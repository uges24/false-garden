import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useWorldStore } from '../store/worldStore';
import { terrainHeight } from '../utils/terrain';
import { worldThemes } from '../utils/theme';

const segmentCount = 24;

export function SnakeSystem() {
  const refs = useRef<Array<THREE.Mesh | null>>([]);
  const wakeRefs = useRef<Array<THREE.Mesh | null>>([]);
  const mode = useWorldStore((state) => state.mode);
  const marbleSeed = useWorldStore((state) => state.marbleSeed);
  const theme = worldThemes[mode];
  const offsets = useMemo(() => Array.from({ length: segmentCount }, (_, i) => i / segmentCount), []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 0.24;
    const rareReveal = mode === 'Deep Night' || mode === 'Eclipse' ? 1 : Math.max(0, Math.sin(clock.elapsedTime * 0.19) - 0.62) * 1.4;
    const marbleOrbit = Math.floor(clock.elapsedTime / 18) % 5;
    const anchorAngle = marbleSeed + marbleOrbit * 1.7;
    const anchorX = Math.cos(anchorAngle) * 18;
    const anchorZ = Math.sin(anchorAngle) * 16;
    offsets.forEach((offset, i) => {
      const mesh = refs.current[i];
      const wake = wakeRefs.current[i];
      const a = t - offset * 4.8;
      const x = anchorX + Math.cos(a) * 9 + Math.sin(a * 1.7) * 3;
      const z = anchorZ + Math.sin(a * 1.15) * 8;
      const y = terrainHeight(x, z) + 0.08 + Math.sin(a * 4) * 0.05;
      if (mesh) {
        mesh.position.set(x, y + 0.1, z);
        mesh.scale.setScalar(0.72 - offset * 0.42);
        mesh.rotation.y = -a;
        const material = mesh.material as THREE.MeshStandardMaterial;
        material.emissiveIntensity = rareReveal * theme.snake * (0.12 + (1 - offset) * 0.82);
        material.opacity = 0.035 + rareReveal * (mode === 'Golden Day' ? 0.1 : 0.32);
      }
      if (wake) {
        wake.position.set(x, y + 0.025, z);
        wake.rotation.z = -a;
        const wakeScale = 1.4 - offset * 0.45;
        wake.scale.set(wakeScale * 1.9, wakeScale * 0.65, wakeScale);
        const wakeMaterial = wake.material as THREE.MeshBasicMaterial;
        wakeMaterial.opacity = 0.08 + (1 - offset) * 0.12 + rareReveal * 0.05;
      }
    });
  });

  return (
    <group>
      {offsets.map((offset, i) => (
        <group key={i}>
          <mesh ref={(node) => { wakeRefs.current[i] = node; }} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.72, 28]} />
            <meshBasicMaterial color={i % 2 ? '#56f8ff' : '#8a54ff'} transparent opacity={0.12} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
          <mesh ref={(node) => { refs.current[i] = node; }} castShadow>
            <sphereGeometry args={[0.34, 16, 12]} />
            <meshStandardMaterial
              color={i < 3 ? '#101314' : '#06352f'}
              emissive={i % 2 ? '#56f8ff' : '#8a54ff'}
              emissiveIntensity={0.02}
              roughness={0.42}
              metalness={0.05}
              transparent
              opacity={0.08}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
