import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { useWorldStore } from '../store/worldStore';
import { worldThemes } from '../utils/theme';

export function SunController() {
  const groupRef = useRef<THREE.Group>(null);
  const haloRef = useRef<THREE.Group>(null);
  const mode = useWorldStore((state) => state.mode);
  const cycleMode = useWorldStore((state) => state.cycleMode);
  const theme = worldThemes[mode];

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const pulse = 1 + Math.sin(clock.elapsedTime * 1.1) * 0.035;
    groupRef.current.scale.setScalar(pulse);
    if (haloRef.current) {
      haloRef.current.rotation.z = clock.elapsedTime * 0.035;
    }
  });

  return (
    <group ref={groupRef} position={[17, 24, -36]} onClick={cycleMode}>
      <pointLight color={theme.sunCore} intensity={mode === 'Eclipse' ? 4 : 18} distance={90} />
      <mesh>
        <sphereGeometry args={[3.2, 48, 48]} />
        <meshBasicMaterial color={theme.sun} />
      </mesh>
      {mode === 'Eclipse' ? (
        <mesh position={[0.45, 0.1, 0.35]}>
          <sphereGeometry args={[2.72, 48, 48]} />
          <meshBasicMaterial color="#020207" />
        </mesh>
      ) : null}
      <mesh scale={1.45}>
        <sphereGeometry args={[3.2, 48, 48]} />
        <meshBasicMaterial color={theme.sunCore} transparent opacity={mode === 'Eclipse' ? 0.2 : 0.15} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <group ref={haloRef}>
        {[4.6, 5.9, 7.8].map((radius, index) => (
          <mesh key={radius} rotation={[Math.PI / 2, 0, index * 0.42]}>
            <ringGeometry args={[radius, radius + 0.035, 128]} />
            <meshBasicMaterial color={index % 2 ? theme.sun : theme.sunCore} transparent opacity={0.1 - index * 0.018} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
        ))}
      </group>
      <mesh rotation={[0.2, 0.35, 0]} scale={[5.2, 0.028, 0.028]}>
        <sphereGeometry args={[1, 16, 8]} />
        <meshBasicMaterial color={theme.sunCore} transparent opacity={0.22} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}
