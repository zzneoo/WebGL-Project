class ShadowMapping
{
    m_webgl2_context = null; //stored when constructor called

    m_u_m_matrixLoc  = null;
    m_u_v_matrixLoc  = null;
    m_u_p_matrixLoc  = null;

    m_shaderProgramObject = null;
    m_vertexShaderObject = null;
    m_fragmentShaderObject = null;
    
    m_Debug_vao = null;
    m_debug_ProjectionMat = null;

    m_u_debugModeOn = null;
    m_u_texturToRender = null;

    m_fb = null;

    m_lightProjectionMat = null;
    m_lightViewMat = null;

    getLightViewMatrix()
    {
        return this.m_lightViewMat;
    }

    getLightProjectionMatrix()
    {
        return this.m_lightProjectionMat;
    }

    /**
     * 
     * @param {*} vao : which has WebGLMacros.AMC_ATTRIBUTE_POSITION for vPosition
     * @param {*} model_mat : model matrix
     * @param {*} view_mat : view matrix
     * @param {*} p_matrix : projection matrix
     * @param {*} drawType : DrawType.DRAW_ARRAYS, or DrawType.DRAW_INDICES : util.js
     * @param {*} vbo_indices : indices VBO if drawType is DrawType.DRAW_INDICES, else null
     */
    /*
    No longer used - creation of generic shadow mapping shader which handles all situations - drawarray, drawyelementinsctanced, etc. was too much work
    May have to bring back in future to improve performance - a simple shader which just projects gl_Position would be much faster for shadow mapping
    startDepthRecording(vao, model_mat, view_mat, p_matrix, drawType, vbo_indices)
    {
        if(gCONFIG_SHADOW_ENABLE_SHADOW == false)
        {
            console.log("shadow mapping disabled");
            return;
        }

        let gl = this.m_webgl2_context;
        
        this.m_fb.startRecordingInFrameBuffer();
        gl.useProgram(this.m_shaderProgramObject);
        
        gl.uniformMatrix4fv(this.m_u_m_matrixLoc, false, model_mat);
        gl.uniformMatrix4fv(this.m_u_v_matrixLoc, false, view_mat);
        gl.uniformMatrix4fv(this.m_u_p_matrixLoc, false, p_matrix);
        
        gl.uniform1i(this.m_u_debugModeOn, 0);

        gl.bindVertexArray(vao);

        if(drawType == DrawType.DRAW_INDICES)
        {
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vbo_indices);
            gl.drawElements(gl.TRIANGLES, NUMBEROFINDICES, gl.UNSIGNED_INT, 0);
            gl.bindVertexArray(null);
            gl.useProgram(null);
        }
        else
        {
            alert("drawType not implemented");
        }
        
        this.m_fb.stopRecordingInFrameBuffer();
    }
    */

    debugShowDepthTexture()
    {
        let gl = this.m_webgl2_context;

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	    gl.clearColor(0,0,1.0, 1.0);
        //gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        gl.useProgram(this.m_shaderProgramObject);
        
        let model_mat = mat4.create();
        let view_mat = mat4.create();
        mat4.translate(model_mat, model_mat, vec3.fromValues(0,0,-6));
        gl.uniformMatrix4fv(this.m_u_m_matrixLoc, false, model_mat);
        gl.uniformMatrix4fv(this.m_u_v_matrixLoc, false, view_mat);
        gl.uniformMatrix4fv(this.m_u_p_matrixLoc, false, this.m_debug_ProjectionMat);
        
        gl.uniform1i(this.m_u_debugModeOn, 1);
        
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.m_fb.getDepthTexture());
        gl.uniform1i(this.m_u_texturToRender, 0);

        gl.bindVertexArray(this.m_Debug_vao);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        gl.useProgram(null);
        
    }

    debugShowColorTexture()
    {
        let gl = this.m_webgl2_context;

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	    gl.clearColor(0,0,1.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.useProgram(this.m_shaderProgramObject);
        
        let model_mat = mat4.create();
        let view_mat = mat4.create();
        mat4.translate(model_mat, model_mat, vec3.fromValues(0,0,-6));
        gl.uniformMatrix4fv(this.m_u_m_matrixLoc, false, model_mat);
        gl.uniformMatrix4fv(this.m_u_v_matrixLoc, false, view_mat);
        gl.uniformMatrix4fv(this.m_u_p_matrixLoc, false, this.m_debug_ProjectionMat);
        
        gl.uniform1i(this.m_u_debugModeOn, 1);
        
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.m_fb.getColorTexture());
        gl.uniform1i(this.m_u_texturToRender, 0);

        gl.bindVertexArray(this.m_Debug_vao);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        gl.useProgram(null);
        
    }

    setFramebuffer(fb)
    {//if we do not want to use the one we created in constructor
        if(this.m_fb == null)
        {
            gl.deleteFramebuffer(this.m_fb);
            this.m_fb = null;
        }
        Object.assign(this.m_fb,fb);
    }

/*
No longer used - creation of generic shadow mapping shader which handles all situations - drawarray, drawyelementinsctanced, etc. was too much work
May have to bring back in future to improve performance - a simple shader which just projects gl_Position would be much faster for shadow mapping
    stopDepthRecording()
    {
        if(gCONFIG_SHADOW_ENABLE_SHADOW == false)
        {
            console.log("shadow mapping disabled");
            return;
        }

        let gl = this.m_webgl2_context;

        gl.bindVertexArray(null);
        gl.useProgram(null);
    }
*/

    getColorTexture()
    {
        return this.m_fb.getColorTexture();
    }

    getDepthTexture()
    {
        return this.m_fb.getDepthTexture();
    }
        /// @brief gl : rendering context. for eg. from gl = gcanvas.getContext("webgl2");
    constructor(gl)
    {
        if(gCONFIG_SHADOW_ENABLE_SHADOW == false)
        {
            console.log("shadow mapping disabled");
            return;
        }

        if(gl==null)
        {
            console.error("webgl context not passed");
            return;
        }
        
        this.m_webgl2_context = gl;

        //vertex shader
        var vertexShaderSourceCode = 
            `#version 300 es
        
            in vec4 vPosition;
            in vec2 vTexCoord;

            out vec2 out_vTexCoord;
        
            uniform mat4 u_m_matrix;
            uniform mat4 u_v_matrix;
            uniform mat4 u_p_matrix;
        
            void main()
            {
                gl_Position = u_p_matrix * u_v_matrix * u_m_matrix * vPosition;
                out_vTexCoord = vTexCoord;
            }
            `;
    
        this.m_vertexShaderObject = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(this.m_vertexShaderObject, vertexShaderSourceCode);
        gl.compileShader(this.m_vertexShaderObject);
        
        if(gl.getShaderParameter(this.m_vertexShaderObject, gl.COMPILE_STATUS) == false)
        {
            var error = gl.getShaderInfoLog(this.m_vertexShaderObject);
            if(error.length > 0)
            {
                console.error("shadow mapping : vertex shader compilation failed.");
                console.error(error);
                return;
            }
        }

        var fragmentShaderSourceCode = 
            `#version 300 es

            precision highp float;

            in vec2 out_vTexCoord;
            out vec4 FragColor;

            uniform sampler2D texturToRender;
            uniform int u_debugModeOn;

            void main()
            {//can add transparency fragment discard in furture - see mention of this in thin matrix shadow mapping video
                if(u_debugModeOn == 1)
                {
                    FragColor = texture(texturToRender, out_vTexCoord);   
                }
                //FragColor.rg = out_vTexCoord.xy;
                FragColor.a = 1.0;
            }
	        `;

	    this.m_fragmentShaderObject = gl.createShader(gl.FRAGMENT_SHADER);
	    gl.shaderSource(this.m_fragmentShaderObject, fragmentShaderSourceCode);
	    gl.compileShader(this.m_fragmentShaderObject);
    
	    if(gl.getShaderParameter(this.m_fragmentShaderObject, gl.COMPILE_STATUS) == false)
	    {
	    	var error = gl.getShaderInfoLog(this.m_fragmentShaderObject);
	    	if(error.length > 0)
	    	{
	    		console.error("shadow mapping: fragment shader compilation failed.");
	    		console.error(error);
	    		uninitialize();
	    	}
	    }

	    //shader program
	    this.m_shaderProgramObject = gl.createProgram();
	    gl.attachShader(this.m_shaderProgramObject, this.m_vertexShaderObject);
        gl.attachShader(this.m_shaderProgramObject, this.m_fragmentShaderObject);
        
        gl.bindAttribLocation(this.m_shaderProgramObject, WebGLMacros.AMC_ATTRIBUTE_POSITION, "vPosition");
        gl.bindAttribLocation(this.m_shaderProgramObject, WebGLMacros.AMC_ATTRIBUTE_TEXTURE0, "vTexCoord");

        //link program
	    gl.linkProgram(this.m_shaderProgramObject);
	    if(!gl.getProgramParameter(this.m_shaderProgramObject, gl.LINK_STATUS))
	    {
	    	var error = gl.getProgramInfoLog(this.m_shaderProgramObject);
	    	if(error.length > 0)
	    	{
	    		console.error("shadow mapping : shader program link failed")
	    		console.error(error);
	    		uninitialize();
	    	}
        }

        this.m_u_m_matrixLoc  =  gl.getUniformLocation(this.m_shaderProgramObject, "u_m_matrix");
        this.m_u_v_matrixLoc  =  gl.getUniformLocation(this.m_shaderProgramObject, "u_v_matrix");
        this.m_u_p_matrixLoc  =  gl.getUniformLocation(this.m_shaderProgramObject, "u_p_matrix");
        this.m_u_debugModeOn  =  gl.getUniformLocation(this.m_shaderProgramObject, "u_debugModeOn");
        this.m_u_texturToRender  =  gl.getUniformLocation(this.m_shaderProgramObject, "texturToRender");

        gl.enable(gl.DEPTH_TEST);
        gl.clearDepth(1.0);

        this.m_fb = new frameBuffer(gl, gl.viewportWidth, gl.viewportHeight);

        let quadVertices = new Float32Array([
            1, 1,0,
           -1, 1,0,
           -1,-1,0,
           -1,-1,0,
            1,-1,0,
            1, 1,0,
        ]);
   
        let quadTexCords = new Float32Array([
        1,1,
        0,1,
        0,0,
        0,0,
        1,0,
        1,1
        ]);
        
        this.m_Debug_vao = gl.createVertexArray();
        gl.bindVertexArray(this.m_Debug_vao);
        let vboQuad = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vboQuad);
        gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);
        gl.vertexAttribPointer(WebGLMacros.AMC_ATTRIBUTE_POSITION, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(WebGLMacros.AMC_ATTRIBUTE_POSITION);
       
        let vboQuadtex = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vboQuadtex);
        gl.bufferData(gl.ARRAY_BUFFER, quadTexCords, gl.STATIC_DRAW);
        gl.vertexAttribPointer(WebGLMacros.AMC_ATTRIBUTE_TEXTURE0, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(WebGLMacros.AMC_ATTRIBUTE_TEXTURE0);
       
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindVertexArray(null);

        this.m_debug_ProjectionMat = mat4.create();
        //mat4.ortho(this.m_debug_ProjectionMat, -10, 10, -10, 10, 1, 100);
        //mat4.ortho(this.m_debug_ProjectionMat, -10, 10, -10, 10, 1, 100);
        mat4.perspective(this.m_debug_ProjectionMat, (Math.PI / 4.0), parseFloat(gl.viewportWidth) / parseFloat(gl.viewportHeight), 0.1, 1000);

        this.m_lightProjectionMat = mat4.create();
        this.m_lightViewMat = mat4.create();

    }//constructor end

		
        //modifies view and projection of camera so that it looks at the world from the position of light
    setCameraToLight()
    {
            let gl = this.m_webgl2_context;

            //let lightPos = [50, 0.0, 0, 1.0];
            let lightPos = [0.0, 0.0, 0.0, 1.0];
            //let camPos = [3, 15.0, -10.0, 1.0];
			lightPos[0]=100.0;
			lightPos[1]=40.0;
			lightPos[2]=Math.sin((Math.PI/180.0)*angle)*100.0;
			
			if(fpsCounter>4520)
			{
				angle-=0.075;
			}
			
			if(angle<90.0)
				angle=90.0;

            var modelMatrix = mat4.create();
	        var viewMatrix = mat4.create();
	        var identityMatrix  = mat4.create();
            var projectionMatrix = mat4.create();

            let lkAT1 = vec3.fromValues(0,0,0);
            let lkAT2 = vec3.fromValues(0,0,0);

            //let camView = mat4.create();
            //mat4.lookAt(camView, vec3.fromValues(camPos[0], camPos[1], camPos[2]), lkAT2, vec3.fromValues(0,0,1));

            let lightPos2 = lightPos.slice();

            mat4.identity(this.m_lightProjectionMat);
            mat4.identity(this.m_lightViewMat);

            if(0.0 == lightPos[3])
            {//simulate directional light
                let scale = 1000;
                lightPos2[0] *= scale;
                lightPos2[1] *= scale;
                lightPos2[2] *= scale;
                lightPos2[3] = 1.0;
            }

            mat4.lookAt(this.m_lightViewMat, vec3.fromValues(lightPos2[0], lightPos2[1], lightPos2[2]), lkAT1, vec3.fromValues(0,1,0));

            let aspectRatio = gl.viewportWidth/gl.viewportHeight;

            let nt =  gCONFIG_FRUSTUM_NEAR * Math.tan(gCONFIG_PERSPECTIVE_FOVY*0.5*(Math.PI/180.0));
            let nb = -nt;
            let nr = nt*aspectRatio;
            let nl = -nr;

            let ft =  gCONFIG_SHADOW_DISTANCE * Math.tan(gCONFIG_PERSPECTIVE_FOVY*0.5*(Math.PI/180.0));
            let fb = -ft;
            let fr =  ft*aspectRatio;
            let fl = -fr;

            //cc - camera coordinates
            let ntrcc = vec4.fromValues(nt,nr,gCONFIG_FRUSTUM_NEAR, 1.0);
            let ntlcc = vec4.fromValues(nt,nl,gCONFIG_FRUSTUM_NEAR, 1.0);
            let nbrcc = vec4.fromValues(nb,nr,gCONFIG_FRUSTUM_NEAR, 1.0);
            let nblcc = vec4.fromValues(nb,nr,gCONFIG_FRUSTUM_NEAR, 1.0);

            let ftrcc = vec4.fromValues(ft,fr,gCONFIG_SHADOW_DISTANCE,1.0);
            let ftlcc = vec4.fromValues(ft,fl,gCONFIG_SHADOW_DISTANCE,1.0);
            let fbrcc = vec4.fromValues(fb,fr,gCONFIG_SHADOW_DISTANCE,1.0);
            let fblcc = vec4.fromValues(fb,fr,gCONFIG_SHADOW_DISTANCE,1.0);

            let camViewInv = mat4.create();
            let camView = camera.getViewMatrixMat4();
            mat4.invert(camViewInv, camView);

            //wc - world coordinate
            let ntrwc = vec4.create();
            let ntlwc = vec4.create();
            let nbrwc = vec4.create();
            let nblwc = vec4.create();

            let ftrwc = vec4.create();
            let ftlwc = vec4.create();
            let fbrwc = vec4.create();
            let fblwc = vec4.create();

            vec4.transformMat4(ntrwc, ntrcc, camViewInv);
            vec4.transformMat4(ntlwc, ntlcc, camViewInv);
            vec4.transformMat4(nbrwc, nbrcc, camViewInv);
            vec4.transformMat4(nblwc, nblcc, camViewInv);

            vec4.transformMat4(ftrwc, ftrcc, camViewInv);
            vec4.transformMat4(ftlwc, ftlcc, camViewInv);
            vec4.transformMat4(fbrwc, fbrcc, camViewInv);
            vec4.transformMat4(fblwc, fblcc, camViewInv);
            
            //now convert them into lc - light coordinates - treating light as camera

            let ntrlc = vec4.create();
            let ntllc = vec4.create();
            let nbrlc = vec4.create();
            let nbllc = vec4.create();

            let ftrlc = vec4.create();
            let ftllc = vec4.create();
            let fbrlc = vec4.create();
            let fbllc = vec4.create();

            vec4.transformMat4(ntrlc, ntrwc, this.m_lightViewMat);
            vec4.transformMat4(ntllc, ntlwc, this.m_lightViewMat);
            vec4.transformMat4(nbrlc, nbrwc, this.m_lightViewMat);
            vec4.transformMat4(nbllc, nblwc, this.m_lightViewMat);

            vec4.transformMat4(ftrlc, ftrwc, this.m_lightViewMat);
            vec4.transformMat4(ftllc, ftlwc, this.m_lightViewMat);
            vec4.transformMat4(fbrlc, fbrwc, this.m_lightViewMat);
            vec4.transformMat4(fbllc, fblwc, this.m_lightViewMat);


            vec4.scale(ntrlc,ntrlc,1.0/ntrlc[3]);
            vec4.scale(ntllc,ntllc,1.0/ntllc[3]);
            vec4.scale(nbrlc,nbrlc,1.0/nbrlc[3]);
            vec4.scale(nbllc,nbllc,1.0/nbllc[3]);

            vec4.scale(ftrlc,ftrlc,1.0/ftrlc[3]);
            vec4.scale(ftllc,ftllc,1.0/ftllc[3]);
            vec4.scale(fbrlc,fbrlc,1.0/fbrlc[3]);
            vec4.scale(fbllc,fbllc,1.0/fbllc[3]);

            let points = [ntrlc, ntllc, nbrlc, nbllc, ftrlc, ftllc, fbrlc, fbllc];

            let minx, maxx, miny, maxy, minz, maxz;
            minx = maxx = ntrlc[0];
            miny = maxy = ntrlc[1];
            minz = maxz = ntrlc[2];

            points.forEach(
            function(item, index)
            {
                if(minx > item[0])
                {
                    minx = item[0];
                }

                if(maxx < item[0])
                {
                    maxx = item[0];
                }

                if(miny > item[1])
                {
                    miny = item[1];
                }

                if(maxy < item[1])
                {
                    maxy = item[1];
                }

                if(minz > item[2])
                {
                    minz = item[2];
                }

                if(maxz < item[2])
                {
                    maxz = item[2];
                }

            });

            let cx = maxx - minx;
            let cy = maxy - miny;
            let cz = maxz - minz;

            let xm = (minx + maxx)/2.0;
            let ym = (miny + maxy)/2.0;
            let zm = (minz + maxz)/2.0;

            let shadowBoxCentre = vec4.fromValues(xm, ym, zm, 1.0);
            let shadowBoxCentreWC = vec4.create();

            let lightViewMatInv = mat4.create();
            mat4.invert(lightViewMatInv, this.m_lightViewMat);
            vec4.transformMat4(shadowBoxCentreWC, shadowBoxCentre, lightViewMatInv);

            let lightDir = vec4.create();
            vec4.normalize(lightDir, lightPos2);
            let lightDist = 10;
            let lightCamPos = vec4.create();
			vec4.scaleAndAdd(lightCamPos, vec4.create(), lightDir, lightDist);
            //vec4.scaleAndAdd(lightCamPos, shadowBoxCentreWC, lightDir, lightDist);
            

            //debugger;
            vec4.scale(lightCamPos, lightCamPos, 1.0/lightCamPos[3]);
            //lightCamPos = camera.getCameraPosition2();
            mat4.lookAt(this.m_lightViewMat, vec3.fromValues(lightCamPos[0], lightCamPos[1], lightCamPos[2]), lkAT1, vec3.fromValues(0,1,0));

            let scale = 12;
            mat4.ortho(this.m_lightProjectionMat, -15*scale, 15*scale, -1.0*scale, 9.5*scale, gCONFIG_FRUSTUM_NEAR, 1000);

            camera.pushMatrix();
            //debugger;
            camera.setViewMatrix(this.m_lightViewMat);
            //camera.setViewMatrix(camera.getViewMatrixMat4());
            camera.setProjectionMatrix(this.m_lightProjectionMat);
    } //setCameraToLight end

    cleanup()
    {
        camera.popMatrix();
    }
    
}