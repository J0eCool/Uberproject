precision mediump float;
varying vec2 vPos;

uniform float uTime;

void main() {
    vec2 uv = vPos*0.5 + 0.5;
    float t = abs(2.0*fract(uTime * 0.3)-1.0);
    gl_FragColor = vec4(uv, t, 1);
}
