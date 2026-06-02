import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { sampledPosition, terrainHeight } from '../utils/terrain';
import { useWorldStore } from '../store/worldStore';
import { worldThemes } from '../utils/theme';

export function SingularityFragments() {
  const refs = useRef<Array<THREE.Mesh | null>>([]);
  const mode = useWorldStore((state) => state.mode);
  const theme = worldThemes[mode];
  const seeds = useMemo(() => Array.from({ length: 24 }, (_, i) => sampledPosition(808, i, 125)), []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    refs.current.forEach((mesh, index) => {
      if (!mesh) return;
      const [sx, , sz] = seeds[index];
      const pull = (Math.sin(t * 0.12 + index) + 1) * 0.5;
      const angle = t * (0.13 + index * 0.004) + index;
      const radius = 4 + pull * 11;
      mesh.position.set(sx + Math.cos(angle) * radius, terrainHeight(sx, sz) + 5 + (index % 6) + Math.sin(t + index) * 0.8, sz + Math.sin(angle) * radius);
      mesh.rotation.x += 0.006 + index * 0.0004;
      mesh.rotation.y += 0.012;
      const s = 0.22 + pull * 0.28;
      mesh.scale.setScalar(s);
    });
  });

  return (
    <group>
      {seeds.map((_, index) => (
        <mesh key={index} ref={(node) => { refs.current[index] = node; }}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={index % 2 ? '#8f66ff' : theme.beam} emissive={theme.beam} emissiveIntensity={0.45} roughness={0.3} metalness={0.25} />
        </mesh>
      ))}
    </group>
  );
}
