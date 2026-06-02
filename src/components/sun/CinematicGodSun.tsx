import { Sky } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Lensflare, LensflareElement } from 'three/examples/jsm/objects/Lensflare.js';
import { uGlobalHueShift, uTerrainColor } from '../../core/shaders/uniforms';

type MoodName = 'Golden Day' | 'Blood Sunset' | 'Deep Night' | 'Eclipse';

type Mood = {
  name: MoodName;
  coreA: string;
  coreB: string;
  rim: string;
  halo: string;
  terrain: [number, number, number];
  hue: number;
  lightIntensity: number;
  pointIntensity: number;
  sky: {
    turbidity: number;
    rayleigh: number;
    mieCoefficient: number;
    mieDirectionalG: number;
    inclination: number;
    azimuth: number;
  };
};

const moods: Mood[] = [
  {
    name: 'Golden Day',
    coreA: '#ffd36a',
    coreB: '#ff8f2e',
    rim: '#fff3b5',
    halo: '#ffe091',
    terrain: [0.0, 0.055, 0.043],
    hue: 0.0,
    lightIntensity: 2.2,
    pointIntensity: 7.5,
    sky: { turbidity: 8.5, rayleigh: 0.55, mieCoefficient: 0.018, mieDirectionalG: 0.82, inclination: 0.47, azimuth: 0.22 },
  },
  {
    name: 'Blood Sunset',
    coreA: '#ff6a2f',
    coreB: '#ffbf58',
    rim: '#ffd08c',
    halo: '#ff715f',
    terrain: [0.018, 0.04, 0.035],
    hue: 0.06,
    lightIntensity: 1.25,
    pointIntensity: 5.4,
    sky: { turbidity: 13, rayleigh: 0.28, mieCoefficient: 0.035, mieDirectionalG: 0.89, inclination: 0.53, azimuth: 0.2 },
  },
  {
    name: 'Deep Night',
    coreA: '#6b72ff',
    coreB: '#35e6ff',
    rim: '#bca0ff',
    halo: '#53e9ff',
    terrain: [0.0, 0.026, 0.035],
    hue: 0.62,
    lightIntensity: 0.38,
    pointIntensity: 2.3,
    sky: { turbidity: 2.2, rayleigh: 0.12, mieCoefficient: 0.006, mieDirectionalG: 0.65, inclination: 0.66, azimuth: 0.14 },
  },
  {
    name: 'Eclipse',
    coreA: '#02020a',
    coreB: '#17091f',
    rim: '#ffd76a',
    halo: '#8f64ff',
    terrain: [0.006, 0.018, 0.03],
    hue: 0.75,
    lightIntensity: 0.55,
    pointIntensity: 3.2,
    sky: { turbidity: 4.5, rayleigh: 0.08, mieCoefficient: 0.012, mieDirectionalG: 0.72, inclination: 0.5, azimuth: 0.22 },
  },
];

const sunPosition = new THREE.Vector3(22, 22, -52);
const targetColor = new THREE.Color();
const reusableColor = new THREE.Color();

function createLensTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d')!;
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.16, 'rgba(255,232,160,0.72)');
  gradient.addColorStop(0.42, 'rgba(112,245,255,0.18)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createSunMaterial(initialMood: Mood) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uCoreA: { value: new THREE.Color(initialMood.coreA) },
      uCoreB: { value: new THREE.Color(initialMood.coreB) },
      uRim: { value: new THREE.Color(initialMood.rim) },
      uEclipse: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormalW;
      varying vec3 vView;

      void main() {
        vUv = uv;
        vec4 world = modelMatrix * vec4(position, 1.0);
        vNormalW = normalize(mat3(modelMatrix) * normal);
        vView = normalize(cameraPosition - world.xyz);
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uCoreA;
      uniform vec3 uCoreB;
      uniform vec3 uRim;
      uniform float uEclipse;
      varying vec2 vUv;
      varying vec3 vNormalW;
      varying vec3 vView;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 5; i++) {
          v += noise(p) * a;
          p = mat2(1.6, 1.2, -1.2, 1.6) * p;
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float radial = length(p);
        float plasma = fbm(p * 4.0 + vec2(uTime * 0.08, -uTime * 0.04));
        float veins = sin((p.x + plasma) * 18.0 + uTime * 0.9) * 0.5 + 0.5;
        float fresnel = pow(1.0 - max(dot(normalize(vNormalW), normalize(vView)), 0.0), 2.2);
        float unstableEdge = smoothstep(0.58, 1.0, radial + plasma * 0.12);

        vec3 color = mix(uCoreA, uCoreB, plasma * 0.75 + veins * 0.25);
        color = mix(color, uRim, fresnel * 0.75 + unstableEdge * 0.55);
        color = mix(color, vec3(0.015, 0.012, 0.03), uEclipse * smoothstep(0.0, 0.72, 1.0 - fresnel));
        color += uRim * fresnel * (0.8 + uEclipse * 1.7);

        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });
}

export function CinematicGodSun() {
  const [moodIndex, setMoodIndex] = useState(0);
  const groupRef = useRef<THREE.Group>(null);
  const lensflareRef = useRef<Lensflare | null>(null);
  const shaderMaterial = useMemo(() => createSunMaterial(moods[0]), []);
  const coronaMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: moods[0].halo, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide }), []);
  const haloMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: moods[0].halo, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide }), []);
  const rayMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: moods[0].rim, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false }), []);
  const pointLightRef = useRef<THREE.PointLight>(null);
  const directionalLightRef = useRef<THREE.DirectionalLight>(null);
  const { scene } = useThree();
  const mood = moods[moodIndex];

  useMemo(() => {
    const texture = createLensTexture();
    const flare = new Lensflare();
    flare.addElement(new LensflareElement(texture, 220, 0, new THREE.Color('#ffe6a4')));
    flare.addElement(new LensflareElement(texture, 72, 0.34, new THREE.Color('#65f6ff')));
    flare.addElement(new LensflareElement(texture, 48, 0.58, new THREE.Color('#9b6bff')));
    flare.addElement(new LensflareElement(texture, 36, 0.82, new THREE.Color('#ffd16b')));
    flare.position.copy(sunPosition);
    lensflareRef.current = flare;
  }, []);

  useFrame(({ clock }, delta) => {
    const time = clock.elapsedTime;
    const lambda = 1 - Math.exp(-3.5 * delta);
    const eclipse = mood.name === 'Eclipse' ? 1 : 0;

    shaderMaterial.uniforms.uTime.value = time;
    shaderMaterial.uniforms.uCoreA.value.lerp(targetColor.set(mood.coreA), lambda);
    shaderMaterial.uniforms.uCoreB.value.lerp(targetColor.set(mood.coreB), lambda);
    shaderMaterial.uniforms.uRim.value.lerp(targetColor.set(mood.rim), lambda);
    shaderMaterial.uniforms.uEclipse.value = THREE.MathUtils.lerp(shaderMaterial.uniforms.uEclipse.value, eclipse, lambda);

    coronaMaterial.color.lerp(targetColor.set(mood.halo), lambda);
    coronaMaterial.opacity = THREE.MathUtils.lerp(coronaMaterial.opacity, mood.name === 'Eclipse' ? 0.34 : 0.2, lambda);
    haloMaterial.color.lerp(targetColor.set(mood.halo), lambda);
    haloMaterial.opacity = THREE.MathUtils.lerp(haloMaterial.opacity, mood.name === 'Deep Night' ? 0.06 : 0.1, lambda);
    rayMaterial.color.lerp(targetColor.set(mood.rim), lambda);
    rayMaterial.opacity = THREE.MathUtils.lerp(rayMaterial.opacity, mood.name === 'Eclipse' ? 0.16 : 0.08, lambda);

    if (pointLightRef.current) {
      pointLightRef.current.color.lerp(targetColor.set(mood.halo), lambda);
      pointLightRef.current.intensity = THREE.MathUtils.lerp(pointLightRef.current.intensity, mood.pointIntensity, lambda);
    }
    if (directionalLightRef.current) {
      directionalLightRef.current.color.lerp(targetColor.set(mood.rim), lambda);
      directionalLightRef.current.intensity = THREE.MathUtils.lerp(directionalLightRef.current.intensity, mood.lightIntensity, lambda);
    }

    reusableColor.setRGB(mood.terrain[0], mood.terrain[1], mood.terrain[2]);
    uTerrainColor.value.lerp(reusableColor, lambda);
    uGlobalHueShift.value = THREE.MathUtils.lerp(uGlobalHueShift.value, mood.hue, lambda * 0.35);

    if (groupRef.current) {
      groupRef.current.rotation.y = time * 0.035;
      const scale = 1 + Math.sin(time * 0.55) * 0.018;
      groupRef.current.scale.setScalar(scale);
    }
  });

  return (
    <>
      <Sky
        distance={450000}
        sunPosition={sunPosition.toArray()}
        turbidity={mood.sky.turbidity}
        rayleigh={mood.sky.rayleigh}
        mieCoefficient={mood.sky.mieCoefficient}
        mieDirectionalG={mood.sky.mieDirectionalG}
        inclination={mood.sky.inclination}
        azimuth={mood.sky.azimuth}
      />
      <primitive object={lensflareRef.current!} />
      <group
        ref={groupRef}
        position={sunPosition.toArray()}
        onClick={(event) => {
          event.stopPropagation();
          setMoodIndex((current) => (current + 1) % moods.length);
        }}
      >
        <pointLight ref={pointLightRef} color={moods[0].halo} intensity={moods[0].pointIntensity} distance={90} decay={1.45} />
        <directionalLight ref={directionalLightRef} color={moods[0].rim} intensity={moods[0].lightIntensity} position={[0, 0, 0]} />
        <mesh>
          <sphereGeometry args={[2.45, 96, 64]} />
          <primitive object={shaderMaterial} attach="material" />
        </mesh>
        <mesh scale={1.34}>
          <sphereGeometry args={[2.45, 80, 48]} />
          <primitive object={coronaMaterial} attach="material" />
        </mesh>
        <mesh scale={2.12}>
          <sphereGeometry args={[2.45, 80, 48]} />
          <primitive object={haloMaterial} attach="material" />
        </mesh>
        <mesh rotation={[0.1, 0.25, 0]} scale={[10.5, 0.03, 0.03]}>
          <sphereGeometry args={[1, 20, 8]} />
          <primitive object={rayMaterial} attach="material" />
        </mesh>
      </group>
    </>
  );
}
