import { RootState, useFrame } from '@react-three/fiber';
import { _XRFrame } from '@react-three/fiber/dist/declarations/src/core/utils';
import { useMemo, useRef } from 'react';
import { useGameMachine } from './state/useGameMachine';

export function usePausableFrame(
  callback: (state: RootState, delta: number, frame?: _XRFrame) => void,
  renderPriority?: number
) {
  const [gameState] = useGameMachine();
  const isPausedRef = useRef(gameState.context.isPaused);
  useMemo(() => (isPausedRef.current = gameState.context.isPaused), [gameState.context.isPaused]);

  useFrame((state, ...args) => {
    const isPaused = isPausedRef.current;

    state.clock[isPaused ? 'stop' : 'start']();

    if (!isPaused) callback(state, ...args);
  }, renderPriority);
}
