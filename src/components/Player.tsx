import { Float } from '@react-three/drei';
import { terrainHeight } from '../utils/terrain';

export function Player() {
  const y = terrainHeight(0, 0) + 1;

  return (
    <Float speed={1.2} floatIntensity={0.04} rotationIntensity={0.06}>
      <group position={[0, y, 0]} scale={0.48}>
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
