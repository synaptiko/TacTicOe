import { Canvas, ThreeEvent } from '@react-three/fiber';
import { times } from 'lodash';
import { Suspense, useState } from 'react';
import { Bloom, ChromaticAberration, DepthOfField, EffectComposer, Noise, Vignette } from '@react-three/postprocessing';
import { OrbitControls } from '@react-three/drei';
import { Cell } from './Cell';
import { Player, PositionKey } from './types';
import { Symbols } from './Symbols';
import { Lasers } from './Lasers';

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

function App() {
  const [playerPositions, setPlayerPositions] = useState(new Map<PositionKey, Player>());
  const [isX, setIsX] = useState(true);
  const [lastPosition, setLastPosition] = useState<[Player, x: number, y: number] | null>(null);

  function handleClick(event: ThreeEvent<MouseEvent>, position: PositionKey, x: number, y: number) {
    event.stopPropagation();

    if (!playerPositions.has(position)) {
      setPlayerPositions((map) => map.set(position, isX ? 'x' : 'o'));
      setIsX((prev) => !prev);
      setLastPosition([isX ? 'x' : 'o', x, y]);
    }
  }

  return (
    <div id="canvas-container">
      <Canvas camera={{ fov: 30, near: 0.1, far: 1000, up: [0, 0, 1], position: [8.5, 8.5, 7.5] }}>
        <Suspense fallback={null}>
          {/* TODO: improve fog, make it denser at the ground level (see https://github.com/mrdoob/three.js/blob/master/examples/webgpu_custom_fog.html) */}
          <fogExp2 attach="fog" color={background} density={0.06} />
          <color attach="background" args={[background]} />
          {isDevelopmentMode && <OrbitControls />}
          <directionalLight color="#ffedf8" intensity={1.25} position={[50, 35, 100]} />
          <Symbols activePlayer={isX ? 'x' : 'o'} />
          {times(7, (x: number) =>
            times(7, (y: number) => (
              <Cell key={`${x}:${y}`} x={x} y={y} player={playerPositions.get(`${x}:${y}`)} onClick={handleClick} />
            ))
          )}
          {lastPosition && (
            <Lasers color={lastPosition[0] === 'x' ? 'red' : 'blue'} x={lastPosition[1]} y={lastPosition[2]} />
          )}
          <EffectComposer>
            {enableAllEffects ? (
              <DepthOfField focusDistance={0} focalLength={0.02} bokehScale={2} resolutionX={2048} resolutionY={2048} />
            ) : (
              <></>
            )}
            <Bloom luminanceThreshold={0} luminanceSmoothing={0} opacity={1} resolutionX={2048} resolutionY={2048} />
            {enableAllEffects ? (
              <>
                <ChromaticAberration modulationOffset={1 / 3} radialModulation />
                <Noise opacity={0.0125} />
                <Noise opacity={0.125} premultiply />
                <Vignette eskil={false} offset={0.25} darkness={0.5} />
              </>
            ) : (
              <></>
            )}
          </EffectComposer>
        </Suspense>
      </Canvas>
    </div>
  );
}

export default App;
