import { useContext, useEffect } from 'react';
import { RenderTargetDebuggerCallback, DebuggerContext } from './Debugger';

export function useRenderTargetDebugger(key: string, callback: RenderTargetDebuggerCallback) {
  const debug = useContext(DebuggerContext);

  useEffect(() => {
    const unregister = debug.registerRenderTargetDebugger(key, callback);

    return unregister;
  }, [debug, key, callback]);
}
