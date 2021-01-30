
class Particle {

    particleArrayWidth = 2048;
    particleArrayHeight = 2048;

    shaderProgramObject = null;
    vaoParticle = null;
    modelUniform = null;
    viewUniform = null;
    projUniform = null;
    TimeUniform = null;
    ParticlesAnimation = 0;

    // texture
    _m_smokeParticleTexture = null;
    _m_smokeParticleTextureSampler = null;

    vertex = [];
    color = [];
    velocity = [];
    startTime = [];

    initCount = 0;
    _m_drawCount = 0;

    CreatePoints(textData)
    {
        for (let i = 0.5 / this.particleArrayWidth - 0.5; i < 0.5; i = i + 1.0 / this.particleArrayWidth)
        {
            for (let j = 0.5 / this.particleArrayHeight - 0.5; j < 0.5; j = j + 1.0 / this.particleArrayHeight)
            {
                let xRand = Math.random();
                let zRand = Math.random();

                let xPixel = parseInt(xRand * textData.width);
                let zPixel = parseInt(zRand * textData.height);

                let index = (zPixel*textData.width + xPixel)*4;

                if(index >= textData.data.length)
                {
                    alert("Index Overflow. index: " + index + " textData.data.length: " + grassmapData.data.length);
                }

                let xPos = (xRand * 2 - 1) * 10;
                let zPos = (zRand * 2 - 1) * 10;

                if (textData.data[index] > 0) {
                    let rand = Math.random();
                    this.vertex.push(xPos);
                    this.vertex.push(zPos);
                    this.vertex.push(0);
                    
                    this.color.push(rand * 3.5 + 0.5);
                    this.color.push(rand * 3.5 + 0.5);
                    this.color.push(rand * 3.5 + 0.5);
                    
                    this.velocity.push(Math.random() + 3.0);
                    this.velocity.push(Math.random() * 10.0);
                    this.velocity.push(Math.random() + 3.0);
                    
                    this.startTime.push(rand);
                    this._m_drawCount++;
                }
            }
        }

        this.vaoParticle = gl.createVertexArray();
        gl.bindVertexArray(this.vaoParticle);

        let particleVertexVBO = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, particleVertexVBO);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertex), gl.STATIC_DRAW);
        gl.vertexAttribPointer(WebGLMacros.AMC_ATTRIBUTES_POSITION,3,gl.FLOAT,false,0, 0);
        gl.enableVertexAttribArray(WebGLMacros.AMC_ATTRIBUTES_POSITION);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        
        let particleVelocityVBO = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, particleVelocityVBO);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.velocity), gl.STATIC_DRAW);
        gl.vertexAttribPointer(WebGLMacros.AMC_ATTRIBUTE_VELOCITY,3,gl.FLOAT,false,0, 0);
        gl.enableVertexAttribArray(WebGLMacros.AMC_ATTRIBUTE_VELOCITY);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        
        let particleStartTimeVBO = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, particleStartTimeVBO);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.startTime), gl.STATIC_DRAW);
        gl.vertexAttribPointer(WebGLMacros.AMC_ATTRIBUTE_START_TIME, 1, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(WebGLMacros.AMC_ATTRIBUTE_START_TIME);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindVertexArray(null);

        this.initCount++;
    }

    Init() {

        Util.loadTexture(`${BASE_PATH}/AstromedicompMap.png`).then((res) => {
            var textData = Util.readImageData(res.image);
            this.CreatePoints(textData);
        });

        let vertexShaderSourceCode =
            `#version 300 es
            in vec4 vPosition;
            in vec3 Velocity;
            in float Startime;
            
            uniform float time;            
            uniform mat4 u_m_matrix; 
            uniform mat4 u_v_matrix; 
            uniform mat4 u_p_matrix; 
            
            void main(void)
            {
                vec4 vert = vPosition;
                float t = time - Startime ;
                if(t > 0.0)
                {
                    vert += vec4(Velocity * t,0.0);
                    vert.x += 4.9 * t;
                    vert.y -= 4.9 * t *t;
                }
                gl_Position = u_p_matrix * u_v_matrix * u_m_matrix * vert ;
                gl_PointSize = 1.0;
            }`;
	
        let vertexShaderObject = Util.generateShader(gl.VERTEX_SHADER, vertexShaderSourceCode);
        
        let fragmentShaderSourceCode =
            `#version 300 es
            precision highp float;

            out vec4 FragColor;
            void main(void)
            {
                FragColor = vec4(1.0);
            }`;
        
        let fragmentShaderObject = Util.generateShader(gl.FRAGMENT_SHADER, fragmentShaderSourceCode);
        
        this.shaderProgramObject = gl.createProgram();
        gl.attachShader(this.shaderProgramObject,vertexShaderObject);
        gl.attachShader(this.shaderProgramObject,fragmentShaderObject);
        
        gl.bindAttribLocation(this.shaderProgramObject, WebGLMacros.AMC_ATTRIBUTE_POSITION, "vPosition");
        gl.bindAttribLocation(this.shaderProgramObject, WebGLMacros.AMC_ATTRIBUTE_VELOCITY, "Velocity");
        gl.bindAttribLocation(this.shaderProgramObject, WebGLMacros.AMC_ATTRIBUTE_START_TIME, "Startime");
        
        gl.linkProgram(this.shaderProgramObject);
        if(!gl.getProgramParameter(this.shaderProgramObject,gl.LINK_STATUS))
        {
            let error=gl.getProgramInfoLog(this.shaderProgramObject);
            if(error.length > 0)
            {
                alert(error);
                uninitialize();
            }
        }
        
        this.modelUniform = gl.getUniformLocation(this.shaderProgramObject, "u_m_matrix");
        this.viewUniform = gl.getUniformLocation(this.shaderProgramObject, "u_v_matrix");
        this.projUniform = gl.getUniformLocation(this.shaderProgramObject, "u_p_matrix");
        this.TimeUniform = gl.getUniformLocation(this.shaderProgramObject, "time");
    }

    Render()
    {
        if(this.initCount < 1) {
            return;
        }

        gl.useProgram(this.shaderProgramObject);
        
        let modelMatrix = mat4.create();
        
        mat4.translate(modelMatrix,modelMatrix,[0.0,0.0,-24.0]);
        
        gl.uniformMatrix4fv(this.modelUniform, false, modelMatrix);
        gl.uniformMatrix4fv(this.viewUniform, false, mat4.create());
        gl.uniformMatrix4fv(this.projUniform, false, camera.getProjectionMatrix());
        
	if(scene5Delay>1088)
	{
        if (this.ParticlesAnimation >= 0.0)
        {
            this.ParticlesAnimation += 0.0009;
        }
	}
	scene5Delay+=1;
	

        gl.uniform1f(this.TimeUniform, this.ParticlesAnimation);
        
        gl.bindVertexArray(this.vaoParticle);
        gl.drawArrays(gl.POINTS, 0, this._m_drawCount);
        gl.bindVertexArray(null);
        gl.useProgram(null);
    }
}
