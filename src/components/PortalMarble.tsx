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
  const portalRingRef = useRef<THREE.Mesh>(null);
  const portalRingTwoRef = useRef<THREE.Mesh>(null);
  const pulseRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const [hovered, setHovered] = useState(false);
  const [portalPulse, setPortalPulse] = useState(0);
  const mode = useWorldStore((state) => state.mode);
  const openPortal = useWorldStore((state) => state.openPortal);
  const theme = worldThemes[mode];
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uGlow: { value: new THREE.Color(theme.marbleGlow) },
          uPearl: { value: new THREE.Color('#f7fdff') },
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
          uniform vec3 uPearl;
          uniform float uHover;
          varying vec2 vUv;
          varying vec3 vNormalW;
          varying vec3 vView;

          void main() {
            float fresnel = pow(1.0 - max(dot(normalize(vNormalW), normalize(vView)), 0.0), 2.0);
            float ribbon = sin(vUv.y * 18.0 + uTime * 1.8) * 0.5 + 0.5;
            float swirl = sin((vUv.x + vUv.y) * 24.0 - uTime * 2.4) * 0.5 + 0.5;
            vec3 magenta = vec3(1.0, 0.18, 0.86);
            vec3 cyan = vec3(0.18, 0.95, 1.0);
            vec3 inner = mix(magenta, cyan, ribbon);
            inner = mix(inner, uPearl, swirl * 0.38);
            vec3 color = mix(inner, uGlow, fresnel);
            float alpha = 0.58 + fresnel * 0.38 + uHover * 0.12;
            gl_FragColor = vec4(color, alpha);
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
    const target = hovered ? 1.62 : 1 + Math.sin(t * 1.6) * 0.06;
    groupRef.current.scale.lerp(new THREE.Vector3(target, target, target), 0.12);
    groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, position[0] + (hovered ? Math.sin(t * 2.1) * 0.18 : 0), 0.08);
    groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, position[1] + Math.sin(t) * 0.08 + (hovered ? 0.22 : 0), 0.1);
    groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, position[2] + (hovered ? Math.cos(t * 1.7) * 0.18 : 0), 0.08);
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.elapsedTime + index;
      materialRef.current.uniforms.uGlow.value.set(theme.marbleGlow);
      materialRef.current.uniforms.uHover.value = THREE.MathUtils.lerp(materialRef.current.uniforms.uHover.value, hovered ? 1 : 0, 0.12);
    }
    if (ringRef.current) {
      const s = 1.4 + ((t * 0.35) % 1) * 2.2;
      ringRef.current.scale.set(s, s, s);
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity = hovered ? 0.28 : 0.1;
    }
    if (portalRingRef.current && portalRingTwoRef.current) {
      portalRingRef.current.rotation.z = t * 0.28;
      portalRingTwoRef.current.rotation.z = -t * 0.42;
      const ringTarget = hovered ? 1.45 : 1;
      portalRingRef.current.scale.lerp(new THREE.Vector3(ringTarget, ringTarget, ringTarget), 0.08);
      portalRingTwoRef.current.scale.lerp(new THREE.Vector3(ringTarget * 0.92, ringTarget * 0.92, ringTarget * 0.92), 0.08);
      (portalRingRef.current.material as THREE.MeshBasicMaterial).opacity = hovered ? 0.48 : 0.2;
      (portalRingTwoRef.current.material as THREE.MeshBasicMaterial).opacity = hovered ? 0.34 : 0.14;
    }
    if (pulseRef.current) {
      const mat = pulseRef.current.material as THREE.MeshBasicMaterial;
      pulseRef.current.scale.setScalar(1 + portalPulse * 8);
      mat.opacity = portalPulse > 0 ? Math.max(0, 0.46 * (1 - portalPulse)) : 0;
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
        setPortalPulse(0.01);
        const started = performance.now();
        const tick = () => {
          const progress = Math.min(1, (performance.now() - started) / 620);
          setPortalPulse(progress);
          if (progress < 1) requestAnimationFrame(tick);
          else {
            setPortalPulse(0);
            openPortal(portal);
          }
        };
        requestAnimationFrame(tick);
      }}
    >
      <mesh castShadow>
        <sphereGeometry args={[0.82, 56, 56]} />
        <primitive ref={materialRef} object={material} attach="material" />
      </mesh>
      <mesh ref={portalRingRef} rotation={[0.2, 0, 0]} scale={1.22}>
        <torusGeometry args={[1.02, 0.035, 10, 96]} />
        <meshBasicMaterial color="#78f8ff" transparent opacity={0.2} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh ref={portalRingTwoRef} rotation={[0.2, Math.PI / 2, 0]} scale={1.08}>
        <torusGeometry args={[1.08, 0.025, 10, 96]} />
        <meshBasicMaterial color="#ff5ee7" transparent opacity={0.14} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh scale={1.45}>
        <sphereGeometry args={[0.78, 32, 32]} />
        <meshBasicMaterial color={theme.marbleGlow} transparent opacity={hovered ? 0.18 : 0.08} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.72, 0]}>
        <ringGeometry args={[0.7, 0.76, 64]} />
        <meshBasicMaterial color={theme.marbleGlow} transparent opacity={0.12} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={pulseRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.66, 0]}>
        <ringGeometry args={[0.52, 0.62, 96]} />
        <meshBasicMaterial color="#f8fbff" transparent opacity={0} blending={THREE.AdditiveBlending} />
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
