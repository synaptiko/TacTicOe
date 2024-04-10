import { MutableRefObject, useEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { BufferGeometry, Group, Mesh } from 'three';
import gsap from 'gsap';
import symbolsUrl from './objects/symbols.glb?url';
import { drawingDuration } from './consts';
import { Player } from './types';
import { SymbolMaterial, SymbolMaterialWrapper } from './SymbolMaterial';

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
  const xMaterialRef = useRef<SymbolMaterial>(null!);
  const oMaterialRef = useRef<SymbolMaterial>(null!);
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
      xMaterialRef.current.uEmissiveIntensity = activePlayer === 'x' ? maxIntensity : 0;
      oMaterialRef.current.uEmissiveIntensity = activePlayer === 'o' ? maxIntensity : 0;
      return;
    }

    const tween = gsap.fromTo(
      activePlayer === 'x' ? xMaterialRef.current : oMaterialRef.current,
      {
        uEmissiveIntensity: 0,
      },
      {
        uEmissiveIntensity: maxIntensity,
        duration: highlightDuration,
        delay: drawingDuration * 2,
        ease: 'power3.inOut',
      }
    );

    // TODO: add slight pulse animation or flicker the intensity

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

  return (
    <group ref={groupRef} dispose={null} position={[0, 0, 4]}>
      <mesh
        ref={xSymbolRef}
        geometry={xGeometry}
        rotation={[Math.PI / 2, -Math.PI, 0]}
        scale={16.5}
        position={[-2.8, -10, 0]}
      >
        <SymbolMaterialWrapper
          uPlayer={1}
          uEmissiveIntensity={0}
          uMaxIntensity={maxIntensity}
          ref={xMaterialRef}
          color="#555"
          emissive="#E72929"
        />
      </mesh>
      <mesh ref={oSymbolRef} geometry={oGeometry} rotation={[0, Math.PI / 2, 0]} scale={16.5} position={[-10, -2.8, 0]}>
        <SymbolMaterialWrapper
          uPlayer={2}
          uEmissiveIntensity={0}
          uMaxIntensity={maxIntensity}
          ref={oMaterialRef}
          color="#555"
          emissive="#299CE7"
        />
      </mesh>
    </group>
  );
}
