import { useEffect, useRef } from 'react';
import { Mesh } from 'three';
import { drawingDuration } from './Cell';

type LaserProps = {
  x: number;
  y: number;
  color: 'red' | 'blue';
};
export function Laser({ x, y, color }: LaserProps) {
  const meshRef = useRef<Mesh>(null!);

  useEffect(() => {
    meshRef.current.visible = true;

    const timeoutId = setTimeout(() => {
      meshRef.current.visible = false;
    }, drawingDuration * 1000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [x, y]);

  return (
    <mesh position={[x - 3, y - 3, 4]} ref={meshRef} visible={false}>
      {/* TODO: use plane that always face the camera instead of box to save some "resources" */}
      <boxGeometry args={[0.005, 0.005, 8]} />
      {/* TODO: add some slight shimmering effect with shader to sell the laser effect more */}
      <meshStandardMaterial emissive={color === 'red' ? '#E72929' : '#299CE7'} emissiveIntensity={12} />
    </mesh>
  );
}
