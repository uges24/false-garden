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
  const count = performanceMode ? 4200 : 9500;

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(0.16, 1, 1, 5);
    geo.translate(0, 0.5, 0);
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

          void main() {
            vUv = uv;
            vec3 transformed = position;
            vec4 worldBase = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
            float wave = sin(uTime * 1.8 + worldBase.x * 0.18 + worldBase.z * 0.23);
            float high = pow(uv.y, 1.7);
            transformed.x += wave * 0.18 * high;
            transformed.z += cos(uTime * 1.3 + worldBase.z * 0.16) * 0.08 * high;
            vWave = wave;
            gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(transformed, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 uBase;
          uniform vec3 uMid;
          uniform vec3 uTip;
          varying vec2 vUv;
          varying float vWave;

          void main() {
            float edge = smoothstep(0.0, 0.16, vUv.x) * smoothstep(1.0, 0.84, vUv.x);
            vec3 color = mix(uBase, uMid, vUv.y);
            color = mix(color, uTip, smoothstep(0.55, 1.0, vUv.y));
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
      const x = (random() - 0.5) * TERRAIN_SIZE;
      const z = (random() - 0.5) * TERRAIN_SIZE;
      const y = terrainHeight(x, z);
      const scale = 0.75 + random() * 1.5;
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, random() * Math.PI, (random() - 0.5) * 0.18);
      dummy.scale.setScalar(scale);
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
  });

  return (
    <instancedMesh ref={meshRef} args={[geometry, material, count]} castShadow receiveShadow frustumCulled={false}>
      <primitive ref={materialRef} object={material} attach="material" />
    </instancedMesh>
  );
}
