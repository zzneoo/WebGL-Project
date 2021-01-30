class RenderableObject
{
    _m_vertices = [];
    _m_faceIndices = [];
    _m_shaderProgramObject = null;
    _m_gvao;
    _m_gvbo;
    _m_gvbo_indices;

    getShaderProgObject()
    {
        return this._m_shaderProgramObject;
    }

    getVao()
    {
        return this._m_gvao;
    }

    getVboIndices()
    {
        return this._m_gvbo_indices;
    }
}