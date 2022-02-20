#version 300 es
precision mediump float;

in vec3 aPos;

out vec2 vPos;

void main() {
  gl_Position = vec4(aPos, 1);
  vPos = aPos.xy;
}
