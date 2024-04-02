uniform float uMaxAge;
varying float vAge;

void main() {
  if (vAge == -1.0) {
    discard;
  }

  vec2 cxy = 2.0 * gl_PointCoord - 1.0;
  float r = dot(cxy, cxy);
  // TODO: requires further adjustments
  float alpha = clamp(0.5 - r, 0.0, 1.0) * ((uMaxAge - vAge) / uMaxAge);

  if (r > 1.0) {
    discard;
  }

  gl_FragColor = vec4(vec3(1.0), alpha * 0.125);
}
