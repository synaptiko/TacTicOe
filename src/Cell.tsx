import { ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { Mesh, Vector4 } from 'three';
import gsap from 'gsap';
import { CellMaterial, CellMaterialWrapper } from './CellMaterial';

type CellProps = {
  x: number;
  y: number;
  player?: Player;
  onClick: (event: ThreeEvent<MouseEvent>, position: PositionKey, x: number, y: number) => void;
};

// TODO: separate these exports to different file?
export type PositionKey = `${number}:${number}`;
export type Player = 'x' | 'o';
export const drawingDuration = 0.5; // seconds

export function Cell({ x, y, player, onClick }: CellProps) {
  const meshRef = useRef<Mesh>(null!);
  const materialRef = useRef<CellMaterial>(null!);
  const uEdges = useMemo(() => new Vector4(x === 0 ? 0 : 1, y === 0 ? 0 : 1, x === 6 ? 0 : 1, y === 6 ? 0 : 1), [x, y]);

  useEffect(() => {
    const tween = gsap.to(meshRef.current.position, {
      x: x - 3,
      y: y - 3,
      z: -5,
      duration: 1 + Math.min(x, y) / 10,
      ease: 'power4.inOut',
    });

    return () => {
      tween.kill();
    };
  }, [x, y]);

  useEffect(() => {
    if (!player) {
      return;
    }

    const tween = gsap.to(materialRef.current, {
      uPlayerFill: 1,
      duration: drawingDuration,
    });

    return () => {
      tween.kill();
    };
  }, [player]);

  return (
    <mesh ref={meshRef} position={[x - 3, y - 3, -15]} onClick={(event) => onClick(event, `${x}:${y}`, x, y)}>
      <boxGeometry args={[1, 1, 10]} />
      <CellMaterialWrapper
        ref={materialRef}
        color="#FFF"
        uEdges={uEdges}
        uPlayer={player === 'x' ? 1 : player === 'o' ? 2 : 0}
        uPlayerFill={0}
      />
    </mesh>
  );
}
