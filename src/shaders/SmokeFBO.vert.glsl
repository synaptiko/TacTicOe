uniform sampler2D uPositions;
uniform float uMaxAge;
varying float vAge;
float size = 100.0;

float mapRange(float value, float fromMin, float fromMax, float toMin, float toMax) {
  return toMin + (value - fromMin) * (toMax - toMin) / (fromMax - fromMin);
}

void main() {
  vec4 data = texture2D(uPositions, position.xy);
  vec3 pos = data.xyz;
  float age = data.w;

  vAge = age;

  if (vAge == -1.0) {
    gl_Position = vec4(0.0, 0.0, 0.0, 0.0);
    gl_PointSize = 0.0;

    return;
  }

  vec4 modelPosition = modelMatrix * vec4(pos, 1.0);
  vec4 viewPosition = viewMatrix * modelPosition;
  vec4 projectedPosition = projectionMatrix * viewPosition;

  gl_Position = projectedPosition;

  size *= mapRange(age, 0.0, uMaxAge, 2.0, 20.0);
  gl_PointSize = size * (-1.0 / viewPosition.z);
}
