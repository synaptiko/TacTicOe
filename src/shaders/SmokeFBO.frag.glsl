varying float vAge;

void main() {
  if (vAge == -1.0) {
    discard;
  }

  vec3 color = vec3(1.0);

  gl_FragColor = vec4(color, 1.0);
}
