import { Canvas, ThreeEvent } from '@react-three/fiber'
import { times } from 'lodash';
import { useState } from 'react';
import { Bloom, EffectComposer } from '@react-three/postprocessing';

type LaserProps = {
  color: 'red' | 'blue'
}

function Laser({ color }: LaserProps) {
  return (
    <mesh position={[0, 0, 2]}>
      <boxGeometry args={[0.005, 0.005, 4]} />
      <meshStandardMaterial emissive={color === 'red' ? 'hotpink' : 'skyblue'} emissiveIntensity={5} />
    </mesh>
  );
}

function App() {
  const [colors, setColors] = useState(new Map<string, string>());

  const [isX, setIsX] = useState(false);

  function handleClick(event: ThreeEvent<MouseEvent>, x: number, y: number) {
    const key = `${x}:${y}`;

    event.stopPropagation();

    if (!colors.has(key)) {
      setColors(colors.set(key, isX ? 'hotpink' : 'darkblue'));
      setIsX(prev => !prev)
    }
  }

  return (
    <div id="canvas-container">
      <Canvas camera={{ fov: 25, near: 0.1, far: 1000, up: [0, 0, 1], position: [10, 10, 5] }}>
        <ambientLight intensity={0.75} />
        <directionalLight color="white" position={[0, 0, 100]} />
        {times(7, (x: number) => (
          times(7, (y: number) => (
            <mesh key={`${x}:${y}`} position={[x * 1.1 - 3 * 1.1, y * 1.1 - 3 * 1.1, -5]} onClick={(event) => handleClick(event, x, y)}>
              <boxGeometry args={[1, 1, 10]} />
              <meshStandardMaterial color={colors.get(`${x}:${y}`) ?? "gray"} />
            </mesh>
          ))
        ))}
        {false && <Laser color="red" />}
        <EffectComposer>
          <Bloom
            luminanceThreshold={1}
            luminanceSmoothing={0}
            resolutionX={1024}
            resolutionY={1024}
          />
        </EffectComposer>
        <color attach="background" args={['skyblue']} />
      </Canvas>
    </div>
  );
}

export default App;
