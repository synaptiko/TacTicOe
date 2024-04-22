import { Canvas } from '@react-three/fiber';
import { times } from 'lodash';
import { Suspense, useEffect } from 'react';
import { Bloom, ChromaticAberration, EffectComposer, Vignette } from '@react-three/postprocessing';
import { OrbitControls, StatsGl } from '@react-three/drei';
import { Cell } from './Cell';
import { Symbols } from './Symbols';
import { Lasers } from './Lasers';
import { Debugger } from './Debugger';
import { Menu } from './Menu';
import classes from './App.module.css';
import { RootMachineContext } from './state/RootMachineContext';
import { MenuMachineContext } from './state/MenuMachineContext';
import { GameMachineContext } from './state/GameMachineContext';
import { useRootMachine } from './state/useRootMachine';
import cx from 'classnames';
import { isDevelopmentMode } from './isDevelopmentMode';
import { toggleFullscreen } from './utils/toggleFullscreen';

const enableAllEffects = !isDevelopmentMode;

const background = '#7b627c';

document.addEventListener('keydown', function (event) {
  if (event.key === 'f') {
    toggleFullscreen();
  }
});

// TODO: what to finish:
// - rework menu to also use gsap for animations to unify the codebase and fix the problem with `transitionEnd` event
// - better "development" mode where I can enable/disabled specific features & animations (or switch to different states)
// - winning condition
// - game over screen in menu style (You win/lose! Play again?)
// - winning animation
// - player selection screen (X or O)
// - add hover effect on cells
// - credits screen
// - quit screen (are you sure you want to quit? => "blue screen of death")
// - address or remove all remaining TODOs

function App() {
  const [rootState, sendToRoot] = useRootMachine();
  const menuRef = MenuMachineContext.useActorRef();
  const gameRef = GameMachineContext.useActorRef();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        const menuSnapshot = menuRef.getSnapshot();

        if (menuSnapshot.hasTag('visible') && menuSnapshot.context.isPaused) {
          sendToRoot({ type: 'resume' });
        } else {
          sendToRoot({ type: 'pause' });
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [sendToRoot, menuRef]);

  return (
    <Debugger isEnabled={isDevelopmentMode}>
      <div className={cx(classes.canvasContainer, rootState.matches('loaded') && classes.shown)}>
        <Canvas
          camera={{ fov: 30, near: 0.1, far: 1000, up: [0, 0, 1], position: [8.5, 8.5, 7.5] }}
          onCreated={() => sendToRoot({ type: 'loaded', menuRef, gameRef })}
        >
          <Suspense fallback={null}>
            {/* TODO: improve fog, make it denser at the ground level (see https://github.com/mrdoob/three.js/blob/master/examples/webgpu_custom_fog.html) */}
            {/* TODO: alternatively implement just screenspace-based gradient on cells' sides and symbols */}
            <fogExp2 attach="fog" color={background} density={0.06} />
            <color attach="background" args={[background]} />
            {isDevelopmentMode && <OrbitControls />}
            <directionalLight color="#ffedf8" intensity={1.25} position={[50, 35, 100]} />
            <Symbols />
            {times(7, (x: number) =>
              times(7, (y: number) => <Cell key={`${x}:${y}`} position={`${x}:${y}`} x={x} y={y} />)
            )}
            <Lasers />
            <EffectComposer>
              <Bloom
                luminanceThreshold={0}
                luminanceSmoothing={0.5}
                opacity={1}
                resolutionX={1024}
                resolutionY={1024}
              />
              {enableAllEffects ? <ChromaticAberration modulationOffset={1 / 3} radialModulation /> : <></>}
              <Vignette eskil={false} offset={0.25} darkness={0.5} />
            </EffectComposer>
            {isDevelopmentMode && <StatsGl />}
          </Suspense>
        </Canvas>
      </div>
      <Menu />
    </Debugger>
  );
}

const AppStateWrapper = () => (
  <MenuMachineContext.Provider>
    <GameMachineContext.Provider>
      <RootMachineContext.Provider>
        <App />
      </RootMachineContext.Provider>
    </GameMachineContext.Provider>
  </MenuMachineContext.Provider>
);

export default AppStateWrapper;
