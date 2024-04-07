uniform sampler2D uParticles;
varying float vAge;
varying float vMaxAge;

float oneThird = 1.0 / 3.0;

float mapRange(float value, float fromMin, float fromMax, float toMin, float toMax) {
  return clamp(toMin + (value - fromMin) * (toMax - toMin) / (fromMax - fromMin), min(toMin, toMax), max(toMin, toMax));
}

void main() {
  vec4 posAndAge = texture2D(uParticles, position.xy);
  vec3 pos = posAndAge.xyz;
  float age = posAndAge.w;
  vec4 velAndMaxAge = texture2D(uParticles, position.xy + vec2(0.0, oneThird));
  float maxAge = velAndMaxAge.w;

  vAge = age;
  vMaxAge = maxAge;

  if (vAge == -1.0) {
    gl_Position = vec4(0.0, 0.0, 0.0, 0.0);
    gl_PointSize = 0.0;

    return;
  }

  vec4 modelPosition = modelMatrix * vec4(pos, 1.0);
  vec4 viewPosition = viewMatrix * modelPosition;
  vec4 projectedPosition = projectionMatrix * viewPosition;

  gl_Position = projectedPosition;

  float size = mapRange(age, 0.0, vMaxAge, 0.33, 1.0) * 1500.0;
  gl_PointSize = size * (-1.0 / viewPosition.z);
}
