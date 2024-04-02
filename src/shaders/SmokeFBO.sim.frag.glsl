uniform sampler2D uPositions;
uniform vec2 uPositionsResolution;
uniform sampler2D uEmitters;
uniform vec2 uEmittersResolution;
uniform float uDelta;
uniform float uMaxAge;
varying vec2 vUv;

void main() {
  float id = floor(vUv.x * uPositionsResolution.x) + floor(vUv.y * uPositionsResolution.y) * uPositionsResolution.x;
  vec4 data = texture2D(uPositions, vUv);
  vec3 pos = data.xyz;
  float age = data.w;

  if (age > uMaxAge) {
    gl_FragColor = vec4(pos, -1.0);
    return;
  } else if (age != -1.0) {
    // TODO: implement velocity from texture
    pos += vec3(0.0, 0.0, 0.33 * uDelta);

    gl_FragColor = vec4(pos, age + uDelta);
    return;
  }

  for (int x = 0; x < int(uEmittersResolution.x); x++) {
    for (int y = 0; y < int(uEmittersResolution.y); y++) {
      vec4 emitter = texture2D(uEmitters, vec2(float(x) / uEmittersResolution.x, float(y) / uEmittersResolution.y));

      if (emitter.w == -1.0) {
        break;
      }

      if (emitter.w == id && age == -1.0) {
        pos = emitter.xyz;
        age = 0.0;
        break;
      }
    }
  }

  gl_FragColor = vec4(pos, age);
}
