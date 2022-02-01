#version 330 core

attribute vec4 aPos;
attribute vec2 aTexUV;

uniform mat4 uModelViewProjection;
uniform vec2 uUVPos;
uniform vec2 uUVSize;

out vec3 vAttrPos;
out vec3 vPos;
out vec2 vUV;

void main() {
    gl_Position = uModelViewProjection*aPos;
    vPos = gl_Position.xyz;
    vAttrPos = aPos.xyz;
    vUV = uUVPos + aTexUV*uUVSize;
}
