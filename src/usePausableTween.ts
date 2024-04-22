import { useCallback, useEffect, useRef } from 'react';
import { useGameMachine } from './state/useGameMachine';

type PausableTween = gsap.core.Tween & { unregister: () => void };

export function usePausableTween() {
  const [gameState] = useGameMachine();
  const tweenRefs = useRef<PausableTween[]>([]);

  const pausable = useCallback((tween: gsap.core.Tween): PausableTween => {
    const pausableTween = tween as PausableTween; // needed in order to add the `unregister` method

    tweenRefs.current.push(pausableTween);

    pausableTween.unregister = () => {
      const index = tweenRefs.current.indexOf(pausableTween);

      if (index >= 0) {
        tweenRefs.current.splice(index, 1);
      }
    };

    const pause = pausableTween.pause.bind(pausableTween);
    const resume = pausableTween.resume.bind(pausableTween);
    let wasActive: boolean | undefined = undefined;

    pausableTween.pause = () => {
      wasActive = pausableTween.isActive();

      if (wasActive) pause();

      return pausableTween;
    };
    pausableTween.resume = () => {
      if (wasActive === true) resume();

      return pausableTween;
    };

    return pausableTween;
  }, []);

  useEffect(() => {
    if (gameState.context.isPaused) {
      tweenRefs.current.forEach((tween) => tween.pause());
    } else {
      tweenRefs.current.forEach((tween) => tween.resume());
    }
  }, [gameState.context.isPaused]);

  return pausable;
}
