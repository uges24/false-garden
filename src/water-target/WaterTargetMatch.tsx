import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

function makeGlowTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d')!;
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,238,178,1)');
  gradient.addColorStop(0.15, 'rgba(255,194,82,0.78)');
  gradient.addColorStop(0.38, 'rgba(106,245,232,0.26)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const waterVertex = `
  varying vec2 vUv;
  varying vec3 vWorld;
  varying vec3 vNormal;
  uniform float uTime;

  float wave(vec2 p) {
    return sin(p.x * 1.05 + uTime * 0.62) * 0.16
      + sin(p.y * 1.8 - uTime * 0.5) * 0.12
      + sin((p.x + p.y) * 4.1 + uTime * 0.58) * 0.07
      + cos((p.x - p.y) * 8.5 - uTime * 1.0) * 0.036
      + sin(p.x * 15.0 + p.y * 4.0 + uTime * 1.85) * 0.016;
  }

  void main() {
    vUv = uv;
    vec3 p = position;
    p.z += wave(position.xy);
    float e = 0.08;
    float hL = wave(position.xy - vec2(e, 0.0));
    float hR = wave(position.xy + vec2(e, 0.0));
    float hD = wave(position.xy - vec2(0.0, e));
    float hU = wave(position.xy + vec2(0.0, e));
    vNormal = normalize(vec3(hL - hR, hD - hU, 2.0 * e));
    vec4 world = modelMatrix * vec4(p, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const waterFragment = `
  varying vec2 vUv;
  varying vec3 vWorld;
  varying vec3 vNormal;
  uniform float uTime;
  uniform vec3 uSunPosition;
  uniform vec3 uCameraPosition;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += noise(p) * a;
      p = mat2(1.55, 1.15, -1.15, 1.55) * p + 4.7;
      a *= 0.5;
    }
    return v;
  }
  float lineCaustic(vec2 p) {
    float a = sin(p.x * 17.0 + sin(p.y * 4.1 + uTime * 0.7) * 1.25 + uTime * 1.45);
    float b = sin((p.x + p.y) * 23.0 - uTime * 1.08);
    float c = sin((p.x - p.y) * 35.0 + uTime * 1.85);
    float lines = 1.0 - min(min(abs(a), abs(b)), abs(c));
    return smoothstep(0.9, 0.99, lines);
  }
  void main() {
    vec3 N = normalize(vNormal.xzy);
    vec3 V = normalize(uCameraPosition - vWorld);
    vec3 L = normalize(uSunPosition - vWorld);
    vec3 H = normalize(V + L);
    vec2 flowA = vUv * 6.2 + vec2(uTime * 0.04, -uTime * 0.03);
    vec2 flowB = vUv * 18.0 + vec2(-uTime * 0.05, uTime * 0.06);
    vec2 flowC = vUv * 48.0 + vec2(uTime * 0.12, uTime * 0.04);
    float nA = fbm(flowA);
    float nB = fbm(flowB);
    float nC = fbm(flowC);
    vec2 distortion = vec2(nA - 0.5, nB - 0.5) * 0.12 + vec2(nC - 0.5, nA - 0.5) * 0.04;
    vec2 sunUv = vec2(0.50, 0.36);
    vec2 sunWarp = distortion + vec2(sin(vUv.y * 36.0 + uTime * 1.1), cos(vUv.x * 30.0 - uTime)) * 0.012;
    float sunDisc = 1.0 - smoothstep(0.035, 0.16, length(vUv - sunUv + sunWarp));
    float sunCore = 1.0 - smoothstep(0.0, 0.055, length(vUv - sunUv + sunWarp * 1.42));
    float sunHalo = 1.0 - smoothstep(0.12, 0.44, length(vUv - sunUv + sunWarp * 0.46));
    float fresnel = pow(1.0 - max(dot(N, V), 0.0), 2.55);
    float spec = pow(max(dot(N, H), 0.0), 150.0);
    float ribbons = lineCaustic(vUv * 1.55 + distortion * 2.1);
    float fine = pow(max(0.0, 1.0 - abs(nC - 0.53) * 9.5), 5.0);
    float sunMask = smoothstep(0.82, 0.04, length(vUv - sunUv));
    float sparse = smoothstep(0.24, 0.85, fbm(vUv * 2.7 + vec2(2.0, uTime * 0.04)));
    vec3 deep = vec3(0.0, 0.024, 0.03);
    vec3 body = vec3(0.0, 0.13, 0.14);
    vec3 cyan = vec3(0.11, 0.96, 0.76);
    vec3 pearl = vec3(1.0, 0.86, 0.48);
    vec3 color = mix(deep, body, smoothstep(0.18, 0.86, nA));
    color += cyan * ribbons * sparse * mix(0.08, 0.72, sunMask);
    color += cyan * fine * 0.22;
    color += cyan * fresnel * 0.36;
    color += pearl * spec * mix(0.42, 2.2, sunMask);
    color += pearl * sunHalo * 0.17;
    color += pearl * sunDisc * 0.3;
    color += vec3(1.0, 0.48, 0.14) * sunCore * 0.68;
    color *= mix(0.54, 0.9, sunMask);
    float edge = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x) * smoothstep(0.0, 0.08, vUv.y) * smoothstep(1.0, 0.9, vUv.y);
    gl_FragColor = vec4(color * edge, 0.98);
  }
`;

const simpleVertex = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const shaftFragment = `
  varying vec2 vUv;
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uSeed;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  void main() {
    float horizontal = smoothstep(0.0, 0.5, vUv.x) * smoothstep(1.0, 0.5, vUv.x);
    float vertical = smoothstep(0.0, 0.05, vUv.y) * pow(1.0 - vUv.y, 1.55);
    float breakup = noise(vec2(vUv.x * 5.4 + uSeed, vUv.y * 10.0 - uTime * 0.18));
    float alpha = horizontal * vertical * smoothstep(0.22, 0.86, breakup);
    gl_FragColor = vec4(uColor, alpha * 0.12);
  }
`;

const mistFragment = `
  varying vec2 vUv;
  uniform float uTime;
  uniform float uSeed;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  void main() {
    float n = noise(vec2(vUv.x * 5.0 + uTime * 0.035 + uSeed, vUv.y * 2.0));
    float edge = smoothstep(0.0, 0.16, vUv.x) * smoothstep(1.0, 0.84, vUv.x);
    float vertical = smoothstep(0.0, 0.28, vUv.y) * smoothstep(1.0, 0.34, vUv.y);
    gl_FragColor = vec4(vec3(0.22, 0.95, 0.78), edge * vertical * smoothstep(0.24, 0.9, n) * 0.095);
  }
`;

const particleVertex = `
  attribute float aSize;
  attribute float aSeed;
  attribute float aBeam;
  varying vec3 vColor;
  varying float vAlpha;
  uniform float uTime;
  void main() {
    vColor = color;
    vec3 p = position;
    p.x += sin(uTime * 0.2 + aSeed * 8.0) * 0.08 * aBeam;
    p.y += sin(uTime * 0.14 + aSeed * 5.0) * 0.08;
    p.z += cos(uTime * 0.16 + aSeed * 6.0) * 0.08 * aBeam;
    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = aSize * (18.0 / max(1.0, -mvPosition.z));
    vAlpha = mix(0.03, 0.5, aBeam);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const particleFragment = `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    gl_FragColor = vec4(vColor, smoothstep(0.5, 0.0, d) * vAlpha);
  }
`;

const marbleVertex = `
  varying vec3 vNormal;
  varying vec3 vWorld;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const marbleFragment = `
  varying vec3 vNormal;
  varying vec3 vWorld;
  uniform float uTime;
  uniform vec3 uCameraPosition;
  void main() {
    vec3 V = normalize(uCameraPosition - vWorld);
    float fresnel = pow(1.0 - max(dot(normalize(vNormal), V), 0.0), 2.3);
    float pulse = sin(vWorld.y * 5.0 + uTime * 1.2) * 0.5 + 0.5;
    vec3 body = mix(vec3(0.0, 0.06, 0.08), vec3(0.0, 0.8, 0.9), pulse * 0.26);
    vec3 rim = vec3(0.25, 1.0, 0.95) * pow(fresnel, 1.2) + vec3(0.9, 0.55, 1.0) * pow(fresnel, 2.4);
    gl_FragColor = vec4(body + rim, 0.93);
  }
`;

const vignetteShader = {
  uniforms: { tDiffuse: { value: null }, uStrength: { value: 0.46 } },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uStrength;
    varying vec2 vUv;
    void main() {
      vec2 edge = vUv - 0.5;
      vec4 color = texture2D(tDiffuse, vUv);
      float vignette = smoothstep(0.32, 0.88, length(edge));
      float aberration = smoothstep(0.62, 0.9, length(edge)) * 0.0015;
      vec3 ca;
      ca.r = texture2D(tDiffuse, vUv + edge * aberration).r;
      ca.g = color.g;
      ca.b = texture2D(tDiffuse, vUv - edge * aberration).b;
      color.rgb = mix(color.rgb, ca, 0.5);
      color.rgb *= 1.0 - vignette * uStrength;
      gl_FragColor = color;
    }
  `,
};

function addGrass(scene: THREE.Scene) {
  const group = new THREE.Group();
  const dark = new THREE.MeshBasicMaterial({ color: '#062217', transparent: true, opacity: 0.98, depthWrite: false });
  const mid = new THREE.MeshBasicMaterial({ color: '#0d6f3a', transparent: true, opacity: 0.7, depthWrite: false });
  const glow = new THREE.MeshBasicMaterial({ color: '#52ff91', transparent: true, opacity: 0.42, depthWrite: false, blending: THREE.AdditiveBlending });
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(36, 18, 1, 1),
    new THREE.MeshBasicMaterial({ color: '#062818', transparent: true, opacity: 0.72, depthWrite: false }),
  );
  ground.position.set(0, -1.25, -4.8);
  ground.rotation.x = -Math.PI / 2;
  group.add(ground);
  const ridge = new THREE.Mesh(new THREE.PlaneGeometry(42, 5.0, 64, 1), new THREE.MeshBasicMaterial({ color: '#02140e', transparent: true, opacity: 0.9, depthWrite: false }));
  const pos = ridge.geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    pos.setY(i, y + (y > 0 ? Math.sin(x * 0.28) * 0.45 + Math.sin(x * 0.7) * 0.2 : 0));
  }
  pos.needsUpdate = true;
  ridge.position.set(0, -1.55, -5.4);
  group.add(ridge);

  for (let i = 0; i < 520; i += 1) {
    const near = Math.random() < 0.55;
    const h = (near ? 0.8 : 0.35) + Math.random() * (near ? 2.8 : 1.3);
    const material = Math.random() < 0.18 ? glow : Math.random() < 0.48 ? mid : dark;
    const blade = new THREE.Mesh(new THREE.PlaneGeometry(0.035 + Math.random() * 0.04, h), material);
    blade.position.set((Math.random() - 0.5) * 28, -0.9 + Math.random() * 0.45, near ? 0.2 - Math.random() * 6.5 : -5.5 - Math.random() * 10);
    blade.rotation.z = (Math.random() - 0.5) * 0.45;
    blade.rotation.y = Math.random() * Math.PI;
    group.add(blade);
  }
  for (let i = 0; i < 90; i += 1) {
    const spark = new THREE.Mesh(
      new THREE.PlaneGeometry(0.035 + Math.random() * 0.08, 0.08 + Math.random() * 0.18),
      glow,
    );
    spark.position.set((Math.random() - 0.5) * 22, -0.45 + Math.random() * 0.45, -0.8 - Math.random() * 10);
    spark.rotation.z = Math.random() * Math.PI;
    group.add(spark);
  }
  scene.add(group);
  return group;
}

function addRuins(scene: THREE.Scene) {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: '#334339', roughness: 0.86, metalness: 0.04 });
  const accent = new THREE.MeshBasicMaterial({ color: '#43ffc8', transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending });
  const placements: Array<[number, number, number, number]> = [
    [-10.5, 0.25, -7.2, 3.6],
    [-4.6, -0.15, -9.2, 2.5],
    [5.9, -0.3, -7.8, 2.2],
    [10.8, -0.15, -9.0, 3.2],
    [0.0, -0.6, -12.5, 1.8],
  ];
  placements.forEach(([x, y, z, h], index) => {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.7 + index * 0.04, h, 0.62), material);
    pillar.position.set(x, y + h / 2 - 1.4, z);
    pillar.rotation.z = (index - 2) * 0.05;
    group.add(pillar);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.22, 0.82), material);
    cap.position.set(x, pillar.position.y + h / 2 + 0.1, z);
    cap.rotation.z = pillar.rotation.z;
    group.add(cap);
    const vine = new THREE.Mesh(new THREE.PlaneGeometry(0.04, h * 0.8), accent);
    vine.position.set(x + 0.38, pillar.position.y, z + 0.34);
    vine.rotation.z = 0.12;
    group.add(vine);
  });
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.1, 0), material);
  rock.scale.set(1.7, 0.35, 0.9);
  rock.position.set(5.0, -1.25, -2.9);
  rock.rotation.set(0.1, 0.4, -0.08);
  group.add(rock);
  scene.add(group);
  return group;
}

export function WaterTargetMatch() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#031514');
    scene.fog = new THREE.FogExp2('#073330', 0.026);

    const camera = new THREE.PerspectiveCamera(52, host.clientWidth / host.clientHeight, 0.1, 140);
    camera.position.set(0, 0.25, 9.6);
    camera.lookAt(0, 4.5, -7.8);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.66;
    host.appendChild(renderer.domElement);

    const sunPosition = new THREE.Vector3(0.0, 8.4, -8.5);
    const waterMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSunPosition: { value: sunPosition },
        uCameraPosition: { value: camera.position },
      },
      vertexShader: waterVertex,
      fragmentShader: waterFragment,
      transparent: true,
      depthWrite: true,
      side: THREE.DoubleSide,
    });
    const water = new THREE.Mesh(new THREE.PlaneGeometry(68, 40, 260, 170), waterMaterial);
    water.position.set(0, 6.55, -6.6);
    water.rotation.x = -Math.PI / 2;
    scene.add(water);

    const sunTexture = makeGlowTexture();
    const sun = new THREE.Sprite(new THREE.SpriteMaterial({
      map: sunTexture,
      color: '#ffd98a',
      transparent: true,
      opacity: 0.36,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    sun.position.copy(sunPosition);
    sun.scale.set(4.8, 2.9, 1);
    scene.add(sun);

    scene.add(new THREE.HemisphereLight('#64ffe8', '#03120b', 1.15));
    const sunLight = new THREE.PointLight('#ffd789', 52, 110, 1.7);
    sunLight.position.copy(sunPosition);
    scene.add(sunLight);

    const shafts: THREE.Mesh[] = [];
    const shaftMaterials: THREE.ShaderMaterial[] = [];
    for (let i = 0; i < 11; i += 1) {
      const material = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color(i % 3 === 0 ? '#ffe5a4' : '#b9fff0') },
          uSeed: { value: i * 6.19 },
        },
        vertexShader: simpleVertex,
        fragmentShader: shaftFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });
      const x = -5.6 + i * 1.12;
      const shaft = new THREE.Mesh(new THREE.PlaneGeometry(1.25 + Math.random() * 0.8, 11.6, 1, 1), material);
      shaft.position.set(x, 1.85, -5.5 + (i % 3) * 0.5);
      shaft.rotation.set(0.26, (x / 22), -x * 0.02);
      scene.add(shaft);
      shafts.push(shaft);
      shaftMaterials.push(material);
    }

    const mistMaterials: THREE.ShaderMaterial[] = [];
    const mistLayers: THREE.Mesh[] = [];
    for (let i = 0; i < 5; i += 1) {
      const material = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uSeed: { value: i * 4.3 } },
        vertexShader: simpleVertex,
        fragmentShader: mistFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });
      const mist = new THREE.Mesh(new THREE.PlaneGeometry(42, 3.2), material);
      mist.position.set(0, 0.75 + i * 0.55, -7.0 - i * 2.0);
      scene.add(mist);
      mistLayers.push(mist);
      mistMaterials.push(material);
    }

    const particlesGeo = new THREE.BufferGeometry();
    const count = 1800;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const seeds = new Float32Array(count);
    const beams = new Float32Array(count);
    const c = new THREE.Color();
    for (let i = 0; i < count; i += 1) {
      const inBeam = Math.random() < 0.82;
      const lane = Math.floor(Math.random() * 11);
      const laneX = -5.6 + lane * 1.12;
      positions[i * 3] = inBeam ? laneX + (Math.random() - 0.5) * (0.45 + Math.random() * 1.3) : (Math.random() - 0.5) * 22;
      positions[i * 3 + 1] = -0.8 + Math.random() * 6.7;
      positions[i * 3 + 2] = inBeam ? -6.6 + Math.random() * 5.5 : -11 + Math.random() * 13;
      c.set(i % 6 === 0 ? '#ffe097' : i % 2 ? '#a5ffee' : '#22e8d0');
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
      sizes[i] = inBeam ? 0.9 + Math.random() * 4.2 : 0.5 + Math.random() * 1.8;
      seeds[i] = Math.random();
      beams[i] = inBeam ? 0.62 + Math.random() * 0.38 : Math.random() * 0.14;
    }
    particlesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particlesGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particlesGeo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    particlesGeo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    particlesGeo.setAttribute('aBeam', new THREE.BufferAttribute(beams, 1));
    const particlesMaterial = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: particleVertex,
      fragmentShader: particleFragment,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particlesGeo, particlesMaterial);
    scene.add(particles);

    const grass = addGrass(scene);
    const ruins = addRuins(scene);

    const marbleMaterial = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uCameraPosition: { value: camera.position } },
      vertexShader: marbleVertex,
      fragmentShader: marbleFragment,
      transparent: true,
      depthWrite: true,
    });
    const marble = new THREE.Mesh(new THREE.SphereGeometry(0.72, 72, 48), marbleMaterial);
    marble.position.set(0, -0.48, 1.25);
    marble.scale.setScalar(0.78);
    scene.add(marble);
    const marbleLight = new THREE.PointLight('#40f7ff', 4.4, 9, 1.5);
    marbleLight.position.copy(marble.position);
    scene.add(marbleLight);

    const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(host.clientWidth, host.clientHeight, {
      type: THREE.HalfFloatType,
      depthBuffer: true,
    }));
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(host.clientWidth, host.clientHeight), 0.46, 0.58, 0.72));
    composer.addPass(new ShaderPass(vignetteShader));
    composer.addPass(new OutputPass());

    const clock = new THREE.Clock();
    let raf = 0;
    const resize = () => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      composer.setSize(width, height);
    };
    window.addEventListener('resize', resize);

    const render = () => {
      const t = clock.getElapsedTime();
      waterMaterial.uniforms.uTime.value = t * 0.9;
      waterMaterial.uniforms.uCameraPosition.value.copy(camera.position);
      water.rotation.z = Math.sin(t * 0.055) * 0.012;
      sun.scale.set(5.4 + Math.sin(t * 0.7) * 0.22, 3.3 + Math.cos(t * 0.5) * 0.14, 1);
      sun.material.opacity = 0.44 + Math.sin(t * 0.8) * 0.03;
      shaftMaterials.forEach((material, index) => {
        material.uniforms.uTime.value = t;
        shafts[index].scale.x = 1 + Math.sin(t * 0.18 + index) * 0.1;
      });
      mistMaterials.forEach((material, index) => {
        material.uniforms.uTime.value = t;
        mistLayers[index].position.x = Math.sin(t * 0.05 + index) * 0.35;
      });
      particlesMaterial.uniforms.uTime.value = t;
      particles.rotation.y = Math.sin(t * 0.04) * 0.02;
      marbleMaterial.uniforms.uTime.value = t;
      marbleMaterial.uniforms.uCameraPosition.value.copy(camera.position);
      marble.rotation.y += 0.0045;
      marble.position.y = -0.48 + Math.sin(t * 0.8) * 0.035;
      marbleLight.position.copy(marble.position);
      grass.position.x = Math.sin(t * 0.05) * 0.025;
      camera.position.x = Math.sin(t * 0.06) * 0.08;
      camera.lookAt(Math.sin(t * 0.05) * 0.12, 4.5, -7.8);
      composer.render();
      raf = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      host.replaceChildren();
      composer.dispose();
      renderer.dispose();
      sunTexture.dispose();
      water.geometry.dispose();
      waterMaterial.dispose();
      shaftMaterials.forEach((material) => material.dispose());
      shafts.forEach((shaft) => shaft.geometry.dispose());
      mistMaterials.forEach((material) => material.dispose());
      mistLayers.forEach((mist) => mist.geometry.dispose());
      particlesGeo.dispose();
      particlesMaterial.dispose();
      grass.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) (mesh.material as THREE.Material).dispose();
      });
      ruins.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) (mesh.material as THREE.Material).dispose();
      });
      marble.geometry.dispose();
      marbleMaterial.dispose();
    };
  }, []);

  return <div ref={hostRef} style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#031514' }} />;
}
