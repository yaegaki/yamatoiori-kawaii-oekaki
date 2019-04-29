export const VertexShaderPositionAttrib = 'position';
export const VertexShaderTexCoordAttrib = 'texCoord';
export const VertexShaderMVPMatrixUni = 'mvpMatrix';

export const VertexShader = `
attribute vec3 position;
attribute vec2 texCoord;
uniform mat4 mvpMatrix;
varying vec2 vTexCoord;

void main(void) {
    vTexCoord = texCoord;
    gl_Position = mvpMatrix * vec4(position, 1);
}
`;

export const FragmentShaderTexUni = 'texture';

export const FragmentShader = `
precision mediump float;

uniform sampler2D texture;
varying vec2 vTexCoord;

void main(void) {
    // vec4 p = texture2D(texture, vTexCoord);
    // gl_FragColor = vec4(vTexCoord,p.x,1);
    gl_FragColor = texture2D(texture, vTexCoord);
}
`;