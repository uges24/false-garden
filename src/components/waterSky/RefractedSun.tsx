import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three/webgpu';
import {
  Fn,
  abs,
  cameraPosition,
  dot,
  float,
  mix,
  mx_noise_float,
  normalWorld,
  normalize,
  positionLocal,
  positionWorld,
  vec3,
  vec4,
} from 'three/tsl';
import { uTime } from '../../core/shaders/uniforms';
import { WATER_SUN_POSITION } from './constants';

type SunMaterialOptions = {
  warmColor: [number, number, number];
  pearlColor: [number, number, number];
  displacement: number;
  noiseScale: number;
  motion: [number, number, number];
  alphaScale: number;
  fresnelPower: number;
  fresnelAlpha: number;
};

function createRefractedSunMaterial(options: SunMaterialOptions) {
  const material = new THREE.MeshBasicNodeMaterial();
  material.transparent = true;
  material.depthWrite = false;
  material.side = THREE.DoubleSide;
  material.blending = THREE.AdditiveBlending;

  material.positionNode = Fn(() => {
    const radial = normalize(positionLocal);
    const noise = mx_noise_float(
      positionLocal.mul(options.noiseScale).add(
        vec3(
          uTime.mul(options.motion[0]),
          uTime.mul(options.motion[1]),
          uTime.mul(options.motion[2]),
        ),
      ),
    );
    const displaced = positionLocal.add(radial.mul(noise.mul(options.displacement)));
    return vec4(displaced, 1.0);
  })();

  material.colorNode = Fn(() => {
    const turbulence = mx_noise_float(
      positionLocal.mul(options.noiseScale * 0.84).add(
        vec3(
          uTime.mul(options.motion[1] * 0.72),
          uTime.mul(options.motion[2] * 0.81),
          uTime.mul(options.motion[0] * 0.66),
        ),
      ),
    ).add(1.0).mul(0.5);

    const viewDir = normalize(cameraPosition.sub(positionWorld));
    const fresnel = float(1.0).sub(abs(dot(normalWorld, viewDir))).pow(options.fresnelPower);

    const warm = vec3(options.warmColor[0], options.warmColor[1], options.warmColor[2]);
    const pearl = vec3(options.pearlColor[0], options.pearlColor[1], options.pearlColor[2]);
    const blend = turbulence.mul(0.42).add(fresnel.mul(0.48));
    const color = mix(warm, pearl, blend);

    const alpha = turbulence.mul(options.alphaScale).add(fresnel.mul(options.fresnelAlpha));

    return vec4(color, alpha);
  })();

  return material;
}

export function RefractedSun() {
  const groupRef = useRef<THREE.Group>(null);

  const coreMaterial = useMemo(
    () => createRefractedSunMaterial({
      warmColor: [1.0, 0.85, 0.66],
      pearlColor: [0.83, 0.94, 0.99],
      displacement: 0.52,
      noiseScale: 0.72,
      motion: [0.13, -0.16, 0.11],
      alphaScale: 0.28,
      fresnelPower: 2.7,
      fresnelAlpha: 0.58,
    }),
    [],
  );

  const shellMaterial = useMemo(
    () => createRefractedSunMaterial({
      warmColor: [0.96, 0.8, 0.57],
      pearlColor: [0.73, 0.9, 0.96],
      displacement: 0.95,
      noiseScale: 0.48,
      motion: [0.09, 0.12, -0.08],
      alphaScale: 0.16,
      fresnelPower: 3.9,
      fresnelAlpha: 0.46,
    }),
    [],
  );

  const veilMaterial = useMemo(
    () => createRefractedSunMaterial({
      warmColor: [0.92, 0.78, 0.52],
      pearlColor: [0.63, 0.82, 0.92],
      displacement: 1.1,
      noiseScale: 0.3,
      motion: [0.05, -0.07, 0.06],
      alphaScale: 0.08,
      fresnelPower: 4.8,
      fresnelAlpha: 0.28,
    }),
    [],
  );

  useFrame(({ clock }) => {
    if (!groupRef.current) return;

    const time = clock.elapsedTime;
    groupRef.current.position.x = WATER_SUN_POSITION[0] + Math.sin(time * 0.07) * 0.8;
    groupRef.current.position.y = WATER_SUN_POSITION[1] + Math.sin(time * 0.16) * 0.6;
    groupRef.current.position.z = WATER_SUN_POSITION[2] + Math.cos(time * 0.05) * 0.7;

    groupRef.current.rotation.y = time * 0.08;
    groupRef.current.rotation.z = Math.sin(time * 0.12) * 0.15;
  });

  return (
    <group ref={groupRef} position={WATER_SUN_POSITION}>
      <pointLight color="#ffe6be" intensity={9.5} distance={190} decay={1.45} />

      <mesh>
        <icosahedronGeometry args={[4.8, 7]} />
        <primitive object={coreMaterial} attach="material" />
      </mesh>

      <mesh scale={1.42} rotation={[0.38, 0.2, 0]}>
        <icosahedronGeometry args={[4.8, 5]} />
        <primitive object={shellMaterial} attach="material" />
      </mesh>

      <mesh scale={[2.4, 1.45, 2.3]} rotation={[0.2, 0.7, -0.25]}>
        <sphereGeometry args={[4.8, 72, 40]} />
        <primitive object={veilMaterial} attach="material" />
      </mesh>
    </group>
  );
}
