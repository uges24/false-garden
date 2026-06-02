import { Float } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { useMovementInput } from '../hooks/useMovementInput';
import { useWorldStore } from '../store/worldStore';
import { terrainHeight } from '../utils/terrain';

export function Player() {
  const groupRef = useRef<THREE.Group>(null);
  const velocity = useRef(0);
  const input = useMovementInput();
  const { camera } = useThree();
  const setPlayerPosition = useWorldStore((state) => state.setPlayerPosition);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const keys = input.current;
    const ix = Number(keys.has('right')) - Number(keys.has('left'));
    const iz = Number(keys.has('back')) - Number(keys.has('forward'));
    const len = Math.hypot(ix, iz);
    const targetSpeed = len > 0 ? (keys.has('run') ? 13 : 7.2) : 0;
    velocity.current = THREE.MathUtils.lerp(velocity.current, targetSpeed, 1 - Math.pow(0.01, delta));

    if (len > 0.01) {
      const camYaw = Math.atan2(camera.position.x - groupRef.current.position.x, camera.position.z - groupRef.current.position.z);
      const angle = Math.atan2(ix / len, iz / len) + camYaw + Math.PI;
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, angle, 1 - Math.pow(0.001, delta));
      groupRef.current.position.x += Math.sin(angle) * velocity.current * delta;
      groupRef.current.position.z += Math.cos(angle) * velocity.current * delta;
    }

    const y = terrainHeight(groupRef.current.position.x, groupRef.current.position.z) + 1;
    groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, y, 0.25);
    setPlayerPosition([groupRef.current.position.x, groupRef.current.position.y, groupRef.current.position.z]);
  });

  return (
    <Float speed={1.2} floatIntensity={0.04} rotationIntensity={0.06}>
      <group ref={groupRef} position={[0, terrainHeight(0, 0) + 1, 0]} scale={0.62}>
        <mesh castShadow position={[0, 1.25, 0]}>
          <capsuleGeometry args={[0.22, 0.72, 8, 14]} />
          <meshStandardMaterial color="#080b10" roughness={0.55} metalness={0.25} />
        </mesh>
        <mesh castShadow position={[0, 1.88, 0]}>
          <sphereGeometry args={[0.24, 18, 18]} />
          <meshStandardMaterial color="#111827" emissive="#12343f" emissiveIntensity={0.25} />
        </mesh>
        <mesh position={[0, 1.9, 0.19]}>
          <circleGeometry args={[0.13, 18]} />
          <meshBasicMaterial color="#9defff" transparent opacity={0.45} />
        </mesh>
      </group>
    </Float>
  );
}
