import { useEffect, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { BufferGeometry, Group } from 'three';
import gsap from 'gsap';
import symbolsUrl from './symbols.glb?url';

useGLTF.preload(symbolsUrl);
export function Symbols() {
  const {
    nodes: { x, o },
  } = useGLTF(symbolsUrl);
  const xGeometry = 'geometry' in x && x.geometry instanceof BufferGeometry ? x.geometry : undefined;
  const oGeometry = 'geometry' in o && o.geometry instanceof BufferGeometry ? o.geometry : undefined;
  const groupRef = useRef<Group>(null!);

  useEffect(() => {
    gsap.to(groupRef.current.position, {
      x: 0,
      y: 0,
      z: 0,
      duration: 1,
      ease: 'power4.inOut',
    });
  }, []);

  return (
    <group ref={groupRef} dispose={null} position={[0, 0, 5]}>
      <mesh geometry={xGeometry} rotation={[Math.PI / 2, -Math.PI, 0]} scale={15} position={[-1.5, -10, 0.25]}>
        <meshStandardMaterial color="#E72929" emissive="#E72929" emissiveIntensity={20} />
      </mesh>
      <mesh geometry={oGeometry} rotation={[0, Math.PI / 2, 0]} scale={15} position={[-10, -1.5, 0.25]}>
        <meshStandardMaterial color="#299CE7" emissive="#299CE7" emissiveIntensity={20} />
      </mesh>
    </group>
  );
}
