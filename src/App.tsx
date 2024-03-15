import { Canvas } from '@react-three/fiber'
import { times } from 'lodash';
import { useState } from 'react';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
// import { OrbitControls } from '@react-three/drei';

function App() {
  const [colors, setColors] = useState(new Map<string, string>());

  const [isX, setIsX] = useState(false);

  function handleClick(x: number, y: number) {
    const key = `${x}:${y}`;

    if (!colors.has(key)) {
      setColors(colors.set(key, isX ? "hotpink" : 'darkblue'));
      setIsX(prev => !prev)
    }
  }

  return (
    <div id="canvas-container">
      <Canvas camera={{ fov: 25, near: 0.1, far: 1000, position: [-18, 10, 18] }}>
        {/* <OrbitControls /> */}
        <ambientLight intensity={0.75} />
        <directionalLight color="white" position={[10, 100, 10]} />
        {times(7, (y: number) => (
          times(7, (x: number) => (
            <mesh key={`${x}:${y}`} position={[x * 2.1 - 3 * 2.1, -5, y * 2.1 - 3 * 2.1]} onClick={(event) => {
                event.stopPropagation();
                handleClick(x, y);
              }}>
              <boxGeometry args={[2, 10, 2]} />
              <meshStandardMaterial color={colors.get(`${x}:${y}`) ?? "gray"} />
            </mesh>
          ))
        ))}
        <mesh>
          <boxGeometry args={[0.02, 100, 0.02]} />
          <meshStandardMaterial emissive="skyblue" emissiveIntensity={5} />
          {/* <meshBasicMaterial color='red' emissive='red' /> */}
        </mesh>
        <axesHelper scale={10} />
        <EffectComposer>
          <Bloom
            luminanceThreshold={0.3}
            luminanceSmoothing={0.9}
            height={300}
          />
        </EffectComposer>
        <color attach="background" args={['skyblue']} />
      </Canvas>
    </div>
  );
}

export default App;
