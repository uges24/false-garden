import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useWorldStore } from '../store/worldStore';
import { TERRAIN_SIZE, seededRandom, terrainHeight } from '../utils/terrain';
import { worldThemes } from '../utils/theme';

const dummy = new THREE.Object3D();

export function GrassField() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const mode = useWorldStore((state) => state.mode);
  const performanceMode = useWorldStore((state) => state.performanceMode);
  const theme = worldThemes[mode];
  const count = performanceMode ? 10000 : 32000;

  const geometry = useMemo(() => {
    const blade = new THREE.PlaneGeometry(0.24, 1.55, 1, 7);
    blade.translate(0, 0.775, 0);
    const cross = blade.clone();
    cross.rotateY(Math.PI / 2);
    const merged = new THREE.BufferGeometry();
    const positions = [...Array.from(blade.attributes.position.array), ...Array.from(cross.attributes.position.array)];
    const uvs = [...Array.from(blade.attributes.uv.array), ...Array.from(cross.attributes.uv.array)];
    const indices = [...Array.from(blade.index?.array ?? []), ...Array.from(cross.index?.array ?? []).map((i) => i + blade.attributes.position.count)];
    merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    merged.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    merged.setIndex(indices);
    return merged;
  }, []);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uBase: { value: new THREE.Color(theme.grassA) },
          uMid: { value: new THREE.Color(theme.grassB) },
          uTip: { value: new THREE.Color(theme.grassTip) },
          uPlayer: { value: new THREE.Vector2(0, 0) },
          uSnake: { value: new THREE.Vector2(18, 0) },
        },
        vertexShader: `
          uniform float uTime;
          uniform vec2 uPlayer;
          uniform vec2 uSnake;
          varying vec2 vUv;
          varying float vWave;
          varying float vPatch;
          varying float vDisturb;

          float hash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
          }

          void main() {
            vUv = uv;
            vec3 transformed = position;
            vec4 worldBase = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
            vec2 xz = worldBase.xz;
            float wave = sin(uTime * 1.8 + xz.x * 0.18 + xz.y * 0.23);
            float patch = sin(xz.x * 0.08) * cos(xz.y * 0.075);
            float clump = hash(floor(xz * 0.22));
            float playerWake = 1.0 - smoothstep(0.5, 6.7, distance(xz, uPlayer));
            float snakeWake = 1.0 - smoothstep(0.4, 6.4, distance(xz, uSnake));
            float marbleWake = 1.0 - smoothstep(0.8, 3.3, length(vec2(sin(xz.x * 0.09), cos(xz.y * 0.11))));
            float disturb = max(max(playerWake, snakeWake), marbleWake * 0.18);
            float high = pow(uv.y, 1.7);
            float foregroundBoost = 1.0 - smoothstep(2.0, 26.0, distance(xz, vec2(0.0, 10.0)));
            transformed.y *= 0.8 + clump * 0.62 + patch * 0.2 + foregroundBoost * 0.55;
            transformed.x += (wave * 0.27 + disturb * 0.55) * high;
            transformed.z += (cos(uTime * 1.3 + xz.y * 0.16) * 0.14 - disturb * 0.36) * high;
            vWave = wave;
            vPatch = patch + clump * 0.45;
            vDisturb = disturb;
            gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(transformed, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 uBase;
          uniform vec3 uMid;
          uniform vec3 uTip;
          varying vec2 vUv;
          varying float vWave;
          varying float vPatch;
          varying float vDisturb;

          void main() {
            float edge = smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x);
            vec3 root = uBase * vec3(0.38, 0.58, 0.56);
            vec3 color = mix(root, uMid, smoothstep(0.0, 0.62, vUv.y));
            color = mix(color, uTip, smoothstep(0.58, 1.0, vUv.y));
            color = mix(color, color * vec3(0.55, 0.85, 0.82), smoothstep(0.35, 1.1, vPatch) * 0.36);
            color = mix(color, vec3(0.58, 1.0, 0.88), vDisturb * 0.32);
            color += vWave * 0.035;
            gl_FragColor = vec4(color, edge);
          }
        `,
        transparent: true,
        side: THREE.DoubleSide,
      }),
    [],
  );

  useLayoutEffect(() => {
    const random = seededRandom(performanceMode ? 31 : 19);
    for (let i = 0; i < count; i += 1) {
      const foreground = random() < (performanceMode ? 0.42 : 0.58);
      const cluster = random() < 0.72;
      let x = (random() - 0.5) * TERRAIN_SIZE;
      let z = (random() - 0.5) * TERRAIN_SIZE;
      if (foreground) {
        const angle = -Math.PI / 2 + (random() - 0.5) * 1.45;
        const distance = 3 + Math.pow(random(), 1.85) * 30;
        x = Math.sin(angle) * distance + (random() - 0.5) * 9;
        z = Math.cos(angle) * distance + 10 + (random() - 0.5) * 7;
      } else if (cluster) {
        const cellX = Math.floor((random() - 0.5) * 14) * 8;
        const cellZ = Math.floor((random() - 0.5) * 14) * 8;
        x = cellX + (random() - 0.5) * 5.5;
        z = cellZ + (random() - 0.5) * 5.5;
      }
      const y = terrainHeight(x, z);
      const clump = Math.floor(random() * 4);
      const scale = 0.95 + random() * 2.15 + clump * 0.13 + (foreground ? 0.85 : 0);
      dummy.position.set(x, y, z);
      dummy.rotation.set((random() - 0.5) * 0.08, random() * Math.PI, (random() - 0.5) * 0.24);
      dummy.scale.set(0.9 + random() * 1.2, scale, 0.9 + random() * 1.2);
      dummy.updateMatrix();
      meshRef.current?.setMatrixAt(i, dummy.matrix);
    }
    if (meshRef.current) {
      meshRef.current.count = count;
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [count, performanceMode]);

  useFrame(({ clock }) => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uTime.value = clock.elapsedTime;
    materialRef.current.uniforms.uBase.value.set(theme.grassA);
    materialRef.current.uniforms.uMid.value.set(theme.grassB);
    materialRef.current.uniforms.uTip.value.set(theme.grassTip);
    const t = clock.elapsedTime * 0.38;
    const x = Math.cos(t) * 21 + Math.sin(t * 1.7) * 4;
    const z = Math.sin(t * 1.15) * 18;
    materialRef.current.uniforms.uSnake.value.set(x, z);
  });

  return (
    <instancedMesh ref={meshRef} args={[geometry, material, count]} castShadow receiveShadow frustumCulled={false}>
      <primitive ref={materialRef} object={material} attach="material" />
    </instancedMesh>
  );
}
