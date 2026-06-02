import { useFrame } from '@react-three/fiber';
import { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useWorldStore } from '../store/worldStore';
import { GRASS_FIELD_SIZE, GRASS_SNAP_SIZE, seededRandom, terrainHeight } from '../utils/terrain';
import { worldThemes } from '../utils/theme';

const dummy = new THREE.Object3D();

export function GrassField() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const mode = useWorldStore((state) => state.mode);
  const performanceMode = useWorldStore((state) => state.performanceMode);
  const theme = worldThemes[mode];
  const count = performanceMode ? 12000 : 34000;
  const snapRef = useRef({ x: Number.NaN, z: Number.NaN });

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(0.18, 1.12, 1, 6);
    geo.translate(0, 0.56, 0);
    return geo;
  }, []);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uBase: { value: new THREE.Color(theme.grassA) },
          uMid: { value: new THREE.Color(theme.grassB) },
          uTip: { value: new THREE.Color(theme.grassTip) },
        },
        vertexShader: `
          uniform float uTime;
          varying vec2 vUv;
          varying float vWave;
          varying float vShade;

          float hash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
          }

          void main() {
            vUv = uv;
            vec3 transformed = position;
            vec4 worldBase = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
            float bladeNoise = hash(worldBase.xz);
            float gust = sin(uTime * 0.42 + worldBase.x * 0.035 - worldBase.z * 0.02);
            float wave = sin(uTime * (1.45 + bladeNoise * 0.45) + worldBase.x * 0.18 + worldBase.z * 0.23 + gust * 1.8);
            float high = pow(uv.y, 1.7);
            transformed.y *= 0.88 + bladeNoise * 0.28;
            transformed.x += wave * (0.17 + gust * 0.045) * high;
            transformed.z += cos(uTime * 1.1 + worldBase.z * 0.16) * 0.09 * high;
            vWave = wave;
            vShade = bladeNoise;
            gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(transformed, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 uBase;
          uniform vec3 uMid;
          uniform vec3 uTip;
          varying vec2 vUv;
          varying float vWave;
          varying float vShade;

          void main() {
            float edge = smoothstep(0.0, 0.16, vUv.x) * smoothstep(1.0, 0.84, vUv.x);
            vec3 root = uBase * vec3(0.42, 0.6, 0.56);
            vec3 color = mix(root, uMid, smoothstep(0.08, 0.68, vUv.y));
            color = mix(color, uTip, smoothstep(0.55, 1.0, vUv.y));
            color *= 0.86 + vShade * 0.24;
            color += vWave * 0.028;
            gl_FragColor = vec4(color, edge);
          }
        `,
        transparent: true,
        side: THREE.DoubleSide,
      }),
    [],
  );

  const rebuildGrass = useCallback((snapX: number, snapZ: number, playerX: number, playerZ: number) => {
    const random = seededRandom((performanceMode ? 31 : 19) + snapX * 3 + snapZ * 7);
    for (let i = 0; i < count; i += 1) {
      const foreground = random() < 0.24;
      const clustered = random() < 0.36;
      let x = snapX + (random() - 0.5) * GRASS_FIELD_SIZE;
      let z = snapZ + (random() - 0.5) * GRASS_FIELD_SIZE;
      if (foreground) {
        x = playerX + (random() - 0.5) * 42;
        z = playerZ + 5 + random() * 34;
      } else if (clustered) {
        x = Math.round(x / 9) * 9 + (random() - 0.5) * 4.2;
        z = Math.round(z / 9) * 9 + (random() - 0.5) * 4.2;
      }
      const y = terrainHeight(x, z);
      const scale = 0.74 + random() * 1.65 + (foreground ? 0.38 : 0);
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, random() * Math.PI, (random() - 0.5) * 0.18);
      dummy.scale.set(0.85 + random() * 0.55, scale, 0.85 + random() * 0.35);
      dummy.updateMatrix();
      meshRef.current?.setMatrixAt(i, dummy.matrix);
    }
    if (meshRef.current) {
      meshRef.current.count = count;
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [count, performanceMode]);

  useLayoutEffect(() => {
    const [playerX, , playerZ] = useWorldStore.getState().playerPosition;
    const snapX = Math.floor(playerX / GRASS_SNAP_SIZE) * GRASS_SNAP_SIZE;
    const snapZ = Math.floor(playerZ / GRASS_SNAP_SIZE) * GRASS_SNAP_SIZE;
    snapRef.current = { x: snapX, z: snapZ };
    rebuildGrass(snapX, snapZ, playerX, playerZ);
  }, [rebuildGrass]);

  useFrame(({ clock }) => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uTime.value = clock.elapsedTime;
    materialRef.current.uniforms.uBase.value.set(theme.grassA);
    materialRef.current.uniforms.uMid.value.set(theme.grassB);
    materialRef.current.uniforms.uTip.value.set(theme.grassTip);
    const [playerX, , playerZ] = useWorldStore.getState().playerPosition;
    const snapX = Math.floor(playerX / GRASS_SNAP_SIZE) * GRASS_SNAP_SIZE;
    const snapZ = Math.floor(playerZ / GRASS_SNAP_SIZE) * GRASS_SNAP_SIZE;
    if (snapX !== snapRef.current.x || snapZ !== snapRef.current.z) {
      snapRef.current = { x: snapX, z: snapZ };
      rebuildGrass(snapX, snapZ, playerX, playerZ);
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[geometry, material, count]} castShadow receiveShadow frustumCulled={false}>
      <primitive ref={materialRef} object={material} attach="material" />
    </instancedMesh>
  );
}
