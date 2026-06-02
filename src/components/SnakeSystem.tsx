import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useWorldStore } from '../store/worldStore';
import { terrainHeight } from '../utils/terrain';
import { worldThemes } from '../utils/theme';

const segmentCount = 58;
const dummy = new THREE.Object3D();
const color = new THREE.Color();

function snakePoint(time: number, u: number, anchor: THREE.Vector3) {
  const s = time - u * 8.5;
  const radius = 32 + Math.sin(time * 0.21) * 10;
  const x = anchor.x + Math.cos(s * 0.38) * radius + Math.sin(s * 1.4) * 7;
  const z = anchor.z + Math.sin(s * 0.31) * (radius * 0.85) + Math.cos(s * 0.73) * 6;
  const y = terrainHeight(x, z) + 0.22 + Math.sin(s * 2.2) * 0.08;
  return new THREE.Vector3(x, y, z);
}

export function SnakeSystem() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const wakeRef = useRef<THREE.InstancedMesh>(null);
  const mode = useWorldStore((state) => state.mode);
  const playerPosition = useWorldStore((state) => state.playerPosition);
  const theme = worldThemes[mode];
  const anchor = useMemo(() => new THREE.Vector3(), []);
  const geometry = useMemo(() => new THREE.SphereGeometry(0.45, 18, 12), []);
  const wakeGeometry = useMemo(() => new THREE.CircleGeometry(1, 28), []);

  useFrame(({ clock }) => {
    if (!meshRef.current || !wakeRef.current) return;
    anchor.set(playerPosition[0] + 26, 0, playerPosition[2] - 18);
    const t = clock.elapsedTime * 1.2;
    const reveal = mode === 'Deep Night' || mode === 'Eclipse' ? 1 : 0.36;

    for (let i = 0; i < segmentCount; i += 1) {
      const u = i / (segmentCount - 1);
      const p = snakePoint(t, u, anchor);
      const next = snakePoint(t, Math.min(1, u + 0.02), anchor);
      const heading = Math.atan2(next.x - p.x, next.z - p.z);
      const taper = Math.sin((1 - u) * Math.PI) * 0.7 + 0.18;

      dummy.position.copy(p);
      dummy.rotation.set(0, heading, 0);
      dummy.scale.set(1.35 * taper, 0.42 * taper, 0.72 * taper);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
      color.set(i % 2 ? '#061f20' : '#0a1220').lerp(new THREE.Color(i % 3 ? '#18f3ff' : '#8158ff'), reveal * 0.26 * (1 - u));
      meshRef.current.setColorAt(i, color);

      dummy.position.set(p.x, p.y - 0.16, p.z);
      dummy.rotation.set(-Math.PI / 2, 0, heading);
      dummy.scale.set(2.6 * taper, 1.1 * taper, 1);
      dummy.updateMatrix();
      wakeRef.current.setMatrixAt(i, dummy.matrix);
      wakeRef.current.setColorAt(i, color.set(i % 2 ? '#4af9ff' : '#8c61ff'));
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    meshRef.current.instanceColor!.needsUpdate = true;
    wakeRef.current.instanceMatrix.needsUpdate = true;
    wakeRef.current.instanceColor!.needsUpdate = true;
    (meshRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = reveal * theme.snake * 0.55;
    (meshRef.current.material as THREE.MeshStandardMaterial).opacity = 0.18 + reveal * 0.28;
    (wakeRef.current.material as THREE.MeshBasicMaterial).opacity = 0.08 + reveal * 0.05;
  });

  return (
    <group>
      <instancedMesh ref={wakeRef} args={[wakeGeometry, undefined, segmentCount]} frustumCulled={false}>
        <meshBasicMaterial transparent opacity={0.1} blending={THREE.AdditiveBlending} depthWrite={false} />
      </instancedMesh>
      <instancedMesh ref={meshRef} args={[geometry, undefined, segmentCount]} castShadow frustumCulled={false}>
        <meshStandardMaterial color="#071817" emissive="#36edff" roughness={0.68} metalness={0.12} transparent opacity={0.22} />
      </instancedMesh>
    </group>
  );
}
