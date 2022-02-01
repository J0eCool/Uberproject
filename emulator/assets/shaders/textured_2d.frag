#version 330
precision mediump float;

uniform vec3 uColor;
uniform sampler2D uTexture;

in vec2 vUV;

layout (location = 0) out vec4 FragColor;

void main() {
    vec4 tex = texture(uTexture, vUV);
    if (tex.a < 0.01f) {
        discard;
    }
    FragColor = tex * vec4(uColor, 1);
}
