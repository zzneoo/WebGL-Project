class BlackBoard
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
        in vec3 vNormal;

        //model, view, projection matrices
        uniform mat4 u_m_matrix;
        uniform mat4 u_v_matrix;
        uniform mat4 u_p_matrix;

        out vec3 out_normal;
        out vec3 fs_surface_normal;
        out vec2 out_texCoord;
        out vec3 lightDir;
        out float visibility;



        void main()
        {
 
            vec4 EyeCoord=u_v_matrix * u_m_matrix * vPosition;
            gl_Position = u_p_matrix * EyeCoord ;
            out_normal = transpose(inverse(mat3(u_v_matrix * u_m_matrix))) * vNormal.xyz;
            fs_surface_normal = vNormal;
            lightDir = normalize(mat3(u_v_matrix * u_m_matrix) * vec3(-10000,2000,1000)-( EyeCoord).xyz);
            out_texCoord = vPosition.xy;

            //fog
            float density = 0.004;
            float gradient = 4.5;
            float distance = length(EyeCoord.xyz);//TODO:should this be wrt camera
            visibility = exp(-pow(distance*density, gradient));
        }
        `;

        let fragmentShaderSourceCode = 
        `#version 300 es

        precision highp float;

        in vec3 out_normal;
        in vec3 fs_surface_normal;
        in vec2 out_texCoord;
        in vec3 lightDir;
        in float visibility;

        uniform sampler2D u_sampler;        

        out vec4 FragColor;

        void main()
        {
            vec4 textureColor = texture( u_sampler, out_texCoord * 0.2);
            vec3 normalizedNormal = normalize(out_normal);
            float diffuse = max(dot(normalizedNormal, lightDir),0.4);
            vec3 upVector = vec3(0.0, 1.0, 0.0);
            FragColor = diffuse*0.7 * (1.0-textureColor)*vec4(125.0/255.0,84.0/255.0,36.0/255.0,1.0);
            FragColor.a = 1.0;
        }`;

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
        this._m_textureDiffuseSampler = gl.getUniformLocation(this._m_shaderProgramObject, "u_sampler");
		
			Util.loadTexture(`${BASE_PATH}/models/blackBoard/gurukul.png`).then(res => {
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
        if(this._m_tex_count < 1)
        {
            return;
        }

   
        gl.useProgram(this._m_shaderProgramObject);
        let modelM = mat4.create(); 
        let rotationM = mat4.create(); 
        let mvpM = mat4.create(); 
        // if(onClickForPixels) {
        //     console.log(worldSpaceCoords);
        // }
        mat4.translate(modelM,modelM,[-82.517154693603516, 22.815338134765625, -1.650888442993164]);
        mat4.fromRotation(rotationM, -90.0*3.14159265/180.0, vec4.fromValues(0.0,1.0,0.0));
		mat4.multiply(modelM,  modelM,rotationM);
        mat4.scale(modelM,modelM,[2.0, 2.0, 2.0]);
        gl.uniformMatrix4fv(this._m_u_model_matrix, false, modelM);
        gl.uniformMatrix4fv(this._m_u_view_matrix, false, camera.getViewMatrixMat4());
        gl.uniformMatrix4fv(this._m_u_projection_matrix, false, camera.getProjectionMatrix());
        
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, terrain._m_terrainRockTexture);
        gl.uniform1i(this._m_textureDiffuseSampler, 0);
        
        gl.bindVertexArray(this._m_gvao);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._m_gvbo_indices);
        gl.drawElements(gl.TRIANGLES, this._m_numberOfIndices, gl.UNSIGNED_INT, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

        gl.bindVertexArray(null);

        gl.useProgram(null);
		
		gl.disable(gl.CULL_FACE);
		
		////////////////////////////
		mat4.identity(modelM);
		mat4.identity(rotationM);
		mat4.translate(modelM,modelM,[-80.917154693603516, 35.355338134765625, -12.650888442993164]);
		mat4.fromRotation(rotationM, -217.0*3.14159265/180.0, vec4.fromValues(0.0,1.0,0.0));
		mat4.multiply(modelM,  modelM,rotationM);
		mat4.identity(rotationM);
		mat4.fromRotation(rotationM, -10.0*3.14159265/180.0, vec4.fromValues(1.0,0.0,0.0));
		mat4.multiply(modelM,  modelM,rotationM);
				
		mat4.scale(modelM,modelM,[11.0, 4.6, 1.0]);
		gl.useProgram(fbShaderProgram);
		
		mat4.multiply(mvpM,  camera.getProjectionMatrix(),camera.getViewMatrixMat4());
		mat4.multiply(mvpM,  mvpM,modelM);
		
		 gl.uniformMatrix4fv(mvpUniform, false, mvpM);
		 gl.uniform1f(blendBlackUniform,0.0);
		
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this._m_textureDiffuse);
		gl.uniform1i(u_fb_sampler, 0);
		
		gl.drawArrays(gl.TRIANGLES, 0, 6);
	
	
	gl.useProgram(null);
		
    }

    Uninitialize()
    {

    }
};