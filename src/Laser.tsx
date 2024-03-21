import { Color } from 'three';
import { symbolThickness } from './consts';
import { Player } from './types';

type LaserProps = {
  x: number;
  y: number;
  player: Player;
};

function mix(color1: string, color2: string, factor: number) {
  return new Color(color1).lerp(new Color(color2), factor);
}

export function Laser({ x, y, player }: LaserProps) {
  {
    /* TODO: move these colors into consts file too */
  }
  const laserColor = player === 'x' ? '#E72929' : '#299CE7';
  const hotSpotColor = mix(laserColor, 'white', 0.25);

  return (
    <>
      <mesh position={[x - 3, y - 3, 4]}>
        {/* TODO: use plane that always face the camera instead of box to save some "resources" */}
        <boxGeometry args={[0.005, 0.005, 8]} />
        {/* TODO: add some slight shimmering effect with shader to sell the laser effect more */}
        <meshStandardMaterial emissive={laserColor} emissiveIntensity={12} />
      </mesh>
      <mesh position={[x - 3, y - 3, 0.01]}>
        <planeGeometry args={[symbolThickness, symbolThickness]} />
        <meshStandardMaterial emissive={hotSpotColor} emissiveIntensity={5} />
      </mesh>
    </>
  );
}
