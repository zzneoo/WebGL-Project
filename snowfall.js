class Snowfall {

    _m_shaderProgramObject = null;

    // uniforms
    _m_u_projectionMatrix = null;
    _m_u_modelViewMatrix = null;
    _m_u_sampler = null;

    // texture
    _m_spriteTexture = null;

    _m_textureCount = 0;
    _m_particles = [];
    _m_particleArray = [];
    _m_particleBuffer = null;
    _m_particleLifespan = 3.0;
    _m_particleCount = 4096 * 2;
    _m_lastFrameTime = 0.0;
    particlesUpdated = false;

    Init() {
        this._m_lastFrameTime = Date.now();

        //vertex shader
        
        let vertexShaderSourceCode =
            `#version 300 es
            
            in vec4 aParticle;
            
            uniform mat4 uMVMatrix;
            uniform mat4 uPMatrix;
            
            out float vLifespan;
            
            void main(void) {
                gl_Position = uPMatrix * uMVMatrix * vec4(aParticle.xyz, 1.0);
                vLifespan = (aParticle.w);
                gl_PointSize = (float(${gCONFIG_FRUSTUM_FAR}) - float(${gCONFIG_FRUSTUM_NEAR})) / gl_Position.w * 0.79;
            }`;
        
        let vertexShaderObject = Util.generateShader(gl.VERTEX_SHADER, vertexShaderSourceCode);

        //fragment shader
        let fragmentShaderSourceCode =
            `#version 300 es

            precision mediump float;
            uniform sampler2D uSampler;
            
            in float vLifespan;
            out vec4 FragColor;
            
            void main(void) {
                vec4 texColor = texture(uSampler, gl_PointCoord); 
                if (texColor.r < 0.5) discard;
                FragColor = vec4(texColor.rgb+0.2, pow(vLifespan,0.4));
            }`;
        
        let fragmentShaderObject = Util.generateShader(gl.FRAGMENT_SHADER, fragmentShaderSourceCode);

        //create program
        this._m_shaderProgramObject = gl.createProgram();
        gl.attachShader(this._m_shaderProgramObject, vertexShaderObject);
        gl.attachShader(this._m_shaderProgramObject, fragmentShaderObject);

        //Bind attrib location
        gl.bindAttribLocation(this._m_shaderProgramObject, WebGLMacros.AMC_ATTRIBUTE_POSITION, "aParticle");

        //Program linking
        gl.linkProgram(this._m_shaderProgramObject);
        if (!gl.getProgramParameter(this._m_shaderProgramObject, gl.LINK_STATUS)) {
            var error = gl.getProgramInfoLog(this._m_shaderProgramObject);
            if (error.length > 0) {
                alert(error);
                uninitialize();
            }
        }

        //Texture code
        Util.loadTexture(`${BASE_PATH}/snowFlake.png`).then(res => {
            this._m_spriteTexture = res;
            this._m_textureCount++;
        })
        
        
        this._m_u_projectionMatrix = gl.getUniformLocation(this._m_shaderProgramObject, "uPMatrix");
        this._m_u_modelViewMatrix = gl.getUniformLocation(this._m_shaderProgramObject, "uMVMatrix");
        this._m_u_sampler = gl.getUniformLocation(this._m_shaderProgramObject, "uSampler");

        this.configureParticles(this._m_particleCount,0.0);//(1024);
    }

    resetParticle(p,windIntensity) {
        p.pos = [(Math.random() * 2.0 - 1.0) * 256.0, Math.random() * 256.0, (Math.random() * 2.0 - 1.0) * 256.0];

		var wind1=vec3.fromValues(3.0,0.0,3.0);
		var wind2=vec3.fromValues(70.0,-1.0,3.0);
		
		var finalWind=vec3.create();
		vec3.lerp(finalWind,wind1,wind2,windIntensity);
		
        p.vel = [
            Math.random() * finalWind[0], 
            finalWind[1], 
            Math.random() * finalWind[2]
        ];

        p.lifespan = (Math.random() * this._m_particleLifespan);
        p.remainingLife = p.lifespan;
    }

    configureParticles(count,windIntensity) {
        var i, p;

        this._m_particleArray = new Float32Array(count * 4);

        for (i = 0; i < count; ++i)
        {
            p = {};
            this.resetParticle(p,windIntensity);
            this._m_particles.push(p);

            this._m_particleArray[(i * 4) + 0] = p.pos[0];
            this._m_particleArray[(i * 4) + 1] = p.pos[1];
            this._m_particleArray[(i * 4) + 2] = p.pos[2];
            this._m_particleArray[(i * 4) + 3] = p.remainingLife / p.lifespan;
        }

        this._m_particleBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this._m_particleBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this._m_particleArray, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }

    updateParticles(elapsed,windIntensity) {
        let i, p, count = this._m_particles.length;

        // Loop through all the particles in the array
        for (i = 0; i < count; ++i) {
            p = this._m_particles[i];

            // Track the particles lifespan
            p.remainingLife -= elapsed;
            if (p.remainingLife <= 0) {
                this.resetParticle(p,windIntensity); // Once the particle expires, reset it to the origin with a new velocity
            }

            // Update the particle position
            p.pos[0] += p.vel[0] * elapsed;
            p.pos[1] += p.vel[1] * elapsed;
            p.pos[2] += p.vel[2] * elapsed;

            // Apply gravity to the velocity
            p.vel[1] -= 9.8 * elapsed;
            if (p.pos[1] < 0) {
            // p.vel[1] *= -0.75; // Allow particles to bounce off the floor
                p.pos[1] = 0;
            }

            // Update the corresponding values in the array
            this._m_particleArray[(i * 4) + 0] = p.pos[0];
            this._m_particleArray[(i * 4) + 1] = p.pos[1];
            this._m_particleArray[(i * 4) + 2] = p.pos[2];
            this._m_particleArray[(i * 4) + 3] = p.remainingLife / p.lifespan;
        }

        // Once we are done looping through all the particles, update the buffer once
        gl.bindBuffer(gl.ARRAY_BUFFER, this._m_particleBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this._m_particleArray, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }

    Render(windIntensity) {

        if(this._m_textureCount < 1) 
            return;

        gl.useProgram(this._m_shaderProgramObject);

        gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    
        let modelMatrix = mat4.create();
        mat4.translate(modelMatrix, modelMatrix, [0.0, 10.0, 0.0]);
        mat4.multiply(modelMatrix, modelMatrix, camera.getViewMatrixMat4());

        gl.uniformMatrix4fv(this._m_u_modelViewMatrix, false, modelMatrix);
        gl.uniformMatrix4fv(this._m_u_projectionMatrix, false, camera.getProjectionMatrix());

        gl.bindBuffer(gl.ARRAY_BUFFER, this._m_particleBuffer);
        gl.vertexAttribPointer(WebGLMacros.AMC_ATTRIBUTE_POSITION, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(WebGLMacros.AMC_ATTRIBUTE_POSITION);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this._m_spriteTexture);
        gl.uniform1i(this._m_u_sampler, 0);

        gl.drawArrays(gl.POINTS, 0, this._m_particles.length);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);

        //*******************************************************
        let time = Date.now();

        // Update the particle positions
        // if(this.particlesUpdated == false) {
            this.updateParticles((time - this._m_lastFrameTime) / 1000.0,windIntensity);
            // this.particlesUpdated = true;
        // }

        this._m_lastFrameTime = time;

        gl.disable(gl.BLEND);
        gl.useProgram(null);
    }
}