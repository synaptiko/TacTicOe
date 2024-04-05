import { RootState, useFrame } from '@react-three/fiber';
import { _XRFrame } from '@react-three/fiber/dist/declarations/src/core/utils';
import { DebuggerContext, IDebug } from './Debugger';
import { useContext } from 'react';

export function useFrameWithDebugger(
  callback: (state: RootState & { debug: IDebug }, delta: number, frame?: _XRFrame) => void,
  renderPriority?: number
) {
  const debug = useContext(DebuggerContext);

  useFrame((state, ...args) => {
    debug.onStartFrame(state.gl, state.clock.elapsedTime);
    callback({ ...state, debug }, ...args);
    debug.onEndFrame(state.clock.elapsedTime);
  }, renderPriority);
}
