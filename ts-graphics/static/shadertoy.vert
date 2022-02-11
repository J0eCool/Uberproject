precision mediump float;

attribute vec3 aPos;

varying vec2 vPos;

void main() {
  gl_Position = vec4(aPos, 1);
  vPos = aPos.xy;
}
