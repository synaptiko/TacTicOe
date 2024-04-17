import { Canvas, ThreeEvent } from '@react-three/fiber';
import { times } from 'lodash';
import { Suspense, useEffect, useRef, useState } from 'react';
import { Bloom, ChromaticAberration, EffectComposer, Vignette } from '@react-three/postprocessing';
import { OrbitControls, StatsGl } from '@react-three/drei';
import { Cell } from './Cell';
import { Player, PositionKey } from './types';
import { Symbols } from './Symbols';
import { Lasers } from './Lasers';
import { Mesh } from 'three';
import { Debugger } from './Debugger';
import { Menu } from './Menu';
import classes from './App.module.css';
import { GameMachineContext, MenuMachineContext, RootMachineContext } from './RootMachineContext';
import { useGameMachine, useMenuMachine, useRootMachine } from './useRootMachine';
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
// - add xstate and state machine for game states
// - player selection screen (X or O)
// - better "development" mode where I can enable/disabled specific features & animations (or switch to different states)
// - winning condition
// - game over screen in menu style (You win/lose! Play again?)
// - winning animation
// - credits screen
// - quit screen (are you sure you want to quit? => "blue screen of death")
// - add hover effect on cells

// TODO: think about these ideas:
// - rubic cube mechanics: rotating the row/column
//   - maybe if you win, that row/column will rotate? what to do with diagonals then?
// - rotating to sides and you can go over edges

function App() {
  const [playerPositions, setPlayerPositions] = useState(new Map<PositionKey, Player>());
  const [isX, setIsX] = useState(true);
  const [lastPosition, setLastPosition] = useState<[player: Player, x: number, y: number] | null>(null);
  const xSymbolRef = useRef<Mesh>(null!);
  const oSymbolRef = useRef<Mesh>(null!);
  const [rootState, sendToRoot] = useRootMachine();
  const [menuState] = useMenuMachine();
  const [gameState] = useGameMachine();
  const menuRef = MenuMachineContext.useActorRef();
  const gameRef = GameMachineContext.useActorRef();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        // TODO: Toggle menu when game already started and menu is opened
        sendToRoot({ type: 'pause' });
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [sendToRoot]);

  function handleCellClick(event: ThreeEvent<MouseEvent>, position: PositionKey, x: number, y: number) {
    event.stopPropagation();

    if (!playerPositions.has(position)) {
      setPlayerPositions((map) => map.set(position, isX ? 'x' : 'o'));
      setIsX((prev) => !prev);
      setLastPosition([isX ? 'x' : 'o', x, y]);
    }
  }

  return (
    <Debugger isEnabled={isDevelopmentMode}>
      <div className={cx(classes.canvasContainer, rootState.matches('loaded') && classes.ready)}>
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
            {!gameState.matches('idle') && (
              <Symbols activePlayer={isX ? 'x' : 'o'} xSymbolRef={xSymbolRef} oSymbolRef={oSymbolRef} />
            )}
            {!gameState.matches('idle') &&
              times(7, (x: number) =>
                times(7, (y: number) => (
                  <Cell
                    key={`${x}:${y}`}
                    x={x}
                    y={y}
                    player={playerPositions.get(`${x}:${y}`)}
                    onClick={handleCellClick}
                  />
                ))
              )}
            {lastPosition && <Lasers player={lastPosition[0]} x={lastPosition[1]} y={lastPosition[2]} />}
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
      {menuState.hasTag('visible') && <Menu />}
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
