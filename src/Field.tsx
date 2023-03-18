import { ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { Mesh, Vector4 } from 'three';
import gsap from 'gsap';
import { FieldMaterialWrapper } from './FieldMaterial';

type FieldProps = {
  x: number;
  y: number;
  color: string;
  onClick: (event: ThreeEvent<MouseEvent>, x: number, y: number) => void;
};

export function Field({ x, y, color, onClick }: FieldProps) {
  const meshRef = useRef<Mesh>(null!);
  const uEdges = useMemo(() => new Vector4(x === 0 ? 0 : 1, y === 0 ? 0 : 1, x === 6 ? 0 : 1, y === 6 ? 0 : 1), [x, y]);

  useEffect(() => {
    gsap.to(meshRef.current.position, {
      x: x - 3,
      y: y - 3,
      z: -5,
      duration: 1 + Math.min(x, y) / 10,
      ease: 'power4.inOut',
    });
  }, [x, y]);

  return (
    <mesh ref={meshRef} position={[x - 3, y - 3, -15]} onClick={(event) => onClick(event, x, y)}>
      <boxGeometry args={[1, 1, 10]} />
      <FieldMaterialWrapper color={color} uEdges={uEdges} />
    </mesh>
  );
}
