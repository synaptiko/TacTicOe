import { useEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { BufferGeometry, Group, MeshStandardMaterial } from 'three';
import gsap from 'gsap';
import symbolsUrl from './symbols.glb?url';
import { Player, drawingDuration } from './Cell';

useGLTF.preload(symbolsUrl);

type SymbolsProps = {
  activePlayer?: Player;
};

const introDuration = 1; // seconds
const highlightDuration = 0.25; // seconds
const maxIntensity = 20;

export function Symbols({ activePlayer }: SymbolsProps) {
  {
    /* TODO: suggestion from Engin, make X/O more plastic by adding some tickness to it; we could emit light only from the front face */
  }
  const {
    nodes: { x, o },
  } = useGLTF(symbolsUrl);
  const xGeometry = 'geometry' in x && x.geometry instanceof BufferGeometry ? x.geometry : undefined;
  const oGeometry = 'geometry' in o && o.geometry instanceof BufferGeometry ? o.geometry : undefined;
  const groupRef = useRef<Group>(null!);
  const xRef = useRef<MeshStandardMaterial>(null!);
  const oRef = useRef<MeshStandardMaterial>(null!);
  const activePlayerRef = useRef(activePlayer);

  useMemo(() => (activePlayerRef.current = activePlayer), [activePlayer]);

  useEffect(() => {
    const tween = gsap.to(groupRef.current.position, {
      x: 0,
      y: 0,
      z: 0,
      duration: introDuration,
      ease: 'power4.inOut',
    });

    return () => {
      tween.kill();
    };
  }, []);

  useEffect(() => {
    const tween = gsap.fromTo(
      activePlayer === 'x' ? xRef.current : oRef.current,
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

  return (
    <group ref={groupRef} dispose={null} position={[0, 0, 5]}>
      <mesh geometry={xGeometry} rotation={[Math.PI / 2, -Math.PI, 0]} scale={15} position={[-1.5, -10, 0.25]}>
        <meshStandardMaterial ref={xRef} color="#555" emissive="#E72929" emissiveIntensity={0} />
      </mesh>
      <mesh geometry={oGeometry} rotation={[0, Math.PI / 2, 0]} scale={15} position={[-10, -1.5, 0.25]}>
        <meshStandardMaterial ref={oRef} color="#555" emissive="#299CE7" emissiveIntensity={0} />
      </mesh>
    </group>
  );
}
