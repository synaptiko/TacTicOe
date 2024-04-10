import { MeshStandardMaterial, WebGLProgramParametersWithUniforms } from 'three';
import vertexShader from './shaders/Symbol.vert.glsl?raw';
import vertexShaderUrl from './shaders/Symbol.vert.glsl?url';
import fragmentShader from './shaders/Symbol.frag.glsl?raw';
import fragmentShaderUrl from './shaders/Symbol.frag.glsl?url';
import { forwardRef, memo, useRef } from 'react';
import { setUniform } from './utils/setUniform';
import { MaterialNode, extend } from '@react-three/fiber';
import { useHotReloadShaders } from './utils/useHotReloadShaders';

// TODO: implement "LEDs" effect (circular rows for O; for X along the edges)

type SymbolMaterialWrapperProps = {
  color: string;
  emissive: string;
  uPlayer: 1 | 2;
  uEmissiveIntensity: number;
  uMaxIntensity: number;
};

const SymbolMaterialDevelopmentWrapper = memo(
  forwardRef<SymbolMaterial, SymbolMaterialWrapperProps>((props, ref) => {
    const materialRef = useRef<SymbolMaterial>(null!);
    const shaders = useHotReloadShaders(materialRef, vertexShaderUrl, fragmentShaderUrl);

    return (
      <symbolMaterial
        ref={(material) => {
          materialRef.current = material!;

          if (typeof ref === 'function') {
            ref(material!);
          } else if (ref) {
            ref.current = material!;
          }
        }}
        {...props}
        {...shaders}
      />
    );
  })
);

export const SymbolMaterialWrapper = memo(
  forwardRef<SymbolMaterial, SymbolMaterialWrapperProps>((props, ref) =>
    import.meta.env.MODE === 'production' ? (
      <symbolMaterial {...props} ref={ref} />
    ) : (
      <SymbolMaterialDevelopmentWrapper ref={ref} {...props} />
    )
  )
);

export class SymbolMaterial extends MeshStandardMaterial {
  #uniforms: WebGLProgramParametersWithUniforms['uniforms'] = {};
  #vertexShader?: string;
  #fragmentShader?: string;
  #shaderVersion: number = 0;

  set uPlayer(value: 1 | 2) {
    setUniform(this.#uniforms, 'uPlayer', value);
  }

  set uEmissiveIntensity(value: number) {
    this.emissiveIntensity = value;
    setUniform(this.#uniforms, 'uEmissiveIntensity', value);
  }

  set uMaxIntensity(value: number) {
    setUniform(this.#uniforms, 'uMaxIntensity', value);
  }

  set vertexShader(value: string | undefined) {
    if (value !== this.#vertexShader) {
      this.#vertexShader = value;
      this.#shaderVersion++;
    }
  }

  set fragmentShader(value: string | undefined) {
    if (value !== this.#fragmentShader) {
      this.#fragmentShader = value;
      this.#shaderVersion++;
    }
  }

  onBeforeCompile(parameters: WebGLProgramParametersWithUniforms) {
    for (const [key, { value }] of Object.entries(this.#uniforms)) {
      setUniform(parameters.uniforms, key, value);
    }
    this.#uniforms = parameters.uniforms;
    // TODO: somehow these vertex/fragmentShader parameters interfere with CellMaterial (if I move them above for loop, CellMaterial breaks)
    parameters.vertexShader = this.#vertexShader ?? vertexShader;
    parameters.fragmentShader = this.#fragmentShader ?? fragmentShader;
  }

  customProgramCacheKey(): string {
    return `${super.customProgramCacheKey()}-${this.#shaderVersion}`;
  }
}

extend({ SymbolMaterial });

declare module '@react-three/fiber' {
  interface ThreeElements {
    symbolMaterial: MaterialNode<SymbolMaterial, typeof SymbolMaterial>;
  }
}
