import { useFrame, useThree } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';

const lookAt = new THREE.Vector3();
const desired = new THREE.Vector3();

export function CameraRig() {
  const { camera, pointer } = useThree();
  const orbitOffset = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }, delta) => {
    const time = -0.42 + Math.sin(clock.elapsedTime * 0.055) * 0.22;
    const radius = 13 + Math.sin(clock.elapsedTime * 0.09) * 0.9;
    orbitOffset.set(Math.sin(time) * radius, 2.35 + pointer.y * 0.38, Math.cos(time) * radius + 7.5);

    desired.set(orbitOffset.x + pointer.x * 1.45, orbitOffset.y, orbitOffset.z);
    camera.position.lerp(desired, 1 - Math.pow(0.04, delta));

    lookAt.set(pointer.x * 0.8, 0.95 + pointer.y * 0.22, -8);
    camera.lookAt(lookAt);
  });

  return null;
}
