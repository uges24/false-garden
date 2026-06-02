import { Billboard, Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef, useState } from 'react';
import * as THREE from 'three';
import { useWorldStore, type MarblePortal } from '../store/worldStore';
import { worldThemes } from '../utils/theme';

type Props = {
  portal: MarblePortal;
  position: [number, number, number];
  index: number;
};

export function PortalMarble({ portal, position, index }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const mode = useWorldStore((state) => state.mode);
  const openPortal = useWorldStore((state) => state.openPortal);
  const theme = worldThemes[mode];

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime + index * 0.7;
    const target = hovered ? 1.45 : 1 + Math.sin(t * 1.6) * 0.06;
    groupRef.current.scale.lerp(new THREE.Vector3(target, target, target), 0.12);
    groupRef.current.position.y = position[1] + Math.sin(t) * 0.08;
    if (ringRef.current) {
      const s = 1.4 + ((t * 0.35) % 1) * 2.2;
      ringRef.current.scale.set(s, s, s);
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity = hovered ? 0.28 : 0.1;
    }
  });

  return (
    <group
      ref={groupRef}
      position={position}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHovered(true);
        document.body.classList.add('has-pointer');
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.classList.remove('has-pointer');
      }}
      onClick={(event) => {
        event.stopPropagation();
        openPortal(portal);
      }}
    >
      <mesh castShadow>
        <sphereGeometry args={[0.78, 40, 40]} />
        <meshPhysicalMaterial
          color="#f7fdff"
          emissive={theme.marbleGlow}
          emissiveIntensity={hovered ? 1.45 : 0.75}
          metalness={0}
          roughness={0.08}
          transmission={0.48}
          thickness={1.4}
          transparent
          opacity={0.78}
        />
      </mesh>
      <mesh scale={1.45}>
        <sphereGeometry args={[0.78, 32, 32]} />
        <meshBasicMaterial color={theme.marbleGlow} transparent opacity={hovered ? 0.18 : 0.08} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.72, 0]}>
        <ringGeometry args={[0.7, 0.76, 64]} />
        <meshBasicMaterial color={theme.marbleGlow} transparent opacity={0.12} blending={THREE.AdditiveBlending} />
      </mesh>
      {hovered ? (
        <Billboard position={[0, 1.65, 0]}>
          <Html center distanceFactor={14}>
            <div className="marble-label">{portal.title}</div>
          </Html>
        </Billboard>
      ) : null}
    </group>
  );
}
