class SpruceTreesModel extends RenderableObject
{

    _m_u_model_matrix = null;
    _m_u_view_matrix = null;
    _m_u_projection_matrix = null;
	_m_u_isFog = null;

    _m_numberOfIndices = 0;

    // textures
    _m_textureDiffuse1 = null;
    _m_textureDiffuse2 = null;
    _m_textureNormal = null;
    _m_textureAO = null;

    // texture samplers
    _m_textureDiffuseSampler = null;
    _m_textureNormalSampler = null;

    // material uniform
    _m_u_materialDiffuse = null;
	
	//animation
	_m_perlinFactor = null;
	_m_animFactor = null;

    // this variable makes sure to render only after entire data is loaded (textures, etc.)
    _m_bool_modelDataLoaded = false;
    _m_tex_count = 0;
    _m_meshOffsets = [];

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
        uniform float perlinFactor;
        uniform float animFactor;

        out vec3 out_normal;
        out vec3 fs_surface_normal;
        out vec2 out_texCoord;
        out vec3 lightDir;
        out float visibility;

        float random (vec2 st)
        {
            return fract(sin(dot(st.xy,vec2(12.9898,78.233)))*43758.5453123);
        }
		
		float hash(float i)
		{
			//%in 1d, return a slope
			float h = i * 127.1;
			float p = -1. + 2. * fract(sin(h) * 43758.1453123);
			return p;//sin(p*6.283 + iTime);
		}
		float perlin_noise_1d(float d)
		{
			float i = floor(d);
			float f = d - i;

			//%interpolation
			//float y = 6.0 * pow(f, 5.0) - 15.0 * pow(f, 4.0) + 10.0 * pow(f, 3.0);
			float y = f*f*f* (6. * f*f - 15. * f + 10.);

			float slope1 = hash(i);
			float slope2 = hash(i + 1.0);
			float v1 = f;
			float v2 = f - 1.0;

			float r = mix(slope1 * v1, slope2 * v2, y);
			r = r * 0.5 + 0.5; //%map to range 0 ~ 1
			return r;
		}
		

        void main()
        {
            float scale = max(random(vec2(float(gl_InstanceID), 0.5)), 0.5);
            vec4 position = vec4(vPosition.xyz * scale, 1.0);
			vec4 normalizedPos=normalize(position);
            int xOffset = ((gl_InstanceID % 4) * 16);
            int zOffset = ((gl_InstanceID / 4) * 16);
            position = vec4(
                            position.x + float(xOffset) + (random(vec2(float(gl_InstanceID),float(gl_InstanceID)))*2.0-1.0)*5.0,
                            position.y, 
                            position.z + float(zOffset) + (random(vec2(float(gl_InstanceID+50),float(gl_InstanceID)))*2.0-1.0)*5.0, 
                            1.0
                        );

			position.x+=8500.0*clamp(vPosition.y/150.0*vPosition.y/150.0*vPosition.y/150.0,0.0,1.0)*clamp(perlin_noise_1d(perlinFactor+float(gl_InstanceID)),0.3,1.0)*animFactor;
			
            vec4 EyeCoord=u_v_matrix * u_m_matrix * position;
            gl_Position = u_p_matrix * EyeCoord ;
            fs_surface_normal = vNormal;
            out_normal = transpose(inverse(mat3(u_v_matrix * u_m_matrix))) * vNormal.xyz;
            lightDir = normalize(mat3(u_v_matrix * u_m_matrix) * vec3(10000,2000,1000) - (EyeCoord).xyz);
            out_texCoord = vTexCoord;

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
        in vec3 fs_surface_normal;
        in vec2 out_texCoord;
        in vec3 lightDir;
        in float visibility;

        uniform vec3 u_materialDiffuse;
        uniform sampler2D u_sampler; 
		uniform int isFog;

        out vec4 FragColor;

        void main()
        {
            vec4 textureColor = texture( u_sampler, out_texCoord);
            if(textureColor.a < 0.5)
            {
                discard;
            }
            vec3 normalizedNormal = normalize(out_normal);
            float diffuse = max(dot(normalizedNormal, lightDir),0.4);
            vec3 upVector = vec3(0.0, 1.0, 0.0);
            FragColor = diffuse * textureColor + (smoothstep(0.6, 0.9, dot(fs_surface_normal, upVector)) * vec4(0.8, 0.85, 1.0, 1.0));

			if(isFog==1)
			{
			FragColor = mix(vec4(0.84,0.9,1.0, 1.0),FragColor, visibility);
			}
			else
			{
				FragColor *= 1.0;
			}
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
		this._m_u_isFog = gl.getUniformLocation(this._m_shaderProgramObject, "isFog");
        this._m_u_model_matrix = gl.getUniformLocation(this._m_shaderProgramObject, "u_m_matrix");
        this._m_u_view_matrix = gl.getUniformLocation(this._m_shaderProgramObject, "u_v_matrix");
        this._m_u_projection_matrix = gl.getUniformLocation(this._m_shaderProgramObject, "u_p_matrix");
        this._m_textureDiffuseSampler = gl.getUniformLocation(this._m_shaderProgramObject, "u_sampler");
        this._m_u_materialDiffuse = gl.getUniformLocation(this._m_shaderProgramObject, "u_materialDiffuse"); 

		this._m_perlinFactor = gl.getUniformLocation(this._m_shaderProgramObject, "perlinFactor");
        this._m_animFactor = gl.getUniformLocation(this._m_shaderProgramObject, "animFactor");
		

        Util.loadTexture(`${BASE_PATH}/models/spruceTree/Sprucebranches.png`).then(res => {
            this._m_textureDiffuse1 = res;
            this._m_tex_count++;
        });

        Util.loadTexture(`${BASE_PATH}/models/spruceTree/Sprucetrunk.png`).then(res => {
            this._m_textureDiffuse2 = res;
            this._m_tex_count++;
        });

        this._m_gvao = gl.createVertexArray();
        this._m_gvbo_indices = gl.createBuffer();
        
        Util.loadModel(modelFilePath).then(data => {
            gl.bindVertexArray(this._m_gvao);
            
            let verticesFArr = new Float32Array(data.sortedVertices);
            let texturesFArr = new Float32Array(data.sortedTextures);
            let normalsFArr = new Float32Array(data.sortedNormals);
            let indicesFArr = new Int32Array(data.faceIndicesArr);

            this._m_numberOfIndices = indicesFArr.length;
            this._m_meshOffsets = data.meshOffset;

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
    
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._m_gvbo_indices);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indicesFArr, gl.STATIC_DRAW);
    
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
            gl.bindVertexArray(null);

            this._m_tex_count++;
        });
        
    }

    getModelMatrix()
    {
        let modelM = mat4.create(); 
        mat4.translate(modelM,modelM,[-80.0,22.0,-50.0]);
        mat4.scale(modelM,modelM,[5.0, 5.0, 5.0]);
        return modelM;
    }

    Render(fog,perlinFactor=1.0,animFactor=0.0)
    {
        if(this._m_tex_count < 3)
        {
            return;
        }

   
        gl.useProgram(this._m_shaderProgramObject);
        
		gl.uniform1f(this._m_perlinFactor,perlinFactor);
		gl.uniform1f(this._m_animFactor,animFactor);
		
		gl.uniform1i(this._m_u_isFog,fog);
        gl.uniformMatrix4fv(this._m_u_model_matrix, false, this.getModelMatrix());
        gl.uniformMatrix4fv(this._m_u_view_matrix, false, camera.getViewMatrixMat4());
        gl.uniformMatrix4fv(this._m_u_projection_matrix, false, camera.getProjectionMatrix());
        
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this._m_textureDiffuse1);
        gl.uniform1i(this._m_textureDiffuseSampler, 0);

        
        
        // gl.activeTexture(gl.TEXTURE1);
        // gl.bindTexture(gl.TEXTURE_2D, this._m_textureAO);
        // gl.uniform1i(this._m_textureAOSampler, 1);

        gl.bindVertexArray(this.getVao());

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.getVboIndices());

        // gl.uniform3fv(this._m_u_materialDiffuse, [0.0, 0.0, 1.0]);
        gl.drawElementsInstanced(gl.TRIANGLES, this._m_meshOffsets[1] - this._m_meshOffsets[0], gl.UNSIGNED_INT, this._m_meshOffsets[0] * 4, 17);

        gl.bindTexture(gl.TEXTURE_2D, this._m_textureDiffuse2);
        gl.uniform1i(this._m_textureDiffuseSampler, 0);

        // gl.uniform3fv(this._m_u_materialDiffuse, [0.0, 1.0, 0.0]);
        gl.drawElementsInstanced(gl.TRIANGLES, this._m_numberOfIndices - this._m_meshOffsets[1], gl.UNSIGNED_INT, this._m_meshOffsets[1] * 4, 17);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

        // gl.drawArraysInstanced(gl.TRIANGLES, 0, this._m_numberOfIndices);
        gl.bindVertexArray(null);

        gl.useProgram(null);
    }

    Uninitialize()
    {

    }
};