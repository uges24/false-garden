import { useFrame, useThree } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';
import { useWorldStore } from '../store/worldStore';

const desired = new THREE.Vector3();
const lookAt = new THREE.Vector3();

export function CameraRig() {
  const { camera, pointer } = useThree();
  const playerPosition = useWorldStore((state) => state.playerPosition);
  const player = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    player.fromArray(playerPosition);
    const orbit = new THREE.Vector3(-7 + pointer.x * 1.4, 4.2 + pointer.y * 0.45, 12);
    desired.copy(player).add(orbit);
    camera.position.lerp(desired, 1 - Math.pow(0.025, delta));
    lookAt.set(player.x + pointer.x * 1.2, player.y + 1.15 + pointer.y * 0.22, player.z - 4);
    camera.lookAt(lookAt);
  });

  return null;
}
