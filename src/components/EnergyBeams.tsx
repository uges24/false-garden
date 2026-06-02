import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useWorldStore } from '../store/worldStore';
import { sampledPosition } from '../utils/terrain';
import { worldThemes } from '../utils/theme';

export function EnergyBeams() {
  const groupRef = useRef<THREE.Group>(null);
  const mode = useWorldStore((state) => state.mode);
  const theme = worldThemes[mode];
  const positions = useMemo(() => [sampledPosition(91, 0, 58), sampledPosition(91, 1, 58), sampledPosition(91, 2, 58)], []);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.children.forEach((child, index) => {
      child.rotation.y = clock.elapsedTime * (0.08 + index * 0.02);
    });
  });

  return (
    <group ref={groupRef}>
      {positions.map(([x, y, z], index) => (
        <group key={index} position={[x, y, z]}>
          <mesh position={[0, 10, 0]}>
            <cylinderGeometry args={[0.18, 0.5, 24, 24, 1, true]} />
            <meshBasicMaterial color={theme.beam} transparent opacity={0.28 + theme.snake * 0.08} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
            <ringGeometry args={[1.7, 1.78, 72]} />
            <meshBasicMaterial color={index % 2 ? '#9d63ff' : theme.beam} transparent opacity={0.28} blending={THREE.AdditiveBlending} />
          </mesh>
          <pointLight color={theme.beam} intensity={1.4 + theme.snake} distance={16} />
        </group>
      ))}
    </group>
  );
}
