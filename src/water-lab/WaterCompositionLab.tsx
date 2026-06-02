import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

function createGlowTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d')!;
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,238,180,0.98)');
  gradient.addColorStop(0.16, 'rgba(255,200,92,0.72)');
  gradient.addColorStop(0.46, 'rgba(142,244,255,0.24)');
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
    return sin(p.x * 1.1 + uTime * 0.62) * 0.15
      + sin(p.y * 1.65 - uTime * 0.5) * 0.1
      + sin((p.x + p.y) * 3.9 + uTime * 0.58) * 0.06
      + cos((p.x - p.y) * 8.1 - uTime * 1.0) * 0.032
      + sin(p.x * 14.0 + p.y * 3.8 + uTime * 1.9) * 0.014;
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
    float a = sin(p.x * 16.0 + sin(p.y * 4.0 + uTime * 0.7) * 1.2 + uTime * 1.35);
    float b = sin((p.x + p.y) * 22.0 - uTime * 1.0);
    float c = sin((p.x - p.y) * 33.0 + uTime * 1.75);
    float lines = 1.0 - min(min(abs(a), abs(b)), abs(c));
    return smoothstep(0.9, 0.988, lines);
  }
  void main() {
    vec3 N = normalize(vNormal.xzy);
    vec3 V = normalize(uCameraPosition - vWorld);
    vec3 L = normalize(uSunPosition - vWorld);
    vec3 H = normalize(V + L);
    vec2 flowA = vUv * 6.5 + vec2(uTime * 0.04, -uTime * 0.03);
    vec2 flowB = vUv * 17.0 + vec2(-uTime * 0.05, uTime * 0.06);
    vec2 flowC = vUv * 44.0 + vec2(uTime * 0.11, uTime * 0.04);
    float nA = fbm(flowA);
    float nB = fbm(flowB);
    float nC = fbm(flowC);
    vec2 distortion = vec2(nA - 0.5, nB - 0.5) * 0.12 + vec2(nC - 0.5, nA - 0.5) * 0.035;
    vec2 sunUv = vec2(0.30, 0.44);
    vec2 sunWarp = distortion + vec2(sin(vUv.y * 34.0 + uTime * 1.1), cos(vUv.x * 27.0 - uTime)) * 0.012;
    float sunDisc = 1.0 - smoothstep(0.032, 0.14, length(vUv - sunUv + sunWarp));
    float sunCore = 1.0 - smoothstep(0.0, 0.052, length(vUv - sunUv + sunWarp * 1.4));
    float sunHalo = 1.0 - smoothstep(0.12, 0.42, length(vUv - sunUv + sunWarp * 0.45));
    float fresnel = pow(1.0 - max(dot(N, V), 0.0), 2.7);
    float spec = pow(max(dot(N, H), 0.0), 148.0);
    float ribbons = lineCaustic(vUv * 1.45 + distortion * 2.1);
    float fine = pow(max(0.0, 1.0 - abs(nC - 0.53) * 9.0), 5.0);
    float sunMask = smoothstep(0.78, 0.05, length(vUv - sunUv));
    float sparse = smoothstep(0.25, 0.85, fbm(vUv * 2.5 + vec2(2.0, uTime * 0.04)));
    vec3 deep = vec3(0.002, 0.032, 0.044);
    vec3 body = vec3(0.01, 0.16, 0.19);
    vec3 cyan = vec3(0.35, 1.0, 0.92);
    vec3 pearl = vec3(1.0, 0.86, 0.52);
    vec3 color = mix(deep, body, smoothstep(0.24, 0.86, nA));
    color += cyan * ribbons * sparse * mix(0.18, 0.58, sunMask);
    color += cyan * fine * 0.26;
    color += cyan * fresnel * 0.48;
    color += pearl * spec * mix(0.7, 2.1, sunMask);
    color += pearl * sunHalo * 0.18;
    color += pearl * sunDisc * 0.34;
    color += vec3(1.0, 0.55, 0.2) * sunCore * 0.46;
    color *= 0.72;
    float edge = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x) * smoothstep(0.0, 0.08, vUv.y) * smoothstep(1.0, 0.9, vUv.y);
    gl_FragColor = vec4(color * edge, 0.98);
  }
`;

const shaftVertex = `
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
    float horizontal = smoothstep(0.0, 0.48, vUv.x) * smoothstep(1.0, 0.52, vUv.x);
    float vertical = smoothstep(0.0, 0.05, vUv.y) * pow(1.0 - vUv.y, 1.45);
    float breakup = noise(vec2(vUv.x * 5.2 + uSeed, vUv.y * 10.0 - uTime * 0.18));
    float alpha = horizontal * vertical * smoothstep(0.22, 0.86, breakup);
    gl_FragColor = vec4(uColor, alpha * 0.105);
  }
`;

const mistVertex = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
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
    float edge = smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.82, vUv.x);
    float vertical = smoothstep(0.0, 0.28, vUv.y) * smoothstep(1.0, 0.34, vUv.y);
    float alpha = edge * vertical * smoothstep(0.24, 0.9, n) * 0.1;
    gl_FragColor = vec4(vec3(0.34, 0.9, 0.84), alpha);
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
    gl_PointSize = aSize * (19.0 / max(1.0, -mvPosition.z));
    vAlpha = mix(0.02, 0.45, aBeam);
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
    float fresnel = pow(1.0 - max(dot(normalize(vNormal), V), 0.0), 2.4);
    float pulse = sin(vWorld.y * 5.0 + uTime * 1.2) * 0.5 + 0.5;
    vec3 body = mix(vec3(0.02, 0.08, 0.09), vec3(0.09, 0.95, 0.9), pulse * 0.22);
    vec3 rim = vec3(0.95, 0.35, 1.0) * fresnel + vec3(0.5, 1.0, 0.95) * pow(fresnel, 2.0);
    gl_FragColor = vec4(body + rim, 0.92);
  }
`;

const vignetteShader = {
  uniforms: { tDiffuse: { value: null }, uStrength: { value: 0.42 } },
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
      float vignette = smoothstep(0.32, 0.86, length(edge));
      float aberration = smoothstep(0.62, 0.9, length(edge)) * 0.0018;
      vec3 ca;
      ca.r = texture2D(tDiffuse, vUv + edge * aberration).r;
      ca.g = color.g;
      ca.b = texture2D(tDiffuse, vUv - edge * aberration).b;
      color.rgb = mix(color.rgb, ca, 0.55);
      color.rgb *= 1.0 - vignette * uStrength;
      gl_FragColor = color;
    }
  `,
};

function addGrassSilhouette(scene: THREE.Scene) {
  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({ color: '#010707', transparent: true, opacity: 0.92, depthWrite: false });
  const ridgeMaterial = new THREE.MeshBasicMaterial({ color: '#021011', transparent: true, opacity: 0.86, depthWrite: false });
  const ridge = new THREE.Mesh(new THREE.PlaneGeometry(34, 4.8, 48, 1), ridgeMaterial);
  const pos = ridge.geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    pos.setY(i, y + (y > 0 ? Math.sin(x * 0.35) * 0.5 + Math.sin(x * 0.9) * 0.18 : 0));
  }
  pos.needsUpdate = true;
  ridge.position.set(0, -1.55, -3.8);
  group.add(ridge);

  for (let i = 0; i < 170; i += 1) {
    const h = 0.55 + Math.random() * 2.4;
    const blade = new THREE.Mesh(new THREE.PlaneGeometry(0.035 + Math.random() * 0.035, h), material);
    blade.position.set((Math.random() - 0.5) * 24, -0.3 + Math.random() * 0.35, -2.0 - Math.random() * 8);
    blade.rotation.z = (Math.random() - 0.5) * 0.34;
    blade.rotation.y = Math.random() * Math.PI;
    group.add(blade);
  }
  scene.add(group);
  return group;
}

export function WaterCompositionLab() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#031015');
    scene.fog = new THREE.FogExp2('#082a2e', 0.035);

    const camera = new THREE.PerspectiveCamera(52, host.clientWidth / host.clientHeight, 0.1, 120);
    camera.position.set(0.35, 0.55, 9.8);
    camera.lookAt(-1.4, 4.6, -4.8);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.65));
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.74;
    host.appendChild(renderer.domElement);

    const sunPosition = new THREE.Vector3(-5.4, 7.9, -7.2);
    const waterGeometry = new THREE.PlaneGeometry(54, 35, 230, 150);
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
    const water = new THREE.Mesh(waterGeometry, waterMaterial);
    water.position.set(0, 6.35, -5.4);
    water.rotation.x = -Math.PI / 2;
    scene.add(water);

    const sunTexture = createGlowTexture();
    const sun = new THREE.Sprite(new THREE.SpriteMaterial({
      map: sunTexture,
      color: '#ffd990',
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    sun.position.copy(sunPosition);
    sun.scale.set(4.3, 2.8, 1);
    scene.add(sun);

    scene.add(new THREE.HemisphereLight('#63fff0', '#020707', 1.15));
    const sunLight = new THREE.PointLight('#ffd99a', 38, 90, 1.7);
    sunLight.position.copy(sunPosition);
    scene.add(sunLight);

    const shafts: THREE.Mesh[] = [];
    const shaftMaterials: THREE.ShaderMaterial[] = [];
    for (let i = 0; i < 7; i += 1) {
      const material = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color(i % 2 ? '#cdfdf2' : '#ffe4ac') },
          uSeed: { value: i * 7.37 },
        },
        vertexShader: shaftVertex,
        fragmentShader: shaftFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });
      const shaft = new THREE.Mesh(new THREE.PlaneGeometry(1.5 + i * 0.22, 10.8, 1, 1), material);
      shaft.position.set(-5.5 + i * 1.1, 2.2, -4.9 + (i % 2) * 0.65);
      shaft.rotation.set(0.28, 0.3, -0.18);
      scene.add(shaft);
      shafts.push(shaft);
      shaftMaterials.push(material);
    }

    const particlesGeo = new THREE.BufferGeometry();
    const count = 1150;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const seeds = new Float32Array(count);
    const beamWeights = new Float32Array(count);
    const color = new THREE.Color();
    for (let i = 0; i < count; i += 1) {
      const inBeam = Math.random() < 0.78;
      const lane = Math.floor(Math.random() * 7);
      const laneX = -5.5 + lane * 1.1;
      positions[i * 3] = inBeam ? laneX + (Math.random() - 0.5) * (0.5 + Math.random() * 1.0) : (Math.random() - 0.5) * 18;
      positions[i * 3 + 1] = 0.0 + Math.random() * 5.9;
      positions[i * 3 + 2] = inBeam ? -5.8 + Math.random() * 4.1 : -8.2 + Math.random() * 9;
      color.set(i % 5 === 0 ? '#ffe5a8' : i % 2 ? '#bafdf0' : '#45ddd8');
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
      sizes[i] = inBeam ? 0.9 + Math.random() * 4.0 : 0.5 + Math.random() * 1.7;
      seeds[i] = Math.random();
      beamWeights[i] = inBeam ? 0.62 + Math.random() * 0.38 : Math.random() * 0.12;
    }
    particlesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particlesGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particlesGeo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    particlesGeo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    particlesGeo.setAttribute('aBeam', new THREE.BufferAttribute(beamWeights, 1));
    const particlesMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: particleVertex,
      fragmentShader: particleFragment,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particlesGeo, particlesMat);
    scene.add(particles);

    const grass = addGrassSilhouette(scene);

    const marbleMaterial = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uCameraPosition: { value: camera.position } },
      vertexShader: marbleVertex,
      fragmentShader: marbleFragment,
      transparent: true,
      depthWrite: true,
    });
    const marble = new THREE.Mesh(new THREE.SphereGeometry(0.72, 64, 40), marbleMaterial);
    marble.position.set(3.75, -0.24, 2.95);
    marble.scale.setScalar(0.72);
    scene.add(marble);
    const marbleGlow = new THREE.PointLight('#7ffff5', 3.2, 7, 1.6);
    marbleGlow.position.copy(marble.position);
    scene.add(marbleGlow);

    const mistMaterials: THREE.ShaderMaterial[] = [];
    const mistLayers: THREE.Mesh[] = [];
    for (let i = 0; i < 4; i += 1) {
      const mistMaterial = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uSeed: { value: i * 4.7 } },
        vertexShader: mistVertex,
        fragmentShader: mistFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });
      const mist = new THREE.Mesh(new THREE.PlaneGeometry(34, 2.6), mistMaterial);
      mist.position.set(0, 0.9 + i * 0.55, -6.5 - i * 2.2);
      scene.add(mist);
      mistLayers.push(mist);
      mistMaterials.push(mistMaterial);
    }

    const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(host.clientWidth, host.clientHeight, {
      type: THREE.HalfFloatType,
      depthBuffer: true,
    }));
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(host.clientWidth, host.clientHeight), 0.38, 0.54, 0.76));
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
      water.rotation.z = Math.sin(t * 0.055) * 0.014;
      sun.scale.set(4.3 + Math.sin(t * 0.7) * 0.18, 2.8 + Math.cos(t * 0.5) * 0.11, 1);
      sun.material.opacity = 0.31 + Math.sin(t * 0.8) * 0.025;
      shaftMaterials.forEach((material, index) => {
        material.uniforms.uTime.value = t;
        shafts[index].scale.x = 1 + Math.sin(t * 0.18 + index) * 0.1;
      });
      particlesMat.uniforms.uTime.value = t;
      particles.rotation.y = Math.sin(t * 0.04) * 0.025;
      marbleMaterial.uniforms.uTime.value = t;
      marbleMaterial.uniforms.uCameraPosition.value.copy(camera.position);
      marble.rotation.y += 0.005;
      marble.position.y = -0.15 + Math.sin(t * 0.8) * 0.035;
      marbleGlow.position.copy(marble.position);
      grass.position.x = Math.sin(t * 0.05) * 0.03;
      mistLayers.forEach((mist, index) => {
        mist.position.x = Math.sin(t * 0.05 + index) * 0.35;
        mistMaterials[index].uniforms.uTime.value = t;
      });
      camera.position.x = 0.35 + Math.sin(t * 0.07) * 0.16;
      camera.lookAt(-1.4 + Math.sin(t * 0.05) * 0.2, 4.6, -4.8);
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
      waterGeometry.dispose();
      waterMaterial.dispose();
      shaftMaterials.forEach((material) => material.dispose());
      shafts.forEach((shaft) => shaft.geometry.dispose());
      particlesGeo.dispose();
      particlesMat.dispose();
      marble.geometry.dispose();
      marbleMaterial.dispose();
      grass.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) (mesh.material as THREE.Material).dispose();
      });
      mistLayers.forEach((mist) => {
        mist.geometry.dispose();
        (mist.material as THREE.Material).dispose();
      });
    };
  }, []);

  return <div ref={hostRef} style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#031015' }} />;
}
