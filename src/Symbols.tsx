import { MutableRefObject, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { BufferGeometry, Group, Mesh, MeshStandardMaterial, WebGLProgramParametersWithUniforms } from 'three';
import gsap from 'gsap';
import symbolsUrl from './symbols.glb?url';
import { drawingDuration } from './consts';
import { Player } from './types';

useGLTF.preload(symbolsUrl);

type SymbolsProps = {
  activePlayer?: Player;
  xSymbolRef: MutableRefObject<Mesh>;
  oSymbolRef: MutableRefObject<Mesh>;
};

const isDevelopmentMode = import.meta.env.MODE === 'development';

const introDuration = 1; // seconds
const highlightDuration = 0.25; // seconds
const maxIntensity = 20;

export function Symbols({ activePlayer, xSymbolRef, oSymbolRef }: SymbolsProps) {
  const {
    nodes: { x, o },
  } = useGLTF(symbolsUrl);
  const xGeometry = 'geometry' in x && x.geometry instanceof BufferGeometry ? x.geometry : undefined;
  const oGeometry = 'geometry' in o && o.geometry instanceof BufferGeometry ? o.geometry : undefined;
  const groupRef = useRef<Group>(null!);
  const xMaterialRef = useRef<MeshStandardMaterial>(null!);
  const oMaterialRef = useRef<MeshStandardMaterial>(null!);
  const activePlayerRef = useRef(activePlayer);

  useMemo(() => (activePlayerRef.current = activePlayer), [activePlayer]);

  useEffect(() => {
    if (isDevelopmentMode) {
      groupRef.current.position.setZ(-1.33);
      return;
    }

    const tween = gsap.to(groupRef.current.position, {
      x: 0,
      y: 0,
      z: -1.33,
      duration: introDuration,
      ease: 'power4.inOut',
    });

    return () => {
      tween.kill();
    };
  }, []);

  useEffect(() => {
    if (isDevelopmentMode) {
      xMaterialRef.current.emissiveIntensity = activePlayer === 'x' ? maxIntensity : 0;
      oMaterialRef.current.emissiveIntensity = activePlayer === 'o' ? maxIntensity : 0;
      return;
    }

    const tween = gsap.fromTo(
      activePlayer === 'x' ? xMaterialRef.current : oMaterialRef.current,
      {
        emissiveIntensity: 0,
      },
      {
        emissiveIntensity: maxIntensity,
        duration: highlightDuration,
        delay: drawingDuration * 2,
        ease: 'power3.inOut',
      }
    );

    // TODO: add slight pulse animation from base to higher intensity
    // TODO: or maybe there could be a slight floating animation to make it more interesting?

    return () => {
      setTimeout(
        () => {
          // condition only needed due to HMR
          if (activePlayerRef.current !== activePlayer) {
            tween.reverse();
          }
        },
        drawingDuration * 1.25 * 1000
      );
    };
  }, [activePlayer]);

  useLayoutEffect(() => {
    xMaterialRef.current.onBeforeCompile = onBeforeCompile;
    oMaterialRef.current.onBeforeCompile = onBeforeCompile;
  }, []);

  return (
    <group ref={groupRef} dispose={null} position={[0, 0, 4]}>
      <mesh
        ref={xSymbolRef}
        geometry={xGeometry}
        rotation={[Math.PI / 2, -Math.PI, 0]}
        scale={16.5}
        position={[-2.8, -10, 0]}
      >
        <meshStandardMaterial ref={xMaterialRef} color="#555" emissive="#E72929" emissiveIntensity={0} />
      </mesh>
      <mesh ref={oSymbolRef} geometry={oGeometry} rotation={[0, Math.PI / 2, 0]} scale={16.5} position={[-10, -2.8, 0]}>
        <meshStandardMaterial ref={oMaterialRef} color="#555" emissive="#299CE7" emissiveIntensity={0} />
      </mesh>
    </group>
  );
}

// FIXME: implement the same way I do for cell, with HMR support
// TODO: add mMyUv as well and implement "LEDs" effect
// TODO: I can use uv from Blender to drive intensity, instead of using normal
function onBeforeCompile(shader: WebGLProgramParametersWithUniforms) {
  shader.vertexShader = shader.vertexShader
    .replace(
      `varying vec3 vViewPosition;`,
      `
      varying vec3 vViewPosition;
      varying vec3 vMyNormal;
    `
    )
    .replace(
      `}`,
      `
      vMyNormal = normal;
    }`
    );
  shader.fragmentShader = shader.fragmentShader
    .replace(
      `vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;`,
      `
    float intensity = (dot(normalize(vMyNormal), normalize(vec3(0, 0, 1))) > 0.99 ? 1.0 : 0.25);
    totalDiffuse *= intensity * 5.0;
    vec3 outgoingLight = (totalDiffuse + totalSpecular + totalEmissiveRadiance) * intensity;
    `
    )
    .replace(
      `#define STANDARD`,
      `
      #define STANDARD
      varying vec3 vMyNormal;
    `
    );
}
