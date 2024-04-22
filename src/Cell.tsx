import { ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { Mesh, Vector3, Vector4 } from 'three';
import gsap from 'gsap';
import { CellMaterial, CellMaterialWrapper } from './CellMaterial';
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
import { useGameMachine } from './state/useGameMachine';
import { PositionKey } from './types';
import { Animation } from './state/GameMachineContext';
import { usePausableTween } from './usePausableTween';

type CellProps = {
  position: PositionKey;
  x: number;
  y: number;
};

export function Cell({ position, x, y }: CellProps) {
  const meshRef = useRef<Mesh>(null!);
  const materialRef = useRef<CellMaterial>(null!);
  const uEdges = useMemo(() => new Vector4(x === 0 ? 0 : 1, y === 0 ? 0 : 1, x === 6 ? 0 : 1, y === 6 ? 0 : 1), [x, y]);
  const [gameState, sendToGame] = useGameMachine();
  const player = gameState.context.positions.get(position);
  const startPosition = useMemo(() => new Vector3(x - 3, y - 3, -16), [x, y]);
  const endPosition = useMemo(() => new Vector3(x - 3, y - 3, -5), [x, y]);
  const pausable = usePausableTween();

  useEffect(() => {
    const introAnimationTween = pausable(
      gsap.fromTo(meshRef.current.position, startPosition, {
        ...endPosition,
        duration: 0.75 + Math.min(x, y) / 10,
        ease: 'power4.inOut',
        paused: true,
        onComplete: () => sendToGame({ type: 'transitionEnd' }),
      })
    );
    const playerMoveAnimationTween = pausable(
      gsap.fromTo(
        materialRef.current,
        {
          uPlayerFill: 0,
        },
        {
          uPlayerFill: 1,
          duration: drawingDuration,
          ease: 'none',
          paused: true,
          onComplete: () => {
            sendToGame({ type: 'transitionEnd' });
          },
        }
      )
    );
    const introAnimation = () => {
      introAnimationTween.restart();
    };
    const playerMoveAnimation: Animation = ({ selectedPosition }) => {
      if (selectedPosition?.position === position) {
        playerMoveAnimationTween.restart();
      }
    };

    sendToGame({ type: 'registerAnimation', key: 'intro', animation: introAnimation });
    sendToGame({ type: 'registerAnimation', key: 'playerMove', animation: playerMoveAnimation });

    return () => {
      introAnimationTween.unregister();
      introAnimationTween.kill();
      playerMoveAnimationTween.unregister();
      playerMoveAnimationTween.kill();
      sendToGame({ type: 'unregisterAnimation', key: 'intro', animation: introAnimation });
      sendToGame({ type: 'unregisterAnimation', key: 'playerMove', animation: playerMoveAnimation });
    };
  }, [sendToGame, pausable, startPosition, endPosition, position, x, y]);

  function handleClick(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation();

    if (event.normal && event.normal.dot(new Vector3(0, 0, 1)) > 0.99) {
      sendToGame({ type: 'selected', position, x, y });
    }
  }

  return (
    <mesh ref={meshRef} position={[x - 3, y - 3, -16]} onClick={handleClick}>
      <boxGeometry args={[1, 1, 10]} />
      {/* TODO: suggestion from Engin, add similar "white noise" texture to cells to break the polished look a bit */}
      {/* TODO: use this texture? https://ambientcg.com/view?id=Paper006 */}
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
