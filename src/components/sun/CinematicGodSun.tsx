import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { uGlobalHueShift, uTerrainColor } from '../../core/shaders/uniforms';

type MoodName = 'Golden Day' | 'Blood Sunset' | 'Deep Night' | 'Eclipse';

type Mood = {
  name: MoodName;
  core: string;
  ember: string;
  rim: string;
  halo: string;
  terrain: [number, number, number];
  hue: number;
  pointIntensity: number;
  directionalIntensity: number;
  coronaOpacity: number;
};

const moods: Mood[] = [
  {
    name: 'Golden Day',
    core: '#ffd36a',
    ember: '#ff8c2e',
    rim: '#fff2b5',
    halo: '#ffe18f',
    terrain: [0.0, 0.055, 0.043],
    hue: 0.0,
    pointIntensity: 7.2,
    directionalIntensity: 1.2,
    coronaOpacity: 0.22,
  },
  {
    name: 'Blood Sunset',
    core: '#ff6b34',
    ember: '#ffbf58',
    rim: '#ffd090',
    halo: '#ff6f5f',
    terrain: [0.018, 0.04, 0.035],
    hue: 0.06,
    pointIntensity: 5.4,
    directionalIntensity: 0.72,
    coronaOpacity: 0.3,
  },
  {
    name: 'Deep Night',
    core: '#5f65ff',
    ember: '#28e4ff',
    rim: '#bda0ff',
    halo: '#54e8ff',
    terrain: [0.0, 0.026, 0.035],
    hue: 0.62,
    pointIntensity: 2.4,
    directionalIntensity: 0.24,
    coronaOpacity: 0.16,
  },
  {
    name: 'Eclipse',
    core: '#03030a',
    ember: '#16091f',
    rim: '#ffd76a',
    halo: '#8e64ff',
    terrain: [0.006, 0.018, 0.03],
    hue: 0.75,
    pointIntensity: 3.4,
    directionalIntensity: 0.36,
    coronaOpacity: 0.36,
  },
];

const sunPosition: [number, number, number] = [22, 22, -52];
const target = new THREE.Color();
const terrainTarget = new THREE.Color();

function lerpMaterialColor(material: THREE.MeshBasicMaterial | THREE.MeshStandardMaterial, color: string, amount: number) {
  target.set(color);
  material.color.lerp(target, amount);
}

function createRadialTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d')!;
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.2, 'rgba(255,220,120,0.62)');
  gradient.addColorStop(0.55, 'rgba(120,245,255,0.16)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function CinematicGodSun() {
  const [moodIndex, setMoodIndex] = useState(0);
  const groupRef = useRef<THREE.Group>(null);
  const coronaRef = useRef<THREE.MeshBasicMaterial>(null);
  const haloRef = useRef<THREE.SpriteMaterial>(null);
  const coreRef = useRef<THREE.MeshBasicMaterial>(null);
  const emberRef = useRef<THREE.MeshBasicMaterial>(null);
  const rimRef = useRef<THREE.MeshBasicMaterial>(null);
  const flareRefs = useRef<THREE.MeshBasicMaterial[]>([]);
  const pointLightRef = useRef<THREE.PointLight>(null);
  const directionalLightRef = useRef<THREE.DirectionalLight>(null);
  const { camera } = useThree();
  const mood = moods[moodIndex];

  const haloTexture = useMemo(() => createRadialTexture(), []);
  const flareRadii = useMemo(() => [3.8, 5.4, 7.3, 9.6], []);

  useFrame(({ clock }, delta) => {
    const time = clock.elapsedTime;
    const amount = 1 - Math.exp(-3.6 * delta);

    if (groupRef.current) {
      groupRef.current.lookAt(camera.position);
      groupRef.current.rotation.z = time * 0.025;
      const scale = 1 + Math.sin(time * 0.65) * 0.018;
      groupRef.current.scale.setScalar(scale);
    }

    if (coreRef.current) {
      lerpMaterialColor(coreRef.current, mood.core, amount);
      coreRef.current.opacity = THREE.MathUtils.lerp(coreRef.current.opacity, mood.name === 'Eclipse' ? 0.96 : 1, amount);
    }
    if (emberRef.current) {
      lerpMaterialColor(emberRef.current, mood.ember, amount);
      emberRef.current.opacity = THREE.MathUtils.lerp(emberRef.current.opacity, mood.name === 'Eclipse' ? 0.18 : 0.42, amount);
    }
    if (rimRef.current) {
      lerpMaterialColor(rimRef.current, mood.rim, amount);
      rimRef.current.opacity = THREE.MathUtils.lerp(rimRef.current.opacity, mood.name === 'Eclipse' ? 0.95 : 0.32, amount);
    }
    if (coronaRef.current) {
      lerpMaterialColor(coronaRef.current, mood.halo, amount);
      coronaRef.current.opacity = THREE.MathUtils.lerp(coronaRef.current.opacity, mood.coronaOpacity, amount);
    }
    if (haloRef.current) {
      target.set(mood.halo);
      haloRef.current.color.lerp(target, amount);
      haloRef.current.opacity = THREE.MathUtils.lerp(haloRef.current.opacity, mood.coronaOpacity * 0.7, amount);
    }

    flareRefs.current.forEach((material, index) => {
      lerpMaterialColor(material, index % 2 ? mood.rim : mood.halo, amount);
      material.opacity = THREE.MathUtils.lerp(material.opacity, mood.coronaOpacity * (0.52 - index * 0.07), amount);
    });

    if (pointLightRef.current) {
      target.set(mood.halo);
      pointLightRef.current.color.lerp(target, amount);
      pointLightRef.current.intensity = THREE.MathUtils.lerp(pointLightRef.current.intensity, mood.pointIntensity, amount);
    }
    if (directionalLightRef.current) {
      target.set(mood.rim);
      directionalLightRef.current.color.lerp(target, amount);
      directionalLightRef.current.intensity = THREE.MathUtils.lerp(directionalLightRef.current.intensity, mood.directionalIntensity, amount);
    }

    terrainTarget.setRGB(mood.terrain[0], mood.terrain[1], mood.terrain[2]);
    uTerrainColor.value.lerp(terrainTarget, amount * 0.45);
    uGlobalHueShift.value = THREE.MathUtils.lerp(uGlobalHueShift.value, mood.hue, amount * 0.22);
  });

  return (
    <group
      position={sunPosition}
      onClick={(event) => {
        event.stopPropagation();
        setMoodIndex((current) => (current + 1) % moods.length);
      }}
    >
      <pointLight ref={pointLightRef} color={moods[0].halo} intensity={moods[0].pointIntensity} distance={95} decay={1.45} />
      <directionalLight ref={directionalLightRef} color={moods[0].rim} intensity={moods[0].directionalIntensity} position={[0, 0, 0]} />

      <group ref={groupRef}>
        <sprite scale={[15, 15, 1]}>
          <spriteMaterial ref={haloRef} map={haloTexture} color={moods[0].halo} transparent opacity={0.16} blending={THREE.AdditiveBlending} depthWrite={false} />
        </sprite>

        <mesh>
          <sphereGeometry args={[2.45, 96, 64]} />
          <meshBasicMaterial ref={coreRef} color={moods[0].core} transparent opacity={1} />
        </mesh>

        <mesh scale={0.82} rotation={[0.4, 0.2, 0]}>
          <sphereGeometry args={[2.45, 64, 32]} />
          <meshBasicMaterial ref={emberRef} color={moods[0].ember} transparent opacity={0.42} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>

        <mesh scale={1.08}>
          <sphereGeometry args={[2.45, 80, 48]} />
          <meshBasicMaterial ref={rimRef} color={moods[0].rim} transparent opacity={0.32} blending={THREE.AdditiveBlending} side={THREE.BackSide} depthWrite={false} />
        </mesh>

        <mesh scale={1.5}>
          <sphereGeometry args={[2.45, 80, 48]} />
          <meshBasicMaterial ref={coronaRef} color={moods[0].halo} transparent opacity={moods[0].coronaOpacity} blending={THREE.AdditiveBlending} side={THREE.BackSide} depthWrite={false} />
        </mesh>

        {flareRadii.map((radius, index) => (
          <mesh key={radius} rotation={[0, 0, index * 0.32]}>
            <ringGeometry args={[radius, radius + 0.035 + index * 0.014, 160]} />
            <meshBasicMaterial
              ref={(node) => {
                if (node) flareRefs.current[index] = node;
              }}
              color={index % 2 ? moods[0].rim : moods[0].halo}
              transparent
              opacity={moods[0].coronaOpacity * (0.52 - index * 0.07)}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        ))}

        <mesh rotation={[0, 0, -0.08]} scale={[10.5, 0.03, 0.03]}>
          <sphereGeometry args={[1, 20, 8]} />
          <meshBasicMaterial color={moods[0].rim} transparent opacity={0.14} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}
