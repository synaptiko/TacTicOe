import vertexShader from './shaders/SparksAndSmoke.vert.glsl?raw';
import fragmentShader from './shaders/SparksAndSmoke.frag.glsl?raw';
import simulationVertexShader from './shaders/SparksAndSmoke.sim.vert.glsl?raw';
import simulationFragmentShader from './shaders/SparksAndSmoke.sim.frag.glsl?raw';
import {
  AdditiveBlending,
  DataTexture,
  FloatType,
  MathUtils,
  NearestFilter,
  OrthographicCamera,
  RGBAFormat,
  RenderTargetOptions,
  Scene,
  ShaderMaterial,
  Texture,
  Vector3,
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
import { Player } from './types';

// TODO: next steps
// 1. separate simulation out of this file
// 2. fix particles' scale (responsiveness related)
// 3. refactor per-frame-definition of particles amount to be adaptive to current FPS instead; we will need to define some acceptable range like 30-120 FPS and implement different way to get emitter's positions with interpolation based on time variable to not create "clumps" of particles
//    - I guess I could render the "simulation frame" multiple times per regular frame
// 4. clean-up the code & comments once everything works (e.g. remove debugging-related code)

const minAge = 0.5;
const maxAge = 2.5;
const emitterCount = 2; // = emitterRefs.length (needs to be in-sync)
const emitterParticlesMin = 20; // per-frame
const emitterParticlesMax = 40; // per-frame
const smokeVsSparkRatio = 0.5; // 50% smoke, 50% sparks

// Note: We use the following structure for particles in DataTexture:
// 1st pixel = position (x, y, z) and age (or id for emitters)
// 2nd pixel = velocity (x, y, z) and max age
// 3rd pixel = acceleration (x, y, z) and particle type (1 = smoke, 2 = red spark, 3 = blue spark)

// The layout of these pixels is as follows:
// 1/3 on v coordinate = 1st pixel
// 2/3 on v coordinate = 2nd pixel
// 3/3 on v coordinate = 3rd pixel
const dataPixelsCount = 3;

const [particlesTextureWidth, particlesTextureHeight] = (() => {
  // we have an assumption that we will create that amount of particles per frame at 120 FPS
  const maxParticleAmount = maxAge * emitterParticlesMax * emitterCount * 120;
  const size = Math.ceil(Math.sqrt(maxParticleAmount));

  return [size, size * dataPixelsCount];
})();

const [emittersTextureWidth, emittersTextureHeight] = (() => {
  return [emitterParticlesMax, emitterCount * dataPixelsCount];
})();

function fillEmptyParticles(width: number, height: number) {
  const data = new Float32Array(width * height * 4);
  const thirdHeight = Math.floor(height / dataPixelsCount);

  // fill the first third with position and age data
  for (let y = 0; y < thirdHeight; y++) {
    for (let x = 0; x < width; x++) {
      const stride = (y * width + x) * 4;

      data[stride] = 0; // position.x
      data[stride + 1] = 0; // position.y
      data[stride + 2] = 0; // position.z
      data[stride + 3] = -1; // particle age
    }
  }

  // fill the second third with velocity and max age data
  for (let y = thirdHeight; y < 2 * thirdHeight; y++) {
    for (let x = 0; x < width; x++) {
      const stride = (y * width + x) * 4;

      data[stride] = 0; // velocity.x
      data[stride + 1] = 0; // velocity.y
      data[stride + 2] = 0; // velocity.z
      data[stride + 3] = -1; // particle max age
    }
  }

  // fill the last third with acceleration and particle type data
  for (let y = 2 * thirdHeight; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const stride = (y * width + x) * 4;

      data[stride] = 0; // acceleration.x
      data[stride + 1] = 0; // acceleration.y
      data[stride + 2] = 0; // acceleration.z
      data[stride + 3] = -1; // particle type
    }
  }

  return data;
}

function fillEmptyEmitters(width: number, height: number) {
  const data = new Float32Array(width * height * 4);
  const thirdHeight = Math.floor(height / dataPixelsCount);

  // fill the first third with position and id data
  for (let y = 0; y < thirdHeight; y++) {
    for (let x = 0; x < width; x++) {
      const stride = (y * width + x) * 4;

      data[stride] = 0; // position.x
      data[stride + 1] = 0; // position.y
      data[stride + 2] = 0; // position.z
      data[stride + 3] = -1; // particle id
    }
  }

  // fill the second third with velocity and max age data
  for (let y = thirdHeight; y < 2 * thirdHeight; y++) {
    for (let x = 0; x < width; x++) {
      const stride = (y * width + x) * 4;

      data[stride] = 0; // velocity.x
      data[stride + 1] = 0; // velocity.y
      data[stride + 2] = 0; // velocity.z
      data[stride + 3] = -1; // particle max age
    }
  }

  // fill the last third with acceleration and particle type data
  for (let y = 2 * thirdHeight; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const stride = (y * width + x) * 4;

      data[stride] = 0; // acceleration.x
      data[stride + 1] = 0; // acceleration.y
      data[stride + 2] = 0; // acceleration.z
      data[stride + 3] = -1; // particle type
    }
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
  const oneThirdIndex = data.length / 3 / 4;
  const twoThirdsIndex = 2 * oneThirdIndex;

  for (let i = startIndex; i < data.length / dataPixelsCount / 4; i++) {
    const stride = i * 4;

    data[stride] = 0;
    data[stride + 1] = 0;
    data[stride + 2] = 0;
    data[stride + 3] = -1;

    data[oneThirdIndex + stride] = 0;
    data[oneThirdIndex + stride + 1] = 0;
    data[oneThirdIndex + stride + 2] = 0;
    data[oneThirdIndex + stride + 3] = -1;

    data[twoThirdsIndex + stride] = 0;
    data[twoThirdsIndex + stride + 1] = 0;
    data[twoThirdsIndex + stride + 2] = 0;
    data[twoThirdsIndex + stride + 3] = -1;
  }
}

function fillEmitters(
  texture: DataTexture,
  freeEmitterIdRef: MutableRefObject<[id: number, length: number]>,
  emitter: Vector4,
  startIndex: number,
  spread: number,
  amount: number,
  playerRef: MutableRefObject<Player | undefined>
) {
  if (playerRef.current === undefined) {
    return startIndex;
  }

  const length = texture.image.data.length;
  const oneThirdIndex = length / 3;
  const twoThirdsIndex = 2 * oneThirdIndex;

  for (let i = 0; i < amount; i++) {
    const isSmokeParticle = Math.random() <= smokeVsSparkRatio;
    const position = new Vector3(
      emitter.x + Math.random() * spread - spread / 2,
      emitter.y + Math.random() * spread - spread / 2,
      emitter.z
    );
    const position2center = position.clone().sub(emitter);
    const velocity = new Vector3(0, 0, 1); // by default go directly up

    if (position2center.length() > 0.01) {
      // if out of emitter's center then go to the side
      const axis = position2center.clone().normalize().cross(velocity);
      const angle = MathUtils.randFloat(-(isSmokeParticle ? Math.PI / 9 : Math.PI / 5), 0.0);

      velocity.applyAxisAngle(axis, angle);
    }

    velocity.multiplyScalar(MathUtils.randFloat(1.5, 2.5));

    // position and id
    texture.image.data[startIndex + 0] = position.x;
    texture.image.data[startIndex + 1] = position.y;
    texture.image.data[startIndex + 2] = position.z;
    texture.image.data[startIndex + 3] = getFreeId(freeEmitterIdRef);

    if (isSmokeParticle) {
      // smoke particle

      // velocity and max age
      texture.image.data[oneThirdIndex + startIndex + 0] = velocity.x;
      texture.image.data[oneThirdIndex + startIndex + 1] = velocity.y;
      texture.image.data[oneThirdIndex + startIndex + 2] = velocity.z;
      texture.image.data[oneThirdIndex + startIndex + 3] = MathUtils.randFloat(minAge, maxAge);

      // acceleration and particle type
      texture.image.data[twoThirdsIndex + startIndex + 0] = MathUtils.randFloatSpread(0.25);
      texture.image.data[twoThirdsIndex + startIndex + 1] = MathUtils.randFloatSpread(0.25);
      texture.image.data[twoThirdsIndex + startIndex + 2] = MathUtils.randFloat(-0.5, -1.5);
      texture.image.data[twoThirdsIndex + startIndex + 3] = 1; // smoke
    } else {
      // spark particle

      // velocity and max age
      texture.image.data[oneThirdIndex + startIndex + 0] = velocity.x;
      texture.image.data[oneThirdIndex + startIndex + 1] = velocity.y;
      texture.image.data[oneThirdIndex + startIndex + 2] = velocity.z;
      texture.image.data[oneThirdIndex + startIndex + 3] = MathUtils.randFloat(minAge, maxAge) * 0.66;

      // acceleration and particle type
      texture.image.data[twoThirdsIndex + startIndex + 0] = 0;
      texture.image.data[twoThirdsIndex + startIndex + 1] = 0;
      texture.image.data[twoThirdsIndex + startIndex + 2] = MathUtils.randFloat(-6.5, -7.5);
      texture.image.data[twoThirdsIndex + startIndex + 3] = playerRef.current === 'x' ? 2 : 3; // red or blue spark
    }

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
  constructor(particlesTexture: DataTexture, emittersTexture: DataTexture) {
    const uniforms = {
      uParticles: { value: particlesTexture },
      uParticlesResolution: { value: [particlesTexture.image.width, particlesTexture.image.height] },
      uEmitters: { value: emittersTexture },
      uEmittersResolution: { value: [emittersTexture.image.width, emittersTexture.image.height] },
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
  player?: Player;
  emitterRefs: [emitter1Ref: MutableRefObject<Vector4>, emitter2Ref: MutableRefObject<Vector4>];
  onFrame: (texture: Texture) => void;
};

// Note: using a single triangle for particles rendering (inspired by FullscreenTriangle from @react-three/drei)
const positions = new Float32Array([
  ...[-1, -1, 0], // bottom left corner
  ...[3, -1, 0], // far right corner
  ...[-1, 3, 0], // far top corner
]);
const uvs = new Float32Array([
  ...[0, 0], // UV for bottom left
  ...[2, 0], // UV for far right
  ...[0, 2], // UV for far top
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
    snapshot(emittersTextureWidth, emittersTextureHeight);
  }
};

const simulationInitialInputDebugger: TextureDebuggerCallback = (_, { snapshot }) =>
  snapshot(particlesTextureWidth, particlesTextureHeight);

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

const Simulation = ({ player, emitterRefs: [emitter1Ref, emitter2Ref], onFrame }: SimulationProps) => {
  const scene = useMemo(() => new Scene(), []);
  const camera = useMemo(() => new OrthographicCamera(-1, 1, 1, -1, 1 / Math.pow(2, 53), 1), []);
  const fboParams = useMemo<RenderTargetOptions>(
    () => ({
      minFilter: NearestFilter,
      magFilter: NearestFilter,
      format: RGBAFormat,
      type: FloatType,
      internalFormat: 'RGBA32F',
      stencilBuffer: false,
      depthBuffer: false,
      generateMipmaps: false,
    }),
    []
  );
  const renderTargetA = useFBO(particlesTextureWidth, particlesTextureHeight, fboParams);
  const renderTargetB = useFBO(particlesTextureWidth, particlesTextureHeight, fboParams);
  const targets = useRef<[write: WebGLRenderTarget<Texture>, read: WebGLRenderTarget<Texture>, initPhase?: boolean]>([
    renderTargetA,
    renderTargetB,
    true,
  ]);
  const simulationMaterialRef = useRef<SimulationMaterial>(null!);
  const particlesTexture = useMemo(
    () => createDataTexture(fillEmptyParticles, particlesTextureWidth, particlesTextureHeight),
    []
  );
  const emittersTexture = useMemo(
    () => createDataTexture(fillEmptyEmitters, emittersTextureWidth, emittersTextureHeight),
    []
  );
  const freeEmitterIdRef = useRef<[id: number, length: number]>(
    useMemo(() => [0, particlesTexture.image.data.length / dataPixelsCount / 4], [particlesTexture])
  );
  useMemo(
    () => (freeEmitterIdRef.current[1] = particlesTexture.image.data.length / dataPixelsCount / 4),
    [particlesTexture]
  ); // update length accordingly
  const lastParticleEmitTimeRef = useRef<number>(Number.POSITIVE_INFINITY);
  const emittersPrevEnabledRef = useRef<[enabled1: boolean | undefined, enabled2: boolean | undefined]>([
    undefined,
    undefined,
  ]);
  const playerRef = useRef<Player | undefined>(player);
  useMemo(() => (playerRef.current = player), [player]);

  useTextureDebugger('Emitters', emittersDebugger);
  useTextureDebugger('Simulation initial input', simulationInitialInputDebugger);
  useRenderTargetDebugger('Simulation output', simulationOutputDebugger);

  useFrameWithDebugger(({ gl, clock /*, debug*/ }, delta) => {
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

      if (emitter1Enabled) {
        index = fillEmitters(
          emittersTexture,
          freeEmitterIdRef,
          emitter1Ref.current,
          index,
          symbolThickness,
          MathUtils.randInt(emitterParticlesMin, emitterParticlesMax),
          playerRef
        );
      }

      if (emitter2Enabled) {
        index = fillEmitters(
          emittersTexture,
          freeEmitterIdRef,
          emitter2Ref.current,
          index,
          symbolThickness,
          MathUtils.randInt(emitterParticlesMin, emitterParticlesMax),
          playerRef
        );
      }

      clearEmitters(emittersTexture, index);

      emittersTexture.needsUpdate = true;

      // debug.expose('Emitters', emittersTexture);
    }

    const [writeTarget, readTarget, initPhase] = targets.current;

    // if (initPhase) {
    //   debug.expose('Simulation initial input', simulationMaterialRef.current.uniforms.uParticles.value);
    // }

    if (!initPhase) {
      simulationMaterialRef.current.uniforms.uParticles.value = readTarget.texture;
    }
    simulationMaterialRef.current.uniforms.uDelta.value = delta;

    gl.setRenderTarget(writeTarget);
    gl.clear();
    gl.render(scene, camera);
    gl.setRenderTarget(null);

    onFrame(writeTarget.texture);

    // debug.expose('Simulation output', writeTarget);

    targets.current = [readTarget, writeTarget];
  });

  return createPortal(
    <mesh>
      <simulationMaterial ref={simulationMaterialRef} args={[particlesTexture, emittersTexture]} />
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-uv" count={uvs.length / 2} array={uvs} itemSize={2} />
      </bufferGeometry>
    </mesh>,
    scene
  );
};

type SparksAndSmokeProps = {
  player?: Player;
  emitterRefs: SimulationProps['emitterRefs'];
};

export const SparksAndSmoke = ({ player, emitterRefs }: SparksAndSmokeProps) => {
  const materialRef = useRef<ShaderMaterial>(null!);
  const particlePositions = useMemo(() => {
    const thirdHeight = Math.floor(particlesTextureHeight / dataPixelsCount);
    const length = particlesTextureWidth * thirdHeight;
    const particles = new Float32Array(length * 3);

    for (let i = 0; i < length; i++) {
      const stride = i * 3;

      particles[stride + 0] = (i % particlesTextureWidth) / thirdHeight;
      particles[stride + 1] = i / particlesTextureWidth / particlesTextureHeight;
    }

    return particles;
  }, []);
  const uniforms = useMemo(
    () => ({
      uParticles: { value: null },
    }),
    []
  );

  function handleFrame(uParticles: Texture) {
    materialRef.current.uniforms.uParticles.value = uParticles;
  }

  return (
    <>
      <Simulation player={player} emitterRefs={emitterRefs} onFrame={handleFrame} />
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particlePositions.length / 3}
            array={particlePositions}
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
