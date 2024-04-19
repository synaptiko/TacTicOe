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

const isDevelopmentMode = import.meta.env.MODE === 'development';
const enableAllEffects = !isDevelopmentMode;

const background = '#7b627c';

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    // If the document is not in fullscreen mode, request fullscreen on the document body
    document.documentElement.requestFullscreen().catch((err) => {
      console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
    });
  } else {
    // If the document is already in fullscreen, exit fullscreen mode
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
}

document.addEventListener('keydown', function (event) {
  if (event.key === 'f') {
    toggleFullscreen();
  }
});

// TODO: what to finish:
// - rework Lasers to use new animation method too
// - implement proper pausing (it should stop all animations, including useFrame & particles)
// - add copy of the Iosevka font!
// - better "development" mode where I can enable/disabled specific features & animations (or switch to different states)
// - winning condition
// - game over screen in menu style (You win/lose! Play again?)
// - winning animation
// - player selection screen (X or O)
// - credits screen
// - quit screen (are you sure you want to quit? => "blue screen of death")
// - menu sometimes get stuck in "visible" state; looks like `transitionEnd` is not always sent (sometimes this happens with cells too)
// - add hover effect on cells

// TODO: think about these ideas:
// - rubic cube mechanics: rotating the row/column
//   - maybe if you win, that row/column will rotate? what to do with diagonals then?
// - rotating to sides and you can go over edges

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
