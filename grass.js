const NUM_TEXTURE_TO_LOAD = 3;

class Grass {
    _m_shaderProgramObject = null;

    /*uniform locations*/
    //matrices
    _m_u_camera_position = null;
    _m_u_model_matrix = null;
    _m_u_view_matrix = null;
    _m_u_projection_matrix = null;
    //texture samplers
    _m_samplerUniform = null;

    //textures
    _m_texture_grass = null;
    _m_texture_terrain_heightmap = null;
    _m_texture_terrain_heightmap_sampler = null;

    //texture load count
    _m_tex_count = 0;
    _m_offsetUniform = 0;

    //vao, vbo, etc.
    _m_vao_rectangle = null;

    //misc
    _m_offsetVar = 0.0;
    _m_b_initDone = false;
    _m_vertexCount = 0;


    Init() {
        // Vertex Shader
        let vertexShaderSourceCode =
            `#version 300 es 
        
            in vec4 vPosition; 
            
            uniform sampler2D u_terrain_heightmap;
            uniform vec3 u_camera_position;
            uniform mat4 u_m_matrix;
            uniform mat4 u_v_matrix;
            uniform mat4 u_p_matrix;

            out float visibility;
            
            void main(void) 
            { 
                vec4 position = vPosition;
                float yHeight = 1.5 + texture(u_terrain_heightmap, (position.xz / float(${MESH_EXTENT_XSCALE})) * 0.5 + 0.5).r * float(${MESH_SCALE_HEIGHT});
                position.y = yHeight;

                vec4 worldPosition = u_m_matrix * position;

                //fog
                float density = 0.005;
                float gradient = 4.5;
                float fogDistance=length((u_v_matrix*worldPosition).xyz);//TODO:should this be wrt camera
                visibility = exp(-pow(fogDistance*density, gradient));

                float distance = distance(u_camera_position, worldPosition.xyz);

                gl_Position = u_p_matrix * u_v_matrix * worldPosition;
                gl_PointSize = (float(${gCONFIG_FRUSTUM_FAR}) - float(${gCONFIG_FRUSTUM_NEAR})) / gl_Position.w * 0.5;
            }`;


        let vertexShaderObject = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShaderObject, vertexShaderSourceCode);
        gl.compileShader(vertexShaderObject);
        if (gl.getShaderParameter(vertexShaderObject, gl.COMPILE_STATUS) == false) {
            var error = gl.getShaderInfoLog(vertexShaderObject);
            if (error.length > 0) {
                alert(error);
                //uninitialize();
            }
        }

        // Fragment Shader
        let fragmentShaderSourceCode =
            `#version 300 es 
            
            precision highp float; 

            in float visibility;

            // in vec2 out_texcoord; 
            uniform highp sampler2D u_sampler; 
            uniform highp float u_offset; 
            out vec4 FragColor; 
            void main(void) 
            { 
                vec4 color = texture(u_sampler, gl_PointCoord); 
                if(color.a < 0.5) 
                {
                    discard; 
                }
                vec4 greenGrassTexture = color; 
                float grayColor = (color.r*0.65  + color.g*0.25 + color.b*0.1); 
                vec4 yellowGrassTexture = grayColor * vec4(1.0, 0.678431, 0.003921, 1.0); 
                FragColor = mix(greenGrassTexture, yellowGrassTexture, u_offset); 
    #if ${CONFIG_ENABLE_FOG}
                FragColor = mix(vec4(0.807, 0.807, 0.807, 1.0),FragColor, visibility);
    #endif
            }`;

        let fragmentShaderObject = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragmentShaderObject, fragmentShaderSourceCode);
        gl.compileShader(fragmentShaderObject);
        if (gl.getShaderParameter(fragmentShaderObject, gl.COMPILE_STATUS) == false) {
            var error = gl.getShaderInfoLog(fragmentShaderObject);
            if (error.length > 0) {
                alert("fragmentShader compilation error: " + error);
                console.error(fragmentShaderSourceCode);
                //uninitialize();
            }
        }

        // Shader Program
        this._m_shaderProgramObject = gl.createProgram();
        gl.attachShader(this._m_shaderProgramObject, vertexShaderObject);
        gl.attachShader(this._m_shaderProgramObject, fragmentShaderObject);

        // Pre linking
        gl.bindAttribLocation(this._m_shaderProgramObject, WebGLMacros.AMC_ATTRIBUTE_VERTEX, "vPosition");
        gl.bindAttribLocation(this._m_shaderProgramObject, WebGLMacros.AMC_ATTRIBUTE_TEXTURE0, "vTexcoord");

        // Linking
        gl.linkProgram(this._m_shaderProgramObject);
        if (!gl.getProgramParameter(this._m_shaderProgramObject, gl.LINK_STATUS)) {
            var error = gl.getProgramInfoLog(this._m_shaderProgramObject);
            if (error.length > 0) {
                alert("linking error: " + error);
                //uninitialize();
            }
        }

        this._m_texture_terrain_heightmap_sampler = gl.getUniformLocation(this._m_shaderProgramObject, "u_terrain_heightmap");
        this._m_u_camera_position = gl.getUniformLocation(this._m_shaderProgramObject, "u_camera_position");
        this._m_u_model_matrix = gl.getUniformLocation(this._m_shaderProgramObject, "u_m_matrix");
        this._m_u_view_matrix = gl.getUniformLocation(this._m_shaderProgramObject, "u_v_matrix");
        this._m_u_projection_matrix = gl.getUniformLocation(this._m_shaderProgramObject, "u_p_matrix");

        this._m_samplerUniform = gl.getUniformLocation(this._m_shaderProgramObject, "u_sampler");
        this._m_offsetUniform = gl.getUniformLocation(this._m_shaderProgramObject, "u_offset");

        Util.loadTexture(`${BASE_PATH}/GrassTextureTempCompression.png`, false, gl.CLAMP_TO_EDGE).then((res) => {
            this._m_texture_grass = res;
            this._m_tex_count++;
        });

        Util.loadTexture(`${BASE_PATH}/terrain/mask_with_height.png`, false, gl.CLAMP_TO_EDGE).then((res) => {
            this._m_texture_terrain_heightmap = res;
            this._m_tex_count++;
        });

        let tempCnt = this._m_tex_count;
        let grassmapData = [];
        Util.loadTexture(`${BASE_PATH}/terrain/grassmap.png`, false, gl.CLAMP_TO_EDGE).then((res) => {
            grassmapData = Util.readImageData(res.image);
            let pointSpriteData = [];

            for (let i = 0; i < 10000; i++) {
                let xRand = Math.random();
                let zRand = Math.random();

                let xPixel = parseInt(xRand * grassmapData.width);
                let zPixel = parseInt(zRand * grassmapData.height);

                let index = (zPixel*grassmapData.width + xPixel)*4;

                if(index >= grassmapData.data.length)
                {
                    alert("Index Overflow. index: " + index + " grassmapData.data.length: " + grassmapData.data.length);
                }

                let xPos = (xRand * 2 - 1) * MESH_EXTENT_XSCALE;
                let zPos = (zRand * 2 - 1) * MESH_EXTENT_ZSCALE;

                if (grassmapData.data[index] > 127) {
                    pointSpriteData.push(xPos);
                    pointSpriteData.push(0);
                    pointSpriteData.push(zPos);
                    this._m_vertexCount++;
                }
            }

            pointSpriteData = new Float32Array(pointSpriteData);

            this._m_vao_rectangle = gl.createVertexArray();
            gl.bindVertexArray(this._m_vao_rectangle);


            // point sprite vbo & data
            let vbo_rectangle_point_sprite = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, vbo_rectangle_point_sprite);
            gl.bufferData(gl.ARRAY_BUFFER, pointSpriteData, gl.STATIC_DRAW);
            gl.vertexAttribPointer(WebGLMacros.AMC_ATTRIBUTE_VERTEX, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(WebGLMacros.AMC_ATTRIBUTE_VERTEX);
            gl.bindBuffer(gl.ARRAY_BUFFER, null);


            gl.bindVertexArray(null);

            this._m_tex_count++;

        });

    }

    Render() {
        if (this._m_tex_count < NUM_TEXTURE_TO_LOAD) {
            return;
        }

        gl.useProgram(this._m_shaderProgramObject);

        let modelMatrix = mat4.create();

        gl.uniform3fv(this._m_u_camera_position, camera.getCameraPosition());
        gl.uniformMatrix4fv(this._m_u_model_matrix, false, modelMatrix);
        gl.uniformMatrix4fv(this._m_u_view_matrix, false, camera.getViewMatrixMat4());
        gl.uniformMatrix4fv(this._m_u_projection_matrix, false, camera.getProjectionMatrix());
        gl.uniform1f(this._m_offsetUniform, this._m_offsetVar);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this._m_texture_grass);
        gl.uniform1i(this._m_samplerUniform, 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this._m_texture_terrain_heightmap);
        gl.uniform1i(this._m_texture_terrain_heightmap_sampler, 1);

        gl.bindVertexArray(this._m_vao_rectangle);
        gl.drawArrays(gl.POINTS, 0, this._m_vertexCount);
        gl.bindVertexArray(null);

        gl.useProgram(null);

        // if (this._m_offsetVar < 1.0) {
        //     this._m_offsetVar = this._m_offsetVar + 0.005;
        // }
    }

    Uninitialize() {

    }
};