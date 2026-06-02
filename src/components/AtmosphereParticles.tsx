import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { seededRandom } from '../utils/terrain';
import { useWorldStore } from '../store/worldStore';
import { worldThemes } from '../utils/theme';

export function AtmosphereParticles() {
  const pointsRef = useRef<THREE.Points>(null);
  const mode = useWorldStore((state) => state.mode);
  const theme = worldThemes[mode];

  const geometry = useMemo(() => {
    const random = seededRandom(219);
    const positions = new Float32Array(420 * 3);
    for (let i = 0; i < 420; i += 1) {
      positions[i * 3] = (random() - 0.5) * 180;
      positions[i * 3 + 1] = 1 + random() * 32;
      positions[i * 3 + 2] = (random() - 0.5) * 180;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y = clock.elapsedTime * 0.014;
    pointsRef.current.rotation.z = Math.sin(clock.elapsedTime * 0.08) * 0.025;
    pointsRef.current.position.y = Math.sin(clock.elapsedTime * 0.17) * 0.25;
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial color={theme.grassTip} size={0.14} transparent opacity={0.22} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}
