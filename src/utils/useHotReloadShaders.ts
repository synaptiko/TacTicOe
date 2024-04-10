import { useEffect, useLayoutEffect, useState } from 'react';
import { Material } from 'three';

export function useHotReloadShaders(
  materialRef: React.MutableRefObject<Material>,
  vertexShaderUrl: string,
  fragmentShaderUrl: string
) {
  const [shaders, setShaders] = useState<{ vertexShader?: string; fragmentShader?: string }>({});

  useEffect(() => {
    import.meta.hot?.on('glsl-update', async (data) => {
      const url = data.url;

      if (url !== vertexShaderUrl && url !== fragmentShaderUrl) {
        // ignore other shader's updates
        return;
      }

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
  }, [fragmentShaderUrl, vertexShaderUrl]);

  useLayoutEffect(() => {
    materialRef.current.needsUpdate = true;
  }, [shaders, materialRef]);

  return shaders;
}
