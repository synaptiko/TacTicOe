import { MaterialNode, extend } from '@react-three/fiber';
import { MeshStandardMaterial, Vector4, WebGLProgramParametersWithUniforms } from 'three';
import vertexShader from './shaders/Cell.vert.glsl?raw';
import vertexShaderUrl from './shaders/Cell.vert.glsl?url';
import fragmentShader from './shaders/Cell.frag.glsl?raw';
import fragmentShaderUrl from './shaders/Cell.frag.glsl?url';
import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import invariant from 'tiny-invariant';

type CellMaterialWrapperProps = {
  color: string;
  uEdges: Vector4;
  uPlayer: 0 | 1 | 2;
};

const CellMaterialDevelopmentWrapper = memo((props: CellMaterialWrapperProps) => {
  const materialRef = useRef<CellMaterial>(null!);
  const [shaders, setShaders] = useState<{ vertexShader?: string; fragmentShader?: string }>({});

  useEffect(() => {
    import.meta.hot?.on('glsl-update', async (data) => {
      const url = data.url;

      invariant(url === vertexShaderUrl || url === fragmentShaderUrl, 'Invalid shader URL');

      const content = await (await fetch(url)).text();

      if (url === vertexShaderUrl) {
        setShaders((shaders) => ({
          ...shaders,
          vertexShader: content,
        }));
      } else if (url === fragmentShaderUrl) {
        setShaders((shaders) => ({
          ...shaders,
          fragmentShader: content,
        }));
      }
    });
  }, []);

  useLayoutEffect(() => {
    materialRef.current.needsUpdate = true;
  }, [shaders]);

  return <cellMaterial ref={materialRef} {...props} {...shaders} />;
});

export const CellMaterialWrapper = memo((props: CellMaterialWrapperProps) =>
  import.meta.env.MODE === 'production' ? <cellMaterial {...props} /> : <CellMaterialDevelopmentWrapper {...props} />
);

export class CellMaterial extends MeshStandardMaterial {
  #uniforms: WebGLProgramParametersWithUniforms['uniforms'] = {};
  #vertexShader?: string;
  #fragmentShader?: string;
  #shaderVersion: number = 0;

  set uPlayer(value: 0 | 1 | 2) {
    setUniform(this.#uniforms, 'uPlayer', value);
  }

  set uEdges(value: Vector4) {
    setUniform(this.#uniforms, 'uEdges', value);
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
    parameters.vertexShader = this.#vertexShader ?? vertexShader;
    parameters.fragmentShader = this.#fragmentShader ?? fragmentShader;
  }

  customProgramCacheKey(): string {
    return `${super.customProgramCacheKey()}-${this.#shaderVersion}`;
  }
}

function setUniform(uniforms: WebGLProgramParametersWithUniforms['uniforms'], name: string, value: unknown) {
  uniforms[name] = uniforms[name] ?? { value };

  if (uniforms[name].value !== value) {
    uniforms[name].value = value;
  }
}

extend({ CellMaterial });

declare module '@react-three/fiber' {
  interface ThreeElements {
    cellMaterial: MaterialNode<CellMaterial, typeof CellMaterial>;
  }
}
