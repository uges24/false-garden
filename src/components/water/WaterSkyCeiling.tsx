import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three/webgpu';
import { WaterMesh } from 'three/examples/jsm/objects/WaterMesh.js';
import { uGlobalHueShift, uTerrainColor } from '../../core/shaders/uniforms';

const sunDirection = new THREE.Vector3(-0.32, 0.82, 0.48).normalize();
const sunPosition: [number, number, number] = [-24, 46, -38];
const waterHeight = 31;

function createWaterNormals() {
  const size = 256;
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 4;
      const sx = Math.sin(x * 0.11) + Math.sin((x + y) * 0.037) * 0.65;
      const sy = Math.cos(y * 0.1) + Math.sin((x - y) * 0.041) * 0.55;
      data[i] = 128 + sx * 48;
      data[i + 1] = 128 + sy * 48;
      data[i + 2] = 220;
      data[i + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

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
  const waterRef = useRef<WaterMesh | null>(null);
  const glowRef = useRef<THREE.SpriteMaterial>(null);
  const waterNormals = useMemo(() => createWaterNormals(), []);
  const glowTexture = useMemo(() => createGlowTexture(), []);
  const water = useMemo(() => {
    const mesh = new WaterMesh(new THREE.PlaneGeometry(360, 360, 96, 96), {
      waterNormals,
      alpha: 0.86,
      size: 2.1,
      sunColor: '#fff0bf',
      sunDirection,
      waterColor: '#0b706e',
      distortionScale: 18,
      resolutionScale: 0.45,
    });
    mesh.material.side = THREE.DoubleSide;
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = waterHeight;
    return mesh;
  }, [waterNormals]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (waterRef.current) {
      waterRef.current.position.y = waterHeight + Math.sin(t * 0.12) * 0.22;
      waterRef.current.rotation.z = Math.sin(t * 0.035) * 0.018;
      waterRef.current.size.value = 2.05 + Math.sin(t * 0.08) * 0.08;
      waterRef.current.distortionScale.value = 17 + Math.sin(t * 0.11) * 1.8;
    }
    if (glowRef.current) {
      glowRef.current.opacity = 0.48 + Math.sin(t * 0.35) * 0.05;
    }

    uTerrainColor.value.lerp(new THREE.Color(0.0, 0.055, 0.052), 0.01);
    uGlobalHueShift.value = THREE.MathUtils.lerp(uGlobalHueShift.value, 0.48, 0.006);
  });

  return (
    <group>
      <color attach="background" args={['#02171d']} />
      <fog attach="fog" args={['#062c32', 11, 92]} />
      <primitive ref={waterRef} object={water} />

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
