const MESH_EXTENT_XSCALE = 256;
const MESH_EXTENT_ZSCALE = 256;
const MESH_TRANSLATE_HEIGHT   = -0.0;
const MESH_SCALE_HEIGHT   = 200;

const NUMBEROFINDICES = 6*(MESH_EXTENT_XSCALE - 1)*(MESH_EXTENT_ZSCALE - 1);
const TEXTURE_TILE_SCALE = 50;
const BASE_PATH = 'assets';
sahils_tex = 0;

const LIGHT_POSITION = "vec4(1.0, 1.0, 1.0, 1.0)";
const UP_VECTOR = "vec3(0.0, 1.0, 0.0)";

var u_m_matrix = -1
var u_v_matrix = -1
var u_p_matrix = -1

class Terrain extends RenderableObject
{

    // textures
    _m_terrainHeightmap;
    _m_terrainNormals;
    _m_terrainRockTexture;
    _m_terrainGrassTexture;

    // texture samplers
    _m_terrainHeightmapSampler;
    _m_terrainNormalsSampler;
    _m_terrainRockTextureSampler;
    _m_terrainGrassTextureSampler;
	
	//uniform int
	_m_isFog;

    //shadow map uniforms
    _m_u_depth_map_texture_sampler;
    _m_u_showShadow;
    _m_u_m_lightView;
    _m_u_m_lightProj;

    Init() {
        this.InitVertices();
        this.InitTerrain();
    }

    InitVertices()
    {
        var i, j;
        for(i=0; i < MESH_EXTENT_XSCALE ; i++)
        {
            //let row = [];
            for(j=0; j < MESH_EXTENT_XSCALE ; j++)
            {
                //row.push([j,1.0,i]);
                this._m_vertices.push(j);
                this._m_vertices.push(1.0);
                this._m_vertices.push(i);
            }
            //this._m_vertices.push(row);
        }

        //construct indices
        let cnt = 0;
        for(let index=0, counter=0; index < NUMBEROFINDICES; index+=6, counter++)
        {
            this._m_faceIndices.push(MESH_EXTENT_XSCALE + 1 + counter);
            this._m_faceIndices.push(counter + 1);
            this._m_faceIndices.push(MESH_EXTENT_XSCALE + counter);
            this._m_faceIndices.push(counter + 1);
            this._m_faceIndices.push(counter);
            this._m_faceIndices.push(MESH_EXTENT_XSCALE + counter);
            cnt++;
            if(cnt/(MESH_EXTENT_XSCALE - 1)==1)
            {
                counter++;
                cnt = 0;
            }
        }

    }
    

    InitTerrain()
    {
        let vertexShaderSourceCode = 
        `#version 300 es

        in vec4 vPosition;

        //model, view, projection matrices
        uniform mat4 u_m_matrix;
        uniform mat4 u_v_matrix;
        uniform mat4 u_p_matrix;

        
        uniform sampler2D u_terrain_heightmap_sampler;
        uniform sampler2D u_terrain_normal_sampler;

        //shadow mapping
        uniform int u_showShadow;//do shadow calculations if 1
        uniform mat4 u_m_lightView;
        uniform mat4 u_m_lightProj;
        out vec4 out_lightSpacePos;

        out vec3 out_normal;
        out vec2 out_texCoord;
        out float visibility;
		

        void main()
        {
            vec4 position = vPosition;
            out_texCoord = vPosition.xz/float(${MESH_EXTENT_XSCALE});
            float height = float(${MESH_TRANSLATE_HEIGHT}) + texture(u_terrain_heightmap_sampler, out_texCoord).r*float(${MESH_SCALE_HEIGHT});
            position.y = height;
            position.xz=(out_texCoord*2.0-1.0)*float(${MESH_EXTENT_XSCALE});
            vec4 worldPosition = u_v_matrix*u_m_matrix*position;
            //vec4 worldPosition = u_v_matrix*position;
            

            //fog
            float density = 0.004;
            float gradient = 4.5;
            float distance=length(worldPosition.xyz);//TODO:should this be wrt camera
            visibility = exp(-pow(distance*density, gradient));

            gl_Position = u_p_matrix*worldPosition;
            out_normal = texture(u_terrain_normal_sampler, out_texCoord).rbg * 2.0 - 1.0;

            if(u_showShadow == 1)
            {
                out_lightSpacePos = u_m_lightProj * u_m_lightView * u_m_matrix * position;
            }
            out_lightSpacePos = u_m_lightProj * u_m_lightView * u_m_matrix * position;
        }
        `;

        let fragmentShaderSourceCode = 
        `#version 300 es

        precision highp float;
        precision highp int;

        in vec3 out_normal;
        in vec2 out_texCoord;
        in float visibility;

        uniform highp sampler2D u_grass_sampler;
        uniform highp sampler2D u_rock_sampler;
        
        //shadow map
        uniform highp sampler2D u_depth_map_texture_sampler;
        uniform int u_showShadow; //do shadow calculations if 1
        uniform int isFog; //do shadow calculations if 1
        in vec4 out_lightSpacePos;
        

        out vec4 FragColor;

        const float zNear = float(${gCONFIG_FRUSTUM_NEAR});
        const float zFar = float(${gCONFIG_FRUSTUM_FAR});
		
		const int pcfcount=3;
		const float fPcfcount=3.0;
		const float totalTexels = (fPcfcount*2.0+1.0)*(fPcfcount*2.0+1.0);

        void main()
        {
            vec4 lightPosition = ${LIGHT_POSITION};
            lightPosition = normalize(lightPosition);
            vec3 normalizedNormal = normalize(out_normal);
            vec3 upVector = ${UP_VECTOR};
            float dotProduct = dot(normalizedNormal, upVector);

            float diffusedLight = max(dot(lightPosition.xyz, normalizedNormal), 0.4);
            vec4 rockColor = texture(u_rock_sampler, out_texCoord * float(${TEXTURE_TILE_SCALE}));
            // vec4 grassColor = texture(u_grass_sampler, out_texCoord * float(${TEXTURE_TILE_SCALE}));
            vec4 grassColor = texture(u_grass_sampler, out_texCoord * 10.0);
            float absoluteValue = smoothstep(0.0, 0.6, (pow(dotProduct,8.0)));
            //FragColor = rockColor*diffusedLight;
            FragColor = mix(rockColor, grassColor, clamp(absoluteValue, 0.0, 1.0)) * diffusedLight*1.8;
            //FragColor = vec4(1.0);
  
            if(u_showShadow == 1)
            {
                vec3 lsPosNDC = out_lightSpacePos.xyz / out_lightSpacePos.w;
                lsPosNDC = lsPosNDC*0.5 + 0.5;
				
				vec2 offset=vec2(1.0/1920.0,1.0/1080.0);
				
				float total;
				
                float depth = texture(u_depth_map_texture_sampler, lsPosNDC.xy).r;
				 if(depth < lsPosNDC.z)
                {
                   total+=1.0;
                }
				
				for(int x=-pcfcount;x<pcfcount;x++)
				{
					for(int y=-pcfcount;y<pcfcount;y++)
					{
						float depth = texture(u_depth_map_texture_sampler, lsPosNDC.xy+vec2(x,y)*offset).r;
						if(depth < lsPosNDC.z)
						{
						   total+=1.0;
						}
					}
				}
              			
				total=total/totalTexels;
            

				
				if(lsPosNDC.x>1.0||lsPosNDC.x<0.0||lsPosNDC.y>1.0||lsPosNDC.y<0.0)
				{
					FragColor.rgb *=1.0;
				}
				else
				{
					FragColor.rgb *= (1.0-total*0.5);
					//FragColor.rgb = vec3(1.0,0.0,0.0)*(1.0-total*0.2);
				}
				
			//FragColor.rgb*=0.5;

                //if(depth < lsPosNDC.z - 0.006)
              //  if(depth < lsPosNDC.z)
              //  {//shadow
              //      FragColor.rgb *= 0.7;
             //       FragColor.a=1.0;
             //   }

            }
			else
			{
			//	FragColor.rgb*=0.5;
			}
			if(isFog==1)
			{
			FragColor = mix(vec4(0.84,0.9,1.0, 1.0),FragColor, visibility);
			}
			else
			{
				FragColor *= 1.0;
			}
            
        }
        `;

        var vertexShaderObject = Util.generateShader(gl.VERTEX_SHADER, vertexShaderSourceCode);
        var fragmentShaderObject = Util.generateShader(gl.FRAGMENT_SHADER, fragmentShaderSourceCode);

        this._m_shaderProgramObject = gl.createProgram();

        gl.attachShader(this._m_shaderProgramObject, vertexShaderObject);
        gl.attachShader(this._m_shaderProgramObject, fragmentShaderObject);

        gl.bindAttribLocation(this._m_shaderProgramObject, WebGLMacros.AMC_ATTRIBUTE_POSITION, "vPosition");
        
        gl.linkProgram(this._m_shaderProgramObject);
        	// error checking
        if(!gl.getProgramParameter(this._m_shaderProgramObject, gl.LINK_STATUS)) 
        {
            var error = gl.getProgramInfoLog(this._m_shaderProgramObject);
            if(error.length) 
            {
                alert(error);
                console.error(error);
                Uninitialize();
            }
        }

        u_m_matrix = gl.getUniformLocation(this._m_shaderProgramObject, "u_m_matrix");
        u_v_matrix = gl.getUniformLocation(this._m_shaderProgramObject, "u_v_matrix");
        u_p_matrix = gl.getUniformLocation(this._m_shaderProgramObject, "u_p_matrix");
        this._m_isFog = gl.getUniformLocation(this._m_shaderProgramObject, "isFog");

        this._m_terrainHeightmapSampler = gl.getUniformLocation(this._m_shaderProgramObject, "u_terrain_heightmap_sampler");
        this._m_terrainNormalsSampler = gl.getUniformLocation(this._m_shaderProgramObject, "u_terrain_normal_sampler");
    
        this._m_terrainGrassTextureSampler = gl.getUniformLocation(this._m_shaderProgramObject, "u_grass_sampler");
        this._m_terrainRockTextureSampler = gl.getUniformLocation(this._m_shaderProgramObject, "u_rock_sampler");
        this._m_terrainRockTextureSampler = gl.getUniformLocation(this._m_shaderProgramObject, "u_rock_sampler");

        //shadow mapping
        this._m_u_depth_map_texture_sampler = gl.getUniformLocation(this._m_shaderProgramObject, "u_depth_map_texture_sampler");
        this._m_u_showShadow = gl.getUniformLocation(this._m_shaderProgramObject, "u_showShadow");
        this._m_u_m_lightView = gl.getUniformLocation(this._m_shaderProgramObject, "u_m_lightView");
        this._m_u_m_lightProj = gl.getUniformLocation(this._m_shaderProgramObject, "u_m_lightProj");

        this._m_gvao = gl.createVertexArray();
        gl.bindVertexArray(this._m_gvao);
        
        let verticesFArr = new Float32Array(this._m_vertices);
        let indicesFArr = new Int32Array(this._m_faceIndices);

        this._m_gvbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this._m_gvbo);
        gl.bufferData(gl.ARRAY_BUFFER, verticesFArr, gl.STATIC_DRAW);
        gl.vertexAttribPointer(WebGLMacros.AMC_ATTRIBUTE_POSITION, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(WebGLMacros.AMC_ATTRIBUTE_POSITION);

        gl.bindBuffer(gl.ARRAY_BUFFER, null);

        this._m_gvbo_indices = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._m_gvbo_indices);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indicesFArr, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
        gl.bindVertexArray(null);

        
        Util.loadTexture(`${BASE_PATH}/terrain/mask_with_height.png`, false, gl.CLAMP_TO_EDGE).then((res) => {
            this._m_terrainHeightmap = res;
            sahils_tex++;
        });
        Util.loadTexture(`${BASE_PATH}/terrain/mask_with_height_NRM.png`).then((res) => {
            this._m_terrainNormals = res;
            sahils_tex++;
        });
        Util.loadTexture(`${BASE_PATH}/terrain/terrainGrassTexture.png`, true).then((res) => {
            this._m_terrainGrassTexture = res;
            sahils_tex++;
        });;
        Util.loadTexture(`${BASE_PATH}/terrain/terrainRockTexture.png`, true).then(res => {
            this._m_terrainRockTexture = res;
            sahils_tex++;
        });

        let oesExt = gl.getExtension("OES_element_index_uint");
        if(oesExt==null)
        {
            //alert("OES_element_index_uint support required.");//see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/drawElements
        }
    }

    /// Any changes to model matrix should be done here - since this method is used in shadow mapping
    getModelMatrix()
    {
        let modelM = mat4.create(); 
        return modelM;
    }

    Render(bShowShadow = false, lightViewMatrix, lightProjectionMatrix, depthTexture,fog)
    {
        if(sahils_tex < 4)
        {
            return;
        }

        gl.useProgram(this.getShaderProgObject());
        
        gl.uniformMatrix4fv(u_m_matrix, false, this.getModelMatrix());
        gl.uniformMatrix4fv(u_v_matrix, false, camera.getViewMatrixMat4());
        gl.uniformMatrix4fv(u_p_matrix, false, camera.getProjectionMatrix());
		
		gl.uniform1i(this._m_isFog,fog);

        if(this._m_terrainHeightmap) {
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this._m_terrainHeightmap);
            gl.uniform1i(this._m_terrainHeightmapSampler, 0);
        }
    
        if(this._m_terrainNormals) {
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, this._m_terrainNormals);
            gl.uniform1i(this._m_terrainNormalsSampler, 1);
        }
        
        if(this._m_terrainRockTexture) {
            gl.activeTexture(gl.TEXTURE2);
            gl.bindTexture(gl.TEXTURE_2D, this._m_terrainRockTexture);
            gl.uniform1i(this._m_terrainRockTextureSampler, 2);
        }
        
        if(this._m_terrainGrassTexture) {
            gl.activeTexture(gl.TEXTURE3);
            gl.bindTexture(gl.TEXTURE_2D, this._m_terrainGrassTexture);
            gl.uniform1i(this._m_terrainGrassTextureSampler, 3);
        }

        
        //shodow mapping
        if(bShowShadow == true)
        {
            if((typeof(lightViewMatrix) == "undefined") || (typeof(lightProjectionMatrix) == "undefined") || (typeof(depthTexture) == "undefined"))
            {
                console.error("lightViewMatrix, lightProjectionMatrix, and depthTexture required for shadow mapping");
                gl.uniform1i(this._m_u_showShadow, 0);
            }

            gl.uniformMatrix4fv(this._m_u_m_lightView, false, lightViewMatrix);
            gl.uniformMatrix4fv(this._m_u_m_lightProj, false, lightProjectionMatrix);
            gl.uniform1i(this._m_u_showShadow, 1);

            gl.activeTexture(gl.TEXTURE4);
            gl.bindTexture(gl.TEXTURE_2D, depthTexture);
            gl.uniform1i(this._m_u_depth_map_texture_sampler, 4);
        }
		else
		{
			 gl.uniform1i(this._m_u_showShadow, 0);
		}

        gl.bindVertexArray(this.getVao());

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.getVboIndices());

        gl.drawElements(gl.TRIANGLES, NUMBEROFINDICES, gl.UNSIGNED_INT, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

        gl.bindVertexArray(null);

        gl.useProgram(null);
    }

    Uninitialize()
    {

    }
};