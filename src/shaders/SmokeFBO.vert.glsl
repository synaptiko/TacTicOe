uniform sampler2D uPositions;

varying float vAge;

void main() {
  vec4 data = texture2D(uPositions, position.xy);
  vec3 pos = data.xyz;
  float age = data.w;

  // for testing purposes
  pos.z = age / 10.0;

  vec4 modelPosition = modelMatrix * vec4(pos, 1.0);
  vec4 viewPosition = viewMatrix * modelPosition;
  vec4 projectedPosition = projectionMatrix * viewPosition;

  gl_Position = projectedPosition;

  gl_PointSize = 50.0;
  gl_PointSize *= -1.0 / viewPosition.z;

  vAge = age;
}
