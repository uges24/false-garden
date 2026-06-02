import { OrbitControls } from '@react-three/drei';

export function CameraRig() {
  return (
    <OrbitControls
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      minDistance={14}
      maxDistance={55}
      maxPolarAngle={Math.PI * 0.48}
      minPolarAngle={Math.PI * 0.16}
      target={[0, 1.5, 0]}
    />
  );
}
