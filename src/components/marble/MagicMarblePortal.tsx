import { useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

const portalPosition: [number, number, number] = [5.5, 1.15, -6.5];

export function MagicMarblePortal() {
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshPhysicalMaterial>(null);
  const shaderRef = useRef<THREE.Shader | null>(null);
  const [hovered, setHovered] = useState(false);
  const [pulseStart, setPulseStart] = useState(0);
  const [heightMap, displacementMap] = useTexture(['/marble/noise.jpg', '/marble/noise3D.jpg']);

  const uniforms = useMemo(() => {
    heightMap.minFilter = THREE.NearestFilter;
    displacementMap.minFilter = THREE.NearestFilter;
    displacementMap.wrapS = THREE.RepeatWrapping;
    displacementMap.wrapT = THREE.RepeatWrapping;

    return {
      time: { value: 0 },
      hover: { value: 0 },
      colorA: { value: new THREE.Color('#041614') },
      colorB: { value: new THREE.Color('#61fff0') },
      colorC: { value: new THREE.Color('#9d65ff') },
      heightMap: { value: heightMap },
      displacementMap: { value: displacementMap },
      iterations: { value: 42 },
      depth: { value: 0.62 },
      smoothing: { value: 0.18 },
      displacement: { value: 0.12 },
    };
  }, [heightMap, displacementMap]);

  useFrame(({ clock }) => {
    const elapsed = clock.elapsedTime;
    const pulse = pulseStart > 0 ? Math.max(0, 1 - (performance.now() - pulseStart) / 850) : 0;

    if (shaderRef.current) {
      shaderRef.current.uniforms.time.value = elapsed * 0.055 + pulse * 0.35;
      shaderRef.current.uniforms.hover.value = THREE.MathUtils.lerp(
        shaderRef.current.uniforms.hover.value,
        hovered ? 1 : 0,
        0.12,
      );
    }

    if (groupRef.current) {
      const s = 1 + Math.sin(elapsed * 1.35) * 0.035 + (hovered ? 0.13 : 0) + pulse * 0.24;
      groupRef.current.scale.lerp(new THREE.Vector3(s, s, s), 0.14);
      groupRef.current.rotation.y = elapsed * 0.18;
      groupRef.current.position.y = portalPosition[1] + Math.sin(elapsed * 1.1) * 0.08;
    }

    if (materialRef.current) {
      materialRef.current.emissiveIntensity = 0.45 + (hovered ? 0.35 : 0) + pulse * 0.65;
    }
  });

  return (
    <group
      ref={groupRef}
      position={portalPosition}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
      onClick={(event) => {
        event.stopPropagation();
        setPulseStart(performance.now());
      }}
    >
      <mesh castShadow>
        <sphereGeometry args={[0.78, 96, 48]} />
        <meshPhysicalMaterial
          ref={materialRef}
          roughness={0.08}
          metalness={0.05}
          transmission={0.38}
          thickness={1.25}
          transparent
          opacity={0.86}
          emissive="#56f7ff"
          emissiveIntensity={0.45}
          envMapIntensity={1.4}
          onBeforeCompile={(shader) => {
            shaderRef.current = shader;
            shader.uniforms = { ...shader.uniforms, ...uniforms };

            shader.vertexShader =
              `
              varying vec3 vPortalPos;
              varying vec3 vPortalDir;
            ` + shader.vertexShader;

            shader.vertexShader = shader.vertexShader.replace(
              'void main() {',
              `
              void main() {
                vPortalDir = position - cameraPosition;
                vPortalPos = position;
              `,
            );

            shader.fragmentShader =
              `
              #define FLIP vec2(1.0, -1.0)

              uniform float time;
              uniform float hover;
              uniform vec3 colorA;
              uniform vec3 colorB;
              uniform vec3 colorC;
              uniform sampler2D heightMap;
              uniform sampler2D displacementMap;
              uniform int iterations;
              uniform float depth;
              uniform float smoothing;
              uniform float displacement;

              varying vec3 vPortalPos;
              varying vec3 vPortalDir;
            ` + shader.fragmentShader;

            shader.fragmentShader = shader.fragmentShader.replace(
              'void main() {',
              `
              vec3 displacePoint(vec3 p, float strength) {
                vec2 uv = equirectUv(normalize(p));
                vec2 scroll = vec2(time, time * 0.27);
                vec3 displacementA = texture2D(displacementMap, uv + scroll).rgb;
                vec3 displacementB = texture2D(displacementMap, uv * FLIP - scroll).rgb;
                displacementA -= 0.5;
                displacementB -= 0.5;
                return p + strength * (displacementA + displacementB);
              }

              vec3 marchMarble(vec3 rayOrigin, vec3 rayDir) {
                float perIteration = 1.0 / float(iterations);
                vec3 deltaRay = rayDir * perIteration * depth;
                vec3 p = rayOrigin;
                float totalVolume = 0.0;

                for (int i = 0; i < 48; ++i) {
                  if (i >= iterations) break;
                  vec3 displaced = displacePoint(p, displacement + hover * 0.035);
                  vec2 uv = equirectUv(normalize(displaced));
                  float heightMapVal = texture2D(heightMap, uv).r;
                  float height = length(p);
                  float cutoff = 1.0 - float(i) * perIteration;
                  float slice = smoothstep(cutoff, cutoff + smoothing, heightMapVal);
                  totalVolume += slice * perIteration;
                  p += deltaRay;
                }

                vec3 liquid = mix(colorA, colorB, totalVolume);
                liquid = mix(liquid, colorC, smoothstep(0.35, 0.95, sin(totalVolume * 7.0 + time * 8.0) * 0.5 + 0.5));
                return liquid;
              }

              void main() {
              `,
            );

            shader.fragmentShader = shader.fragmentShader.replace(
              '#include <color_fragment>',
              `
              vec3 rayDir = normalize(vPortalDir);
              vec3 rgb = marchMarble(vPortalPos, rayDir);
              float fresnel = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 2.4);
              diffuseColor.rgb = mix(diffuseColor.rgb, rgb, 0.88);
              diffuseColor.rgb += vec3(0.35, 0.95, 1.0) * fresnel * (0.65 + hover * 0.55);
              `,
            );
          }}
          customProgramCacheKey={() => 'false-garden-magic-marble-portal-v1'}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.72, 0]}>
        <ringGeometry args={[0.9, 0.97, 96]} />
        <meshBasicMaterial color="#69fff1" transparent opacity={hovered ? 0.32 : 0.16} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <pointLight color="#65f7ff" intensity={hovered ? 4.2 : 2.4} distance={9} />
    </group>
  );
}
