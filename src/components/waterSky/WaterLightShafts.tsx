import { createPortal, useFrame } from '@react-three/fiber';
import { useContext, useMemo, useRef } from 'react';
import * as THREE from 'three/webgpu';
import {
  Fn,
  float,
  length,
  mix,
  mx_fractal_noise_float,
  positionLocal,
  smoothstep,
  uv,
  vec2,
  vec3,
  vec4,
} from 'three/tsl';
import { BeamSceneContext } from '../../app/App';
import { uTime } from '../../core/shaders/uniforms';
import { WATER_SHAFT_COUNT, WATER_SUN_POSITION } from './constants';

type ShaftDefinition = {
  baseX: number;
  baseY: number;
  baseZ: number;
  width: number;
  length: number;
  tiltX: number;
  tiltZ: number;
  yaw: number;
  driftX: number;
  driftZ: number;
  phase: number;
};

function createShaftMaterial() {
  const material = new THREE.MeshBasicNodeMaterial();
  material.transparent = true;
  material.depthWrite = false;
  material.side = THREE.DoubleSide;
  material.blending = THREE.AdditiveBlending;

  material.colorNode = Fn(() => {
    const radialDistance = length(positionLocal.xz.mul(2.2));
    const radialFade = smoothstep(float(1.0), float(0.08), radialDistance);

    const topFade = smoothstep(float(0.0), float(0.08), uv().y);
    const bottomFade = smoothstep(float(1.0), float(0.2), uv().y);

    const flowNoise = mx_fractal_noise_float(
      vec2(uv().x.mul(4.2).add(uTime.mul(0.08)), uv().y.mul(8.5).sub(uTime.mul(0.05))),
    ).add(1.0).mul(0.5);

    const shimmer = smoothstep(float(0.42), float(0.95), flowNoise).mul(0.65).add(0.35);
    const alpha = radialFade.mul(topFade).mul(bottomFade).mul(shimmer).mul(0.25);

    const cool = vec3(0.24, 0.69, 0.74);
    const warm = vec3(0.99, 0.91, 0.76);
    const beamColor = mix(cool, warm, uv().y.mul(0.58).add(flowNoise.mul(0.12)));

    return vec4(beamColor, alpha);
  })();

  return material;
}

export function WaterLightShafts() {
  const beamScene = useContext(BeamSceneContext);
  const shaftRefs = useRef<Array<THREE.Mesh | null>>([]);

  const shafts = useMemo<ShaftDefinition[]>(
    () =>
      Array.from({ length: WATER_SHAFT_COUNT }, (_, index) => {
        const spread = 7 + Math.random() * 14;
        const angle = (index / WATER_SHAFT_COUNT) * Math.PI * 2 + Math.random() * 0.7;
        const length = 42 + Math.random() * 28;

        return {
          baseX: Math.cos(angle) * spread,
          baseY: -length * 0.46,
          baseZ: Math.sin(angle) * spread,
          width: 1.3 + Math.random() * 1.6,
          length,
          tiltX: -0.28 + Math.random() * 0.56,
          tiltZ: -0.22 + Math.random() * 0.44,
          yaw: Math.random() * Math.PI * 2,
          driftX: 0.5 + Math.random() * 1.2,
          driftZ: 0.5 + Math.random() * 1.2,
          phase: Math.random() * Math.PI * 2,
        };
      }),
    [],
  );

  const shaftMaterial = useMemo(() => createShaftMaterial(), []);

  useFrame(({ clock }) => {
    const time = clock.elapsedTime;

    shafts.forEach((shaft, index) => {
      const mesh = shaftRefs.current[index];
      if (!mesh) return;

      mesh.position.x = shaft.baseX + Math.sin(time * 0.08 + shaft.phase) * shaft.driftX;
      mesh.position.y = shaft.baseY + Math.sin(time * 0.04 + shaft.phase * 0.75) * 0.35;
      mesh.position.z = shaft.baseZ + Math.cos(time * 0.06 + shaft.phase * 1.2) * shaft.driftZ;

      mesh.rotation.x = shaft.tiltX + Math.sin(time * 0.1 + shaft.phase) * 0.07;
      mesh.rotation.y = shaft.yaw + Math.sin(time * 0.03 + shaft.phase * 0.6) * 0.1;
      mesh.rotation.z = shaft.tiltZ + Math.cos(time * 0.09 + shaft.phase * 0.8) * 0.06;
    });
  });

  const shaftLayer = (
    <group position={WATER_SUN_POSITION}>
      {shafts.map((shaft, index) => (
        <mesh
          key={index}
          ref={(node) => {
            shaftRefs.current[index] = node;
          }}
          position={[shaft.baseX, shaft.baseY, shaft.baseZ]}
          rotation={[shaft.tiltX, shaft.yaw, shaft.tiltZ]}
          scale={[shaft.width, shaft.length, shaft.width * 1.35]}
        >
          <cylinderGeometry args={[0.18, 1.2, 1, 28, 1, true]} />
          <primitive object={shaftMaterial} attach="material" />
        </mesh>
      ))}
    </group>
  );

  if (!beamScene) {
    return shaftLayer;
  }

  return createPortal(shaftLayer, beamScene);
}
