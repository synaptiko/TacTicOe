import { Plugin } from 'vite';

export default function hmrGLSL(): Plugin {
  return {
    name: 'hmr-glsl',
    handleHotUpdate({ server, modules }) {
      let updated = false;

      for (const { url } of modules) {
        if (url.endsWith('.glsl')) {
          server.hot.send({
            type: 'custom',
            event: 'glsl-update',
            data: { url },
          });
          updated = true;
        }
      }

      if (updated) {
        return [];
      }
    },
  };
}
