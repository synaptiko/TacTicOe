import { useEffect, useRef } from 'react';
import { Laser } from './Laser';
import { Group, Object3D } from 'three';
import gsap from 'gsap';
import { drawingDuration } from './Cell';

type LasersProps = {
  x: number;
  y: number;
  color: 'red' | 'blue';
};

class LaserRotation {
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

export function Lasers({ x, y, color }: LasersProps) {
  const laser1Ref = useRef<Group>(null!);
  const laser2Ref = useRef<Group>(null!);

  useEffect(() => {
    const laser1Rotation = new LaserRotation(laser1Ref.current, 0.33);
    const laser2Rotation = new LaserRotation(laser2Ref.current, 0.33 - 0.1 * 1.5, Math.PI);

    const tween = gsap.fromTo(
      [laser1Rotation, laser2Rotation],
      {
        value: 0,
      },
      {
        value: 2 * Math.PI,
        runBackwards: true,
        duration: drawingDuration,
        ease: 'none',
      }
    );

    return () => {
      tween.kill();
    };
  }, [x, y, color]);

  return (
    <>
      <group ref={laser1Ref}>
        <Laser x={x} y={y} color={color} />
      </group>
      <group ref={laser2Ref}>
        <Laser x={x} y={y} color={color} />
      </group>
    </>
  );
}
