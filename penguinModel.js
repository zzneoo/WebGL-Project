class PenguinModel
{

    _m_u_model_matrix = null;
    _m_u_view_matrix = null;
    _m_u_projection_matrix = null;
    _m_u_rotationMatrix = null;

    _m_shaderProgramObject = null;
    _m_gvao;
    _m_gvbo;
    _m_gvbo_indices;
    _m_numberOfIndices = 0;

    // textures
    _m_textureDiffuse = null;
    _m_textureNormal = null;
    _m_textureAO = null;

    // texture samplers
    _m_textureDiffuseSampler = null;
    _m_textureNormalSampler = null;
    _m_textureAOSampler = null;

    // this variable makes sure to render only after entire data is loaded (textures, etc.)
    _m_bool_modelDataLoaded = false;
    _m_tex_count = 0;

    Init(modelFilePath) {
        this.InitModel(modelFilePath);
    }
    

    InitModel(modelFilePath)
    {
        let vertexShaderSourceCode = 
        `#version 300 es

        in vec4 vPosition;
        in vec2 vTexCoord;
        in vec3 vNormal;

        //model, view, projection matrices
        uniform mat4 u_m_matrix;
        uniform mat4 u_v_matrix;
        uniform mat4 u_p_matrix;
        uniform mat4 rotationMatrix;

        out vec3 out_normal;
        out vec2 out_texCoord;
        out vec3 lightDir;
        out float visibility;

        float random (vec2 st)
        {
            return fract(sin(dot(st.xy,vec2(12.9898,78.233)))*43758.5453123);
        }

        void main()
        {
            float scale = gl_InstanceID == 16 ? 1.0 : 0.5;
            vec4 position = vec4(vPosition.xyz * scale, 1.0) * (gl_InstanceID == 16 ? rotationMatrix : mat4(1.0));
            int xOffset = ((gl_InstanceID % 4) * 12) + (gl_InstanceID == 16 ? 26 : 0);
            int zOffset = ((gl_InstanceID / 4) * 12)+ (gl_InstanceID == 16 ? 22 : 0);
            float yOffset = gl_InstanceID == 16 ? 0.5 : 0.0;
            position = vec4(position.x + float(xOffset)+(random(vec2(float(gl_InstanceID),float(gl_InstanceID)))*2.0-1.0)*5.0, position.y+float(yOffset), position.z + float(zOffset)+(random(vec2(float(gl_InstanceID+50),float(gl_InstanceID+70)))*2.0-1.0)*5.0, 1.0);//
            vec4 EyeCoord=u_v_matrix*u_m_matrix * position;
            gl_Position = u_p_matrix * EyeCoord ;
            out_normal = transpose(inverse(mat3(u_v_matrix*(gl_InstanceID == 16 ? rotationMatrix : mat4(1.0))*u_m_matrix))) * vNormal.xyz;
            lightDir = normalize(mat3(u_v_matrix*u_m_matrix)*vec3(10000,2000,1000)-( EyeCoord).xyz);
            out_texCoord = vTexCoord;
            // out_texCoord.y = 1.0 - vTexCoord.y;
            

            //fog
            float density = 0.004;
            float gradient = 4.5;
            float distance=length(EyeCoord.xyz);//TODO:should this be wrt camera
            visibility = exp(-pow(distance*density, gradient));
        }
        `;

        let fragmentShaderSourceCode = 
        `#version 300 es

        precision highp float;

        in vec3 out_normal;
        in vec2 out_texCoord;
        in vec3 lightDir;
        in float visibility;

        uniform sampler2D u_sampler;        

        out vec4 FragColor;

        void main()
        {
            FragColor = texture( u_sampler, out_texCoord );
            float diffuse = max(dot(normalize(out_normal), lightDir),0.4);
            FragColor.rgb *= diffuse*vec3(0.8,0.7,0.6)*1.5;
#if ${CONFIG_ENABLE_FOG}
            FragColor =mix(vec4(0.84,0.9,1.0, 1.0),FragColor*vec4(0.7,0.8,1.0,1.0),visibility);
#endif
        }
        `;

        var vertexShaderObject = Util.generateShader(gl.VERTEX_SHADER, vertexShaderSourceCode);
        var fragmentShaderObject = Util.generateShader(gl.FRAGMENT_SHADER, fragmentShaderSourceCode);

        this._m_shaderProgramObject = gl.createProgram();

        gl.attachShader(this._m_shaderProgramObject, vertexShaderObject);
        gl.attachShader(this._m_shaderProgramObject, fragmentShaderObject);

        gl.bindAttribLocation(this._m_shaderProgramObject, WebGLMacros.AMC_ATTRIBUTE_POSITION, "vPosition");
        gl.bindAttribLocation(this._m_shaderProgramObject, WebGLMacros.AMC_ATTRIBUTE_TEXTURE0, "vTexCoord");
        gl.bindAttribLocation(this._m_shaderProgramObject, WebGLMacros.AMC_ATTRIBUTE_NORMAL, "vNormal");
        
        gl.linkProgram(this._m_shaderProgramObject);
        	// error checking
        if(!gl.getProgramParameter(this._m_shaderProgramObject, gl.LINK_STATUS)) 
        {
            var error = gl.getProgramInfoLog(this._m_shaderProgramObject);
            if(error.length) 
            {
                alert(error);
                Uninitialize();
            }
        }
        this._m_u_model_matrix = gl.getUniformLocation(this._m_shaderProgramObject, "u_m_matrix");
        this._m_u_view_matrix = gl.getUniformLocation(this._m_shaderProgramObject, "u_v_matrix");
        this._m_u_projection_matrix = gl.getUniformLocation(this._m_shaderProgramObject, "u_p_matrix");
        this._m_u_rotationMatrix = gl.getUniformLocation(this._m_shaderProgramObject, "rotationMatrix");
        this._m_textureDiffuseSampler = gl.getUniformLocation(this._m_shaderProgramObject, "u_sampler");

        Util.loadTexture(`${BASE_PATH}/models/penguin/peng_texture.png`).then(res => {
            this._m_textureDiffuse = res;
            this._m_tex_count++;
        });

        Util.loadModel(modelFilePath).then(data => {
            this._m_gvao = gl.createVertexArray();
            gl.bindVertexArray(this._m_gvao);
            
            let verticesFArr = new Float32Array(data.sortedVertices);
            let texturesFArr = new Float32Array(data.sortedTextures);
            let normalsFArr = new Float32Array(data.sortedNormals);
            let indicesFArr = new Int32Array(data.faceIndicesArr);

            this._m_numberOfIndices = indicesFArr.length;
    
            let vboPosition = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, vboPosition);
            gl.bufferData(gl.ARRAY_BUFFER, verticesFArr, gl.STATIC_DRAW);
            gl.vertexAttribPointer(WebGLMacros.AMC_ATTRIBUTE_POSITION, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(WebGLMacros.AMC_ATTRIBUTE_POSITION);
    
            gl.bindBuffer(gl.ARRAY_BUFFER, null);
    
            let textureVbo = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, textureVbo);
            gl.bufferData(gl.ARRAY_BUFFER, texturesFArr, gl.STATIC_DRAW);
            gl.vertexAttribPointer(WebGLMacros.AMC_ATTRIBUTE_TEXTURE0, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(WebGLMacros.AMC_ATTRIBUTE_TEXTURE0);
    
            gl.bindBuffer(gl.ARRAY_BUFFER, null);
    
            let normalsVbo = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, normalsVbo);
            gl.bufferData(gl.ARRAY_BUFFER, normalsFArr, gl.STATIC_DRAW);
            gl.vertexAttribPointer(WebGLMacros.AMC_ATTRIBUTE_NORMAL, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(WebGLMacros.AMC_ATTRIBUTE_NORMAL);
    
            gl.bindBuffer(gl.ARRAY_BUFFER, null);
    
            this._m_gvbo_indices = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._m_gvbo_indices);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indicesFArr, gl.STATIC_DRAW);
    
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
            gl.bindVertexArray(null);

            this._m_tex_count++;
        });
        
    }

    Render()
    {
        if(this._m_tex_count < 2)
        {
            return;
        }

   
        gl.useProgram(this._m_shaderProgramObject);
        let modelM = mat4.create(); 
        let rotateM = mat4.create(); 
        mat4.translate(modelM,modelM,[-80.0,23.5,-50.0]);
        mat4.scale(modelM,modelM,[0.7, 0.7, 0.7]);
        gl.uniformMatrix4fv(this._m_u_model_matrix, false, modelM);
        gl.uniformMatrix4fv(this._m_u_view_matrix, false, camera.getViewMatrixMat4());
        gl.uniformMatrix4fv(this._m_u_projection_matrix, false, camera.getProjectionMatrix());
        gl.uniformMatrix4fv(this._m_u_rotationMatrix, false, mat4.rotateY(rotateM, rotateM, degToRad(180.0)));
        
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this._m_textureDiffuse);
        gl.uniform1i(this._m_textureDiffuseSampler, 0);
        
        gl.bindVertexArray(this._m_gvao);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._m_gvbo_indices);
        gl.drawElementsInstanced(gl.TRIANGLES, this._m_numberOfIndices, gl.UNSIGNED_INT, 0, 17);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

        gl.bindVertexArray(null);

        gl.useProgram(null);
    }

    Uninitialize()
    {

    }
};