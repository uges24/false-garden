import { useEffect, useRef } from 'react';
import * as THREE from 'three';

function makeGrassGroup() {
  const group = new THREE.Group();
  const groundMaterial = new THREE.MeshBasicMaterial({ color: '#06170d', transparent: true, opacity: 0.96, depthWrite: false });
  const bladeDark = new THREE.MeshBasicMaterial({ color: '#020b07', transparent: true, opacity: 0.96, depthWrite: false });
  const bladeMid = new THREE.MeshBasicMaterial({ color: '#0d4f27', transparent: true, opacity: 0.72, depthWrite: false });
  const bladeLit = new THREE.MeshBasicMaterial({ color: '#91f86f', transparent: true, opacity: 0.46, depthWrite: false, blending: THREE.AdditiveBlending });

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(34, 18), groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -1.42, -4.8);
  group.add(ground);

  for (let i = 0; i < 620; i += 1) {
    const near = Math.random() < 0.58;
    const h = near ? 0.8 + Math.random() * 2.8 : 0.35 + Math.random() * 1.4;
    const material = Math.random() < 0.12 ? bladeLit : Math.random() < 0.38 ? bladeMid : bladeDark;
    const blade = new THREE.Mesh(new THREE.PlaneGeometry(0.035 + Math.random() * 0.04, h), material);
    blade.position.set((Math.random() - 0.5) * 28, -0.92 + Math.random() * 0.32, near ? 0.2 - Math.random() * 6.4 : -5.5 - Math.random() * 10);
    blade.rotation.z = (Math.random() - 0.5) * 0.42;
    blade.rotation.y = Math.random() * Math.PI;
    group.add(blade);
  }

  return group;
}

function makeRuinsGroup() {
  const group = new THREE.Group();
  const stone = new THREE.MeshBasicMaterial({ color: '#17241f', transparent: true, opacity: 0.96, depthWrite: false });
  const rim = new THREE.MeshBasicMaterial({ color: '#a7df72', transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending });
  const placements: Array<[number, number, number, number]> = [
    [-10.3, -1.2, -7.3, 3.8],
    [-4.2, -1.25, -9.4, 2.5],
    [0.0, -1.35, -12.3, 1.7],
    [5.8, -1.25, -7.8, 2.1],
    [10.2, -1.2, -9.1, 3.0],
  ];

  placements.forEach(([x, y, z, h], index) => {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.72, h, 0.68), stone);
    pillar.position.set(x, y + h / 2, z);
    pillar.rotation.z = (index - 2) * 0.045;
    group.add(pillar);

    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.2, 0.82), stone);
    cap.position.set(x, y + h + 0.12, z);
    cap.rotation.z = pillar.rotation.z;
    group.add(cap);

    const highlight = new THREE.Mesh(new THREE.PlaneGeometry(0.055, h * 0.72), rim);
    highlight.position.set(x + 0.38, y + h * 0.55, z + 0.36);
    highlight.rotation.z = pillar.rotation.z + 0.12;
    group.add(highlight);
  });

  const rock = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 0.72), stone);
  rock.position.set(4.8, -1.0, -2.9);
  rock.rotation.z = -0.06;
  group.add(rock);

  return group;
}

function makeMarble() {
  const group = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.72, 64, 40),
    new THREE.MeshBasicMaterial({ color: '#05383d', transparent: true, opacity: 0.92 }),
  );
  group.add(core);

  const rim = new THREE.Mesh(
    new THREE.SphereGeometry(0.75, 64, 40),
    new THREE.MeshBasicMaterial({ color: '#48fff5', transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  group.add(rim);

  const light = new THREE.PointLight('#35f7ff', 3.4, 8, 1.5);
  light.position.set(0, 0, 0.25);
  group.add(light);
  group.position.set(0, -0.62, 1.35);
  group.scale.setScalar(0.82);
  return group;
}

export function WaterTargetHarness() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#071a17');
    scene.fog = new THREE.FogExp2('#0b302d', 0.023);

    const camera = new THREE.PerspectiveCamera(52, host.clientWidth / host.clientHeight, 0.1, 120);
    camera.position.set(0, 0.02, 9.9);
    camera.lookAt(0, 5.55, -8.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.82;
    host.appendChild(renderer.domElement);

    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(68, 40, 1, 1),
      new THREE.MeshBasicMaterial({ color: '#0a6e68', transparent: true, opacity: 0.78, depthWrite: false }),
    );
    water.position.set(0, 7.25, -6.8);
    water.rotation.x = -Math.PI / 2;
    scene.add(water);

    const sun = new THREE.Mesh(
      new THREE.CircleGeometry(1.2, 48),
      new THREE.MeshBasicMaterial({ color: '#ffd98a', transparent: true, opacity: 0.62, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    sun.position.set(0, 8.9, -8.5);
    scene.add(sun);
    scene.add(new THREE.HemisphereLight('#55ffe8', '#03120b', 1.0));
    const sunLight = new THREE.PointLight('#ffd98a', 34, 95, 1.7);
    sunLight.position.set(0, 8.9, -8.5);
    scene.add(sunLight);

    const mist = new THREE.Mesh(
      new THREE.PlaneGeometry(42, 3.4),
      new THREE.MeshBasicMaterial({ color: '#56d6c3', transparent: true, opacity: 0.11, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    mist.position.set(0, 1.0, -8.4);
    scene.add(mist);

    const grass = makeGrassGroup();
    const ruins = makeRuinsGroup();
    const marble = makeMarble();
    scene.add(grass, ruins, marble);

    let raf = 0;
    const clock = new THREE.Clock();
    const resize = () => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', resize);

    const render = () => {
      const t = clock.getElapsedTime();
      mist.position.x = Math.sin(t * 0.05) * 0.25;
      marble.position.y = -0.62 + Math.sin(t * 0.7) * 0.025;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      host.replaceChildren();
      renderer.dispose();
      scene.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          const material = mesh.material as THREE.Material | THREE.Material[];
          if (Array.isArray(material)) material.forEach((item) => item.dispose());
          else material.dispose();
        }
      });
    };
  }, []);

  return <div ref={hostRef} style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#071a17' }} />;
}
