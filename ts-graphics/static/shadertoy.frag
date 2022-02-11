precision mediump float;
varying vec2 vPos;

uniform float uTime;

void main() {
    vec2 uv = vPos*0.5 + 0.5;
    gl_FragColor = vec4(uv, 0.5, 1);
}
