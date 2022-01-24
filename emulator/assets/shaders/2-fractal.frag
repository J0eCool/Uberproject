#version 330
precision mediump float;

in vec2 vPos;

layout (location = 0) out vec4 FragColor;

void main() {
    FragColor = vec4(vPos.x, 0.5, vPos.y, 1);
}
