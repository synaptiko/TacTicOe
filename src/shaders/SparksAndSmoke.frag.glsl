varying float vAge;
varying float vMaxAge;
flat varying int vType;

float mapRange(float value, float fromMin, float fromMax, float toMin, float toMax) {
  return clamp(toMin + (value - fromMin) * (toMax - toMin) / (fromMax - fromMin), min(toMin, toMax), max(toMin, toMax));
}

void main() {
  if (vAge == -1.0) {
    discard;
  }

  vec2 cxy = 2.0 * gl_PointCoord - 1.0;
  float r = dot(cxy, cxy);

  if (r > 1.0) {
    discard;
  }

  if (vType == 1) {
    float alphaAge = pow(mapRange(vAge, 0.0, vMaxAge, 1.0, 0.0), 1.5) * 0.005;
    float alpha = mapRange(r, 0.25, 1.0, 1.0, 0.0) * alphaAge;

    gl_FragColor = vec4(vec3(1.0), alpha);
  } else {
    float alphaAge = pow(mapRange(vAge, 0.0, vMaxAge, 1.0, 0.0), 3.0);
    float alpha = mapRange(r, 0.25, 1.0, 1.0, 0.0) * alphaAge;
    vec3 baseColor;

    if (vType == 2) {
      baseColor = vec3(0.905882, 0.160784, 0.160784); // = #E72929
    } else {
      baseColor = vec3(0.160784, 0.611765, 0.905882); // = #299CE7
    }
    gl_FragColor = vec4(baseColor * 10.0, alpha);
  }
}
