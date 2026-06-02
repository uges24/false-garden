import { useFrame, useThree } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';

const lookAt = new THREE.Vector3();
const desired = new THREE.Vector3();

export function CameraRig() {
  const { camera, pointer } = useThree();
  const orbitOffset = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }, delta) => {
    const time = clock.elapsedTime * 0.085;
    const radius = 14.5 + Math.sin(clock.elapsedTime * 0.11) * 1.25;
    orbitOffset.set(Math.sin(time) * radius, 4.2 + pointer.y * 0.65, Math.cos(time) * radius + 9);

    desired.set(orbitOffset.x + pointer.x * 2.4, orbitOffset.y, orbitOffset.z);
    camera.position.lerp(desired, 1 - Math.pow(0.025, delta));

    lookAt.set(pointer.x * 1.2, 1.15 + pointer.y * 0.38, 0);
    camera.lookAt(lookAt);
  });

  return null;
}
