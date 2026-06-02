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
  gradient.addColorStop(0, 'rgba(255,250,220,1)');
  gradient.addColorStop(0.18, 'rgba(255,221,126,0.86)');
  gradient.addColorStop(0.42, 'rgba(116,246,255,0.34)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

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

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }

  void main() {
    float horizontal = smoothstep(0.0, 0.46, vUv.x) * smoothstep(1.0, 0.54, vUv.x);
    float vertical = smoothstep(0.0, 0.06, vUv.y) * pow(1.0 - vUv.y, 1.35);
    float core = smoothstep(0.0, 0.35, vUv.x) * smoothstep(1.0, 0.65, vUv.x);
    float breakup = noise(vec2(vUv.x * 6.0 + uSeed, vUv.y * 11.0 - uTime * 0.2));
    float alpha = mix(horizontal * 0.35, core, 0.45) * vertical * smoothstep(0.18, 0.86, breakup);
    gl_FragColor = vec4(uColor, alpha * 0.18);
  }
`;

const waterVertex = `
  varying vec2 vUv;
  varying vec3 vWorld;
  varying vec3 vNormal;
  uniform float uTime;

  float wave(vec2 p) {
    return sin(p.x * 1.15 + uTime * 0.68) * 0.16
      + sin(p.y * 1.55 - uTime * 0.48) * 0.12
      + sin((p.x + p.y) * 3.8 + uTime * 0.58) * 0.065
      + cos((p.x - p.y) * 7.4 - uTime * 0.95) * 0.032
      + sin(p.x * 12.0 + p.y * 4.0 + uTime * 1.7) * 0.014;
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

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

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

  float caustic(vec2 p) {
    vec2 q = p;
    float c = 0.0;
    for (int i = 0; i < 4; i++) {
      q += vec2(sin(q.y * 1.8 + uTime * 0.32), cos(q.x * 1.6 - uTime * 0.27)) * 0.32;
      c += abs(0.52 / (sin(q.x * 2.1) + cos(q.y * 2.35) + 1.95));
      q *= 1.28;
    }
    return smoothstep(1.25, 2.35, c);
  }

  float lineCaustic(vec2 p) {
    float a = sin(p.x * 18.0 + sin(p.y * 4.0 + uTime * 0.7) * 1.2 + uTime * 1.5);
    float b = sin((p.x + p.y) * 24.0 - uTime * 1.1);
    float c = sin((p.x - p.y) * 31.0 + uTime * 1.8);
    float lines = 1.0 - min(min(abs(a), abs(b)), abs(c));
    return smoothstep(0.89, 0.985, lines);
  }

  void main() {
    vec3 N = normalize(vNormal.xzy);
    vec3 V = normalize(uCameraPosition - vWorld);
    vec3 L = normalize(uSunPosition - vWorld);
    vec3 H = normalize(V + L);

    vec2 flowA = vUv * 7.5 + vec2(uTime * 0.045, -uTime * 0.032);
    vec2 flowB = vUv * 18.0 + vec2(-uTime * 0.05, uTime * 0.065);
    vec2 flowC = vUv * 46.0 + vec2(uTime * 0.12, uTime * 0.04);
    float nA = fbm(flowA);
    float nB = fbm(flowB);
    float nC = fbm(flowC);
    vec2 distortion = vec2(nA - 0.5, nB - 0.5) * 0.13 + vec2(nC - 0.5, nA - 0.5) * 0.035;

    vec2 sunUv = vec2(0.34, 0.42);
    vec2 sunWarp = distortion + vec2(sin(vUv.y * 35.0 + uTime * 1.2), cos(vUv.x * 28.0 - uTime)) * 0.012;
    float sunDisc = 1.0 - smoothstep(0.035, 0.16, length(vUv - sunUv + sunWarp));
    float sunCore = 1.0 - smoothstep(0.0, 0.055, length(vUv - sunUv + sunWarp * 1.45));
    float sunHalo = 1.0 - smoothstep(0.13, 0.46, length(vUv - sunUv + sunWarp * 0.45));
    float fresnel = pow(1.0 - max(dot(N, V), 0.0), 2.65);
    float spec = pow(max(dot(N, H), 0.0), 135.0);
    float ripples = caustic(vUv * 10.5 + distortion * 3.0);
    float ribbons = lineCaustic(vUv * 1.55 + distortion * 2.0);
    float fine = pow(max(0.0, 1.0 - abs(nC - 0.53) * 9.0), 5.0);
    float boundary = smoothstep(0.42, 0.55, abs(nB - nA));

    vec3 deep = vec3(0.002, 0.035, 0.048);
    vec3 body = vec3(0.012, 0.19, 0.22);
    vec3 cyan = vec3(0.35, 1.0, 0.92);
    vec3 pearl = vec3(1.0, 0.88, 0.55);
    vec3 color = mix(deep, body, smoothstep(0.22, 0.86, nA));
    color += cyan * ripples * 0.28;
    color += cyan * ribbons * 0.52;
    color += cyan * fine * 0.42;
    color += vec3(0.9, 1.0, 0.78) * boundary * 0.18;
    color += cyan * fresnel * 0.58;
    color += pearl * spec * 1.9;
    color += pearl * sunHalo * 0.13;
    color += pearl * sunDisc * 0.3;
    color += vec3(1.0, 0.62, 0.22) * sunCore * 0.55;
    color *= 0.72;

    float edge = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x) * smoothstep(0.0, 0.08, vUv.y) * smoothstep(1.0, 0.9, vUv.y);
    gl_FragColor = vec4(color * edge, 0.98);
  }
`;

const particleVertex = `
  attribute float aSize;
  attribute float aSeed;
  attribute float aBeam;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vBeam;
  uniform float uTime;

  void main() {
    vColor = color;
    vBeam = aBeam;
    vec3 p = position;
    p.x += sin(uTime * 0.22 + aSeed * 8.0) * 0.08 * aBeam;
    p.y += sin(uTime * 0.15 + aSeed * 5.0) * 0.12 + (fract(aSeed * 17.0 + uTime * 0.018) - 0.5) * 0.12;
    p.z += cos(uTime * 0.18 + aSeed * 6.0) * 0.08 * aBeam;
    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = aSize * (22.0 / max(1.0, -mvPosition.z));
    vAlpha = mix(0.03, 0.56, aBeam);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const particleFragment = `
  varying vec3 vColor;
  varying float vAlpha;
  varying float vBeam;
  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float d = length(p);
    float alpha = smoothstep(0.5, 0.0, d) * vAlpha * smoothstep(0.12, 0.8, vBeam);
    gl_FragColor = vec4(vColor, alpha);
  }
`;

const vignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    uStrength: { value: 0.35 },
  },
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
      vec4 color = texture2D(tDiffuse, vUv);
      float d = distance(vUv, vec2(0.5));
      color.rgb *= 1.0 - smoothstep(0.36, 0.86, d) * uStrength;
      gl_FragColor = color;
    }
  `,
};

export function WaterLab() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#031015');
    scene.fog = new THREE.FogExp2('#052329', 0.014);

    const camera = new THREE.PerspectiveCamera(58, host.clientWidth / host.clientHeight, 0.1, 120);
    camera.position.set(0, -3.4, 12.8);
    camera.lookAt(-1.6, 6.0, -4.1);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.66;
    host.appendChild(renderer.domElement);

    const sunPosition = new THREE.Vector3(-6.5, 9.8, -7.5);
    const waterGeometry = new THREE.PlaneGeometry(48, 34, 220, 160);
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
    water.position.set(0, 5.8, -2.4);
    water.rotation.x = -Math.PI / 2;
    scene.add(water);

    const glowTexture = createGlowTexture();
    const sun = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture,
        color: '#ffe7a6',
        transparent: true,
        opacity: 0.46,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    sun.position.copy(sunPosition);
    sun.scale.set(4.9, 3.15, 1);
    scene.add(sun);

    scene.add(new THREE.HemisphereLight('#7ffff1', '#02090c', 1.4));
    const sunLight = new THREE.PointLight('#ffe4a6', 55, 80, 1.7);
    sunLight.position.copy(sunPosition);
    scene.add(sunLight);

    const shaftMaterials: THREE.ShaderMaterial[] = [];
    const shafts: THREE.Mesh[] = [];
    for (let i = 0; i < 8; i += 1) {
      const material = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color(i % 2 ? '#d8fff3' : '#ffeab8') },
          uSeed: { value: i * 9.13 },
        },
        vertexShader: shaftVertex,
        fragmentShader: shaftFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });
      const shaft = new THREE.Mesh(new THREE.PlaneGeometry(1.6 + i * 0.1, 14.5, 1, 1), material);
      shaft.position.set(-4.7 + i * 1.18, -0.05, -4.9 + (i % 3) * 0.55);
      shaft.rotation.set(0.2, 0.24, -0.14);
      shaft.scale.set(1.0, 1, 1);
      scene.add(shaft);
      shaftMaterials.push(material);
      shafts.push(shaft);
    }

    const dustGeometry = new THREE.BufferGeometry();
    const count = 1700;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const seeds = new Float32Array(count);
    const beamWeights = new Float32Array(count);
    const color = new THREE.Color();
    for (let i = 0; i < count; i += 1) {
      const beam = Math.random() < 0.82;
      const lane = Math.floor(Math.random() * 8);
      const laneX = -4.7 + lane * 1.18;
      const x = beam ? laneX + (Math.random() - 0.5) * (0.55 + Math.random() * 0.95) : (Math.random() - 0.5) * 18;
      positions[i * 3] = x;
      positions[i * 3 + 1] = -4.8 + Math.random() * 10.8;
      positions[i * 3 + 2] = beam ? -5.3 + Math.random() * 3.7 : -9 + Math.random() * 12;
      color.set(i % 5 === 0 ? '#fff0bd' : i % 2 ? '#b8fff2' : '#65deda');
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
      sizes[i] = beam ? 1.2 + Math.random() * 4.8 : 0.8 + Math.random() * 2.2;
      seeds[i] = Math.random();
      beamWeights[i] = beam ? 0.68 + Math.random() * 0.32 : Math.random() * 0.18;
    }
    dustGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    dustGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    dustGeometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    dustGeometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    dustGeometry.setAttribute('aBeam', new THREE.BufferAttribute(beamWeights, 1));
    const dustMaterial = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: particleVertex,
      fragmentShader: particleFragment,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const dust = new THREE.Points(dustGeometry, dustMaterial);
    scene.add(dust);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(18, 72),
      new THREE.MeshBasicMaterial({ color: '#020708', transparent: true, opacity: 0.58, depthWrite: false }),
    );
    floor.position.set(0, -5.2, -3);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    const silhouetteMaterial = new THREE.MeshBasicMaterial({ color: '#010607', transparent: true, opacity: 0.68, depthWrite: false });
    const silhouettes: THREE.Mesh[] = [];
    for (let i = 0; i < 3; i += 1) {
      const geo = new THREE.PlaneGeometry(24 + i * 7, 3.4 + i * 0.8, 24, 1);
      const position = geo.attributes.position as THREE.BufferAttribute;
      for (let j = 0; j < position.count; j += 1) {
        const x = position.getX(j);
        const y = position.getY(j);
        const crest = y > 0 ? Math.sin(x * (0.45 + i * 0.08) + i) * (0.38 + i * 0.12) : 0;
        position.setY(j, y + crest);
      }
      position.needsUpdate = true;
      const mesh = new THREE.Mesh(geo, silhouetteMaterial.clone());
      mesh.position.set(0, -4.7 - i * 0.28, -4.7 - i * 2.4);
      mesh.rotation.x = -0.12;
      scene.add(mesh);
      silhouettes.push(mesh);
    }

    const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(host.clientWidth, host.clientHeight, {
      type: THREE.HalfFloatType,
      depthBuffer: true,
    }));
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(host.clientWidth, host.clientHeight), 0.42, 0.56, 0.78);
    composer.addPass(bloomPass);
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
      water.rotation.z = Math.sin(t * 0.07) * 0.018;
      sun.scale.set(4.9 + Math.sin(t * 0.76) * 0.22, 3.15 + Math.cos(t * 0.53) * 0.16, 1);
      sun.material.opacity = 0.42 + Math.sin(t * 0.9) * 0.035;
      shafts.forEach((shaft, index) => {
        shaft.rotation.y = 0.28 + Math.sin(t * 0.16 + index) * 0.065;
        shaft.scale.x = 1.1 + Math.sin(t * 0.21 + index * 1.7) * 0.16;
        shaftMaterials[index].uniforms.uTime.value = t;
      });
      dustMaterial.uniforms.uTime.value = t;
      dust.rotation.y = Math.sin(t * 0.055) * 0.035;
      silhouettes.forEach((mesh, index) => {
        mesh.position.y = -4.7 - index * 0.28 + Math.sin(t * 0.08 + index) * 0.04;
      });
      camera.position.x = Math.sin(t * 0.09) * 0.55;
      camera.position.y = -3.25 + Math.sin(t * 0.13) * 0.22;
      camera.lookAt(-1.4 + Math.sin(t * 0.07) * 0.4, 6.2, -4.2);
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
      glowTexture.dispose();
      waterGeometry.dispose();
      waterMaterial.dispose();
      shafts.forEach((shaft) => shaft.geometry.dispose());
      shaftMaterials.forEach((material) => material.dispose());
      dustGeometry.dispose();
      dustMaterial.dispose();
      floor.geometry.dispose();
      (floor.material as THREE.Material).dispose();
      silhouettes.forEach((mesh) => {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      });
    };
  }, []);

  return <div ref={hostRef} style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#031015' }} />;
}
