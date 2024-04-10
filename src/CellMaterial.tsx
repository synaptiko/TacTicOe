import { MaterialNode, extend } from '@react-three/fiber';
import { Color, MeshStandardMaterial, Vector4, WebGLProgramParametersWithUniforms } from 'three';
import vertexShader from './shaders/Cell.vert.glsl?raw';
import vertexShaderUrl from './shaders/Cell.vert.glsl?url';
import fragmentShader from './shaders/Cell.frag.glsl?raw';
import fragmentShaderUrl from './shaders/Cell.frag.glsl?url';
import { forwardRef, memo, useRef } from 'react';
import { setUniform } from './utils/setUniform';
import { useHotReloadShaders } from './utils/useHotReloadShaders';

type CellMaterialWrapperProps = {
  color: string;
  uEdges: Vector4;
  uPlayer: 0 | 1 | 2;
  uPlayerFill: number;
  uStrokeColor: Color;
  uEdgeThickness: number;
  uEdgeSmoothness: number;
  uSymbolThickness: number;
  uSymbolSmoothness: number;
  uSymbolGap: number;
  uSymbolRadius: number;
  uXSymbolScale: number;
};

const CellMaterialDevelopmentWrapper = memo(
  forwardRef<CellMaterial, CellMaterialWrapperProps>((props, ref) => {
    const materialRef = useRef<CellMaterial>(null!);
    const shaders = useHotReloadShaders(materialRef, vertexShaderUrl, fragmentShaderUrl);

    return (
      <cellMaterial
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

export const CellMaterialWrapper = memo(
  forwardRef<CellMaterial, CellMaterialWrapperProps>((props, ref) =>
    import.meta.env.MODE === 'production' ? (
      <cellMaterial {...props} ref={ref} />
    ) : (
      <CellMaterialDevelopmentWrapper ref={ref} {...props} />
    )
  )
);

export class CellMaterial extends MeshStandardMaterial {
  #uniforms: WebGLProgramParametersWithUniforms['uniforms'] = {};
  #vertexShader?: string;
  #fragmentShader?: string;
  #shaderVersion: number = 0;

  set uPlayer(value: 0 | 1 | 2) {
    setUniform(this.#uniforms, 'uPlayer', value);
  }

  set uPlayerFill(value: number) {
    setUniform(this.#uniforms, 'uPlayerFill', value);
  }

  set uEdges(value: Vector4) {
    setUniform(this.#uniforms, 'uEdges', value);
  }

  set uStrokeColor(value: Color) {
    setUniform(this.#uniforms, 'uStrokeColor', value);
  }

  set uEdgeThickness(value: number) {
    setUniform(this.#uniforms, 'uEdgeThickness', value);
  }

  set uEdgeSmoothness(value: number) {
    setUniform(this.#uniforms, 'uEdgeSmoothness', value);
  }

  set uSymbolThickness(value: number) {
    setUniform(this.#uniforms, 'uSymbolThickness', value);
  }

  set uSymbolSmoothness(value: number) {
    setUniform(this.#uniforms, 'uSymbolSmoothness', value);
  }

  set uSymbolGap(value: number) {
    setUniform(this.#uniforms, 'uSymbolGap', value);
  }

  set uSymbolRadius(value: number) {
    setUniform(this.#uniforms, 'uSymbolRadius', value);
  }

  set uXSymbolScale(value: number) {
    setUniform(this.#uniforms, 'uXSymbolScale', value);
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
    // TODO: somehow these vertex/fragmentShader parameters interfere with SymbolMaterial (if I move them below for loop, CellMaterial breaks)
    parameters.vertexShader = this.#vertexShader ?? vertexShader;
    parameters.fragmentShader = this.#fragmentShader ?? fragmentShader;
    for (const [key, { value }] of Object.entries(this.#uniforms)) {
      setUniform(parameters.uniforms, key, value);
    }
    this.#uniforms = parameters.uniforms;
  }

  customProgramCacheKey(): string {
    return `${super.customProgramCacheKey()}-${this.#shaderVersion}`;
  }
}

extend({ CellMaterial });

declare module '@react-three/fiber' {
  interface ThreeElements {
    cellMaterial: MaterialNode<CellMaterial, typeof CellMaterial>;
  }
}
