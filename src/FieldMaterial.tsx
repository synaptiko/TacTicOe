import { MaterialNode, extend } from '@react-three/fiber';
import { MeshStandardMaterial, Vector4, WebGLProgramParametersWithUniforms } from 'three';
import vertexShader from './shaders/Field.vert.glsl?raw';
import fragmentShader from './shaders/Field.frag.glsl?raw';
import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react';

type FieldMaterialWrapperProps = {
  color: string;
  uEdges: Vector4;
};

const FieldMaterialDevelopmentWrapper = memo(({ color, uEdges }: FieldMaterialWrapperProps) => {
  const materialRef = useRef<FieldMaterial>(null!);
  const [shaders, setShaders] = useState<{ vertexShader?: string; fragmentShader?: string }>({});

  useEffect(() => {
    import.meta.hot?.on('glsl-update', async (data) => {
      const url = 'url' in data && typeof data.url === 'string' ? data.url : undefined;

      if (!url) {
        return;
      }

      const content = await (await fetch(`${url}?t=${Date.now}`)).text();

      if (url.endsWith('/shaders/Field.vert.glsl')) {
        setShaders((shaders) => ({
          ...shaders,
          vertexShader: content,
        }));
      } else if (url.endsWith('/shaders/Field.frag.glsl')) {
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

  return <fieldMaterial ref={materialRef} color={color} uEdges={uEdges} {...shaders} />;
});

export const FieldMaterialWrapper = memo((props: FieldMaterialWrapperProps) =>
  import.meta.env.MODE === 'production' ? <fieldMaterial {...props} /> : <FieldMaterialDevelopmentWrapper {...props} />
);

export class FieldMaterial extends MeshStandardMaterial {
  uEdges!: Vector4;
  #vertexShader?: string;
  #fragmentShader?: string;
  #shaderVersion: number = 0;

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
    parameters.uniforms.uEdges = { value: this.uEdges };
    parameters.vertexShader = this.#vertexShader ?? vertexShader;
    parameters.fragmentShader = this.#fragmentShader ?? fragmentShader;
  }

  customProgramCacheKey(): string {
    return `${super.customProgramCacheKey()}-${this.#shaderVersion}`;
  }
}

extend({ FieldMaterial });

declare module '@react-three/fiber' {
  interface ThreeElements {
    fieldMaterial: MaterialNode<FieldMaterial, typeof FieldMaterial>;
  }
}
