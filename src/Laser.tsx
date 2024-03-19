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
    const tween = gsap.to(meshRef.current.position, {
      x: x - 3,
      y: y - 3,
      z: 2,
      duration: 0.125,
      ease: 'power4.inOut',
    });

    const timeoutId = setTimeout(() => {
      tween.reverse();
    }, 500);

    return () => {
      tween.kill();
      clearTimeout(timeoutId);
    };
  }, [x, y]);

  return (
    <mesh position={[x - 3, y - 3, 6]} ref={meshRef}>
      {/* TODO: use plane that always face the camera instead of box to save some "resources" */}
      <boxGeometry args={[0.005, 0.005, 4]} />
      {/* TODO: add some slight shimmering effect with shader to sell the laser effect more */}
      <meshStandardMaterial emissive={color === 'red' ? 'hotpink' : 'skyblue'} emissiveIntensity={12} />
    </mesh>
  );
}
