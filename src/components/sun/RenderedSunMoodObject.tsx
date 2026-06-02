import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

type MoodName = 'Golden Day' | 'Blood Sunset' | 'Deep Night' | 'Eclipse';

type Mood = {
  name: MoodName;
  core: string;
  halo: string;
  rim: string;
  light: string;
  coreIntensity: number;
  coronaOpacity: number;
  flareOpacity: number;
  pointIntensity: number;
  directionalIntensity: number;
};

const moods: Mood[] = [
  {
    name: 'Golden Day',
    core: '#ffd46b',
    halo: '#fff1a8',
    rim: '#fff7cc',
    light: '#ffd77a',
    coreIntensity: 1,
    coronaOpacity: 0.2,
    flareOpacity: 0.18,
    pointIntensity: 9,
    directionalIntensity: 1.1,
  },
  {
    name: 'Blood Sunset',
    core: '#ff743d',
    halo: '#ffb15f',
    rim: '#ffd18a',
    light: '#ff8a54',
    coreIntensity: 0.86,
    coronaOpacity: 0.28,
    flareOpacity: 0.26,
    pointIntensity: 6.8,
    directionalIntensity: 0.7,
  },
  {
    name: 'Deep Night',
    core: '#4f62ff',
    halo: '#73f7ff',
    rim: '#bda1ff',
    light: '#7df7ff',
    coreIntensity: 0.54,
    coronaOpacity: 0.16,
    flareOpacity: 0.12,
    pointIntensity: 2.8,
    directionalIntensity: 0.22,
  },
  {
    name: 'Eclipse',
    core: '#05030a',
    halo: '#f3c45b',
    rim: '#fff0a6',
    light: '#caa04b',
    coreIntensity: 0.28,
    coronaOpacity: 0.34,
    flareOpacity: 0.32,
    pointIntensity: 4.5,
    directionalIntensity: 0.34,
  },
];

const sunPosition: [number, number, number] = [14, 18, -34];
const tmpCore = new THREE.Color();
const tmpHalo = new THREE.Color();
const tmpRim = new THREE.Color();
const tmpLight = new THREE.Color();

function dampColor(color: THREE.Color, target: string, lambda: number, delta: number) {
  tmpCore.set(target);
  color.lerp(tmpCore, 1 - Math.exp(-lambda * delta));
}

function dampNumber(current: number, target: number, lambda: number, delta: number) {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * delta));
}

export function RenderedSunMoodObject() {
  const groupRef = useRef<THREE.Group>(null);
  const haloRef = useRef<THREE.Group>(null);
  const coreMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const innerGlowRef = useRef<THREE.MeshBasicMaterial>(null);
  const outerGlowRef = useRef<THREE.MeshBasicMaterial>(null);
  const eclipseRimRef = useRef<THREE.MeshBasicMaterial>(null);
  const flareMaterialsRef = useRef<THREE.MeshBasicMaterial[]>([]);
  const pointLightRef = useRef<THREE.PointLight>(null);
  const directionalLightRef = useRef<THREE.DirectionalLight>(null);
  const [moodIndex, setMoodIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const { camera } = useThree();
  const targetMood = moods[moodIndex];

  const ringRadii = useMemo(() => [3.8, 5.4, 7.2, 9.8], []);

  useFrame(({ clock }, delta) => {
    const elapsed = clock.elapsedTime;
    const pulse = 1 + Math.sin(elapsed * 0.85) * 0.035;

    if (groupRef.current) {
      groupRef.current.scale.lerp(new THREE.Vector3(pulse, pulse, pulse), 0.08);
    }

    if (haloRef.current) {
      haloRef.current.quaternion.copy(camera.quaternion);
      haloRef.current.rotation.z += elapsed * 0.0008;
    }

    if (coreMaterialRef.current) {
      dampColor(coreMaterialRef.current.color, targetMood.core, 4.2, delta);
      coreMaterialRef.current.opacity = dampNumber(coreMaterialRef.current.opacity, targetMood.coreIntensity, 4.2, delta);
    }

    if (innerGlowRef.current) {
      dampColor(innerGlowRef.current.color, targetMood.halo, 4.2, delta);
      innerGlowRef.current.opacity = dampNumber(innerGlowRef.current.opacity, targetMood.coronaOpacity, 4.2, delta);
    }

    if (outerGlowRef.current) {
      dampColor(outerGlowRef.current.color, targetMood.halo, 4.2, delta);
      outerGlowRef.current.opacity = dampNumber(outerGlowRef.current.opacity, targetMood.coronaOpacity * 0.56, 4.2, delta);
    }

    if (eclipseRimRef.current) {
      dampColor(eclipseRimRef.current.color, targetMood.rim, 4.2, delta);
      eclipseRimRef.current.opacity = dampNumber(eclipseRimRef.current.opacity, targetMood.name === 'Eclipse' ? 0.82 : 0.18, 4.2, delta);
    }

    flareMaterialsRef.current.forEach((material, index) => {
      tmpHalo.set(index % 2 ? targetMood.rim : targetMood.halo);
      material.color.lerp(tmpHalo, 1 - Math.exp(-4.2 * delta));
      material.opacity = dampNumber(material.opacity, targetMood.flareOpacity * (0.95 - index * 0.16), 4.2, delta);
    });

    if (pointLightRef.current) {
      tmpLight.set(targetMood.light);
      pointLightRef.current.color.lerp(tmpLight, 1 - Math.exp(-4.2 * delta));
      pointLightRef.current.intensity = dampNumber(pointLightRef.current.intensity, targetMood.pointIntensity, 4.2, delta);
    }

    if (directionalLightRef.current) {
      tmpRim.set(targetMood.light);
      directionalLightRef.current.color.lerp(tmpRim, 1 - Math.exp(-4.2 * delta));
      directionalLightRef.current.intensity = dampNumber(directionalLightRef.current.intensity, targetMood.directionalIntensity, 4.2, delta);
    }
  });

  return (
    <group
      ref={groupRef}
      position={sunPosition}
      onClick={(event) => {
        event.stopPropagation();
        setMoodIndex((current) => (current + 1) % moods.length);
      }}
      onPointerOver={() => {
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'default';
      }}
    >
      <pointLight ref={pointLightRef} color={moods[0].light} intensity={moods[0].pointIntensity} distance={60} decay={1.6} />
      <directionalLight ref={directionalLightRef} color={moods[0].light} intensity={moods[0].directionalIntensity} position={[0, 0, 0]} />

      <mesh userData={{ lensflare: 'no-occlusion' }}>
        <sphereGeometry args={[1.72, 72, 48]} />
        <meshBasicMaterial ref={coreMaterialRef} color={moods[0].core} transparent opacity={moods[0].coreIntensity} />
      </mesh>

      <mesh scale={1.18}>
        <sphereGeometry args={[1.72, 72, 48]} />
        <meshBasicMaterial
          ref={eclipseRimRef}
          color={moods[0].rim}
          transparent
          opacity={0.18}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>

      <mesh scale={1.55}>
        <sphereGeometry args={[1.72, 64, 40]} />
        <meshBasicMaterial
          ref={innerGlowRef}
          color={moods[0].halo}
          transparent
          opacity={moods[0].coronaOpacity}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>

      <mesh scale={2.18}>
        <sphereGeometry args={[1.72, 64, 40]} />
        <meshBasicMaterial
          ref={outerGlowRef}
          color={moods[0].halo}
          transparent
          opacity={moods[0].coronaOpacity * 0.56}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>

      <group ref={haloRef}>
        {ringRadii.map((radius, index) => (
          <mesh key={radius} rotation={[0, 0, index * 0.35]} scale={hovered ? 1.04 : 1}>
            <ringGeometry args={[radius, radius + 0.035 + index * 0.014, 160]} />
            <meshBasicMaterial
              ref={(node) => {
                if (node) flareMaterialsRef.current[index] = node;
              }}
              color={index % 2 ? moods[0].rim : moods[0].halo}
              transparent
              opacity={moods[0].flareOpacity * (0.95 - index * 0.16)}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>

      <mesh rotation={[0.1, 0.25, -0.08]} scale={[7.4, 0.032, 0.032]}>
        <sphereGeometry args={[1, 18, 8]} />
        <meshBasicMaterial color={moods[0].rim} transparent opacity={0.18} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}
