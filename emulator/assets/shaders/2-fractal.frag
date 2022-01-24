#version 330
precision mediump float;

uniform float uTime;

in vec2 vPos;

layout (location = 0) out vec4 FragColor;

void main() {
    vec2 uv = (vPos + 1) / 2;
    uv = mix(uv, uv/4+vec2(0.75,0.0), pow(fract(uTime*0.4),1/sqrt(2)));

    // Colors used
    vec3 A = vec3(0.3, 0.7, 1);
    vec3 B = vec3(1, 1, 1);
    vec3 C = vec3(1, 0.6, 0.1);

    float lineWidth = 0.0025;
    const int maxDepth = 32;
    for (int i = 0; i < maxDepth; ++i) {
        if (uv.x <= 0.5) break;
        // lineWidth*=2;
        uv.x = (uv.x-0.5)*2;
        if (uv.y < 0.5) {
            uv.y = uv.y*2;
            // swap colors to keep things consistent across levels
            vec3 t = B;
            B = A;
            A = t;
        } else {
            uv.y = (uv.y-0.5)*2;
            vec3 t = B;
            B = C;
            C = t;
        }
    }

    // offset the coordinates to be at the center of a circle
    uv.x -= 0.5 + lineWidth/2;
    uv.y -= 0.5;
    float sdf = uv.x*uv.x + 4*uv.y*uv.y;
    float r = 0.25;
    vec3 c = sdf < r ? B : (uv.y < 0.0 ? C : A);

    // draw boundaries
    float b = abs(sdf - r);
    if (b < lineWidth) {
        c = vec3(b-lineWidth);
    }

    FragColor = vec4(c, 1);
}
