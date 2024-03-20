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
  const {
    nodes: { x, o, xExtruded, oExtruded },
  } = useGLTF(symbolsUrl);
  const xGeometry = 'geometry' in x && x.geometry instanceof BufferGeometry ? x.geometry : undefined;
  const oGeometry = 'geometry' in o && o.geometry instanceof BufferGeometry ? o.geometry : undefined;
  const xExtrudedGeometry =
    'geometry' in xExtruded && xExtruded.geometry instanceof BufferGeometry ? xExtruded.geometry : undefined;
  const oExtrudedGeometry =
    'geometry' in oExtruded && oExtruded.geometry instanceof BufferGeometry ? oExtruded.geometry : undefined;
  const groupRef = useRef<Group>(null!);
  const xRef = useRef<MeshStandardMaterial>(null!);
  const oRef = useRef<MeshStandardMaterial>(null!);
  const xExtrudedRef = useRef<MeshStandardMaterial>(null!);
  const oExtrudedRef = useRef<MeshStandardMaterial>(null!);
  const activePlayerRef = useRef(activePlayer);

  useMemo(() => (activePlayerRef.current = activePlayer), [activePlayer]);

  useEffect(() => {
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
    const tween = gsap.fromTo(
      activePlayer === 'x' ? [xRef.current, xExtrudedRef.current] : [oRef.current, oExtrudedRef.current],
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
    <group ref={groupRef} dispose={null} position={[0, 0, 4]}>
      <mesh geometry={xGeometry} rotation={[Math.PI / 2, -Math.PI, 0]} scale={16.5} position={[-2.8, -10, 0]}>
        <meshStandardMaterial ref={xRef} color="#555" emissive="#E72929" emissiveIntensity={0} />
      </mesh>
      <mesh geometry={oGeometry} rotation={[0, Math.PI / 2, 0]} scale={16.5} position={[-10, -2.8, 0]}>
        <meshStandardMaterial ref={oRef} color="#555" emissive="#299CE7" emissiveIntensity={0} />
      </mesh>
      <mesh geometry={xExtrudedGeometry} rotation={[Math.PI / 2, -Math.PI, 0]} scale={16.5} position={[-2.8, -10, 0]}>
        <meshStandardMaterial ref={xExtrudedRef} color="#000" emissive="#731414" emissiveIntensity={0} />
      </mesh>
      <mesh geometry={oExtrudedGeometry} rotation={[0, Math.PI / 2, 0]} scale={16.5} position={[-10, -2.8, 0]}>
        <meshStandardMaterial ref={oExtrudedRef} color="#000" emissive="#144E73" emissiveIntensity={0} />
      </mesh>
    </group>
  );
}
