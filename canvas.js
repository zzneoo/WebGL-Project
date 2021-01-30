// global variables
var canvas = null;
var audio = null;
var gl = null;	// webgl context
var bFullscreen = false;
var bEditMode = false;
var canvas_original_width;
var canvas_original_height;
var currentDirection = "d";
//quad
var mvpUniform = null;
var u_fb_sampler = null;
var blendBlackUniform = null;

var fbClientX, fbClientY;
var onClickForPixels = false;
var pixels;
var worldSpaceCoords = vec4.fromValues(5.0, 0.0, -5.0, 1.0);
var angle = 270.0;
var fpsCounter = 0;
var bFpsPrint=false;
var bAudioPlaying=false;

//scenefbo
var fboScene = null;
var fboSceneTexture = null;
var fboDepthTexture = null;
//sceneMSAAfbo
var MSAAfboScene = null;
var MSAAfboSceneRenderBuffer = null;
var MSAAfboDepthRenderBuffer = null;

//scene1
var scene1QuadBlackBlendIn=1.0;
var scene1QuadBlackBlendOut=0.0;
var shaderGroupTexture = null;
var scene1Pitch= 90.0;
var windIntensity= 0.0;
var scene1BlackBlend = 0.0;
var treeNoiseFactorScene1 = 0.0;

//scene2
var scene2BlackBlendIn = 1.0;
var scene2BlackBlendOut = 0.0;
var cameraOffsetJugadMove = 0.0;

//scene3
var factorFirstLerp=0.0;
var factorSecondLerp =0.0;
var factorThirdLerp =0.0;
var finalPitchYawFactor =0.0;
var scene3BlackBlendIn = 1.0;
var scene3BlackBlendOut = 0.0;
var treeNoiseFactorScene3 = 0.0;

//scene4
var quoteTexture = null;
var scene4BlackBlendIn = 1.0;
var scene4BlackBlendOut = 0.0;

//scene5
var scene5BlackBlendIn = 1.0;
var scene5BlackBlendOut = 0.0;
var scene5Delay =0;
// shader related variables

var scene1Done = false;
var scene2Done = false;
var scene3Done = false;
var scene4Done = false;

var startDemo = false;

const WebGLMacros = {
	AMC_ATTRIBUTE_POSITION: 0,
	AMC_ATTRIBUTE_COLOR: 1,
	AMC_ATTRIBUTE_NORMAL: 2,
	AMC_ATTRIBUTE_TEXTURE0: 3,
	AMC_ATTRIBUTE_TEXTURE1: 4,
	AMC_ATTRIBUTE_VELOCITY: 5,
	AMC_ATTRIBUTE_START_TIME: 6
};

var shaderProgramObject = null;

// To start animation: To have requestAnimationFrame() to be called "cross-browser" compatible
var requestAnimationFrame = 
	window.requestAnimationFrame ||
	window.mozRequestAnimationFrame ||
	window.webkitRequestAnimationFrame ||
	window.oRequestAnimationFrame ||
	window.msRequestAnimationFrame ||
	null;

// To stop animation: To have cancelAnimationFrame() to be called "cross-browser" compatible
var cancelAnimationFrame = 
	window.cancelAnimationFrame 		 ||
	window.mozCancelRequestAnimationFrame 	 || window.mozCancelAnimationFrame 	||
	window.webkitCancelRequestAnimationFrame || window.webkitCancelAnimationFrame 	||
	window.oCancelRequestAnimationFrame 	 || window.oCancelAnimationFrame 	||
	window.msCancelRequestAnimationFrame	 || window.msCancelAnimationFrame	||
	null;

var requestPointerLock;
var exitPointerLock = document.exitPointerLock || document.mozExitPointerLock;

var camera = new Camera();
var cubemap = new Cubemap();
var terrain = new Terrain();
var grass = new Grass();
var tree = new Tree();
var model = new Model();
var penguinModel = new PenguinModel();
var iglooModel = new IglooModel();
var blackBoard = new BlackBoard();
var spruceTree = new SpruceTreesModel();
var particle = new Particle();
var snowfall = new Snowfall();
var shadowMapping  = null;
var frameBufferRecorder  = null;

// onload function
function main() {
	// get <canvas> element
	canvas = document.getElementById("AMC");
	audio = document.getElementById("myAudio");
	if(!canvas) {
		// console.log("Obtaining canvas failed\n");
	}
	else {
		// console.log("Obtaining canvas Succeeded\n");
	}

	requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock;

	canvas_original_width = canvas.width;
	canvas_original_height = canvas.height;

	// register event handlers
	canvas.onclick = function(event) {
		onClickForPixels = true;
		console.log(`clientX : ${event.clientX}, clientY: ${event.clientY}`);
		fbClientX = event.clientX;
		fbClientY = 1080 - event.clientY;
		// canvas.requestPointerLock();
		// draw();
		 audio.play();
		startDemo = true;
	}
	window.addEventListener("keydown", keydown, false);
	window.addEventListener("keyup", keyup, false);
	window.addEventListener("resize", resize, false);

	// Hook pointer lock state change events for different browsers
	document.addEventListener('pointerlockchange', lockChangeAlert, false);
	document.addEventListener('mozpointerlockchange', lockChangeAlert, false);
	document.addEventListener('mouseDown', mouseDown, false);

	// initialize WebGL
	init();

	// simulate keydown event for key 'f'

	// var keyPressedFEvent = new Event('keydown', { keyCode: 70 });
	// canvas.dispatchEvent(keyPressedFEvent);

	// start drawing here as warming-up
	resize();

	draw();
	
		
}

function toggleFullScreen() {
	// code
	var fullscreen_element = 
		document.fullscreenElement ||
		document.mozFullScreenElement ||
		document.webkitFullscreenElement ||
		document.msFullscreenElement ||
		null;

	// if not fullscreen
	if(fullscreen_element == null) {
		if(canvas.requestFullscreen)
			canvas.requestFullscreen();
		else if(canvas.mozRequestFullScreen)
			canvas.mozRequestFullScreen();
		else if(canvas.webkitRequestFullscreen)
			canvas.webkitRequestFullscreen();
		else if(canvas.msRequestFullscreen)
			canvas.msRequestFullscreen();
		bFullscreen = true;
	}
	else {	// if already fullscreen
		if(document.exitFullscreen)
			document.exitFullscreen();
		else if(document.mozCancelFullScreen)
			document.mozCancelFullScreen();
		else if(document.webkitExitFullscreen)
			document.webkitExitFullscreen();
		else if(document.msExitFullscreen)
			document.msExitFullscreen();
		bFullscreen = false;
	}
}

function init() {
	// code
	// get WebGL 2.0 context
	gl = canvas.getContext("webgl2");

	if(gl == null) {
		// console.log("Failed to get the rendring context for WebGL");
		return;
	}

	gl.viewportWidth = canvas.width;
	gl.viewportHeight = canvas.height;

	let perspectiveProjectionMatrix = mat4.create();
	camera.setProjectionMatrix(perspectiveProjectionMatrix);

	// set clear color
	//   gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.clearColor(0.84,0.9,1.0, 1.0);

	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL);

	gl.enable(gl.CULL_FACE);

	//cubemap.Init();
	//grass.Init();
	//model.Init(`${BASE_PATH}/models/rock/rock.obj`);
	
	     Util.loadTexture(`${BASE_PATH}/DrVijayGokhale.png`).then(res =>
		{
             quoteTexture= res;
        })

		Util.loadTexture(`${BASE_PATH}/ShaderGroupPresents.png`).then(res =>
		{
             shaderGroupTexture= res;
        })
	
	terrain.Init();
	penguinModel.Init(`${BASE_PATH}/models/penguin/peng1.obj`);
	iglooModel.Init(`${BASE_PATH}/models/igloo/igloo2.obj`);
	blackBoard.Init(`${BASE_PATH}/models/blackBoard/blackBoard.obj`);
	spruceTree.Init(`${BASE_PATH}/models/spruceTree/spruceTreeobj.obj`);
	particle.Init();
	snowfall.Init();

//FBO
	fboScene = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, fboScene);

	fboSceneTexture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, fboSceneTexture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fboSceneTexture, 0);
	
	fboDepthTexture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, fboDepthTexture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT16, canvas.width, canvas.height, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, fboDepthTexture, 0);
	
	if(gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE){
		console.error("failed to get framebuffer");
		return;
	}
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	
//MSAAFBO

	MSAAfboScene = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, MSAAfboScene);

	MSAAfboSceneRenderBuffer = gl.createRenderbuffer();
	gl.bindRenderbuffer(gl.RENDERBUFFER, MSAAfboSceneRenderBuffer);
	gl.renderbufferStorageMultisample(gl.RENDERBUFFER, gl.getParameter(gl.MAX_SAMPLES), gl.RGBA8, canvas.width, canvas.height);
	gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, MSAAfboSceneRenderBuffer);
	
	 MSAAfboDepthRenderBuffer = gl.createRenderbuffer();
	gl.bindRenderbuffer(gl.RENDERBUFFER, MSAAfboDepthRenderBuffer);
	gl.renderbufferStorageMultisample(gl.RENDERBUFFER, gl.getParameter(gl.MAX_SAMPLES), gl.DEPTH_COMPONENT16, canvas.width, canvas.height);
	gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, MSAAfboDepthRenderBuffer);
	
	if(gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE){
		console.error("failed to get framebuffer");
		return;
	}
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);

	let vertexShaderSrc = 
		`#version 300 es
		
		out vec2 fs_texCoord;
		uniform mat4 u_mvp_matrix;

		void main(void) {
			vec2 quadVertices[6] = vec2[6](
				vec2(1.0, 1.0),
				vec2(-1.0, 1.0),
				vec2(1.0, -1.0),

				vec2(1.0, -1.0),
				vec2(-1.0, 1.0),
				vec2(-1.0, -1.0)
			);

			gl_Position =u_mvp_matrix* vec4(quadVertices[gl_VertexID], 0.0, 1.0);
			fs_texCoord = quadVertices[gl_VertexID] * 0.5 + 0.5;
		}`;

	var vertexShader = Util.generateShader(gl.VERTEX_SHADER, vertexShaderSrc);
	
	let fragmentShaderSrc = 
		`#version 300 es
		precision highp float;

		in vec2 fs_texCoord;
		uniform sampler2D u_fb_sampler;
		uniform float u_blendBlack;

		out vec4 FragColor;

		void main(void)
		{
		//	FragColor.xyz = vec3(linearDepth(texture(u_fb_sampler,fs_texCoord).r))/zFar;
		//	FragColor.xyz = vec3(texture(u_fb_sampler,fs_texCoord).r);
			FragColor = mix(texture(u_fb_sampler,fs_texCoord),vec4(0.0,0.0,0.0,1.0),u_blendBlack);
			FragColor.a=FragColor.r;
		}`;

	var fragmentShader = Util.generateShader(gl.FRAGMENT_SHADER, fragmentShaderSrc);

	fbShaderProgram = gl.createProgram();

	gl.attachShader(fbShaderProgram, vertexShader);
	gl.attachShader(fbShaderProgram, fragmentShader);

	gl.linkProgram(fbShaderProgram);

	if (!gl.getProgramParameter(fbShaderProgram, gl.LINK_STATUS)) {
		var error = gl.getProgramInfoLog(fbShaderProgram);
		if (error.length > 0) {
			alert(error);
			uninitialize();
		}
	}

	u_fb_sampler = gl.getUniformLocation(fbShaderProgram, "u_fb_sampler");
	mvpUniform = gl.getUniformLocation(fbShaderProgram, "u_mvp_matrix");
	blendBlackUniform = gl.getUniformLocation(fbShaderProgram, "u_blendBlack");
	
	shadowMapping  = new ShadowMapping(gl);
	frameBufferRecorder = new frameBuffer(gl, 4096, 4096);

}

function resize()
 {
	// code
	if(bFullscreen) {
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
	}
	else {
		canvas.width = canvas_original_width;
		canvas.height = canvas_original_height;
	}

	// set the viewport to match
	gl.viewport(0, 0, canvas.width, canvas.height);

	let perspectiveProjectionMatrix = mat4.create();
	mat4.perspective(perspectiveProjectionMatrix, gCONFIG_PERSPECTIVE_FOVY*(Math.PI/180.0), parseFloat(canvas.width) / parseFloat(canvas.height), 1, gCONFIG_FRUSTUM_FAR);//TODO: set frustum near - removed for debugging
	camera.setProjectionMatrix(perspectiveProjectionMatrix);
	
	gl.bindTexture(gl.TEXTURE_2D, fboSceneTexture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
	gl.bindTexture(gl.TEXTURE_2D, null);

	gl.bindTexture(gl.TEXTURE_2D, fboDepthTexture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT16, canvas.width, canvas.height, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
	gl.bindTexture(gl.TEXTURE_2D, null);
	
	gl.bindRenderbuffer(gl.RENDERBUFFER, MSAAfboSceneRenderBuffer);
	gl.renderbufferStorageMultisample(gl.RENDERBUFFER, gl.getParameter(gl.MAX_SAMPLES), gl.RGBA8, canvas.width, canvas.height);
	gl.bindRenderbuffer(gl.RENDERBUFFER, null);
	
	gl.bindRenderbuffer(gl.RENDERBUFFER, MSAAfboDepthRenderBuffer);
	gl.renderbufferStorageMultisample(gl.RENDERBUFFER, gl.getParameter(gl.MAX_SAMPLES), gl.DEPTH_COMPONENT16, canvas.width, canvas.height);
	gl.bindRenderbuffer(gl.RENDERBUFFER, null);
}

function draw()
 {
	 gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	 if(true==startDemo)
	 {
		// code
		camera.update(currentDirection, 1, 1);
				
	//all scenes-------------------------------------------------------------------------------------------------------------------------
		 if(scene1Done!==true)
		 {
			  scene1();
		 }
		 else if(scene1Done==true&&scene2Done==false)
		 {
			  scene2();
		 }
		 else if(scene2Done ==true&&scene3Done==false)
		 {
			  scene3();
		 }
		 else if(scene3Done==true&&scene4Done==false)
		 {
			  scene4();
		 }
		 else if(scene4Done==true)
		 {
			 scene5();
		 }
		
		// animation loop
		//	 terrain.Render(true, shadowMapping.getLightViewMatrix(), shadowMapping.getLightProjectionMatrix(), frameBufferRecorder.getDepthTexture(),0);
		//	 iglooModel.Render(1);
		fpsCounter += 1;
		
		if(bFpsPrint==true)
		{
			console.log(fpsCounter);
			console.log(camera.getCameraPosition());
			console.log(camera.getPitch());
			console.log(camera.getYaw());
			console.log(scene5Delay);
			console.log(angle);
			bFpsPrint=false;
		}
		
	 }
	 requestAnimationFrame(draw, canvas);
}

function uninitialize()
 {
	// remove event listeners
	window.removeEventListener("keydown", keydown, false);
	window.removeEventListener("keyup", keyup, false);
	window.removeEventListener("resize", resize, false);

	document.removeEventListener('pointerlockchange', lockChangeAlert, false);
	document.removeEventListener('mozpointerlockchange', lockChangeAlert, false);

	if(shaderProgramObject) {
		gl.useProgram(shaderProgramObject);

		var shaderCount = gl.getProgramParameter(shaderProgramObject, gl.ATTACHED_SHADERS);

		if(shaderCount > 0) {
			var shaders = gl.getAttachedShaders(shaderProgramObject);

			if(shaders.length > 0) {
				for(var shaderNumber = 0; shaderNumber < shaders.length; shaderNumber++) {
					gl.detachShader(shaderProgramObject, shaders[shaderNumber]);
					gl.deleteShader(shaders[shaderNumber]);
					shaders[shaderNumber] = 0;
				}
			}
		}

		gl.useProgram(null);

		gl.deleteProgram(shaderProgramObject);
		shaderProgramObject = null;
	}
}

function keydown(event)
 {
	// code
	if(event.keyCode >= 'A'.charCodeAt(0) && event.keyCode <= 'Z'.charCodeAt(0))
	{
		var chr = String.fromCharCode(event.keyCode);

		switch(chr)
		{
			case 'F':
				toggleFullScreen();
				break;

			case 'w':
			case 'W':
			case 'A':
			case 'a':
			case 'S':
			case 's':
			case 'D':
			case 'd':
				currentDirection = chr;
				camera.m_isCameraAnimating = true;
				break;
			case 'E':
			case 'e':
				bEditMode = !bEditMode;
				if(bEditMode) {
					canvas.requestPointerLock();
				}
				else {
					document.exitPointerLock();
				}
			break;	
			case 'p':
            case 'P':				
				bFpsPrint=true;
                break;
		}
	}
	else {
		switch(event.keyCode) {
			case 27:
				uninitialize();
	
				// close our application's tab
				window.close();
				break;
			case 70:
				toggleFullScreen();
				break;
		}
	}
	
}

function keyup(event)
 {
	// code
	if(camera.m_isCameraAnimating==true)
		camera.m_isCameraAnimating = false;
}

function mouseMove({movementX, movementY, offsetX, offsetY, ...rest})
{
	// code
	camera.update(currentDirection,1,1, movementX, movementY);
}

function mouseDown({movementX, movementY, offsetX, offsetY, ...rest})
 {
	// code
	console.log({rest})
	camera.update(currentDirection,1,1, movementX, movementY);
}

function lockChangeAlert()
 {
	if (document.pointerLockElement === canvas ||
		document.mozPointerLockElement === canvas) {
	  document.addEventListener("mousemove", mouseMove, false);
	} else {
	  document.removeEventListener("mousemove", mouseMove, false);
	}
  }

function degToRad(degrees)
{
        return (degrees * Math.PI / 180.0);
}

function scene1()
{
	
	//Scene	
	gl.bindFramebuffer(gl.FRAMEBUFFER, MSAAfboScene);
	gl.viewport(0, 0, canvas.width, canvas.height);
	gl.clearColor(0.0,0.0,0.0, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	
	camera.setCameraPosition(vec3.fromValues(3.2889606952667236, 36.77817153930664, 183.0161590576172));
	
	var factor=scene1Pitch/90.0;
	
	if(fpsCounter>540)
	{
		if(scene1Pitch>6.899999999999998)
		scene1Pitch-=0.1*smoothstep(0.0,0.3,factor)*smoothstep(1.0,0.5,1.0-factor);
	}
	camera.setPitch(scene1Pitch);
	camera.setYaw(-105.00000000000004);
	
	terrain.Render(true, shadowMapping.getLightViewMatrix(), shadowMapping.getLightProjectionMatrix(), frameBufferRecorder.getDepthTexture(),0);
	
	if(fpsCounter>2000)
	{
		if(windIntensity<1.0)
		{
			windIntensity+=0.0005;
		}
	}
	
	treeNoiseFactorScene1+=lerp(0.01,0.06,windIntensity);
	spruceTree.Render(0,treeNoiseFactorScene1,lerp(-0.3,1.0,windIntensity));
	snowfall.Render(windIntensity);
	
	
	//ShaderGroupTexture quad
	
	    gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
		gl.useProgram(fbShaderProgram);
				
				
		let modelMatrix = mat4.create();      
		let MVP = mat4.create();      
        mat4.translate(modelMatrix,modelMatrix,[0.0,0.00,-3.0]);
		
		mat4.multiply(MVP, camera.getProjectionMatrix(),modelMatrix);	
				
		 gl.uniformMatrix4fv(mvpUniform, false, MVP);
		 
		 
		  if(scene1QuadBlackBlendIn>0.0)
		 {
			scene1QuadBlackBlendIn-=0.006;
		 }
		 else
		 {
			 if(scene1QuadBlackBlendOut<1.0)
			 {
				scene1QuadBlackBlendOut+=0.0036;
			 }
			
		 }
		 
		 gl.uniform1f(blendBlackUniform,scene1QuadBlackBlendIn+scene1QuadBlackBlendOut);
		
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D,shaderGroupTexture );
		gl.uniform1i(u_fb_sampler, 0);
		
		gl.drawArrays(gl.TRIANGLES, 0, 6);
		gl.useProgram(null);
		gl.disable(gl.BLEND);
		
	//-----------------------------
	
		//render quad
		if(fpsCounter>4000)
		{
			if(scene1BlackBlend<1.0)
			scene1BlackBlend+=0.0025;
			else
			{
			scene1Done=true;
			}
		}
		
		gl.bindFramebuffer(gl.READ_FRAMEBUFFER, MSAAfboScene);
		gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, fboScene);
		gl.blitFramebuffer(0, 0, canvas.width, canvas.height,
                     0, 0, canvas.width, canvas.height,
                     gl.COLOR_BUFFER_BIT, gl.LINEAR);

		
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.viewport(0, 0, canvas.width, canvas.height);
		gl.clearColor(0.0,0.0,0.0, 1.0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		
		gl.useProgram(fbShaderProgram);
				
		 gl.uniformMatrix4fv(mvpUniform, false, mat4.create());
		 gl.uniform1f(blendBlackUniform,scene1BlackBlend);
		
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D,fboSceneTexture );
		gl.uniform1i(u_fb_sampler, 0);
		
		gl.drawArrays(gl.TRIANGLES, 0, 6);
	
	
		gl.useProgram(null);
}

function scene2()
{
	
	//shadow
	gl.viewport(0, 0, 4096, 4096);
	frameBufferRecorder.startRecordingInFrameBuffer();
	shadowMapping.setCameraToLight();
	gl.clearDepth(1.0);
	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL);
	gl.clear( gl.DEPTH_BUFFER_BIT);
	spruceTree.Render(0);
	frameBufferRecorder.stopRecordingInFrameBuffer();
	shadowMapping.setFramebuffer(frameBufferRecorder);

	//shadowMapping.debugShowDepthTexture();
	//shadowMapping.debugShowColorTexture();
	//debugger;
	shadowMapping.cleanup();

	//Scene	
	gl.bindFramebuffer(gl.FRAMEBUFFER, MSAAfboScene);
	gl.viewport(0, 0, canvas.width, canvas.height);
	gl.clearColor(0.87,0.93,1.0, 1.0);
	//gl.clearColor(0.0,0.0,0.0, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	
	camera.setCameraPosition(vec3.fromValues(151.00901794433594-cameraOffsetJugadMove, 103.5381851196289, 100.44471740722656 +cameraOffsetJugadMove));
	camera.setPitch(-23.499999999999584);
	camera.setYaw(204.99999999999886+cameraOffsetJugadMove*0.5);
	
	terrain.Render(true, shadowMapping.getLightViewMatrix(), shadowMapping.getLightProjectionMatrix(), frameBufferRecorder.getDepthTexture(),0);
	spruceTree.Render(0);
	
	
	//render quad

		if(scene2BlackBlendIn>0.0)
		{
			scene2BlackBlendIn-=0.005;
		}
		if(fpsCounter>6840)
		{
			if(scene2BlackBlendOut<1.0)
			scene2BlackBlendOut+=0.005;
			else
			{
				scene2Done=true;
			}
		}

		if(fpsCounter>6500)
		{
			cameraOffsetJugadMove+=0.17;
		}
		
		gl.bindFramebuffer(gl.READ_FRAMEBUFFER, MSAAfboScene);
		gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, fboScene);
		gl.blitFramebuffer(0, 0, canvas.width, canvas.height,
                     0, 0, canvas.width, canvas.height,
                     gl.COLOR_BUFFER_BIT, gl.LINEAR);

		
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.viewport(0, 0, canvas.width, canvas.height);
		gl.clearColor(0.0,0.0,0.0, 1.0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		
		gl.useProgram(fbShaderProgram);
				
		 gl.uniformMatrix4fv(mvpUniform, false, mat4.create());
		 gl.uniform1f(blendBlackUniform,scene2BlackBlendIn+scene2BlackBlendOut);
		
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D,fboSceneTexture );
		gl.uniform1i(u_fb_sampler, 0);
		
		gl.drawArrays(gl.TRIANGLES, 0, 6);
	
	
		gl.useProgram(null);
}

function scene3()
{
	gl.bindFramebuffer(gl.FRAMEBUFFER, MSAAfboScene);
	gl.viewport(0, 0, canvas.width, canvas.height);
	gl.clearColor(0.84,0.9,1.0, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	
	 var  firstCameraPos=vec3.fromValues(148.2786102294922, 82.58158874511719, 237.4732208251953);
	 var secondCameraPos=vec3.fromValues(-0.5156363248825073, 38.617713928222656, 97.42207336425781 );
	 var thirdCameraPos=vec3.fromValues(12.334766387939453, 27.824054718017578, -27.710783004760742  );
	 var fourthCameraPos=vec3.fromValues(-42.73171615600586, 31.543270111083984, -27.710926055908203);
	 
	 var firstPitch=-10.200000000000008;
	 var firstYaw=-137.8;
	 
	 var secondPitch=-3.100000000000014;
	 var secondYaw=-78.79999999999997;
	 
	 var thirdPitch=0.5999999999999873;
	 var thirdYaw=-183.4999999999999;

	 var finalPitch=2.4999999999999956;
	 var finalYaw=-214.20000000000124;

	var firstPitchLerp=lerp(firstPitch,secondPitch,factorFirstLerp);
	var firstYawLerp=lerp(firstYaw,secondYaw,factorFirstLerp);

	var secondPitchLerp=lerp(firstPitchLerp,thirdPitch,factorSecondLerp);
	var secondYawLerp=lerp(firstYawLerp,thirdYaw,hermite(factorSecondLerp*factorSecondLerp*factorSecondLerp));
	
	var finalPitchLerp=lerp(secondPitchLerp,finalPitch,finalPitchYawFactor);
	var finalYawLerp=lerp(secondYawLerp,finalYaw,finalPitchYawFactor);
	
	 var firstCameraLerp=vec3.create();
	 var secondCameraLerp=vec3.create();
	 var finalCameraLerp=vec3.create();
	 
	 
	 if(scene3BlackBlendIn>0.0)
	 {
		 scene3BlackBlendIn-=0.005;
	 }
	 
	
	if(factorFirstLerp<1.0)
	{
		factorFirstLerp+=0.001;
	}
	else
	{
		if(factorSecondLerp<1.0)
		{
			factorSecondLerp+=0.001;
		}
		else
		{
			if(factorThirdLerp<1.0)
			{
				factorThirdLerp+=0.001;
			}
			else
			{
				if(finalPitchYawFactor<1.0)
				{
					finalPitchYawFactor+=0.002;
				}
				else
				{
					if(scene3BlackBlendOut<1.0)
					{
						scene3BlackBlendOut+=0.005;
					}
					else
					{
						scene3Done=true;
					}
				}
			}
		}
	}
	
	vec3.lerp(firstCameraLerp,firstCameraPos,secondCameraPos,factorFirstLerp);
	vec3.lerp(secondCameraLerp,firstCameraLerp,thirdCameraPos,factorSecondLerp);
	vec3.lerp(finalCameraLerp,secondCameraLerp,fourthCameraPos,factorThirdLerp);
	
	if(factorSecondLerp<0.9)
	{
		snowfall.Render(1.0);
		treeNoiseFactorScene3+=0.02;
		spruceTree.Render(1,treeNoiseFactorScene3,0.2);
	}
	
	 camera.setCameraPosition(finalCameraLerp);
	 camera.setPitch(finalPitchLerp);
	 camera.setYaw(finalYawLerp);


	penguinModel.Render();
	iglooModel.Render(1);
	blackBoard.Render();
	terrain.Render(false, shadowMapping.getLightViewMatrix(), shadowMapping.getLightProjectionMatrix(), frameBufferRecorder.getDepthTexture(),1);
	
		
	gl.bindFramebuffer(gl.READ_FRAMEBUFFER, MSAAfboScene);
	gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, fboScene);
	gl.blitFramebuffer(0, 0, canvas.width, canvas.height,
                     0, 0, canvas.width, canvas.height,
                     gl.COLOR_BUFFER_BIT, gl.LINEAR);
			 
		//quad			 
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.viewport(0, 0, canvas.width, canvas.height);
	gl.clearColor(0.0,0.0,0.0, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		
	gl.useProgram(fbShaderProgram);
				
	gl.uniformMatrix4fv(mvpUniform, false, mat4.create());
		 
		 // if(scene3BlackBlendIn>0.0)
		 // {
			// scene3BlackBlendIn-=0.002;
		 // }
		 // else
		 // {
			 // if(scene3BlackBlendOut<1.0)
			 // {
				// scene3BlackBlendOut+=0.002;
			 // }
			 // else
			 // {
				 // scene3Done=true;
			 // }
			
		 // }
		 
		 gl.uniform1f(blendBlackUniform,scene3BlackBlendIn+scene3BlackBlendOut);
		
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D,fboSceneTexture );
		gl.uniform1i(u_fb_sampler, 0);
		
		gl.drawArrays(gl.TRIANGLES, 0, 6);
	
	
		gl.useProgram(null);				 
	
}

function scene4()
{
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.viewport(0, 0, canvas.width, canvas.height);
		gl.clearColor(0.0,0.0,0.0, 1.0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		
		gl.useProgram(fbShaderProgram);
		
		let modelMatrix = mat4.create();      
		let MVP = mat4.create();      
        mat4.translate(modelMatrix,modelMatrix,[0.0,0.05,-2.0]);
		
		mat4.multiply(MVP, camera.getProjectionMatrix(),modelMatrix);
		
		 gl.uniformMatrix4fv(mvpUniform, false, MVP);
		 
		 if(scene4BlackBlendIn>0.0)
		 {
			scene4BlackBlendIn-=0.002;
		 }
		 else
		 {
			 if(scene4BlackBlendOut<1.0)
			 {
				scene4BlackBlendOut+=0.002;
			 }
			 else
			 {
				 scene4Done=true;
			 }
			
		 }
		 
		 gl.uniform1f(blendBlackUniform,scene4BlackBlendIn+scene4BlackBlendOut);
		
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D,quoteTexture );
		gl.uniform1i(u_fb_sampler, 0);
		
		gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function scene5()
{

		gl.bindFramebuffer(gl.FRAMEBUFFER, MSAAfboScene);
		gl.viewport(0, 0, canvas.width, canvas.height);
		gl.clearColor(0.0,0.0,0.0, 1.0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		particle.Render();
		
	
		gl.bindFramebuffer(gl.READ_FRAMEBUFFER, MSAAfboScene);
		gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, fboScene);
		gl.blitFramebuffer(0, 0, canvas.width, canvas.height,
                     0, 0, canvas.width, canvas.height,
                     gl.COLOR_BUFFER_BIT, gl.LINEAR);
					 
					 
					 		//quad
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.viewport(0, 0, canvas.width, canvas.height);
		gl.clearColor(0.0,0.0,0.0, 1.0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		
		gl.useProgram(fbShaderProgram);
				
		 gl.uniformMatrix4fv(mvpUniform, false, mat4.create());
		 
		 if(scene5BlackBlendIn>0.0)
		 {
			 scene5BlackBlendIn-=0.003;
		 }
		 
		 if(scene5Delay>2341)
		 {
			 scene5BlackBlendOut+=0.003;
		 }
		 
		 gl.uniform1f(blendBlackUniform,scene5BlackBlendIn+scene5BlackBlendOut);
		
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D,fboSceneTexture );
		gl.uniform1i(u_fb_sampler, 0);
		
		gl.drawArrays(gl.TRIANGLES, 0, 6);
	
	
		gl.useProgram(null);
	
}

function remap(value,low1,high1,low2,high2)
{
	return low2 + (value - low1) * (high2 - low2) / (high1 - low1);
}

function hermite(t)
{
    return t * t * (3.0 - 2.0 * t);
}
function smoothstep(edge0,edge1,x)
{
	var t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
    return t * t * (3.0 - 2.0 * t);
}

function lerp(first,second,factor)
{
	return first +(second-first)*factor;
}
function clamp(x,min,max)
{
	var temp=0.0;
	if(x<min)
	{
		temp=min;
	}
	else if(x>max)
	{
		temp=max;
	}
	else
	{
		temp=x;
	}
	return temp;
}
