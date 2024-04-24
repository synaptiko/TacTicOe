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
import { stringify, parse } from 'flatted';

// TODO: remove this (and other similar places) once the game is finished
const enableAllEffects = !isDevelopmentMode || true;

const background = '#7b627c';

document.addEventListener('keydown', function (event) {
  if (event.key === 'f') {
    toggleFullscreen();
  }
});

// TODO: what to finish:
// - winning condition and animation
// - game over screen in menu style (X/O win! Play again?)
// - add hover effect on cells
// - player selection screen (X or O)
// - credits screen
// - quit screen (are you sure you want to quit? => "blue screen of death")
// - address or remove all remaining TODOs

function App() {
  const [rootState, sendToRoot] = useRootMachine();
  const rootRef = RootMachineContext.useActorRef();
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
        // FIXME: remove all this hacky snapshotting logic once the game is finished
      } else if (event.key === 's') {
        saveSnapshot(rootRef, menuRef, gameRef);
      } else if (event.key === 'd') {
        deleteSnapshot();
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [sendToRoot, rootRef, menuRef, gameRef]);

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

// FIXME: remove all this hacky snapshotting logic once the game is finished
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function saveSnapshot(rootRef: any, menuRef: any, gameRef: any) {
  const snapshot = {
    root: rootRef.getPersistedSnapshot(),
    menu: menuRef.getPersistedSnapshot(),
    game: gameRef.getPersistedSnapshot(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  snapshot.root.context = { ...snapshot.root.context };
  delete snapshot.root.context.menuRef;
  delete snapshot.root.context.gameRef;
  snapshot.menu.context = { ...snapshot.menu.context };
  delete snapshot.menu.context.animations;
  snapshot.game.context = { ...snapshot.game.context };
  delete snapshot.game.context.animations;
  localStorage.setItem(
    'snapshot',
    stringify(snapshot, (_key, value) => {
      if (value instanceof Map) {
        return { $map: [...value.entries()] };
      }
      return value;
    })
  );
}

// FIXME: remove all this hacky snapshotting logic once the game is finished
function deleteSnapshot() {
  localStorage.removeItem('snapshot');
}

// FIXME: remove all this hacky snapshotting logic once the game is finished
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSnapshot(): any {
  const raw = localStorage.getItem('snapshot');

  if (raw) {
    const snapshot = parse(raw, (_key, value) => {
      if (value && value['$map']) {
        return new Map(value['$map']);
      }

      return value;
    });

    snapshot.menu.context.animations = new Map();
    snapshot.game.context.animations = new Map();

    return snapshot;
  } else {
    return undefined;
  }
}

// FIXME: remove all this hacky snapshotting logic once the game is finished
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RootMachineContextWithSnapshot = ({ snapshot }: { snapshot: any }) => {
  const menuRef = MenuMachineContext.useActorRef();
  const gameRef = GameMachineContext.useActorRef();

  if (snapshot) {
    snapshot.context.menuRef = menuRef;
    snapshot.context.gameRef = gameRef;
  }

  return (
    <RootMachineContext.Provider options={{ snapshot }}>
      <App />
    </RootMachineContext.Provider>
  );
};

const AppStateWrapper = () => {
  const snapshot = getSnapshot();

  return (
    <MenuMachineContext.Provider options={{ snapshot: snapshot?.menu }}>
      <GameMachineContext.Provider options={{ snapshot: snapshot?.game }}>
        <RootMachineContextWithSnapshot snapshot={snapshot?.root} />
      </GameMachineContext.Provider>
    </MenuMachineContext.Provider>
  );
};

export default AppStateWrapper;
