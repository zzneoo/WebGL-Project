"use strict";
var CONFIG_ENABLE_FOG = 1;
const gCONFIG_SHADOW_ENABLE_SHADOW = true;
const gCONFIG_SHADOW_LIGHT_DISTANCE = 10;//distance from centre of camera furstum's centre where light is assumed - from where it will cast shadows. closer this is the better the objects near camera furstum centre have shadows - less pixelated
const gCONFIG_SHADOW_DISTANCE = 100;

const gCONFIG_FRUSTUM_NEAR = 0.1;
const gCONFIG_FRUSTUM_FAR  = 1000.0;
const gCONFIG_PERSPECTIVE_FOVY = 45.0;
