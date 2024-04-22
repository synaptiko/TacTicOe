import { MutableRefObject, useEffect, useRef } from 'react';
import { Laser } from './Laser';
import { Group, Object3D, Vector2, Vector4 } from 'three';
import gsap from 'gsap';
import { drawingDuration, symbolGap, symbolRadius, xSymbolScale } from './consts';
import { SparksAndSmoke } from './SparksAndSmoke';
import { Howl } from 'howler';
import laserSoundUrl from './sounds/laser.mp3?url';
import { useGameMachine } from './state/useGameMachine';
import { Animation } from './state/GameMachineContext';
import invariant from 'tiny-invariant';
import { usePausableTween } from './usePausableTween';

const laserSound = new Howl({ src: [laserSoundUrl], volume: 10.0 }); // TODO: turn up volume in the mp3 file directly

class LaserOAnimation {
  constructor(
    private laser: MutableRefObject<Object3D>,
    private emitter: MutableRefObject<Vector4>,
    private amplitude: number,
    private offset: number = 0
  ) {}

  set value(angle: number) {
    const {
      laser: { current: laser },
      emitter: { current: emitter },
      amplitude,
      offset,
    } = this;

    laser.position.set(amplitude * Math.cos(angle - offset), amplitude * Math.sin(angle - offset), 0);
    emitter.setX(laser.position.x);
    emitter.setY(laser.position.y);
  }
}

class LaserXAnimation {
  private path: Vector2[] = [];
  private segmentLengths: number[] = [];
  private totalPathLength: number = 0;

  constructor(
    private laser: MutableRefObject<Object3D>,
    private emitter: MutableRefObject<Vector4>,
    private w: number,
    private h: number,
    private flip: boolean = false
  ) {
    this.calculatePath();
  }

  private calculatePath() {
    const wh = this.w * 0.5;
    const angleRad = (-45 * Math.PI) / 180;
    const basePoints = [
      new Vector2(-wh, wh + this.h),
      new Vector2(wh, wh + this.h),
      new Vector2(wh, wh),
      new Vector2(wh + this.h, wh),
      new Vector2(wh + this.h, -wh),
      new Vector2(wh, -wh),
      new Vector2(wh, -wh - this.h),
    ].map(
      (point) =>
        new Vector2(
          point.x * Math.cos(angleRad) - point.y * Math.sin(angleRad),
          point.x * Math.sin(angleRad) + point.y * Math.cos(angleRad)
        )
    );

    this.path = this.flip ? basePoints.map((p) => new Vector2(-p.x, -p.y)) : basePoints;

    this.segmentLengths = [];
    this.totalPathLength = 0;

    for (let i = 1; i < this.path.length; i++) {
      const segmentLength = this.path[i].distanceTo(this.path[i - 1]);
      this.segmentLengths.push(segmentLength);
      this.totalPathLength += segmentLength;
    }
  }

  set value(progress: number) {
    const {
      laser: { current: laser },
      emitter: { current: emitter },
      path,
      segmentLengths,
      totalPathLength,
    } = this;

    let cumulativeLength = 0;

    for (let i = 1; i < path.length; i++) {
      if ((cumulativeLength + segmentLengths[i - 1]) / totalPathLength > progress) {
        const segmentFraction = (progress * totalPathLength - cumulativeLength) / segmentLengths[i - 1];
        const currentPoint = new Vector2().lerpVectors(path[i - 1], path[i], segmentFraction);

        laser.position.set(currentPoint.x, currentPoint.y, 0);
        emitter.setX(laser.position.x);
        emitter.setY(laser.position.y);

        break;
      }

      cumulativeLength += this.segmentLengths[i - 1];
    }
  }
}

class EmitterWithOffset extends Vector4 {
  constructor(
    private xOffset: number,
    private yOffset: number
  ) {
    super(0, 0, 0.05, 0);
  }

  setX(x: number) {
    super.setX(x + this.xOffset);

    return this;
  }

  setY(y: number) {
    super.setY(y + this.yOffset);

    return this;
  }

  setXOffset(xOffset: number) {
    this.xOffset = xOffset;

    return this;
  }

  setYOffset(yOffset: number) {
    this.yOffset = yOffset;

    return this;
  }
}

export function Lasers() {
  const [gameState, sendToGame] = useGameMachine();
  const { selectedPosition } = gameState.context;
  const laser1Ref = useRef<Group>(null!);
  const laser2Ref = useRef<Group>(null!);
  const sparksAndSmokeEmitter1Ref = useRef(new EmitterWithOffset(0, 0));
  const sparksAndSmokeEmitter2Ref = useRef(new EmitterWithOffset(0, 0));
  const pausable = usePausableTween();

  useEffect(() => {
    function onStart() {
      laserSound.play();
      laser1Ref.current.visible = true;
      laser2Ref.current.visible = true;
      sparksAndSmokeEmitter1Ref.current.setW(1);
      sparksAndSmokeEmitter2Ref.current.setW(1);
    }
    function onComplete() {
      laser1Ref.current.visible = false;
      laser2Ref.current.visible = false;
      sparksAndSmokeEmitter1Ref.current.setW(0);
      sparksAndSmokeEmitter2Ref.current.setW(0);
    }

    const xPlayerMoveAnimationTween = pausable(
      gsap.fromTo(
        (() => {
          const w = symbolGap;
          const h = (symbolRadius - symbolGap) * xSymbolScale;

          return [
            new LaserXAnimation(laser1Ref, sparksAndSmokeEmitter1Ref, w, h),
            new LaserXAnimation(laser2Ref, sparksAndSmokeEmitter2Ref, w, h, true),
          ];
        })(),
        {
          value: 0,
        },
        {
          value: 1,
          duration: drawingDuration,
          ease: 'none',
          paused: true,
          onStart,
          onComplete,
        }
      )
    );
    const oPlayerMoveAnimationTween = pausable(
      gsap.fromTo(
        [
          new LaserOAnimation(laser1Ref, sparksAndSmokeEmitter1Ref, symbolRadius),
          new LaserOAnimation(laser2Ref, sparksAndSmokeEmitter2Ref, symbolRadius - symbolGap, Math.PI),
        ],
        {
          value: 0,
        },
        {
          value: 2 * Math.PI,
          runBackwards: true,
          duration: drawingDuration,
          ease: 'none',
          paused: true,
          onStart,
          onComplete,
        }
      )
    );
    const playerMoveAnimation: Animation = ({ selectedPosition }) => {
      invariant(selectedPosition, 'selectedPosition should be defined');
      const { x, y, player } = selectedPosition;

      // FIXME: we should adjust x/y on higher level most probably; in order to not duplicate the logic all over the place (and have ability to change the dimensions of the field, if wanted)
      sparksAndSmokeEmitter1Ref.current.setXOffset(x - 3);
      sparksAndSmokeEmitter1Ref.current.setYOffset(y - 3);
      sparksAndSmokeEmitter2Ref.current.setXOffset(x - 3);
      sparksAndSmokeEmitter2Ref.current.setYOffset(y - 3);

      if (player === 'x') {
        xPlayerMoveAnimationTween.restart();
      } else {
        oPlayerMoveAnimationTween.restart();
      }
    };

    sendToGame({ type: 'registerAnimation', key: 'playerMove', animation: playerMoveAnimation });

    return () => {
      xPlayerMoveAnimationTween.unregister();
      xPlayerMoveAnimationTween.kill();
      oPlayerMoveAnimationTween.unregister();
      oPlayerMoveAnimationTween.kill();
      sendToGame({ type: 'unregisterAnimation', key: 'playerMove', animation: playerMoveAnimation });
    };
  }, [sendToGame, pausable]);

  return (
    <>
      <group ref={laser1Ref} visible={false}>
        {selectedPosition && <Laser {...selectedPosition} />}
      </group>
      <group ref={laser2Ref} visible={false}>
        {selectedPosition && <Laser {...selectedPosition} />}
      </group>
      <SparksAndSmoke
        player={selectedPosition?.player}
        emitterRefs={[sparksAndSmokeEmitter1Ref, sparksAndSmokeEmitter2Ref]}
      />
    </>
  );
}
