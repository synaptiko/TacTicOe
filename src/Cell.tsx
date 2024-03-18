import { ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { Mesh, Vector4 } from 'three';
import gsap from 'gsap';
import { CellMaterialWrapper } from './CellMaterial';

type CellProps = {
  x: number;
  y: number;
  player?: Player;
  onClick: (event: ThreeEvent<MouseEvent>, position: PositionKey, x: number, y: number) => void;
};

export type PositionKey = `${number}:${number}`;
export type Player = 'x' | 'o';

export function Cell({ x, y, player, onClick }: CellProps) {
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
    <mesh ref={meshRef} position={[x - 3, y - 3, -15]} onClick={(event) => onClick(event, `${x}:${y}`, x, y)}>
      <boxGeometry args={[1, 1, 10]} />
      <CellMaterialWrapper color="#A39F9F" uEdges={uEdges} uPlayer={player === 'x' ? 1 : player === 'o' ? 2 : 0} />
    </mesh>
  );
}
