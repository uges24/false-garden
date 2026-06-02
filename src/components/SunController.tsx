import { Billboard, Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { useWorldStore } from '../store/worldStore';
import { worldThemes } from '../utils/theme';

export function SunController() {
  const groupRef = useRef<THREE.Group>(null);
  const mode = useWorldStore((state) => state.mode);
  const cycleMode = useWorldStore((state) => state.cycleMode);
  const theme = worldThemes[mode];

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const pulse = 1 + Math.sin(clock.elapsedTime * 1.1) * 0.035;
    groupRef.current.scale.setScalar(pulse);
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
        <meshBasicMaterial color={theme.sunCore} transparent opacity={0.13} blending={THREE.AdditiveBlending} />
      </mesh>
      <Billboard position={[0, -4.4, 0]}>
        <Html center distanceFactor={22}>
          <button className="sun-label">Shift sun</button>
        </Html>
      </Billboard>
    </group>
  );
}
