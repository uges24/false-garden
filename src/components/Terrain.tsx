import { useMemo } from 'react';
import * as THREE from 'three';
import { useWorldStore } from '../store/worldStore';
import { TERRAIN_SIZE, terrainHeight } from '../utils/terrain';
import { worldThemes } from '../utils/theme';

export function Terrain() {
  const mode = useWorldStore((state) => state.mode);
  const theme = worldThemes[mode];

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, 220, 220);
    geo.rotateX(-Math.PI / 2);
    const position = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < position.count; i += 1) {
      const x = position.getX(i);
      const z = position.getZ(i);
      position.setY(i, terrainHeight(x, z));
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial color={theme.grassA} roughness={0.92} metalness={0.03} />
    </mesh>
  );
}
