import { Canvas, ThreeEvent } from '@react-three/fiber';
import { times } from 'lodash';
import { Suspense, useRef, useState } from 'react';
import { Bloom, ChromaticAberration, EffectComposer, Vignette } from '@react-three/postprocessing';
import { OrbitControls, StatsGl } from '@react-three/drei';
import { Cell } from './Cell';
import { Player, PositionKey } from './types';
import { Symbols } from './Symbols';
import { Lasers } from './Lasers';
// import { BlendFunction, KernelSize } from 'postprocessing';
// import { DepthOfField, GodRays } from '@react-three/postprocessing';
import { Mesh } from 'three';
import { Debugger } from './Debugger';

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

  function handleClick(event: ThreeEvent<MouseEvent>, position: PositionKey, x: number, y: number) {
    event.stopPropagation();

    if (!playerPositions.has(position)) {
      setPlayerPositions((map) => map.set(position, isX ? 'x' : 'o'));
      setIsX((prev) => !prev);
      setLastPosition([isX ? 'x' : 'o', x, y]);
    }
  }

  return (
    <Debugger isEnabled={isDevelopmentMode}>
      <div id="canvas-container">
        <Canvas camera={{ fov: 30, near: 0.1, far: 1000, up: [0, 0, 1], position: [8.5, 8.5, 7.5] }}>
          <Suspense fallback={null}>
            {/* TODO: improve fog, make it denser at the ground level (see https://github.com/mrdoob/three.js/blob/master/examples/webgpu_custom_fog.html) */}
            {/* TODO: alternatively implement just screenspace-based gradient on cells' sides and symbols */}
            <fogExp2 attach="fog" color={background} density={0.06} />
            <color attach="background" args={[background]} />
            {isDevelopmentMode && <OrbitControls />}
            <directionalLight color="#ffedf8" intensity={1.25} position={[50, 35, 100]} />
            <Symbols activePlayer={isX ? 'x' : 'o'} xSymbolRef={xSymbolRef} oSymbolRef={oSymbolRef} />
            {times(7, (x: number) =>
              times(7, (y: number) => (
                <Cell key={`${x}:${y}`} x={x} y={y} player={playerPositions.get(`${x}:${y}`)} onClick={handleClick} />
              ))
            )}
            {lastPosition && <Lasers player={lastPosition[0]} x={lastPosition[1]} y={lastPosition[2]} />}
            <EffectComposer>
              {/* TODO: consider adding motion blur */}
              {enableAllEffects ? (
                <>
                  {/* TODO: looks like depth of field is making rendering very slow; consider removing it */}
                  {/* <DepthOfField
                    focusDistance={0}
                    focalLength={0.02}
                    bokehScale={2}
                    resolutionX={1024}
                    resolutionY={1024}
                  /> */}
                  {/* TODO: looks like GodRays covers smoke & sparks; will probably get rid of it or replace it with other custom "bloom-like" effect */}
                  {/* <GodRays
                    sun={xSymbolRef}
                    blendFunction={BlendFunction.SCREEN}
                    samples={60}
                    density={0.96 * 5}
                    decay={0.9 / 1.5}
                    weight={0.4 / 4}
                    exposure={0.6 / 3}
                    clampMax={2}
                    kernelSize={KernelSize.HUGE}
                    blur={true}
                  />
                  <GodRays
                    sun={oSymbolRef}
                    blendFunction={BlendFunction.SCREEN}
                    samples={60}
                    density={0.96 * 5}
                    decay={0.9 / 1.5}
                    weight={0.4 / 4}
                    exposure={0.6 / 3}
                    clampMax={2}
                    kernelSize={KernelSize.HUGE}
                    blur={true}
                  /> */}
                </>
              ) : (
                <></>
              )}
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
    </Debugger>
  );
}

export default App;
