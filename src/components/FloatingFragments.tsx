import { Float } from '@react-three/drei';
import { useMemo } from 'react';
import { sampledPosition } from '../utils/terrain';
import { useWorldStore } from '../store/worldStore';
import { worldThemes } from '../utils/theme';

export function FloatingFragments() {
  const mode = useWorldStore((state) => state.mode);
  const theme = worldThemes[mode];
  const fragments = useMemo(() => Array.from({ length: 14 }, (_, i) => sampledPosition(407, i, 62)), []);

  return (
    <group>
      {fragments.map(([x, y, z], index) => (
        <Float key={index} speed={0.6 + index * 0.03} floatIntensity={0.6} rotationIntensity={1.8}>
          <mesh position={[x, y + 3 + (index % 5), z]} scale={0.25 + (index % 3) * 0.08}>
            <octahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color={index % 2 ? '#8e6cff' : theme.beam} emissive={theme.beam} emissiveIntensity={0.35} roughness={0.24} />
          </mesh>
        </Float>
      ))}
    </group>
  );
}
