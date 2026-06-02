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
  mx_fractal_noise_float,
  normalize,
  positionLocal,
  positionWorld,
  smoothstep,
  uniform,
  vec2,
  vec3,
  vec4,
} from 'three/tsl';
import { uTime } from '../../core/shaders/uniforms';
import { WATER_DOME_CENTER_Y, WATER_DOME_RADIUS, WATER_SUN_POSITION } from './constants';

export function WaterSkyDome() {
  const groupRef = useRef<THREE.Group>(null);

  const sunPosition = useMemo(
    () => new THREE.Vector3(WATER_SUN_POSITION[0], WATER_SUN_POSITION[1], WATER_SUN_POSITION[2]),
    [],
  );
  const sunDirection = useMemo(() => new THREE.Vector3(0, 1, 0), []);

  const uniforms = useMemo(() => ({
    sunDirection: uniform(vec3(0, 1, 0)),
  }), []);

  const mainMaterial = useMemo(() => {
    const material = new THREE.MeshBasicNodeMaterial();
    material.side = THREE.BackSide;
    material.transparent = true;
    material.depthWrite = false;

    material.positionNode = Fn(() => {
      const radial = normalize(positionLocal);
      const flowUv = positionLocal.xz.mul(0.018).add(vec2(uTime.mul(0.05), uTime.mul(-0.042)));
      const largeWave = mx_fractal_noise_float(flowUv).mul(3.4);
      const mediumWave = mx_fractal_noise_float(
        flowUv.mul(2.1).add(vec2(uTime.mul(-0.08), uTime.mul(0.073))),
      ).mul(1.8);
      const ripple = mx_fractal_noise_float(
        flowUv.mul(5.2).add(vec2(uTime.mul(0.14), uTime.mul(0.11))),
      ).mul(0.9);
      const displacement = largeWave.add(mediumWave).add(ripple).mul(0.36);

      return vec4(positionLocal.add(radial.mul(displacement)), 1.0);
    })();

    material.colorNode = Fn(() => {
      const radialDir = normalize(positionLocal);
      const viewDir = normalize(cameraPosition.sub(positionWorld));
      const fresnel = float(1.0).sub(abs(dot(radialDir, viewDir))).pow(3.6);

      const depthMix = smoothstep(float(-0.45), float(0.92), radialDir.y);
      const deep = vec3(0.02, 0.15, 0.17);
      const mid = vec3(0.06, 0.36, 0.42);
      const baseColor = mix(deep, mid, depthMix);

      const shimmerNoise = mx_fractal_noise_float(
        radialDir.xz.mul(22.0).add(vec2(uTime.mul(0.23), uTime.mul(-0.18))),
      ).add(1.0).mul(0.5);
      const shimmer = smoothstep(float(0.62), float(0.98), shimmerNoise).mul(0.24);

      const sunFocus = smoothstep(float(0.88), float(1.0), dot(radialDir, uniforms.sunDirection));
      const sunTint = vec3(0.95, 0.84, 0.72).mul(sunFocus.mul(0.75));

      const pearl = vec3(0.74, 0.9, 0.94);
      const pearlBlend = fresnel.mul(0.6).add(shimmer);
      const finalColor = mix(baseColor, pearl, pearlBlend).add(sunTint);

      return vec4(finalColor, float(0.98));
    })();

    return material;
  }, [uniforms.sunDirection]);

  const shimmerMaterial = useMemo(() => {
    const material = new THREE.MeshBasicNodeMaterial();
    material.side = THREE.BackSide;
    material.transparent = true;
    material.depthWrite = false;
    material.blending = THREE.AdditiveBlending;

    material.colorNode = Fn(() => {
      const radialDir = normalize(positionLocal);
      const viewDir = normalize(cameraPosition.sub(positionWorld));
      const fresnel = float(1.0).sub(abs(dot(radialDir, viewDir))).pow(5.4);
      const glintNoise = mx_fractal_noise_float(
        radialDir.xz.mul(30.0).add(vec2(uTime.mul(0.38), uTime.mul(-0.31))),
      ).add(1.0).mul(0.5);
      const glints = smoothstep(float(0.72), float(0.99), glintNoise).mul(fresnel).mul(0.32);

      return vec4(vec3(0.78, 0.96, 1.0), glints);
    })();

    return material;
  }, []);

  useFrame(({ camera }) => {
    if (!groupRef.current) return;

    groupRef.current.position.x = camera.position.x;
    groupRef.current.position.z = camera.position.z;

    sunDirection.copy(sunPosition).sub(groupRef.current.position).normalize();
    uniforms.sunDirection.value.set(sunDirection.x, sunDirection.y, sunDirection.z);
  });

  return (
    <group ref={groupRef} position={[0, WATER_DOME_CENTER_Y, 0]}>
      <mesh frustumCulled={false}>
        <sphereGeometry args={[WATER_DOME_RADIUS, 192, 128, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
        <primitive object={mainMaterial} attach="material" />
      </mesh>

      <mesh scale={0.986} frustumCulled={false}>
        <sphereGeometry args={[WATER_DOME_RADIUS, 160, 96, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
        <primitive object={shimmerMaterial} attach="material" />
      </mesh>
    </group>
  );
}
