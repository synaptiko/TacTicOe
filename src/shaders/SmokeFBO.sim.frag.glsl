uniform sampler2D uPositions;
uniform float uDelta;
varying vec2 vUv;

void main() {
  vec4 data = texture2D(uPositions, vUv);
  vec3 pos = data.xyz;
  float age = data.w;

  if (age != -1.0) {
    age += uDelta;
  }

  gl_FragColor = vec4(pos, age);
}
