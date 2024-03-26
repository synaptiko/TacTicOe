import { useRef, useMemo, useEffect, MutableRefObject } from 'react';
import { MaterialNode, extend, useFrame } from '@react-three/fiber';
import { AdditiveBlending, Points, ShaderMaterial, Vector4 } from 'three';
import gsap from 'gsap';
import { drawingDuration } from './consts';

class ParticleMaterial extends ShaderMaterial {
  constructor() {
    super({
      vertexShader: `
        attribute float age;

        varying float vAge;
        float size = 300.0;

        void main() {
          vAge = age;

          if (vAge == -1.0) {
            gl_Position = vec4(-100.0, -100.0, -100.0, 0.0);
            gl_PointSize = 0.0;
            return;
          }

          vec4 modelPosition = modelMatrix * vec4(position, 1.0);
          vec4 viewPosition = viewMatrix * modelPosition;
          vec4 projectedPosition = projectionMatrix * viewPosition;

          size *= (((age + 2.0) / 12.0) * 5.0);
          gl_Position = projectedPosition;
          gl_PointSize = size * (1.0 / - viewPosition.z);
        }
      `,
      fragmentShader: `
        varying float vAge;

        void main() {
          if (vAge == -1.0) {
            discard;
          }

          vec2 cxy = 2.0 * gl_PointCoord - 1.0;
          float r = dot(cxy, cxy);
          // TODO: requires further adjustments
          float alpha = clamp(0.5 - r, 0.0, 1.0) * ((10.0 - vAge) / 10.0);

          if (r > 1.0) {
            discard;
          }

          gl_FragColor = vec4(vec3(1.0), alpha * 0.125);
        }
      `,
    });
  }
}

extend({ ParticleMaterial });

declare module '@react-three/fiber' {
  interface ThreeElements {
    particleMaterial: MaterialNode<ParticleMaterial, typeof ParticleMaterial>;
  }
}

type ParticleSetup = {
  maxAge: number; // in seconds
  speed: number; // in units per second
  minPerSecond: number;
  maxPerSecond: number;
};

type Particles = {
  smoke: ParticleSetup;
  sparks: ParticleSetup;
};

const particles: Particles = {
  smoke: {
    maxAge: 10,
    speed: 50,
    minPerSecond: 10,
    maxPerSecond: 20,
  },
  sparks: {
    maxAge: 0.5,
    speed: 100,
    // minPerSecond: 3,
    // maxPerSecond: 5,
    minPerSecond: 0,
    maxPerSecond: 0,
  },
};
// we need 4 times more particles to have room for two current emitters and two previous emitters
// TODO: most probably we need even more, depending on maxAge and drawingDuration
const particlesCount =
  2 *
  2 *
  Math.ceil(
    particles.smoke.maxPerSecond * particles.smoke.maxAge + particles.sparks.maxPerSecond * particles.sparks.maxAge
  );

type SparksAndSmokeProps = {
  emitterRefs: [emitter1Ref: MutableRefObject<Vector4>, emitter2Ref: MutableRefObject<Vector4>];
};

export const SparksAndSmoke = ({ emitterRefs: [emitter1Ref, emitter2Ref] }: SparksAndSmokeProps) => {
  const particlesRef = useRef<Points>(null!);
  const [ids, types, ages, positions] = useMemo(() => {
    const ids = new Uint16Array(particlesCount);
    const types = new Uint8Array(particlesCount);
    const ages = new Float32Array(particlesCount);
    const positions = new Float32Array(particlesCount * 3);

    positions.fill(-100);

    for (let i = 0; i < particlesCount; i++) {
      ids[i] = Math.random() * 0xffff; // to randomize the particles
      types[i] = -1; // -1 = not defined, 0 = smoke, 1 = sparks
      ages[i] = -1; // -1 = not used, >= 0 = age in seconds
    }

    return [ids, types, ages, positions];
  }, []);

  useFrame(({ clock }) => {
    const deltaTime = clock.getDelta();
    const { attributes } = particlesRef.current.geometry;
    let newParticlesCount =
      Math.ceil(particles.smoke.maxPerSecond * deltaTime * 1000) * (emitter1Ref.current.w + emitter2Ref.current.w);
    let emitter: Vector4 | undefined = emitter1Ref.current.w === 1 ? emitter1Ref.current : emitter2Ref.current;

    if (emitter1Ref.current.w === 0 && emitter2Ref.current.w === 0) {
      newParticlesCount = 0;
    }

    for (let i = 0, createdParticles = 0; i < particlesCount; i++) {
      const age = attributes.age.array[i];
      const type = attributes.type.array[i]; // TODO: define type as enum?

      if (age === -1) {
        if (emitter && createdParticles < newParticlesCount) {
          attributes.type.array[i] = 0;
          attributes.age.array[i] = 0;
          attributes.position.array[i * 3] = emitter.x;
          attributes.position.array[i * 3 + 1] = emitter.y;
          attributes.position.array[i * 3 + 2] = emitter.z;

          createdParticles++;

          if (emitter1Ref.current.w === 1 && emitter2Ref.current.w === 1) {
            emitter =
              emitter === emitter1Ref.current && emitter2Ref.current.w === 1
                ? emitter2Ref.current
                : emitter1Ref.current;
          } else if (emitter1Ref.current.w === 1) {
            emitter = emitter1Ref.current;
          } else if (emitter2Ref.current.w === 1) {
            emitter = emitter2Ref.current;
          } else {
            emitter = undefined;
          }
        }

        continue;
      }

      if (type === 0) {
        if (age >= particles.smoke.maxAge) {
          attributes.type.array[i] = -1;
          attributes.age.array[i] = -1;
          attributes.position.array[i * 3 + 2] = -100;

          continue;
        }

        attributes.age.array[i] += deltaTime * 1000;
        attributes.position.array[i * 3 + 2] +=
          particles.smoke.speed * deltaTime * ((attributes.age.array[i] / particles.smoke.maxAge) * 5);
      }
    }

    attributes.age.needsUpdate = true;
    attributes.type.needsUpdate = true;
    attributes.position.needsUpdate = true;
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-id" count={ids.length} array={ids} itemSize={1} />
        <bufferAttribute attach="attributes-type" count={types.length} array={types} itemSize={1} />
        <bufferAttribute attach="attributes-age" count={ages.length} array={ages} itemSize={1} />
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
      </bufferGeometry>
      <particleMaterial attach="material" depthWrite={false} vertexColors blending={AdditiveBlending} transparent />
    </points>
  );
};

class RotatingEmitter {
  constructor(
    private emitter: Vector4,
    private amplitude: number
  ) {}

  set value(angle: number) {
    const { emitter, amplitude } = this;

    emitter.setX(amplitude * Math.cos(angle));
    emitter.setY(amplitude * Math.sin(angle));
  }
}

export const SparksAndSmokeTest = () => {
  const emitter1Ref = useRef(new Vector4(0, 0, 0, 0));
  const emitter2Ref = useRef(new Vector4(0, 0, 0, 0));

  useEffect(() => {
    const rotatingEmitter1 = new RotatingEmitter(emitter1Ref.current, 0.33);
    const rotatingEmitter2 = new RotatingEmitter(emitter2Ref.current, 0.33 / 2);
    const tween = gsap.fromTo(
      [rotatingEmitter1, rotatingEmitter2],
      { value: 0 },
      {
        value: Math.PI * 2,
        duration: drawingDuration,
        repeat: -1,
        ease: 'none',
        onStart: () => {
          emitter1Ref.current.setW(1);
          emitter2Ref.current.setW(1);
        },
        onComplete: () => {
          emitter1Ref.current.setW(0);
          emitter2Ref.current.setW(0);
        },
      }
    );

    return () => {
      tween.kill();
    };
  }, []);

  return <SparksAndSmoke emitterRefs={[emitter1Ref, emitter2Ref]} />;
};
