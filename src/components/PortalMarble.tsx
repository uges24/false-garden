import { Billboard, Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
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
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const [hovered, setHovered] = useState(false);
  const mode = useWorldStore((state) => state.mode);
  const openPortal = useWorldStore((state) => state.openPortal);
  const playerPosition = useWorldStore((state) => state.playerPosition);
  const theme = worldThemes[mode];
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uGlow: { value: new THREE.Color(theme.marbleGlow) },
          uHover: { value: 0 },
        },
        vertexShader: `
          varying vec2 vUv;
          varying vec3 vNormalW;
          varying vec3 vView;

          void main() {
            vUv = uv;
            vec4 world = modelMatrix * vec4(position, 1.0);
            vNormalW = normalize(mat3(modelMatrix) * normal);
            vView = normalize(cameraPosition - world.xyz);
            gl_Position = projectionMatrix * viewMatrix * world;
          }
        `,
        fragmentShader: `
          uniform float uTime;
          uniform vec3 uGlow;
          uniform float uHover;
          varying vec2 vUv;
          varying vec3 vNormalW;
          varying vec3 vView;

          void main() {
            float fresnel = pow(1.0 - max(dot(normalize(vNormalW), normalize(vView)), 0.0), 2.35);
            float ribbon = sin(vUv.y * 16.0 + uTime * 1.45) * 0.5 + 0.5;
            float vein = sin((vUv.x - vUv.y) * 22.0 - uTime * 1.9) * 0.5 + 0.5;
            vec3 cyan = vec3(0.28, 0.96, 1.0);
            vec3 magenta = vec3(1.0, 0.22, 0.84);
            vec3 pearl = vec3(0.96, 1.0, 0.94);
            vec3 color = mix(cyan, magenta, ribbon);
            color = mix(color, pearl, vein * 0.34);
            color = mix(color, uGlow, fresnel * 0.9);
            gl_FragColor = vec4(color, 0.54 + fresnel * 0.38 + uHover * 0.08);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime + index * 0.7;
    const dx = playerPosition[0] - position[0];
    const dz = playerPosition[2] - position[2];
    const approach = 1 - THREE.MathUtils.smoothstep(Math.hypot(dx, dz), 6, 22);
    const target = hovered ? 1.45 : 1 + Math.sin(t * 1.6) * 0.06 + approach * 0.22;
    groupRef.current.scale.lerp(new THREE.Vector3(target, target, target), 0.12);
    groupRef.current.position.y = position[1] + Math.sin(t) * 0.08;
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.elapsedTime + index * 0.8;
      materialRef.current.uniforms.uGlow.value.set(theme.marbleGlow);
      materialRef.current.uniforms.uHover.value = THREE.MathUtils.lerp(materialRef.current.uniforms.uHover.value, hovered ? 1 : approach, 0.12);
    }
    if (ringRef.current) {
      const s = 1.4 + ((t * 0.35) % 1) * 2.2;
      ringRef.current.scale.set(s, s, s);
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity = hovered ? 0.28 : 0.1 + approach * 0.16;
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
        <primitive ref={materialRef} object={material} attach="material" />
      </mesh>
      <mesh scale={1.45}>
        <sphereGeometry args={[0.78, 32, 32]} />
        <meshBasicMaterial color={theme.marbleGlow} transparent opacity={hovered ? 0.22 : 0.1} blending={THREE.AdditiveBlending} depthWrite={false} />
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
