
class Tree {
    _m_shaderProgramObject = null;

    /*uniform locations*/
    //matrices
    // _m_u_camera_position = null;
    _m_u_model_matrix = null;
    _m_u_view_matrix = null;
    _m_u_projection_matrix = null;

    _m_u_laUniform = null;
    _m_u_ldUniform = null;
    _m_u_lsUniform = null;
    _m_u_lpUniform = null;
    _m_u_kaUniform = null;
    _m_u_kdUniform = null;
    _m_u_ksUniform = null;

    //texture samplers
    _m_texture_tree_sampler = null;
    _m_texture_tree_normalMap_sampler = null;
    

    //textures
    _m_texture_tree = null;
    _m_texture_tree_normalMap = null;
    // _m_texture_terrain_heightmap = null;
    // _m_texture_terrain_heightmap_sampler = null;

    //texture load count
    _m_tex_count = 0;

    //vao, vbo, etc.
    _m_vao_rectangle = null;

    // light related variables
    light_ambient = [1.0, 1.0, 1.0];
    light_diffuse = [1.0, 1.0, 1.0];
    light_specular = [0.0, 0.0, 0.0];
    light_position = [0.0, 0.0, 100.0, 1.0];

    material_ambient = [1.0, 1.0, 1.0];
    material_diffuse = [1.0, 1.0, 1.0];
    material_specular = [0.0, 0.0, 0.0];
    // materialShininess = 10.0;

    Init() {
        // Vertex Shader
        let vertexShaderSourceCode =
            `#version 300 es 
        
            in vec4 vPosition;
            in vec2 vTexcoord;
            in vec2 vTexcoordNormal;
            in vec3 vNormal;

            uniform vec4 u_light_position;
            uniform mat4 u_m_matrix;
            uniform mat4 u_v_matrix;
            uniform mat4 u_p_matrix;

            out vec2 out_texcoord;
            out vec2 out_texcoord_normal;
            out vec3 out_tangent;
            out vec3 out_bitangent;
            out vec3 toLightVector;
            out vec3 outNormal;
            out vec3 transformedNormals;
            out vec3 lightDirection;
            out vec3 viewerVector;
            
            vec3 vTangent;
            vec3 vBiTangent;

            
            void main(void) 
            {
                vec4 eye_coordinates = u_v_matrix * u_m_matrix * vPosition;
                transformedNormals = mat3(u_v_matrix * u_m_matrix) * vNormal;
                lightDirection = vec3(u_light_position) - eye_coordinates.xyz;
                viewerVector = -eye_coordinates.xyz;

                vTangent = vec3(1.0, 0.0, 0.0);
                vBiTangent = vec3(0.0, 1.0, 0.0);
                vec3 tNormal = transpose(inverse(mat3(u_v_matrix * u_m_matrix))) * vPosition.xyz;
                vec3 tan = normalize((mat3(u_v_matrix * u_m_matrix) * vTangent).xyz);
                vec3 bitan = normalize((mat3(u_v_matrix * u_m_matrix) * vBiTangent).xyz);
                mat3 toTangentSpace = mat3(tan.x, bitan.x, tNormal.x, tan.y, bitan.y, tNormal.y, tan.z, bitan.z, tNormal.z);
                vec3 eyeCoords=transpose(inverse(mat3(u_v_matrix * u_m_matrix))) * vPosition.xyz;
                mat4 mvMatrix = u_v_matrix * u_m_matrix;
                mvMatrix[0][0] = 1.0;
                mvMatrix[1][0] = 0.0;
                mvMatrix[2][0] = 0.0;

                mvMatrix[0][1] = 0.0;
                mvMatrix[1][1] = 1.0;
                mvMatrix[2][1] = 0.0;

                mvMatrix[0][2] = 0.0;
                mvMatrix[1][2] = 0.0;
                mvMatrix[2][2] = 1.0;

                gl_Position = u_p_matrix * mvMatrix * vPosition;
                toLightVector = vec3(0,0,1000)-gl_Position.xyz;
                toLightVector = toTangentSpace * toLightVector;
                outNormal = tNormal;
                out_texcoord = vTexcoord;
                out_texcoord_normal = vTexcoordNormal;
                out_tangent = vTangent;
                out_bitangent = vBiTangent;
            }`;


        let vertexShaderObject = Util.generateShader(gl.VERTEX_SHADER, vertexShaderSourceCode);

        // Fragment Shader
        let fragmentShaderSourceCode =
            `#version 300 es 
            
            precision highp float; 

            in vec2 out_texcoord;
            in vec2 out_texcoord_normal;
            in vec3 out_tangent;
            in vec3 out_bitangent;
            in vec3 toLightVector;
            in vec3 outNormal;
            in vec3 transformedNormals;
            in vec3 lightDirection;
            in vec3 viewerVector;

            uniform sampler2D u_sampler; 
            uniform sampler2D u_sampler_normal; 
            uniform vec3 u_la;
            uniform vec3 u_ld;
            uniform vec3 u_ls;
            uniform vec3 u_ka;
            uniform vec3 u_kd;
            uniform vec3 u_ks;

            out vec4 FragColor; 
            void main(void) 
            { 
                vec3 phong_ads_color;
                vec3 normalizedtNorms = normalize(transformedNormals);
                vec3 normalizedLightDirection = normalize(lightDirection);
                vec3 normalizedViewerVector = normalize(viewerVector);
                vec3 ambient = u_la * u_ka;
                float tn_dot_ld = max(dot(normalizedtNorms, normalizedLightDirection), 0.0);
                vec3 diffuse = u_ld * u_kd * tn_dot_ld;
                vec3 reflection_vector = reflect(-normalizedLightDirection, normalizedtNorms);
                phong_ads_color = ambient + diffuse;
                vec4 textureNormal = texture(u_sampler_normal, out_texcoord_normal) * 2.0 - 1.0;
                float light=dot(normalize(textureNormal).rgb,normalize(toLightVector));
                vec4 color = texture(u_sampler, out_texcoord);
                FragColor = vec4(vec3(max(light, 0.2)), 1.0) * vec4(vec3(phong_ads_color), 1.0) * color*(color.a);
                // FragColor = vec4(1.0);
            }`;

        let fragmentShaderObject = Util.generateShader(gl.FRAGMENT_SHADER, fragmentShaderSourceCode);
        
        // Shader Program
        this._m_shaderProgramObject = gl.createProgram();
        gl.attachShader(this._m_shaderProgramObject, vertexShaderObject);
        gl.attachShader(this._m_shaderProgramObject, fragmentShaderObject);

        // Pre linking
        gl.bindAttribLocation(this._m_shaderProgramObject, WebGLMacros.AMC_ATTRIBUTE_VERTEX, "vPosition");
        gl.bindAttribLocation(this._m_shaderProgramObject, WebGLMacros.AMC_ATTRIBUTE_TEXTURE0, "vTexcoord");
        gl.bindAttribLocation(this._m_shaderProgramObject, WebGLMacros.AMC_ATTRIBUTE_TEXTURE1, "vTexcoordNormal");
        gl.bindAttribLocation(this._m_shaderProgramObject, WebGLMacros.AMC_ATTRIBUTE_NORMAL, "vNormal");

        // Linking
        gl.linkProgram(this._m_shaderProgramObject);
        if (!gl.getProgramParameter(this._m_shaderProgramObject, gl.LINK_STATUS)) {
            var error = gl.getProgramInfoLog(this._m_shaderProgramObject);
            if (error.length > 0) {
                alert("linking error: " + error);
                //uninitialize();
            }
        }

        this._m_u_model_matrix = gl.getUniformLocation(this._m_shaderProgramObject, "u_m_matrix");
        this._m_u_view_matrix = gl.getUniformLocation(this._m_shaderProgramObject, "u_v_matrix");
        this._m_u_projection_matrix = gl.getUniformLocation(this._m_shaderProgramObject, "u_p_matrix");
        
        this._m_texture_tree_sampler = gl.getUniformLocation(this._m_shaderProgramObject, "u_sampler");
        this._m_texture_tree_normalMap_sampler = gl.getUniformLocation(this._m_shaderProgramObject, "u_sampler_normal");
        this._m_u_laUniform = gl.getUniformLocation(this._m_shaderProgramObject, "u_la");
        this._m_u_ldUniform = gl.getUniformLocation(this._m_shaderProgramObject, "u_ld");
        this._m_u_lsUniform = gl.getUniformLocation(this._m_shaderProgramObject, "u_ls");
        this._m_u_lpUniform = gl.getUniformLocation(this._m_shaderProgramObject, "u_light_position");
        this._m_u_kaUniform = gl.getUniformLocation(this._m_shaderProgramObject, "u_ka");
        this._m_u_kdUniform = gl.getUniformLocation(this._m_shaderProgramObject, "u_kd");
        this._m_u_ksUniform = gl.getUniformLocation(this._m_shaderProgramObject, "u_ks");

        Util.loadTexture(`${BASE_PATH}/Tree.png`, false).then((res) => {
            this._m_texture_tree = res;
            this._m_tex_count++;
        });

        Util.loadTexture(`${BASE_PATH}/TreeNormalMap.png`, false).then((res) => {
            this._m_texture_tree_normalMap = res;
            this._m_tex_count++;
        });

        // Util.loadTexture(`${BASE_PATH}/terrain/mask_with_height.png`, false, gl.CLAMP_TO_EDGE).then((res) => {
        //     this._m_texture_terrain_heightmap = res;
        //     this._m_tex_count++;
        // });

        let rectangleVertices = new Float32Array([1.0, 1.0, 0.0,
            -1.0, 1.0, 0.0,
            -1.0, -1.0, 0.0,
            1.0, -1.0, 0.0
        ]);
    
        let rectangleTexcoords = new Float32Array([0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0
        ]);
    
        let rectangleNormals = new Float32Array([0.0, 0.0, 1.0,
            0.0, 0.0, 1.0,
            0.0, 0.0, 1.0,
            0.0, 0.0, 1.0
        ]);
    
        this._m_vao_rectangle = gl.createVertexArray();
        gl.bindVertexArray(this._m_vao_rectangle);
    
        let vbo_rectangle = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo_rectangle);
        gl.bufferData(gl.ARRAY_BUFFER, rectangleVertices, gl.STATIC_DRAW);
        gl.vertexAttribPointer(WebGLMacros.AMC_ATTRIBUTE_VERTEX, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(WebGLMacros.AMC_ATTRIBUTE_VERTEX);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    
        let vbo_rectangle_texture = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo_rectangle_texture);
        gl.bufferData(gl.ARRAY_BUFFER, rectangleTexcoords, gl.STATIC_DRAW);
        gl.vertexAttribPointer(WebGLMacros.AMC_ATTRIBUTE_TEXTURE0, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(WebGLMacros.AMC_ATTRIBUTE_TEXTURE0);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    
        let vbo_normal_texture = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo_normal_texture);
        gl.bufferData(gl.ARRAY_BUFFER, rectangleTexcoords, gl.STATIC_DRAW);
        gl.vertexAttribPointer(WebGLMacros.AMC_ATTRIBUTE_TEXTURE1, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(WebGLMacros.AMC_ATTRIBUTE_TEXTURE1);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    
        let vbo_normal = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo_normal);
        gl.bufferData(gl.ARRAY_BUFFER, rectangleNormals, gl.STATIC_DRAW);
        gl.vertexAttribPointer(WebGLMacros.AMC_ATTRIBUTE_NORMAL, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(WebGLMacros.AMC_ATTRIBUTE_NORMAL);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    
        gl.bindVertexArray(null);

        if(vbo_rectangle) {
            gl.deleteBuffer(vbo_rectangle);
            vbo_rectangle = null;
        }

        if(vbo_rectangle_texture) {
            gl.deleteBuffer(vbo_rectangle_texture);
            vbo_rectangle_texture = null;
        }

        if(vbo_normal_texture) {
            gl.deleteBuffer(vbo_normal_texture);
            vbo_normal_texture = null;
        }

        if(vbo_normal) {
            gl.deleteBuffer(vbo_normal);
            vbo_normal = null;
        }
    }

    Render() {
        if (this._m_tex_count < 2) {
            return;
        }

        gl.useProgram(this._m_shaderProgramObject);

        let modelMatrix = mat4.create();

        // mat4.translate(modelMatrix, modelMatrix, [0.0, 0.0, -10.0]);

        gl.uniformMatrix4fv(this._m_u_model_matrix, false, modelMatrix);
        gl.uniformMatrix4fv(this._m_u_view_matrix, false, camera.getViewMatrixMat4());
        gl.uniformMatrix4fv(this._m_u_projection_matrix, false, camera.getProjectionMatrix());
        
        gl.uniform3fv(this._m_u_laUniform, this.light_ambient);
        gl.uniform3fv(this._m_u_ldUniform, this.light_diffuse);
        gl.uniform3fv(this._m_u_lsUniform, this.light_specular);
        gl.uniform4fv(this._m_u_lpUniform, this.light_position);
        gl.uniform3fv(this._m_u_kaUniform, this.material_ambient);
        gl.uniform3fv(this._m_u_kdUniform, this.material_diffuse);
        gl.uniform3fv(this._m_u_ksUniform, this.material_specular);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this._m_texture_tree);
        gl.uniform1i(this._m_texture_tree_sampler, 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this._m_texture_tree_normalMap);
        gl.uniform1i(this._m_texture_tree_normalMap_sampler, 1);

        // gl.activeTexture(gl.TEXTURE2);
        // gl.bindTexture(gl.TEXTURE_2D, this._m_texture_terrain_heightmap);
        // gl.uniform1i(this._m_texture_terrain_heightmap_sampler, 1);

        gl.bindVertexArray(this._m_vao_rectangle);
        gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
        gl.bindVertexArray(null);

        gl.useProgram(null);

        // if (this._m_offsetVar < 1.0) {
        //     this._m_offsetVar = this._m_offsetVar + 0.005;
        // }
    }

    Uninitialize() {

    }
};