import vertexShader from './shaders/SmokeFBO.vert.glsl?raw';
import fragmentShader from './shaders/SmokeFBO.frag.glsl?raw';
import simulationVertexShader from './shaders/SmokeFBO.sim.vert.glsl?raw';
import simulationFragmentShader from './shaders/SmokeFBO.sim.frag.glsl?raw';
import {
  AdditiveBlending,
  DataTexture,
  FloatType,
  NearestFilter,
  OrthographicCamera,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  Texture,
  WebGLRenderTarget,
} from 'three';
import { MaterialNode, createPortal, extend, useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { useFBO } from '@react-three/drei';

const getRandomData = (width: number, height: number) => {
  const length = width * height * 4;
  const data = new Float32Array(length);

  for (let i = 0; i < length; i++) {
    const stride = i * 4;

    // const distance = Math.sqrt(Math.random()) * 2.0;
    // const theta = MathUtils.randFloatSpread(360);
    // const phi = MathUtils.randFloatSpread(360);

    // data[stride] = distance * Math.sin(theta) * Math.cos(phi);
    // data[stride + 1] = distance * Math.sin(theta) * Math.sin(phi);
    // data[stride + 2] = distance * Math.cos(theta) + 2;
    data[stride] = 0;
    data[stride + 1] = 0;
    data[stride + 2] = 0;
    data[stride + 3] = -1.0;
  }

  // TODO: next steps
  // 1. add id for each particle: texture will be height * 2 (additional data will be read from v / 2 part; based on uv)
  // 2. add "emitter" texture with position and id; if id is -1, then we will ignore it (this way we can have static buffer texture and emitter can start/stop on demand)
  // 3. consider adding curl noise to the particles

  return data;
};

class SimulationMaterial extends ShaderMaterial {
  constructor(positionsTexture: DataTexture) {
    const uniforms = {
      uPositions: { value: positionsTexture },
      uDelta: { value: 0 },
    };

    super({
      uniforms,
      vertexShader: simulationVertexShader,
      fragmentShader: simulationFragmentShader,
    });
  }
}

extend({ SimulationMaterial });

declare module '@react-three/fiber' {
  interface ThreeElements {
    simulationMaterial: MaterialNode<SimulationMaterial, typeof SimulationMaterial>;
  }
}

type SimulationProps = {
  width: number;
  height: number;
  onFrame: (texture: Texture) => void;
};

const positions = new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, 1, 0]);
const uvs = new Float32Array([0, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0]);

const Simulation = ({ width, height, onFrame }: SimulationProps) => {
  const scene = useMemo(() => new Scene(), []);
  const camera = useMemo(() => new OrthographicCamera(-1, 1, 1, -1, 1 / Math.pow(2, 53), 1), []);
  const fboParams = useMemo(
    () => ({
      minFilter: NearestFilter,
      magFilter: NearestFilter,
      format: RGBAFormat,
      stencilBuffer: false,
      type: FloatType,
    }),
    []
  );
  const renderTargetA = useFBO(width, height, fboParams);
  const renderTargetB = useFBO(width, height, fboParams);
  const targets = useRef<[write: WebGLRenderTarget<Texture>, read: WebGLRenderTarget<Texture>, initPhase?: boolean]>([
    renderTargetA,
    renderTargetB,
    true,
  ]);
  const simulationMaterialRef = useRef<SimulationMaterial>(null!);
  const positionsTexture = useMemo(() => {
    const texture = new DataTexture(getRandomData(width, height), width, height, RGBAFormat, FloatType);

    texture.needsUpdate = true;

    return texture;
  }, [width, height]);

  useFrame(({ gl }, delta) => {
    const [writeTarget, readTarget, initPhase] = targets.current;

    if (!initPhase) {
      simulationMaterialRef.current.uniforms.uPositions.value = readTarget.texture;
    }
    simulationMaterialRef.current.uniforms.uDelta.value = delta;

    gl.setRenderTarget(writeTarget);
    gl.clear();
    gl.render(scene, camera);
    gl.setRenderTarget(null);

    onFrame(writeTarget.texture);

    targets.current = [readTarget, writeTarget];
  });

  return createPortal(
    <mesh>
      <simulationMaterial ref={simulationMaterialRef} args={[positionsTexture]} />
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-uv" count={uvs.length / 2} array={uvs} itemSize={2} />
      </bufferGeometry>
    </mesh>,
    scene
  );
};

export const SmokeFBO = () => {
  const width = 128;
  const height = 128;
  const materialRef = useRef<ShaderMaterial>(null!);
  const particlesPosition = useMemo(() => {
    const length = width * height;
    const particles = new Float32Array(length * 3);

    for (let i = 0; i < length; i++) {
      const i3 = i * 3;

      particles[i3 + 0] = (i % width) / height;
      particles[i3 + 1] = i / width / height;
    }

    return particles;
  }, []);
  const uniforms = useMemo(
    () => ({
      uPositions: { value: null },
    }),
    []
  );

  function handleFrame(uPositions: Texture) {
    materialRef.current.uniforms.uPositions.value = uPositions;
  }

  return (
    <>
      <Simulation width={width} height={height} onFrame={handleFrame} />
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particlesPosition.length / 3}
            array={particlesPosition}
            itemSize={3}
          />
        </bufferGeometry>
        <shaderMaterial
          ref={materialRef}
          blending={AdditiveBlending}
          depthWrite={false}
          fragmentShader={fragmentShader}
          vertexShader={vertexShader}
          uniforms={uniforms}
        />
      </points>
    </>
  );
};
