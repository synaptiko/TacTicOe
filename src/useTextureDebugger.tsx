import { useContext, useEffect } from 'react';
import { TextureDebuggerCallback, DebuggerContext } from './Debugger';

export function useTextureDebugger(key: string, callback: TextureDebuggerCallback) {
  const debug = useContext(DebuggerContext);

  useEffect(() => {
    const unregister = debug.registerTextureDebugger(key, callback);

    return unregister;
  }, [debug, key, callback]);
}
