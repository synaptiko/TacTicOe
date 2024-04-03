uniform float uMaxAge;
varying float vAge;

float mapRange(float value, float fromMin, float fromMax, float toMin, float toMax) {
  return toMin + (value - fromMin) * (toMax - toMin) / (fromMax - fromMin);
}

void main() {
  if (vAge == -1.0) {
    discard;
  }

  vec2 cxy = 2.0 * gl_PointCoord - 1.0;
  float r = dot(cxy, cxy);
  float alphaAge = pow(mapRange(vAge, 0.0, uMaxAge, 1.0, 0.0), 5.0) * 0.01;
  float alpha = mapRange(r, 0.25, 1.0, 1.0, 0.0) * alphaAge;

  if (r > 1.0) {
    discard;
  }

  gl_FragColor = vec4(vec3(1.0), alpha);
}
