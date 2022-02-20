#version 300 es
precision mediump float;

in vec2 vPos;
out vec4 FragColor;

uniform float uTime;
uniform float uAspectRatio; // x / y

void main() {
    vec2 uv = vPos*0.5 + 0.5; // 0 to 1
    vec2 pos = vec2(uAspectRatio * vPos.x, vPos.y);

    vec3 color = vec3(0, 0, 0);

    const float numRings = 32.0;
    const float ringWidth = 0.02;
    const float ringSpace = 0.05;
    const float speed = 0.02;
    for (float i = 1.0; i <= numRings; ++i) {
        float t = i - fract(uTime * speed / ringWidth);
        float rLo = ringSpace * t + ringWidth * (t - 1.0);
        float rHi = rLo + ringWidth;
        float r = length(pos.xy);
        if (r >= rLo && r <= rHi) {
            color = vec3(1, 1, 1);
            break;
        }
    }

    FragColor = vec4(color, 1);
}
