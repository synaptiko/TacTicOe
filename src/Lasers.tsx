import { useEffect, useRef } from 'react';
import { Laser } from './Laser';
import { Group, Object3D, Vector2 } from 'three';
import gsap from 'gsap';
import { drawingDuration, symbolGap, symbolRadius, xSymbolScale } from './consts';
import { Player } from './types';

type LasersProps = {
  x: number;
  y: number;
  player: Player;
};

class LaserOAnimation {
  constructor(
    private laser: Object3D,
    private amplitude: number,
    private offset: number = 0
  ) {}

  set value(angle: number) {
    const { laser, amplitude, offset } = this;

    laser.position.set(amplitude * Math.cos(angle - offset), amplitude * Math.sin(angle - offset), 0);
  }
}

class LaserXAnimation {
  private path: Vector2[] = [];
  private segmentLengths: number[] = [];
  private totalPathLength: number = 0;

  constructor(
    private laser: Object3D,
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
    let cumulativeLength = 0;

    for (let i = 1; i < this.path.length; i++) {
      if ((cumulativeLength + this.segmentLengths[i - 1]) / this.totalPathLength > progress) {
        const segmentFraction = (progress * this.totalPathLength - cumulativeLength) / this.segmentLengths[i - 1];
        const currentPoint = new Vector2().lerpVectors(this.path[i - 1], this.path[i], segmentFraction);
        this.laser.position.set(currentPoint.x, currentPoint.y, 0);

        break;
      }

      cumulativeLength += this.segmentLengths[i - 1];
    }
  }
}

export function Lasers({ x, y, player }: LasersProps) {
  const laser1Ref = useRef<Group>(null!);
  const laser2Ref = useRef<Group>(null!);

  useEffect(() => {
    const animations: gsap.TweenTarget[] = [];

    if (player === 'x') {
      const w = symbolGap;
      const h = (symbolRadius - symbolGap) * xSymbolScale;

      animations.push(new LaserXAnimation(laser1Ref.current, w, h), new LaserXAnimation(laser2Ref.current, w, h, true));
    } else {
      animations.push(
        new LaserOAnimation(laser1Ref.current, symbolRadius),
        new LaserOAnimation(laser2Ref.current, symbolRadius - symbolGap, Math.PI)
      );
    }

    laser1Ref.current.visible = true;
    laser2Ref.current.visible = true;

    const tween = gsap.fromTo(
      animations,
      {
        value: 0,
      },
      {
        value: player === 'x' ? 1 : 2 * Math.PI,
        runBackwards: player === 'o',
        duration: drawingDuration,
        ease: 'none',
        onComplete: () => {
          laser1Ref.current.visible = false;
          laser2Ref.current.visible = false;
        },
      }
    );

    return () => {
      tween.kill();
    };
  }, [x, y, player]);

  return (
    <>
      <group ref={laser1Ref} visible={false}>
        <Laser x={x} y={y} player={player} />
      </group>
      <group ref={laser2Ref} visible={false}>
        <Laser x={x} y={y} player={player} />
      </group>
    </>
  );
}
