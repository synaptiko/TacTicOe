import { useEffect, useRef } from 'react';
import { Laser } from './Laser';
import { Group, Object3D } from 'three';
import gsap from 'gsap';
import { drawingDuration, symbolGap, symbolRadius } from './consts';
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

export function Lasers({ x, y, player }: LasersProps) {
  const laser1Ref = useRef<Group>(null!);
  const laser2Ref = useRef<Group>(null!);

  useEffect(() => {
    const animations: gsap.TweenTarget[] = [];

    if (player === 'x') {
      animations.push(
        new LaserXAnimation(laser1Ref.current, symbolRadius),
        new LaserXAnimation(laser2Ref.current, symbolRadius - symbolGap, Math.PI)
      );
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
        value: 2 * Math.PI,
        runBackwards: true,
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
