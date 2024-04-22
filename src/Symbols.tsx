import { useEffect, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { BufferGeometry, Group, Vector3 } from 'three';
import gsap from 'gsap';
import symbolsUrl from './objects/symbols.glb?url';
import { drawingDuration } from './consts';
import { SymbolMaterial, SymbolMaterialWrapper } from './SymbolMaterial';
import { useGameMachine } from './state/useGameMachine';
import { Howl } from 'howler';
import introSoundUrl from './sounds/intro.mp3?url';
import { usePausableTween } from './usePausableTween';

useGLTF.preload(symbolsUrl);

const introSound = new Howl({ src: [introSoundUrl] });
const introDuration = 0.75; // seconds
const highlightDuration = 0.25; // seconds
const startIntensity = 0;
const endIntensity = 20;
const startPosition = new Vector3(0, 0, 4);
const endPosition = new Vector3(0, 0, -1.33);

export function Symbols() {
  const [, sendToGame] = useGameMachine();
  const {
    nodes: { x, o },
  } = useGLTF(symbolsUrl);
  const xGeometry = 'geometry' in x && x.geometry instanceof BufferGeometry ? x.geometry : undefined;
  const oGeometry = 'geometry' in o && o.geometry instanceof BufferGeometry ? o.geometry : undefined;
  const groupRef = useRef<Group>(null!);
  const xMaterialRef = useRef<SymbolMaterial>(null!);
  const oMaterialRef = useRef<SymbolMaterial>(null!);
  const pausable = usePausableTween();

  useEffect(() => {
    const introAnimationTween = pausable(
      gsap.fromTo(groupRef.current.position, startPosition, {
        ...endPosition,
        duration: introDuration,
        ease: 'power4.inOut',
        paused: true,
      })
    );
    const xPlayerMoveAnimationTween = pausable(
      gsap.fromTo(
        xMaterialRef.current,
        { uEmissiveIntensity: startIntensity },
        {
          uEmissiveIntensity: endIntensity,
          duration: highlightDuration,
          delay: drawingDuration,
          ease: 'power3.inOut',
          paused: true,
        }
      )
    );
    const oPlayerMoveAnimationTween = pausable(
      gsap.fromTo(
        oMaterialRef.current,
        { uEmissiveIntensity: startIntensity },
        {
          uEmissiveIntensity: endIntensity,
          duration: highlightDuration,
          delay: drawingDuration,
          ease: 'power3.inOut',
          paused: true,
        }
      )
    );
    const introAnimation = () => {
      introSound.play();
      introAnimationTween.restart();
      xPlayerMoveAnimationTween.kill();
      oPlayerMoveAnimationTween.kill();
      xMaterialRef.current.uEmissiveIntensity = startIntensity;
      oMaterialRef.current.uEmissiveIntensity = startIntensity;
    };
    const xPlayerTurnAnimation = () => {
      oPlayerMoveAnimationTween.reverse();
      xPlayerMoveAnimationTween.restart();
    };
    const oPlayerTurnAnimation = () => {
      xPlayerMoveAnimationTween.reverse();
      oPlayerMoveAnimationTween.restart();
    };

    sendToGame({ type: 'registerAnimation', key: 'intro', animation: introAnimation });
    sendToGame({ type: 'registerAnimation', key: 'xPlayerTurn', animation: xPlayerTurnAnimation });
    sendToGame({ type: 'registerAnimation', key: 'oPlayerTurn', animation: oPlayerTurnAnimation });

    return () => {
      introAnimationTween.unregister();
      introAnimationTween.kill();
      xPlayerMoveAnimationTween.unregister();
      xPlayerMoveAnimationTween.kill();
      oPlayerMoveAnimationTween.unregister();
      oPlayerMoveAnimationTween.kill();
      sendToGame({ type: 'unregisterAnimation', key: 'intro', animation: introAnimation });
      sendToGame({ type: 'unregisterAnimation', key: 'xPlayerTurn', animation: xPlayerTurnAnimation });
      sendToGame({ type: 'unregisterAnimation', key: 'oPlayerTurn', animation: oPlayerTurnAnimation });
    };
  }, [sendToGame, pausable]);

  return (
    <group ref={groupRef} dispose={null} position={startPosition}>
      <mesh geometry={xGeometry} rotation={[Math.PI / 2, -Math.PI, 0]} scale={16.5} position={[-2.8, -10, 0]}>
        <SymbolMaterialWrapper
          uPlayer={1}
          uEmissiveIntensity={startIntensity}
          uMaxIntensity={endIntensity}
          ref={xMaterialRef}
          color="#555"
          emissive="#E72929"
        />
      </mesh>
      <mesh geometry={oGeometry} rotation={[0, Math.PI / 2, 0]} scale={16.5} position={[-10, -2.8, 0]}>
        <SymbolMaterialWrapper
          uPlayer={2}
          uEmissiveIntensity={startIntensity}
          uMaxIntensity={endIntensity}
          ref={oMaterialRef}
          color="#555"
          emissive="#299CE7"
        />
      </mesh>
    </group>
  );
}
