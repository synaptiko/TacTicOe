import vertexShader from './shaders/SmokeFBO.vert.glsl?raw';
import fragmentShader from './shaders/SmokeFBO.frag.glsl?raw';
import simulationVertexShader from './shaders/SmokeFBO.sim.vert.glsl?raw';
import simulationFragmentShader from './shaders/SmokeFBO.sim.frag.glsl?raw';
import {
  AdditiveBlending,
  DataTexture,
  FloatType,
  MathUtils,
  NearestFilter,
  OrthographicCamera,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  Texture,
  Vector4,
  WebGLRenderTarget,
} from 'three';
import { MaterialNode, createPortal, extend } from '@react-three/fiber';
import { MutableRefObject, useMemo, useRef } from 'react';
import { useFBO } from '@react-three/drei';
import { symbolThickness } from './consts';
import { useFrameWithDebugger } from './useFrameWithDebugger';
import { RenderTargetDebuggerCallback, TextureDebuggerCallback } from './Debugger';
import { useTextureDebugger } from './useTextureDebugger';
import { useRenderTargetDebugger } from './useRenderTargetDebugger';

// const minAge = 0.5;
const maxAge = 2.0;
const emitterCount = 2; // = emitterRefs.length (needs to be in-sync)
// const emitterParticlesMin = 5; // per-frame
// const emitterParticlesMax = 25; // per-frame
const emitterParticlesMin = 1; // per-frame
const emitterParticlesMax = 1; // per-frame

const [width, height] = (() => {
  // we have an assumption that we will create that amount of particles per frame at 120 FPS
  const maxParticleAmount = maxAge * emitterParticlesMax * emitterCount * 120;
  const size = Math.ceil(Math.sqrt(maxParticleAmount));

  return [size, size];
})();

// TODO: next steps
// 1. add variable/dynamic maxAge, velocity and acceleration; adjust smoke particles to it
// 2. integrate curl noise to smoke particle
// 3. create proper particle texture with some noise and light/shadows
// 4. add sparks with gravity
// 5. refactor per-frame-definition of particles amount to be adaptive to current FPS instead; we will need to define some acceptable range like 30-120 FPS and implement different way to get emitter's positions with interpolation based on time variable to not create "clumps" of particles
// 6. fix remaining TODOs in this file
// 7. rename the file into SparksAndSmoke.tsx
// 8. fix particles' scale (responsiveness related)

function fillEmptyPositions(width: number, height: number) {
  const data = new Float32Array(width * height * 4);

  for (let i = 0; i < data.length; i += 4) {
    data[i] = 0; // x
    data[i + 1] = 0; // y
    data[i + 2] = 0; // z
    data[i + 3] = -1.0; // age
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

function clearEmitters(texture: DataTexture, startIndex: number) {
  const { data } = texture.image;

  for (let i = startIndex; i < data.length; i += 4) {
    data[i] = 0;
    data[i + 1] = 0;
    data[i + 2] = 0;
    data[i + 3] = -1;
  }
}

function fillEmitters(
  texture: DataTexture,
  freeEmitterIdRef: MutableRefObject<[id: number, length: number]>,
  emitter: Vector4,
  startIndex: number,
  spread: number,
  amount: number
) {
  if (emitter.w === 0) {
    return startIndex;
  }

  for (let i = 0; i < amount; i += 1) {
    texture.image.data[startIndex + 0] = emitter.x + Math.random() * spread - spread / 2;
    texture.image.data[startIndex + 1] = emitter.y + Math.random() * spread - spread / 2;
    texture.image.data[startIndex + 2] = emitter.z;
    texture.image.data[startIndex + 3] = getFreeId(freeEmitterIdRef);

    startIndex += 4;
  }

  return startIndex;
}

function getFreeId(ref: MutableRefObject<[id: number, length: number]>) {
  const [id, length] = ref.current;

  ref.current[0] = (id + 1) % length;

  return id;
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

const positions = new Float32Array([
  ...[-1, -1, 0], // bottom left
  ...[1, -1, 0], // bottom right
  ...[1, 1, 0], // top right
  ...[-1, 1, 0], // top left
]);
const uvs = new Float32Array([
  ...[0, 0], // bottom left
  ...[1, 0], // bottom right
  ...[1, 1], // top right
  ...[0, 1], // top left
]);
const indices = new Uint16Array([
  ...[0, 1, 2], // first triangle
  ...[2, 3, 0], // second triangle
]);

let emitterSnapshotTaken = false;
const emittersDebugger: TextureDebuggerCallback = (texture, { log, snapshot }) => {
  let emitterCount = 0;

  for (let i = 0; i < texture.image.data.length; i += 4) {
    if (texture.image.data[i + 3] !== -1) {
      emitterCount++;
    }
  }

  log('Count', emitterCount);

  if (emitterCount > 0 && !emitterSnapshotTaken) {
    emitterSnapshotTaken = true;
    snapshot(emitterParticlesMax, emitterCount);
  }
};

const simulationInitialInputDebugger: TextureDebuggerCallback = (_, { snapshot }) => snapshot(width, height);

const simulationOutputDebugger: RenderTargetDebuggerCallback = (renderTarget, { gl, log, frame, snapshot }) => {
  const buffer = new Float32Array(renderTarget.width * renderTarget.height * 4);

  gl.readRenderTargetPixels(renderTarget, 0, 0, renderTarget.width, renderTarget.height, buffer);

  let aliveParticlesCount = 0;
  let maxAge = 0;

  for (let i = 0; i < buffer.length; i += 4) {
    if (buffer[i + 3] !== -1) {
      aliveParticlesCount++;
      maxAge = Math.max(maxAge, buffer[i + 3]);
    }
  }
  log('Buffer size', buffer.length / 4);
  log('Alive particles', aliveParticlesCount);
  log('Max age', maxAge);

  if (frame === 0 || frame === 1 || frame === 2 || frame === 3 || frame === 4 || frame === 5 || frame === 6) {
    snapshot(0, 0, renderTarget.width, renderTarget.height);
  }
};

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
  const emittersTexture = useMemo(
    () => createDataTexture(fillEmptyEmitters, emitterParticlesMax, emitterCount /* = emitterRefs.length */),
    []
  );
  const freeEmitterIdRef = useRef<[id: number, length: number]>(
    useMemo(() => [0, positionsTexture.image.data.length / 4], [positionsTexture])
  );
  useMemo(() => (freeEmitterIdRef.current[1] = positionsTexture.image.data.length / 4), [positionsTexture]); // update length accordingly
  const lastParticleEmitTimeRef = useRef<number>(Number.POSITIVE_INFINITY);
  const emittersPrevEnabledRef = useRef<[enabled1: boolean | undefined, enabled2: boolean | undefined]>([
    undefined,
    undefined,
  ]);

  useTextureDebugger('Emitters', emittersDebugger);
  useTextureDebugger('Simulation initial input', simulationInitialInputDebugger);
  useRenderTargetDebugger('Simulation output', simulationOutputDebugger);

  useFrameWithDebugger(({ gl, clock, debug }, delta) => {
    const elapsed = clock.elapsedTime;
    const emitter1Enabled = emitter1Ref.current.w === 1;
    const emitter2Enabled = emitter2Ref.current.w === 1;

    // maxAge * 1.1 is a bit of a buffer to ensure that all particles are dead
    if (elapsed - lastParticleEmitTimeRef.current > maxAge * 1.1 && !emitter1Enabled && !emitter2Enabled) {
      // nothing to animate anymore
      return;
    } else if (emitter1Enabled || emitter2Enabled) {
      lastParticleEmitTimeRef.current = elapsed;
    }

    const emitter1PrevEnabled = emittersPrevEnabledRef.current[0];
    const emitter2PrevEnabled = emittersPrevEnabledRef.current[1];

    emittersPrevEnabledRef.current[0] = emitter1Enabled;
    emittersPrevEnabledRef.current[1] = emitter2Enabled;

    if (
      emitter1Enabled ||
      emitter2Enabled ||
      emitter1PrevEnabled !== emitter1Enabled ||
      emitter2PrevEnabled !== emitter2Enabled
    ) {
      let index = 0;

      index = fillEmitters(
        emittersTexture,
        freeEmitterIdRef,
        emitter1Ref.current,
        index,
        symbolThickness,
        MathUtils.randInt(emitterParticlesMin, emitterParticlesMax)
      );
      index = fillEmitters(
        emittersTexture,
        freeEmitterIdRef,
        emitter2Ref.current,
        index,
        symbolThickness,
        MathUtils.randInt(emitterParticlesMin, emitterParticlesMax)
      );
      clearEmitters(emittersTexture, index);

      emittersTexture.needsUpdate = true;

      // debug.expose('Emitters', emittersTexture);
    }

    const [writeTarget, readTarget, initPhase] = targets.current;

    // if (initPhase) {
    //   debug.expose('Simulation initial input', simulationMaterialRef.current.uniforms.uPositions.value);
    // }

    if (!initPhase) {
      simulationMaterialRef.current.uniforms.uPositions.value = readTarget.texture;
    }
    simulationMaterialRef.current.uniforms.uDelta.value = delta;

    gl.setRenderTarget(writeTarget);
    gl.clear();
    gl.render(scene, camera);
    gl.setRenderTarget(null);

    onFrame(writeTarget.texture);

    debug.expose('Simulation output', writeTarget);

    targets.current = [readTarget, writeTarget];
  });

  return createPortal(
    <mesh>
      <simulationMaterial ref={simulationMaterialRef} args={[positionsTexture, emittersTexture]} />
      <bufferGeometry>
        <bufferAttribute attach="index" array={indices} count={indices.length} />
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
