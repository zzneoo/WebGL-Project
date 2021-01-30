var pitchD = 0;
var yawD = 0;
var EXT_texture_filter_anisotropic = null;
var MatrixStack = [];//each entry is a list of [view, projection]

const DrawType = {
    DRAW_ARRAYS : 0,
    DRAW_INDICES : 1
};

class Camera {
    _m_v3_cameraPosition;
	_m_v3_forwardVector;
	_m_v3_rightVector;
	_m_v3_upVector;
    _m_m4_viewMatrix;
    _m_m4_projectionMatrix;//just for storage

    _m_blockUpdate;
	
    m_pitch;
    m_yaw;

	m_isCameraAnimating;

	constructor() {
        this._m_v3_cameraPosition = vec3.fromValues(0.0, 50.0, 0.0);
        this._m_v3_rightVector = vec3.fromValues(0.0, 0.0, 0.0);
        this._m_m4_viewMatrix = mat4.create();
        this._m_m4_projectionMatrix = mat4.create();
        this._m_v3_upVector = vec3.fromValues(0.0, 1.0, 0.0);
        this.m_pitch = 0.0;
        this.m_yaw = 0.0;
        this._m_blockUpdate = false;
        this.m_isCameraAnimating = false;
    }

	getCameraPosition() {
        return this._m_v3_cameraPosition;
    }
	
	setCameraPosition(camPos)
	{
       this._m_v3_cameraPosition=camPos;
    }
	
	getPitch()
	{
		return this.m_pitch;
	}
	
	getYaw()
	{
		return this.m_yaw;
	}
	
	setPitch(pitch)
	{
		 this.m_pitch=pitch;
	}
	
	setYaw(yaw)
	{
		 this.m_yaw=yaw;
	}

    //camera world coords
    getCameraPosition2() {
        let viewInv = mat4.create();
        mat4.invert(viewInv, this._m_m4_viewMatrix);
        let camWC = vec4.create();
        vec4.transformMat4(camWC, vec4.fromValues(0,0,0,1), viewInv);
        return camWC;
    }

	getViewMatrixMat4() {
        return this._m_m4_viewMatrix;
    }

    setViewMatrix(vMatrix)
    {
        Object.assign(this._m_m4_viewMatrix, vMatrix);
    }

    getProjectionMatrix()
    {
        return this._m_m4_projectionMatrix;
    }

    setProjectionMatrix(pMatrix)
    {
        Object.assign(this._m_m4_projectionMatrix, pMatrix);//copy instead of reference
    }

    blockUpdate(bBlockUpdate = true)
    {
        this._m_blockUpdate = bBlockUpdate;
    }

    pushMatrix()
    {
        let vmCopy = mat4.create();   
        let pmCopy = mat4.create();   
        Object.assign(vmCopy,this.getViewMatrixMat4());//push copy instead of reference
        Object.assign(pmCopy,this.getProjectionMatrix());
        MatrixStack.push([vmCopy, pmCopy]);   
    }

    popMatrix()
    {
        if(MatrixStack.length == 0)
        {
            console.error("stack underflow");
            return;
        }

        let mats = MatrixStack.pop();
        this.setViewMatrix(mats[0]);
        this.setProjectionMatrix(mats[1]);
    }

    update(cameraDirection, deltaTime, animationSpeed, currentMouseX = 0, currentMouseY = 0) {
        if(this.bBlockUpdate)
        {
            console.info("camera updates blocked");
            return;
        }

        let XOffset, YOffset;
        let front = [], target, up = vec3.fromValues(0.0, 1.0, 0.0);
    
        XOffset = parseFloat(currentMouseX);
        YOffset = parseFloat(-currentMouseY);

        // XOffset *= 1.5 * deltaTime * animationSpeed;
        // YOffset *= 1.5 * deltaTime * animationSpeed;
        
        XOffset *= 0.1;
        YOffset *= 0.1;
        
        // Calculate Yaw / Pitch
        this.m_pitch += YOffset;
        this.m_yaw += XOffset;
        // restrict pitch values
        if (this.m_pitch > 89.0) this.m_pitch = 89.0;
        if (this.m_pitch < -89.0) this.m_pitch = -89.0;

        // calcuate front
        front[0] = Math.cos(this.m_pitch * 0.0174532) * Math.cos(this.m_yaw * 0.0174532);
        front[1] = Math.sin(this.m_pitch * 0.0174532);
        front[2] = Math.cos(this.m_pitch * 0.0174532) * Math.sin(this.m_yaw * 0.0174532);
        vec3.normalize(front, front);

        this._m_v3_forwardVector = front;

        vec3.cross(this._m_v3_rightVector, this._m_v3_forwardVector, up)
        vec3.normalize(this._m_v3_rightVector, this._m_v3_rightVector);

        vec3.cross(this._m_v3_upVector, this._m_v3_rightVector, this._m_v3_forwardVector)
        vec3.normalize(this._m_v3_upVector, this._m_v3_upVector);

        let rDotc = vec3.dot(this._m_v3_rightVector, this._m_v3_cameraPosition);
        let uDotc = vec3.dot(this._m_v3_upVector, this._m_v3_cameraPosition);
        let fDotc = vec3.dot(this._m_v3_forwardVector, this._m_v3_cameraPosition);

        if (this.m_isCameraAnimating) {
            switch (cameraDirection) {
            case 'w':
            case 'W':
                vec3.scaleAndAdd(this._m_v3_cameraPosition, this._m_v3_cameraPosition, this._m_v3_forwardVector, deltaTime*animationSpeed);
                break;
            case 'a':
            case 'A':
                //this._m_v3_cameraPosition -= this._m_v3_rightVector * deltaTime * animationSpeed;
                vec3.scaleAndAdd(this._m_v3_cameraPosition, this._m_v3_cameraPosition, this._m_v3_rightVector, -deltaTime*animationSpeed);
                break;
            case 's':
            case 'S':
                //this._m_v3_cameraPosition -= this._m_v3_forwardVector * deltaTime * animationSpeed;
                vec3.scaleAndAdd(this._m_v3_cameraPosition, this._m_v3_cameraPosition, this._m_v3_forwardVector, -deltaTime*animationSpeed);
                break;
            case 'd':
            case 'D':
                //this._m_v3_cameraPosition += this._m_v3_rightVector * deltaTime * animationSpeed;
                vec3.scaleAndAdd(this._m_v3_cameraPosition, this._m_v3_cameraPosition, this._m_v3_rightVector, deltaTime*animationSpeed);
                break;
				
	
            }
        }

        // if (this._m_v3_cameraPosition[1] < 10.0)
        //     this._m_v3_cameraPosition[1] = 10.0;

        this._m_m4_viewMatrix = mat4.fromValues(
			this._m_v3_rightVector[0], this._m_v3_upVector[0], -this._m_v3_forwardVector[0], 0.0,
			this._m_v3_rightVector[1], this._m_v3_upVector[1], -this._m_v3_forwardVector[1], 0.0,
			this._m_v3_rightVector[2], this._m_v3_upVector[2], -this._m_v3_forwardVector[2], 0.0,
			-rDotc, -uDotc, fDotc, 1.0
        );
    }
}

class Util{
    static generateShader(shaderType, shaderCode)
    {
        let shader = gl.createShader(shaderType);
        gl.shaderSource(shader, shaderCode);

        gl.compileShader(shader);
        
        // error checking for shader compilation
        if(gl.getShaderParameter(shader, gl.COMPILE_STATUS) == false) 
        {
            var error = gl.getShaderInfoLog(shader);
            if(error.length > 0) 
            {
                alert(error);
                console.error(error);
                console.trace();
                return -1;
            }
        }
    return shader;
    };

    static loadTexture(imgPath, useAnisotropic = false, wrapMode=gl.REPEAT) {
        return new Promise((resolve, reject) => {
            let imgTexture = gl.createTexture();
            imgTexture.image = new Image();
            imgTexture.image.src = imgPath;
            imgTexture.image.onload = function() {
                gl.bindTexture(gl.TEXTURE_2D, imgTexture);
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
                gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapMode);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapMode);

                if(EXT_texture_filter_anisotropic == null)
                {
                    EXT_texture_filter_anisotropic = gl.getExtension("EXT_texture_filter_anisotropic")  ||
                    gl.getExtension("WEBKIT_EXT_texture_filter_anisotropic") ||
                    gl.getExtension("MOZ_EXT_texture_filter_anisotropic");
                }

                if(useAnisotropic == true)
                {
                    if(EXT_texture_filter_anisotropic != null)
                    {
                        var largest = gl.getParameter(EXT_texture_filter_anisotropic.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
                        gl.texParameteri(gl.TEXTURE_2D, EXT_texture_filter_anisotropic.TEXTURE_MAX_ANISOTROPY_EXT, largest);
                    }
                    else
                    {
                        console.warn("unable to load TEXTURE_MAX_ANISOTROPY_EXT extension");
                    }
                }

                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imgTexture.image);
                gl.generateMipmap(gl.TEXTURE_2D);
                gl.bindTexture(gl.TEXTURE_2D, null);
                resolve(imgTexture);
            };
        });
    }
    
    static loadCubemapTexture() {
        return new Promise((resolve, reject) => {
            let cubemapTexture = gl.createTexture();

            new Promise(resolve => {

                let Cube_MAP_POS_X=new Image();
                Cube_MAP_POS_X.src=`${BASE_PATH}/cubemap/posx.png`;
                
                Cube_MAP_POS_X.onload=function()
                {
                    gl.bindTexture(gl.TEXTURE_CUBE_MAP,cubemapTexture);
                    //gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
                    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
                    
                    gl.texParameteri(gl.TEXTURE_CUBE_MAP,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
                    gl.texParameteri(gl.TEXTURE_CUBE_MAP,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
                    gl.texParameteri(gl.TEXTURE_CUBE_MAP,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_CUBE_MAP,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_CUBE_MAP,gl.TEXTURE_WRAP_R,gl.CLAMP_TO_EDGE);
                    
                    gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X,0,gl.RGBA,Cube_MAP_POS_X.width,Cube_MAP_POS_X.height,0,gl.RGBA,gl.UNSIGNED_BYTE,Cube_MAP_POS_X);
                    
                    resolve(true);
                }
            })
            .then(() => {
                return new Promise(resolve => {
                    let Cube_MAP_NEG_X=new Image();
                    Cube_MAP_NEG_X.src=`${BASE_PATH}/cubemap/negx.png`;
                    Cube_MAP_NEG_X.onload=function()
                    {
                        gl.bindTexture(gl.TEXTURE_CUBE_MAP,cubemapTexture);
                        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
                        gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_X,0,gl.RGBA,Cube_MAP_NEG_X.width,Cube_MAP_NEG_X.height,0,gl.RGBA,gl.UNSIGNED_BYTE,Cube_MAP_NEG_X);
                        resolve(true);
                    }
                });
            })
            .then(() => {
                return new Promise(resolve => {
                    let Cube_MAP_POS_Y=new Image(); 
                    Cube_MAP_POS_Y.src=`${BASE_PATH}/cubemap/posy.png`;
                    Cube_MAP_POS_Y.onload=function()
                    {
                        gl.bindTexture(gl.TEXTURE_CUBE_MAP,cubemapTexture);
                        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
                        gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Y,0,gl.RGBA,Cube_MAP_POS_Y.width,Cube_MAP_POS_Y.height,0,gl.RGBA,gl.UNSIGNED_BYTE,Cube_MAP_POS_Y);
                        resolve(true);
                    }
                });
            })
            .then(() => {
                return new Promise(resolve => {
                    let Cube_MAP_NEG_Y=new Image();	
                    Cube_MAP_NEG_Y.src=`${BASE_PATH}/cubemap/negy.png`;
                    Cube_MAP_NEG_Y.onload=function()
                    {
                        gl.bindTexture(gl.TEXTURE_CUBE_MAP,cubemapTexture);
                        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
                        gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,0,gl.RGBA,Cube_MAP_NEG_Y.width,Cube_MAP_NEG_Y.height,0,gl.RGBA,gl.UNSIGNED_BYTE,Cube_MAP_NEG_Y);
                        resolve(true);
                    }
                });
            })
            .then(() => {
                return new Promise(resolve => {
                    let Cube_MAP_POS_Z=new Image();
                    Cube_MAP_POS_Z.src=`${BASE_PATH}/cubemap/posz.png`;
                    Cube_MAP_POS_Z.onload=function()
                    {
                        gl.bindTexture(gl.TEXTURE_CUBE_MAP,cubemapTexture);
                        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
                        gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Z,0,gl.RGBA,Cube_MAP_POS_Z.width,Cube_MAP_POS_Z.height,0,gl.RGBA,gl.UNSIGNED_BYTE,Cube_MAP_POS_Z);
                        resolve(true);
                    }
                });
            })
            .then(() => {
                    let Cube_MAP_NEG_Z=new Image();
                    Cube_MAP_NEG_Z.src=`${BASE_PATH}/cubemap/negz.png`;
                    Cube_MAP_NEG_Z.onload=function()
                    {
                        gl.bindTexture(gl.TEXTURE_CUBE_MAP,cubemapTexture);
                        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
                        gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,0,gl.RGBA,Cube_MAP_NEG_Z.width,Cube_MAP_NEG_Z.height,0,gl.RGBA,gl.UNSIGNED_BYTE,Cube_MAP_NEG_Z);
                        gl.bindTexture(gl.TEXTURE_CUBE_MAP,null);
                        resolve(cubemapTexture);
                    }
            });
        });        
    }

    static readImageData(imgObject) {
        if(imgObject.toString().slice(8, -1) != 'HTMLImageElement') 
            alert('Object of type Image is expected');

        let canvasElm = document.getElementById('img-data');

        let context = canvasElm.getContext('2d');

        context.drawImage(imgObject, 0, 0);

        return context.getImageData(0, 0, imgObject.width, imgObject.height);
    }

    static loadModel(filePath) {
        return new Promise((resolve, reject) => {
            let httpRequest = new XMLHttpRequest();
            httpRequest.open('GET', filePath);

            httpRequest.onreadystatechange = () => {
                if(httpRequest.status != 200) {
                    reject(-1);
                }

                

                if(httpRequest.readyState == XMLHttpRequest.DONE && httpRequest.status === 200) {
                    let lines = httpRequest.responseText.split('\n');
                    let vertices = [], textures = [], normals = [];
                    let retVal = { 
                        sortedVertices: [], sortedTextures: [], sortedNormals: [],
                        faceCount: 0, loopCount: 0, faceIndicesArr: [], meshOffset: []
                    };
                    lines.forEach((line) => {
                        if(line.length > 1) {
                            let data = line.split(' ');

                            if(data[0] === 'v') {
                                vertices.push(parseFloat(data[1]), parseFloat(data[2]), parseFloat(data[3]));
                            } 
                            else if(data[0] === 'vt') {
                                textures.push(parseFloat(data[1]), parseFloat(data[2]));
                            }
                            else if(data[0] === 'vn') {
                                normals.push(parseFloat(data[1]), parseFloat(data[2]), parseFloat(data[3]));
                            }
                            else if(data[0] === 'f') {
                                data.splice(0, 1);

                                data.forEach((face, index) => {
                                    let indicesArr = face.split('/');
                                    
                                    let arrIndex = indicesArr[0] - 1;
                                    retVal.sortedVertices.push(vertices[3 * arrIndex]);
                                    retVal.sortedVertices.push(vertices[3 * arrIndex + 1]);
                                    retVal.sortedVertices.push(vertices[3 * arrIndex + 2]);

                                    arrIndex = indicesArr[1] - 1;
                                    retVal.sortedTextures.push(textures[2 * arrIndex]);
                                    retVal.sortedTextures.push(textures[2 * arrIndex + 1]);

                                    arrIndex = indicesArr[2] - 1;
                                    retVal.sortedNormals.push(normals[3 * arrIndex]);
                                    retVal.sortedNormals.push(normals[3 * arrIndex + 1]);
                                    retVal.sortedNormals.push(normals[3 * arrIndex + 2]);

                                    if(index % 3 == 0) {
                                        retVal.faceCount += 1;
                                    }

                                    retVal.faceIndicesArr.push(retVal.loopCount++);
                                });
                            }
                            else if(data[0] === 'usemtl') {
                                retVal.meshOffset.push(retVal.loopCount);
                                // retVal.faceCount = 0;
                            }
                        }
                    });
                    resolve(retVal);
                }
            }

            httpRequest.send();

        })
    }
};