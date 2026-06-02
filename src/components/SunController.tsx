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
      haloRef.current.rotation.z = clock.elapsedTime * 0.045;
      haloRef.current.children.forEach((child, index) => {
        const ring = child as THREE.Mesh;
        const s = 1 + Math.sin(clock.elapsedTime * 0.4 + index) * 0.035;
        ring.scale.setScalar(s);
      });
    }
  });

  return (
    <group ref={groupRef} position={[10, 15, -48]} onClick={cycleMode}>
      <pointLight color={theme.sunCore} intensity={mode === 'Eclipse' ? 9 : 30} distance={130} />
      <mesh>
        <sphereGeometry args={[4.15, 64, 64]} />
        <meshBasicMaterial color={theme.sun} />
      </mesh>
      {mode === 'Eclipse' ? (
        <mesh position={[0.45, 0.1, 0.35]}>
          <sphereGeometry args={[3.6, 64, 64]} />
          <meshBasicMaterial color="#020207" />
        </mesh>
      ) : null}
      <mesh scale={1.75}>
        <sphereGeometry args={[4.15, 48, 48]} />
        <meshBasicMaterial color={theme.sunCore} transparent opacity={mode === 'Eclipse' ? 0.28 : 0.2} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <group ref={haloRef}>
        {[6.1, 8.4, 12.2, 17.5].map((radius, index) => (
          <mesh key={radius} rotation={[Math.PI / 2, 0, index * 0.34]}>
            <ringGeometry args={[radius, radius + 0.04 + index * 0.02, 128]} />
            <meshBasicMaterial
              color={index % 2 ? theme.sun : theme.sunCore}
              transparent
              opacity={(mode === 'Eclipse' ? 0.18 : 0.1) - index * 0.012}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>
      <mesh rotation={[0.2, 0.4, 0]} scale={[9.5, 0.035, 0.035]}>
        <sphereGeometry args={[1, 16, 8]} />
        <meshBasicMaterial color={theme.sunCore} transparent opacity={0.34} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}
