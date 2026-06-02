import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const vertexShader = `
  varying vec2 vUv;
  varying vec3 vWorld;
  uniform float uTime;

  float wave(vec2 p) {
    return sin(p.x * 2.8 + uTime * 0.8) * 0.18
      + cos(p.y * 3.4 - uTime * 0.64) * 0.12
      + sin((p.x + p.y) * 6.6 + uTime * 0.38) * 0.055;
  }

  void main() {
    vUv = uv;
    vec3 p = position;
    p.z += wave(position.xy);
    vec4 world = modelMatrix * vec4(p, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragmentShader = `
  varying vec2 vUv;
  varying vec3 vWorld;
  uniform float uTime;
  uniform vec3 uSun;

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
      p = mat2(1.6, 1.2, -1.2, 1.6) * p + 7.1;
      a *= 0.5;
    }
    return v;
  }

  float caustic(vec2 p) {
    vec2 q = p;
    float c = 0.0;
    for (int i = 0; i < 4; i++) {
      q = vec2(q.x + sin(q.y * 1.7 + uTime * 0.34), q.y + cos(q.x * 1.45 - uTime * 0.28));
      c += abs(0.5 / (sin(q.x * 2.2) + cos(q.y * 2.1) + 1.85));
      q *= 1.34;
    }
    return smoothstep(1.18, 2.25, c);
  }

  void main() {
    vec2 uv = vUv;
    vec2 flowA = uv * 7.0 + vec2(uTime * 0.055, -uTime * 0.035);
    vec2 flowB = uv * 13.0 + vec2(-uTime * 0.034, uTime * 0.047);
    float n = fbm(flowA);
    float n2 = fbm(flowB);

    vec2 sunUv = vec2(0.38, 0.42);
    vec2 distort = vec2(n - 0.5, n2 - 0.5) * 0.18;
    float sunDisc = 1.0 - smoothstep(0.035, 0.26, length(uv - sunUv + distort));
    float sunHalo = 1.0 - smoothstep(0.12, 0.58, length(uv - sunUv + distort * 0.45));
    float rippleLines = caustic(uv * 9.0 + vec2(uTime * 0.08, -uTime * 0.04));
    float micro = pow(max(0.0, 1.0 - abs(n - 0.54) * 6.0), 5.0);

    vec3 deep = vec3(0.005, 0.075, 0.09);
    vec3 teal = vec3(0.02, 0.42, 0.42);
    vec3 cyan = vec3(0.42, 1.0, 0.92);
    vec3 pearl = vec3(1.0, 0.9, 0.62);
    vec3 color = mix(deep, teal, smoothstep(0.1, 0.95, n));
    color += cyan * rippleLines * 0.36;
    color += cyan * micro * 0.52;
    color += pearl * sunHalo * 0.45;
    color += pearl * sunDisc * 1.7;
    color = mix(color, vec3(0.75, 1.0, 0.94), pow(max(0.0, 1.0 - abs(uv.y - 0.52) * 2.0), 4.0) * 0.08);

    float edge = smoothstep(0.0, 0.16, uv.x) * smoothstep(1.0, 0.84, uv.x) * smoothstep(0.0, 0.14, uv.y) * smoothstep(1.0, 0.82, uv.y);
    gl_FragColor = vec4(color * edge, 1.0);
  }
`;

function createParticleTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d')!;
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,235,1)');
  gradient.addColorStop(0.35, 'rgba(160,255,240,0.55)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

export function WaterLab() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hostRef.current) return;

    const host = hostRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#02090c');
    scene.fog = new THREE.FogExp2('#03232a', 0.028);

    const camera = new THREE.PerspectiveCamera(55, host.clientWidth / host.clientHeight, 0.1, 80);
    camera.position.set(0, -0.9, 8.8);
    camera.lookAt(0, 4.2, -2.6);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    host.appendChild(renderer.domElement);

    const waterMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSun: { value: new THREE.Vector3(-2.4, 6.7, -3.0) },
      },
      vertexShader,
      fragmentShader,
      side: THREE.DoubleSide,
    });
    const water = new THREE.Mesh(new THREE.PlaneGeometry(22, 15, 220, 150), waterMaterial);
    water.position.set(0, 5.25, -1.7);
    water.rotation.x = -Math.PI / 2;
    scene.add(water);

    const sunTexture = createParticleTexture();
    const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTexture, color: '#ffe7a3', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    sun.position.set(-2.4, 6.55, -3.15);
    sun.scale.set(4.2, 2.8, 1);
    scene.add(sun);

    const beamMaterial = new THREE.MeshBasicMaterial({ color: '#d8fff2', transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const beams: THREE.Mesh[] = [];
    for (let i = 0; i < 7; i += 1) {
      const beam = new THREE.Mesh(new THREE.ConeGeometry(0.55 + i * 0.06, 9.5, 48, 1, true), beamMaterial.clone());
      beam.position.set(-2.2 + i * 0.72, 2.4, -2.4 + (i % 2) * 0.55);
      beam.rotation.set(0.2, 0.24, -0.28);
      scene.add(beam);
      beams.push(beam);
    }

    const particleGeometry = new THREE.BufferGeometry();
    const count = 1200;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const color = new THREE.Color();
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 11;
      positions[i * 3 + 1] = Math.random() * 6.5 - 0.3;
      positions[i * 3 + 2] = -6 + Math.random() * 9;
      color.set(i % 4 === 0 ? '#fff4c6' : i % 2 ? '#70e8e8' : '#c7fff3');
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const particles = new THREE.Points(
      particleGeometry,
      new THREE.PointsMaterial({ map: sunTexture, size: 0.055, vertexColors: true, transparent: true, opacity: 0.68, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    scene.add(particles);

    let frame = 0;
    let raf = 0;
    const clock = new THREE.Clock();

    const resize = () => {
      camera.aspect = host.clientWidth / host.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(host.clientWidth, host.clientHeight);
    };
    window.addEventListener('resize', resize);

    const render = () => {
      const t = clock.getElapsedTime();
      waterMaterial.uniforms.uTime.value = t;
      water.rotation.z = Math.sin(t * 0.08) * 0.025;
      sun.scale.set(4.2 + Math.sin(t * 0.9) * 0.28, 2.8 + Math.cos(t * 0.72) * 0.2, 1);
      sun.material.opacity = 0.82 + Math.sin(t * 1.2) * 0.08;
      beams.forEach((beam, index) => {
        beam.rotation.y = 0.24 + Math.sin(t * 0.17 + index) * 0.06;
        beam.scale.x = 1 + Math.sin(t * 0.24 + index) * 0.12;
        (beam.material as THREE.MeshBasicMaterial).opacity = 0.055 + Math.sin(t * 0.19 + index) * 0.018;
      });
      particles.rotation.y = Math.sin(t * 0.07) * 0.05;
      particles.position.y = Math.sin(t * 0.18) * 0.09;
      camera.position.x = Math.sin(t * 0.11) * 0.28;
      camera.lookAt(Math.sin(t * 0.06) * 0.42, 4.2, -2.6);
      renderer.render(scene, camera);
      frame += 1;
      raf = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      water.geometry.dispose();
      waterMaterial.dispose();
      sunTexture.dispose();
      beamMaterial.dispose();
      particleGeometry.dispose();
      renderer.dispose();
      host.replaceChildren();
      frame = 0;
    };
  }, []);

  return <div ref={hostRef} style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#02090c' }} />;
}
