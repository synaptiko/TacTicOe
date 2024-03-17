import { Canvas, MaterialNode, ThreeEvent, extend } from '@react-three/fiber'
import { times } from 'lodash';
import { Suspense, useEffect, useRef, useState } from 'react';
import { Bloom, ChromaticAberration, DepthOfField, EffectComposer, Noise, Vignette } from '@react-three/postprocessing';
import { Environment, OrbitControls, useGLTF } from '@react-three/drei';
import { BufferGeometry, Group, Mesh, MeshStandardMaterial, Vector4, WebGLProgramParametersWithUniforms } from 'three';
import gsap from 'gsap';
import symbolsUrl from './symbols.glb?url';

useGLTF.preload(symbolsUrl);

class CustomMaterial extends MeshStandardMaterial {
  uEdges!: Vector4;

  onBeforeCompile(parameters: WebGLProgramParametersWithUniforms) {
    parameters.uniforms.uEdges = { value: this.uEdges };

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
        '#define STANDARD\nvarying vec2 vMyUv;\nvarying vec3 vMyNormal;\nuniform vec4 uEdges;'
      )
      .replace(
        'vec4 diffuseColor = vec4( diffuse, opacity );',
        `vec4 diffuseColor = vec4( diffuse, opacity );

          vec3 upVector = vec3(0.0, 0.0, 1.0);
          if (dot(vMyNormal, upVector) > 0.99) {
            float edgeWidth = 0.03;
            float edgeTransition = 0.01;
            float edgeStart = edgeWidth - edgeTransition;
            float edgeBlend = 1.0;

            if (uEdges.x == 1.0) {
              edgeBlend *= smoothstep(edgeStart, edgeWidth, vMyUv.x);
            }
            if (uEdges.y == 1.0) {
              edgeBlend *= smoothstep(edgeStart, edgeWidth, vMyUv.y);
            }
            if (uEdges.z == 1.0) {
              edgeBlend *= smoothstep(edgeStart, edgeWidth, 1.0 - vMyUv.x);
            }
            if (uEdges.w == 1.0) {
              edgeBlend *= smoothstep(edgeStart, edgeWidth, 1.0 - vMyUv.y);
            }

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

type LaserProps = {
  x: number;
  y: number;
  color: 'red' | 'blue'
}

function Laser({ x, y, color }: LaserProps) {
  const meshRef = useRef<Mesh>(null!);

  useEffect(() => {
    gsap.to(meshRef.current.position, {
      x: x - 3,
      y: y - 3,
      z: 2,
      duration: 0.125,
      delay: 1.25,
      ease: "power4.inOut",
    });
  }, [x, y]);

  return (
    <mesh position={[x - 3, y - 3, 6]} ref={meshRef}>
      <boxGeometry args={[0.005, 0.005, 4]} />
      <meshStandardMaterial emissive={color === 'red' ? 'hotpink' : 'skyblue'} emissiveIntensity={12} />
    </mesh>
  );
}

type FieldProps = {
  x: number;
  y: number;
  color: string;
  onClick: (event: ThreeEvent<MouseEvent>, x: number, y: number) => void;
}

function Field({ x, y, color, onClick }: FieldProps) {
  const meshRef = useRef<Mesh>(null!);

  useEffect(() => {
    gsap.to(meshRef.current.position, {
      x: x - 3,
      y: y - 3,
      z: -5,
      duration: 1 + Math.min(x, y) / 10,
      ease: "power4.inOut",
    });
  }, [x, y]);

  return <mesh ref={meshRef} position={[x - 3, y - 3, -15]} onClick={(event) => onClick(event, x, y)}>
    <boxGeometry args={[1, 1, 10]} />
    <customMaterial
      color={color}
      uEdges={new Vector4(x === 0 ? 0 : 1, y === 0 ? 0 : 1, x === 6 ? 0 : 1, y === 6 ? 0 : 1)}
    />
  </mesh>
}

function Symbols() {
  const { nodes: { x, o } } = useGLTF(symbolsUrl);
  const xGeometry = 'geometry' in x && x.geometry instanceof BufferGeometry ? x.geometry : undefined;
  const oGeometry = 'geometry' in o && o.geometry instanceof BufferGeometry ? o.geometry : undefined;
  const groupRef = useRef<Group>(null!);

  useEffect(() => {
    gsap.to(groupRef.current.position, {
      x: 0,
      y: 0,
      z: 0,
      duration: 1,
      ease: "power4.inOut",
    });
  }, []);

  return (
    <group ref={groupRef} dispose={null} position={[0, 0, 3]}>
      <mesh geometry={xGeometry} rotation={[Math.PI / 2, -Math.PI, 0]} scale={10} position={[3, -3, 1.75]}>
        <meshStandardMaterial color="#E72929" emissive="#E72929" emissiveIntensity={20} />
      </mesh>
      <mesh geometry={oGeometry} rotation={[0, Math.PI / 2, 0]} scale={10} position={[-3, 3, 1.75]}>
        <meshStandardMaterial color="#299CE7" emissive="#299CE7" emissiveIntensity={20} />
      </mesh>
    </group>
  )
}

function App() {
  const [colors, setColors] = useState(new Map<string, string>());
  const [isX, setIsX] = useState(false);

  function handleClick(event: ThreeEvent<MouseEvent>, x: number, y: number) {
    const key = `${x}:${y}`;

    event.stopPropagation();

    if (!colors.has(key)) {
      setColors(colors.set(key, isX ? '#E72929' : '#299CE7'));
      setIsX(prev => !prev)
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
          {times(7, (x: number) => (
            times(7, (y: number) => (
              <Field
                key={`${x}:${y}`}
                x={x}
                y={y}
                color={colors.get(`${x}:${y}`) ?? "gray"}
                onClick={handleClick}
              />
            ))
          ))}
          {true && <Laser color="red" x={4} y={2} />}
          {true && <Laser color="blue" x={2} y={4} />}
          <EffectComposer>
            <DepthOfField focusDistance={0} focalLength={0.02} bokehScale={2} resolutionX={2048} resolutionY={2048} />
            <Bloom luminanceThreshold={3} luminanceSmoothing={0} opacity={0.5} resolutionX={2048} resolutionY={2048} />
            <ChromaticAberration modulationOffset={1/3} radialModulation />
            <Noise opacity={0.0125} />
            <Noise opacity={0.125} premultiply />
            <Vignette eskil={false} offset={0.25} darkness={0.5} />
          </EffectComposer>
        </Suspense>
      </Canvas>
    </div>
  );
}

export default App;
