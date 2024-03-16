import { Canvas, MaterialNode, ThreeEvent, extend } from '@react-three/fiber'
import { times } from 'lodash';
import { useState } from 'react';
import { Bloom, ChromaticAberration, DepthOfField, EffectComposer, Noise, Vignette } from '@react-three/postprocessing';
import { Environment } from '@react-three/drei';
import { MeshStandardMaterial, WebGLProgramParametersWithUniforms } from 'three';

type LaserProps = {
  color: 'red' | 'blue'
}

function Laser({ color }: LaserProps) {
  return (
    <mesh position={[0, 0, 2]}>
      <boxGeometry args={[0.005, 0.005, 4]} />
      <meshStandardMaterial emissive={color === 'red' ? 'hotpink' : 'skyblue'} emissiveIntensity={12} />
    </mesh>
  );
}

class CustomMaterial extends MeshStandardMaterial {
  onBeforeCompile(parameters: WebGLProgramParametersWithUniforms) {
    parameters.vertexShader = parameters.vertexShader
      .replace(
        '#define STANDARD',
        '#define STANDARD\nvarying vec2 vMyUv;\nvarying vec3 vMyNormal;'
      )
      .replace(
        'vWorldPosition = worldPosition.xyz;\n#endif',
        'vWorldPosition = worldPosition.xyz;\n#endif\nvMyUv = uv;\nvMyNormal = normal;'
      );

    parameters.fragmentShader = parameters.fragmentShader
      .replace(
        '#define STANDARD',
        '#define STANDARD\nvarying vec2 vMyUv;\nvarying vec3 vMyNormal;'
      )
      .replace(
        'vec4 diffuseColor = vec4( diffuse, opacity );',
        `vec4 diffuseColor = vec4( diffuse, opacity );

          vec3 upVector = vec3(0.0, 0.0, 1.0);
          if (dot(vMyNormal, upVector) > 0.99) {
            float edgeWidth = 0.03;
            float edgeTransition = 0.01;
            float edgeStart = edgeWidth - edgeTransition;
            float edgeBlend = smoothstep(edgeStart, edgeWidth, vMyUv.x);
            edgeBlend *= smoothstep(edgeStart, edgeWidth, vMyUv.y);
            edgeBlend *= smoothstep(edgeStart, edgeWidth, 1.0 - vMyUv.x);
            edgeBlend *= smoothstep(edgeStart, edgeWidth, 1.0 - vMyUv.y);

            vec3 edgeColor = diffuseColor.rgb * 0.125;
            diffuseColor.rgb = mix(diffuseColor.rgb, edgeColor, 1.0 - edgeBlend);
          } else {
            diffuseColor.rgb = diffuseColor.rgb * 0.125;
          }
        `
      );
  }
}

extend({ CustomMaterial });

declare module '@react-three/fiber' {
  interface ThreeElements {
    customMaterial: MaterialNode<CustomMaterial, typeof CustomMaterial>
  }
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
        <Environment preset="dawn" />
        <color attach="background" args={['#7b627c']} />
        <directionalLight color="white" intensity={3} position={[10, 0, 100]} />
        {times(7, (x: number) => (
          times(7, (y: number) => (
            <mesh key={`${x}:${y}`} position={[x - 3, y - 3, -5]} onClick={(event) => handleClick(event, x, y)}>
              <boxGeometry args={[1, 1, 10]} />
              <customMaterial color={colors.get(`${x}:${y}`) ?? "gray"} />
            </mesh>
          ))
        ))}
        {false && <Laser color="red" />}
        <EffectComposer>
          <DepthOfField focusDistance={0} focalLength={0.02} bokehScale={2} resolutionX={2048} resolutionY={2048} />
          <Bloom luminanceThreshold={3} luminanceSmoothing={0} opacity={0.5} resolutionX={2048} resolutionY={2048} />
          <ChromaticAberration modulationOffset={1/3} radialModulation />
          <Noise opacity={0.0125} />
          <Noise opacity={0.125} premultiply />
          <Vignette eskil={false} offset={0.25} darkness={0.5} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}

export default App;
