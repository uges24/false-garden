import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useWorldStore } from '../store/worldStore';
import { terrainHeight } from '../utils/terrain';
import { worldThemes } from '../utils/theme';

const segmentCount = 24;

export function SnakeSystem() {
  const refs = useRef<Array<THREE.Mesh | null>>([]);
  const mode = useWorldStore((state) => state.mode);
  const theme = worldThemes[mode];
  const offsets = useMemo(() => Array.from({ length: segmentCount }, (_, i) => i / segmentCount), []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 0.38;
    offsets.forEach((offset, i) => {
      const mesh = refs.current[i];
      if (!mesh) return;
      const a = t - offset * 4.8;
      const x = Math.cos(a) * 21 + Math.sin(a * 1.7) * 4;
      const z = Math.sin(a * 1.15) * 18;
      mesh.position.set(x, terrainHeight(x, z) + 0.18 + Math.sin(a * 4) * 0.07, z);
      mesh.scale.setScalar(1 - offset * 0.55);
      mesh.rotation.y = -a;
      const material = mesh.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = theme.snake * (0.18 + (1 - offset) * 0.55);
      material.opacity = 0.22 + theme.snake * 0.28;
    });
  });

  return (
    <group>
      {offsets.map((offset, i) => (
        <mesh key={i} ref={(node) => { refs.current[i] = node; }} castShadow>
          <sphereGeometry args={[0.34, 16, 12]} />
          <meshStandardMaterial
            color={i < 3 ? '#101314' : '#06352f'}
            emissive={i % 2 ? '#56f8ff' : '#8a54ff'}
            emissiveIntensity={0.2}
            roughness={0.42}
            metalness={0.05}
            transparent
            opacity={0.4}
          />
        </mesh>
      ))}
    </group>
  );
}
