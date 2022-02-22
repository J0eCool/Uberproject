#version 300 es
precision mediump float;

in vec2 vPos;
out vec4 FragColor;

uniform float uTime;
uniform float uAspectRatio; // x / y

const float PI = 3.1415926535;
const float TAU = 2.0 * PI;

// ring pattern
// width: thickness of ring
// space: space between rings
// speed: speed of animation
float rings(vec2 pos, float width, float space, float speed) {
    const float numRings = 32.0;
    for (float i = 1.0; i <= numRings; ++i) {
        float t = i - fract(uTime * speed / width);
        float rLo = space * t + width * (t - 1.0);
        float rHi = rLo + width;
        float r = length(pos.xy);
        if (r >= rLo && r <= rHi) {
            return 1.0;
        }
    }
    return 0.0;
}

// smoothstep: I don't like how GLSL's smoothstep works
float slerp(float lo, float hi, float t) {
    float s = t * t * (3.0 - 2.0 * t);
    return mix(lo, hi, s);
}

// lerp from lo to hi and then back again
// 0 = lo, 1 = hi, 2 = lo, 3 = hi, etc
float lerpLoop(float lo, float hi, float t) {
    float s = 2.0 * fract((t - 1.0) / 2.0) - 1.0;
    return mix(lo, hi, abs(s));
}

float slerpLoop(float lo, float hi, float t) {
    float s = 2.0 * fract((t - 1.0) / 2.0) - 1.0;
    return slerp(lo, hi, abs(s));
}

float wedges(vec2 pos) {
    float ang = pos.x / pos.y;
    float t = fract(atan(ang + fract(uTime))) > 0.5 ? 1.0 : 0.0;
    t = atan(fract(ang));
    return t;
}

vec3 circleScene(vec2 pos) {
    float A = rings(pos, 0.2, 0.075, 0.15);
    float B = rings(pos, 0.02, 0.05, 0.17);
    // look at this one on its own its great
    // this is enjoyable to look at because it changes in frequency and direction
    // the staccato effect is visually captivating
    // I'd like to find a way to recreate it stably over time
    float magic = rings(pos, 0.1 + 0.05*sin(uTime*0.1), 0.05, 0.17);
    float C = rings(pos, 0.05, 0.05, 0.1 + 0.09*sin(uTime));
    vec3 color = vec3(A, B, magic);
    // color = vec3((B+C)/2.0, (A+C)/2.0, (A+B)/2.0);
    // color = vec3(magic);
    color = vec3(1)-color;
    return color;
}

void main() {
    vec2 uv = vPos*0.5 + 0.5; // 0 to 1
    vec2 pos = vec2(uAspectRatio * vPos.x, vPos.y);

    vec3 color = circleScene(pos);
    // color = vec3(wedges(pos));
    color = vec3(rings(pos, 0.1, 0.1, lerpLoop(0.1, 0.2, uTime)));

    FragColor = vec4(color, 1);
}
