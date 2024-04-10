import { WebGLProgramParametersWithUniforms } from 'three';

export function setUniform(uniforms: WebGLProgramParametersWithUniforms['uniforms'], name: string, value: unknown) {
  uniforms[name] = uniforms[name] ?? { value };

  if (uniforms[name].value !== value) {
    uniforms[name].value = value;
  }
}
