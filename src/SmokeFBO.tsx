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
  Vector4,
  WebGLRenderTarget,
} from 'three';
import { MaterialNode, createPortal, extend, useFrame } from '@react-three/fiber';
import { MutableRefObject, useMemo, useRef } from 'react';
import { useFBO } from '@react-three/drei';

const maxAge = 2.0;

// TODO: could be useful later =>
// MathUtils.randFloatSpread(360);

// TODO: next steps
// 1. pass current emitters position with "spread" radius and density per "ideal frame" (= 120 FPS) with "buffering"
// 2. create proper particle shape with some noise and light/shadows
// 3. add variable maxAge, velocity and acceleration; adjust smoke particles to it
// 4. integrate curl noise to smoke particle
// 5. add sparks with gravity
// 6. fix remaining TODOs in this file
// 7. rename the file into SparksAndSmoke.tsx

function fillEmptyPositions(width: number, height: number) {
  const data = new Float32Array(width * height * 4);

  for (let i = 0; i < data.length; i++) {
    const stride = i * 4;

    data[stride] = 0; // x
    data[stride + 1] = 0; // y
    data[stride + 2] = 0; // z
    data[stride + 3] = -1.0; // age
  }

  return data;
}

function fillEmptyEmitters(width: number, height: number) {
  const data = new Float32Array(width * height * 4);

  for (let i = 0; i < data.length; i += 4) {
    data[i] = 0.0; // x
    data[i + 1] = 0.0; // y
    data[i + 2] = 0.0; // z
    data[i + 3] = 0.0; // particle id
  }

  return data;
}

function createDataTexture(fill: (width: number, height: number) => Float32Array, width: number, height: number) {
  const texture = new DataTexture(fill(width, height), width, height, RGBAFormat, FloatType);

  texture.needsUpdate = true;

  return texture;
}

class SimulationMaterial extends ShaderMaterial {
  constructor(positionsTexture: DataTexture, emittersTexture: DataTexture) {
    const uniforms = {
      uPositions: { value: positionsTexture },
      uPositionsResolution: { value: [positionsTexture.image.width, positionsTexture.image.height] },
      uEmitters: { value: emittersTexture },
      uEmittersResolution: { value: [emittersTexture.image.width, emittersTexture.image.height] },
      uDelta: { value: 0 },
      uMaxAge: { value: maxAge },
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
  emitterRefs: [emitter1Ref: MutableRefObject<Vector4>, emitter2Ref: MutableRefObject<Vector4>];
  onFrame: (texture: Texture) => void;
};

const positions = new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, 1, 0]);
const uvs = new Float32Array([0, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0]);

const Simulation = ({ width, height, emitterRefs: [emitter1Ref, emitter2Ref], onFrame }: SimulationProps) => {
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
  const positionsTexture = useMemo(() => createDataTexture(fillEmptyPositions, width, height), [width, height]);
  const emittersTexture = useMemo(() => createDataTexture(fillEmptyEmitters, 2, 1), []);
  const freeEmitterId = useRef(0);

  useFrame(({ gl }, delta) => {
    const [writeTarget, readTarget, initPhase] = targets.current;

    // TODO: create function to add emitters, including spread radius and density
    if (emitter1Ref.current.w === 0 && emitter2Ref.current.w === 0) {
      emittersTexture.image.data[0] = 0;
      emittersTexture.image.data[1] = 0;
      emittersTexture.image.data[2] = 0;
      emittersTexture.image.data[3] = -1;
      emittersTexture.image.data[4] = 0;
      emittersTexture.image.data[5] = 0;
      emittersTexture.image.data[6] = 0;
      emittersTexture.image.data[7] = -1;
    } else if (emitter1Ref.current.w !== 0 && emitter2Ref.current.w !== 0) {
      emittersTexture.image.data[0] = emitter1Ref.current.x;
      emittersTexture.image.data[1] = emitter1Ref.current.y;
      emittersTexture.image.data[2] = emitter1Ref.current.z;
      emittersTexture.image.data[3] = freeEmitterId.current++;
      emittersTexture.image.data[4] = emitter2Ref.current.x;
      emittersTexture.image.data[5] = emitter2Ref.current.y;
      emittersTexture.image.data[6] = emitter2Ref.current.z;
      emittersTexture.image.data[7] = freeEmitterId.current++;
    } else if (emitter1Ref.current.w === 0) {
      emittersTexture.image.data[0] = emitter1Ref.current.x;
      emittersTexture.image.data[1] = emitter1Ref.current.y;
      emittersTexture.image.data[2] = emitter1Ref.current.z;
      emittersTexture.image.data[3] = freeEmitterId.current++;
      emittersTexture.image.data[4] = 0;
      emittersTexture.image.data[5] = 0;
      emittersTexture.image.data[6] = 0;
      emittersTexture.image.data[7] = -1;
    } else {
      emittersTexture.image.data[0] = emitter2Ref.current.x;
      emittersTexture.image.data[1] = emitter2Ref.current.y;
      emittersTexture.image.data[2] = emitter2Ref.current.z;
      emittersTexture.image.data[3] = freeEmitterId.current++;
      emittersTexture.image.data[4] = 0;
      emittersTexture.image.data[5] = 0;
      emittersTexture.image.data[6] = 0;
      emittersTexture.image.data[7] = -1;
    }

    // TODO: cache positionsTexture.image.data.length
    freeEmitterId.current = freeEmitterId.current % positionsTexture.image.data.length;
    // TODO: detect if update is needed
    emittersTexture.needsUpdate = true;

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
      <simulationMaterial ref={simulationMaterialRef} args={[positionsTexture, emittersTexture]} />
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-uv" count={uvs.length / 2} array={uvs} itemSize={2} />
      </bufferGeometry>
    </mesh>,
    scene
  );
};

type SmokeFBOProps = {
  emitterRefs: SimulationProps['emitterRefs'];
};

export const SmokeFBO = ({ emitterRefs }: SmokeFBOProps) => {
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
      uMaxAge: { value: maxAge },
    }),
    []
  );

  function handleFrame(uPositions: Texture) {
    materialRef.current.uniforms.uPositions.value = uPositions;
  }

  return (
    <>
      <Simulation width={width} height={height} emitterRefs={emitterRefs} onFrame={handleFrame} />
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
