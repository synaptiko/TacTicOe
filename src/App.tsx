import { Canvas, ThreeEvent } from '@react-three/fiber';
import { times } from 'lodash';
import { Suspense, useState } from 'react';
import { Bloom, ChromaticAberration, DepthOfField, EffectComposer, Noise, Vignette } from '@react-three/postprocessing';
import { Environment, OrbitControls } from '@react-three/drei';
import './FieldMaterial';
import { Laser } from './Laser';
import { Field } from './Field';
import { Symbols } from './Symbols';

const enableAllEffects = false;

function App() {
  const [colors, setColors] = useState(new Map<string, string>());
  const [isX, setIsX] = useState(false);

  function handleClick(event: ThreeEvent<MouseEvent>, x: number, y: number) {
    const key = `${x}:${y}`;

    event.stopPropagation();

    if (!colors.has(key)) {
      setColors(colors.set(key, isX ? '#E72929' : '#299CE7'));
      setIsX((prev) => !prev);
    }
  }

  return (
    <div id="canvas-container">
      <Canvas camera={{ fov: 25, near: 0.1, far: 1000, up: [0, 0, 1], position: [10, 10, 5] }}>
        <Suspense fallback={null}>
          <OrbitControls />
          <Environment preset="dawn" />
          <color attach="background" args={['#7b627c']} />
          <directionalLight color="white" intensity={3} position={[10, 0, 100]} />
          <Symbols />
          {times(7, (x: number) =>
            times(7, (y: number) => (
              <Field key={`${x}:${y}`} x={x} y={y} color={colors.get(`${x}:${y}`) ?? 'gray'} onClick={handleClick} />
            ))
          )}
          {true && <Laser color="red" x={4} y={2} />}
          {true && <Laser color="blue" x={2} y={4} />}
          <EffectComposer>
            {enableAllEffects ? (
              <DepthOfField focusDistance={0} focalLength={0.02} bokehScale={2} resolutionX={2048} resolutionY={2048} />
            ) : (
              <></>
            )}
            <Bloom luminanceThreshold={3} luminanceSmoothing={0} opacity={0.5} resolutionX={2048} resolutionY={2048} />
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
