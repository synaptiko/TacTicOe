type LaserProps = {
  x: number;
  y: number;
  color: 'red' | 'blue';
};

export function Laser({ x, y, color }: LaserProps) {
  return (
    <mesh position={[x - 3, y - 3, 4]}>
      {/* TODO: use plane that always face the camera instead of box to save some "resources" */}
      <boxGeometry args={[0.005, 0.005, 8]} />
      {/* TODO: add some slight shimmering effect with shader to sell the laser effect more */}
      <meshStandardMaterial emissive={color === 'red' ? '#E72929' : '#299CE7'} emissiveIntensity={12} />
    </mesh>
  );
}
