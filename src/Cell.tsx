import { ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { Mesh, Vector3, Vector4 } from 'three';
import gsap from 'gsap';
import { CellMaterial, CellMaterialWrapper } from './CellMaterial';
import { Player, PositionKey } from './types';
import {
  drawingDuration,
  edgeSmoothness,
  edgeThickness,
  strokeColor,
  symbolGap,
  symbolRadius,
  symbolSmoothness,
  symbolThickness,
  xSymbolScale,
} from './consts';
import { Howl } from 'howler';
import introSoundUrl from './sounds/intro.mp3?url';

const introSound = new Howl({ src: [introSoundUrl], volume: 0.01 });

type CellProps = {
  x: number;
  y: number;
  player?: Player;
  onClick: (event: ThreeEvent<MouseEvent>, position: PositionKey, x: number, y: number) => void;
};

const isDevelopmentMode = import.meta.env.MODE === 'development' && false;

export function Cell({ x, y, player, onClick }: CellProps) {
  const meshRef = useRef<Mesh>(null!);
  const materialRef = useRef<CellMaterial>(null!);
  const uEdges = useMemo(() => new Vector4(x === 0 ? 0 : 1, y === 0 ? 0 : 1, x === 6 ? 0 : 1, y === 6 ? 0 : 1), [x, y]);

  useEffect(() => {
    setTimeout(() => {
      introSound.play();
    }, 300);
  }, [x, y]);

  useEffect(() => {
    if (isDevelopmentMode) {
      meshRef.current.position.setZ(-5);
      return;
    }

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
      ease: 'none',
    });

    return () => {
      tween.kill();
    };
  }, [player]);

  function handleClick(event: ThreeEvent<MouseEvent>) {
    if (event.normal && event.normal.dot(new Vector3(0, 0, 1)) > 0.99) {
      onClick(event, `${x}:${y}`, x, y);
    }
  }

  return (
    <mesh ref={meshRef} position={[x - 3, y - 3, -16]} onClick={handleClick}>
      <boxGeometry args={[1, 1, 10]} />
      {/* TODO: suggestion from Engin, add similar "white noise" texture to cells to break the polished look a bit */}
      <CellMaterialWrapper
        ref={materialRef}
        color="#FFF"
        uEdges={uEdges}
        uPlayer={player === 'x' ? 1 : player === 'o' ? 2 : 0}
        uPlayerFill={0}
        uStrokeColor={strokeColor}
        uEdgeThickness={edgeThickness}
        uEdgeSmoothness={edgeSmoothness}
        uSymbolThickness={symbolThickness}
        uSymbolSmoothness={symbolSmoothness}
        uSymbolGap={symbolGap}
        uSymbolRadius={symbolRadius}
        uXSymbolScale={xSymbolScale}
      />
    </mesh>
  );
}
