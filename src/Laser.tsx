import { useEffect, useRef } from 'react';
import { Mesh } from 'three';
import gsap from 'gsap';

type LaserProps = {
  x: number;
  y: number;
  color: 'red' | 'blue';
};
export function Laser({ x, y, color }: LaserProps) {
  const meshRef = useRef<Mesh>(null!);

  useEffect(() => {
    gsap.to(meshRef.current.position, {
      x: x - 3,
      y: y - 3,
      z: 2,
      duration: 0.125,
      delay: 1.25,
      ease: 'power4.inOut',
    });
  }, [x, y]);

  return (
    <mesh position={[x - 3, y - 3, 6]} ref={meshRef}>
      <boxGeometry args={[0.005, 0.005, 4]} />
      <meshStandardMaterial emissive={color === 'red' ? 'hotpink' : 'skyblue'} emissiveIntensity={12} />
    </mesh>
  );
}
