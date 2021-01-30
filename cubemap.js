class Cubemap {
    _m_cubemapShaderProgramObject = null;
    _m_vao_cubemap = null;

    _m_cube_texture = null;
    _m_cubemap_texture_sampler;

    _m_u_model_matrix = null;
    _m_u_view_matrix = null;
    _m_u_projection_matrix = null;

    _m_bool_textureLoaded = false;

    constructor() {
        // add code if required
    }

    Init() {
        this.InitCubemap();
    }

    InitCubemap() {
        let vertexShaderSourceCode =
            `#version 300 es
	        in vec4 vPosition;
    
            uniform mat4 u_m_matrix;
            uniform mat4 u_v_matrix;
            uniform mat4 u_p_matrix;

            out vec3 out_TexCoord;
            
	        void main(void)
	        {
                mat4 viewMatrix = u_v_matrix;
                viewMatrix[3][0] = 0.0;
                viewMatrix[3][1] = 0.0;
                viewMatrix[3][2] = 0.0;

                vec4 worldPosition = viewMatrix*u_m_matrix*vPosition;
                
                out_TexCoord = vPosition.xyz;
                gl_Position = u_p_matrix * worldPosition;
            }`
        
        let vertexShaderObject = Util.generateShader(gl.VERTEX_SHADER, vertexShaderSourceCode);
        
        let fragmentShaderSourceCode =
            `#version 300 es
            precision highp float;

            in vec3 out_TexCoord;
            uniform samplerCube u_texture;
            out vec4 FragColor;
            
            void main(void) 
            {
                FragColor=texture(u_texture,out_TexCoord);
#if ${CONFIG_ENABLE_FOG}
                FragColor = mix(vec4(0.807, 0.807, 0.807, 1.0),FragColor, smoothstep(0.6, 0.8, out_TexCoord.y*0.5+0.5));
#endif                
            }`
        
        let fragmentShaderObject = Util.generateShader(gl.FRAGMENT_SHADER, fragmentShaderSourceCode);

        this._m_cubemapShaderProgramObject = gl.createProgram();

        gl.attachShader(this._m_cubemapShaderProgramObject, vertexShaderObject);
        gl.attachShader(this._m_cubemapShaderProgramObject, fragmentShaderObject);

        gl.bindAttribLocation(this._m_cubemapShaderProgramObject, WebGLMacros.AMC_ATTRIBUTE_POSITION, "vPosition");
        
        gl.linkProgram(this._m_cubemapShaderProgramObject);
        	// error checking
        if(!gl.getProgramParameter(this._m_cubemapShaderProgramObject, gl.LINK_STATUS)) 
        {
            var error = gl.getProgramInfoLog(this._m_cubemapShaderProgramObject);
            if(error.length) 
            {
                alert(error);
                Uninitialize();
            }
        }
        
        Util.loadCubemapTexture().then((cubemap) => {
            this._m_cube_texture = cubemap;
            this._m_bool_textureLoaded = true;
        }); //gentexture

        this._m_u_model_matrix = gl.getUniformLocation(this._m_cubemapShaderProgramObject, "u_m_matrix");
        this._m_u_view_matrix = gl.getUniformLocation(this._m_cubemapShaderProgramObject, "u_v_matrix");
        this._m_u_projection_matrix = gl.getUniformLocation(this._m_cubemapShaderProgramObject, "u_p_matrix");
        this._m_cubemap_texture_sampler = gl.getUniformLocation(this._m_cubemapShaderProgramObject,"u_texture");

        let CubeVertices=new Float32Array([
            1.0, 1.0, -1.0,
            -1.0, 1.0, -1.0,
            -1.0, 1.0, 1.0,
            1.0, 1.0, 1.0,
    
            1.0, -1.0, -1.0,
            -1.0, -1.0, -1.0,
            -1.0, -1.0, 1.0,
            1.0, -1.0, 1.0,
    
            1.0, 1.0, 1.0,
            -1.0, 1.0, 1.0,
            -1.0, -1.0, 1.0,
            1.0,-1.0, 1.0,
    
            1.0, 1.0, -1.0,
            -1.0, 1.0, -1.0,
            -1.0, -1.0, -1.0,
            1.0, -1.0, -1.0,
    
            1.0, 1.0, -1.0,
            1.0, 1.0, 1.0,
            1.0, -1.0, 1.0,
            1.0, -1.0, -1.0,
    
            -1.0, 1.0, 1.0,
            -1.0, 1.0, -1.0,
            -1.0, -1.0, -1.0,
            -1.0, -1.0, 1.0	
        ]);

        this._m_vao_cubemap = gl.createVertexArray();
        gl.bindVertexArray(this._m_vao_cubemap);
        
        let vbo_Cube_Position = gl.createBuffer();
        
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo_Cube_Position);
        gl.bufferData(gl.ARRAY_BUFFER, CubeVertices, gl.STATIC_DRAW);
        gl.vertexAttribPointer(WebGLMacros.AMC_ATTRIBUTES_VERTEX, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(WebGLMacros.AMC_ATTRIBUTES_VERTEX);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        
        gl.bindVertexArray(null);
    }

    Render() {
        if(this._m_bool_textureLoaded != true) 
            return;

        gl.useProgram(this._m_cubemapShaderProgramObject);

        let modelMatrix = mat4.create();

        mat4.scale(modelMatrix,modelMatrix,[1000.0,1000.0,1000.0]);
        gl.uniformMatrix4fv(this._m_u_model_matrix, false, modelMatrix);
        gl.uniformMatrix4fv(this._m_u_view_matrix, false, camera.getViewMatrixMat4());
        gl.uniformMatrix4fv(this._m_u_projection_matrix, false, camera.getProjectionMatrix());

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP,this._m_cube_texture);
        gl.uniform1i(this._m_cubemap_texture_sampler, 0);
        
        gl.bindVertexArray(this._m_vao_cubemap);
        
        gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
        gl.drawArrays(gl.TRIANGLE_FAN, 4, 4);
        gl.drawArrays(gl.TRIANGLE_FAN, 8, 4);
        gl.drawArrays(gl.TRIANGLE_FAN, 12, 4);
        gl.drawArrays(gl.TRIANGLE_FAN, 16, 4);
        gl.drawArrays(gl.TRIANGLE_FAN, 20, 4);

        gl.bindVertexArray(null);
        
        gl.useProgram(null);
    }

}