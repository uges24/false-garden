import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three/webgpu';
import { uGlobalHueShift, uTerrainColor } from '../../core/shaders/uniforms';

const sunPosition: [number, number, number] = [-24, 46, -38];
const waterHeight = 31;

function createGlowTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d')!;
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,244,206,0.95)');
  gradient.addColorStop(0.2, 'rgba(255,210,122,0.45)');
  gradient.addColorStop(0.48, 'rgba(95,240,255,0.16)');
  gradient.addColorStop(1, 'rgba(0,40,48,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createWaterVeilTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d')!;

  context.fillStyle = '#0a5f66';
  context.fillRect(0, 0, size, size);

  for (let i = 0; i < 46; i += 1) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const radius = 28 + Math.random() * 120;
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(${150 + Math.random() * 80},255,238,${0.05 + Math.random() * 0.1})`);
    gradient.addColorStop(0.45, 'rgba(68,205,200,0.035)');
    gradient.addColorStop(1, 'rgba(4,44,54,0)');
    context.fillStyle = gradient;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  context.globalCompositeOperation = 'screen';
  for (let i = 0; i < 34; i += 1) {
    context.beginPath();
    context.strokeStyle = `rgba(202,255,238,${0.035 + Math.random() * 0.05})`;
    context.lineWidth = 1 + Math.random() * 2.5;
    const y = Math.random() * size;
    context.moveTo(-40, y);
    for (let x = -40; x < size + 80; x += 36) {
      context.lineTo(x, y + Math.sin(x * 0.025 + i) * (9 + Math.random() * 18));
    }
    context.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3.4, 3.4);
  return texture;
}

function UnderwaterDust() {
  const pointsRef = useRef<THREE.Points>(null);
  const geometry = useMemo(() => {
    const count = 520;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const color = new THREE.Color();

    for (let i = 0; i < count; i += 1) {
      const radius = Math.sqrt(Math.random()) * 70;
      const angle = Math.random() * Math.PI * 2;
      positions[i * 3] = Math.cos(angle) * radius - 6;
      positions[i * 3 + 1] = 4 + Math.random() * 25;
      positions[i * 3 + 2] = Math.sin(angle) * radius - 10;

      color.set(i % 3 === 0 ? '#e6fff6' : i % 3 === 1 ? '#8df6ff' : '#68d8c8');
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geo;
  }, []);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.035) * 0.08;
    pointsRef.current.position.y = Math.sin(clock.elapsedTime * 0.19) * 0.18;
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial size={0.13} vertexColors transparent opacity={0.36} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

function CausticShafts() {
  const groupRef = useRef<THREE.Group>(null);
  const shaftMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#bffdf1',
        transparent: true,
        opacity: 0.09,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    [],
  );

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.children.forEach((child, index) => {
      child.rotation.y = Math.sin(clock.elapsedTime * 0.08 + index) * 0.09;
      child.scale.x = 1 + Math.sin(clock.elapsedTime * 0.17 + index * 1.8) * 0.12;
    });
  });

  return (
    <group ref={groupRef} position={[-8, 17, -16]} rotation={[0.16, -0.22, 0.08]}>
      {[-14, -7, 0, 8, 15].map((x, index) => (
        <mesh key={x} position={[x, 0, index % 2 ? 4 : -4]} material={shaftMaterial}>
          <coneGeometry args={[3.2 + index * 0.45, 34, 32, 1, true]} />
        </mesh>
      ))}
    </group>
  );
}

export function WaterSkyCeiling() {
  const { scene } = useThree();
  const waterRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.SpriteMaterial>(null);
  const waterVeil = useMemo(() => createWaterVeilTexture(), []);
  const glowTexture = useMemo(() => createGlowTexture(), []);
  const backgroundColor = useMemo(() => new THREE.Color('#02171d'), []);
  const fogColor = useMemo(() => new THREE.Color('#062c32'), []);
  const fog = useMemo(() => new THREE.Fog(fogColor, 11, 92), [fogColor]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    scene.background = backgroundColor;
    scene.fog = fog;

    if (waterRef.current) {
      waterRef.current.position.y = waterHeight + Math.sin(t * 0.12) * 0.22;
      waterRef.current.rotation.z = Math.sin(t * 0.035) * 0.018;
      waterRef.current.scale.setScalar(1 + Math.sin(t * 0.08) * 0.012);
    }
    waterVeil.offset.set(t * 0.006, t * -0.004);
    waterVeil.rotation = Math.sin(t * 0.035) * 0.018;
    waterVeil.repeat.set(3.4 + Math.sin(t * 0.07) * 0.08, 3.4);
    if (waterRef.current?.material instanceof THREE.MeshBasicMaterial) {
      waterRef.current.material.opacity = 0.68 + Math.sin(t * 0.16) * 0.04;
    }
    if (glowRef.current) {
      glowRef.current.opacity = 0.48 + Math.sin(t * 0.35) * 0.05;
    }

    uTerrainColor.value.lerp(new THREE.Color(0.0, 0.055, 0.052), 0.01);
    uGlobalHueShift.value = THREE.MathUtils.lerp(uGlobalHueShift.value, 0.48, 0.006);
  });

  return (
    <group>
      <mesh ref={waterRef} position={[0, waterHeight, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[360, 360, 96, 96]} />
        <meshBasicMaterial
          map={waterVeil}
          color="#58d8d0"
          transparent
          opacity={0.68}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <sprite position={sunPosition} scale={[23, 23, 1]}>
        <spriteMaterial ref={glowRef} map={glowTexture} color="#ffe8b4" transparent opacity={0.48} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      <pointLight position={sunPosition} color="#ffe2a6" intensity={4.8} distance={125} decay={1.35} />
      <directionalLight position={sunPosition} color="#bffdf4" intensity={0.65} />

      <CausticShafts />
      <UnderwaterDust />
    </group>
  );
}
