class frameBuffer
{
    m_fbo = null;
    m_fbo_color_texture = null; //FB color attachment
    m_fbo_depth_texture = null; //FB color attachment

    m_webgl2_context = null; //stored when constructor called

    /// @brief gl : rendering context. for eg. from gl = gcanvas.getContext("webgl2");
    constructor(gl, width, height)
    {
        console.assert(arguments.length == 3, "argument mismatch");
        this.m_webgl2_context = gl;

        //texture attachments
        //color
        this.m_fbo_color_texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.m_fbo_color_texture);
        
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        
        //deph
        this.m_fbo_depth_texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.m_fbo_depth_texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT16, width, height, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }

    startRecordingInFrameBuffer()
    {
        let gl = this.m_webgl2_context;

        gl.bindTexture(gl.TEXTURE_2D, null);

        this.m_fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.m_fbo);

        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.m_fbo_color_texture, 0);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.m_fbo_depth_texture, 0);

        if(gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE){
            console.error("failed to create framebuffer");
            return;
        }

        gl.clearColor(0,0,0, 1.0);
        gl.clearDepth(1.0);
	    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    }

    stopRecordingInFrameBuffer()
    {
        let gl = this.m_webgl2_context;

        if(this.m_fbo)
        {
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.deleteFramebuffer(this.m_fbo);
            this.m_fbo = null;
        }
    }

    getColorTexture()
    {
        if(this.m_fbo != null)
        {
            console.error("should not access framebuffer attachment before framebuffer is freed. Did you forget calling stopRecordingInFrameBuffer()?")
        }

        return this.m_fbo_color_texture;
    }

    getDepthTexture()
    {
        if(this.m_fbo != null)
        {
            console.error("should not access framebuffer attachment before framebuffer is freed. Did you forget calling stopRecordingInFrameBuffer()?")
        }

        return this.m_fbo_depth_texture;
    }
}