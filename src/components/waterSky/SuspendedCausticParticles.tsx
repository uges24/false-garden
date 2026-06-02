import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three/webgpu';
import { WATER_SUN_POSITION } from './constants';

const PARTICLE_COUNT = 360;
const COLUMN_RADIUS = 22;
const COLUMN_HEIGHT = 58;

type ParticleState = {
  positions: Float32Array;
  baseX: Float32Array;
  baseZ: Float32Array;
  baseHeight: Float32Array;
  verticalSpeed: Float32Array;
  swirlAmp: Float32Array;
  phase: Float32Array;
};

function createSoftParticleTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return null;
  }

  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
  gradient.addColorStop(0.45, 'rgba(220, 248, 255, 0.38)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;

  return texture;
}

export function SuspendedCausticParticles() {
  const pointsRef = useRef<THREE.Points>(null);

  const particleState = useMemo<ParticleState>(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const baseX = new Float32Array(PARTICLE_COUNT);
    const baseZ = new Float32Array(PARTICLE_COUNT);
    const baseHeight = new Float32Array(PARTICLE_COUNT);
    const verticalSpeed = new Float32Array(PARTICLE_COUNT);
    const swirlAmp = new Float32Array(PARTICLE_COUNT);
    const phase = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const radius = Math.pow(Math.random(), 0.75) * COLUMN_RADIUS;
      const angle = Math.random() * Math.PI * 2;
      const height = Math.random() * COLUMN_HEIGHT;

      baseX[i] = Math.cos(angle) * radius;
      baseZ[i] = Math.sin(angle) * radius * 0.82;
      baseHeight[i] = height;
      verticalSpeed[i] = 0.08 + Math.random() * 0.17;
      swirlAmp[i] = 0.12 + Math.random() * 0.75;
      phase[i] = Math.random() * Math.PI * 2;

      const stride = i * 3;
      positions[stride] = baseX[i];
      positions[stride + 1] = height;
      positions[stride + 2] = baseZ[i];
    }

    return {
      positions,
      baseX,
      baseZ,
      baseHeight,
      verticalSpeed,
      swirlAmp,
      phase,
    };
  }, []);

  const geometry = useMemo(() => {
    const bufferGeometry = new THREE.BufferGeometry();
    bufferGeometry.setAttribute('position', new THREE.BufferAttribute(particleState.positions, 3));
    return bufferGeometry;
  }, [particleState.positions]);

  const particleTexture = useMemo(() => createSoftParticleTexture(), []);

  const material = useMemo(() => {
    const pointsMaterial = new THREE.PointsMaterial({
      color: '#d7f7ff',
      size: 0.52,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
      blending: THREE.NormalBlending,
      alphaTest: 0.01,
      map: particleTexture,
    });

    return pointsMaterial;
  }, [particleTexture]);

  useFrame(({ clock }) => {
    const attribute = pointsRef.current?.geometry.getAttribute('position');
    if (!(attribute instanceof THREE.BufferAttribute)) {
      return;
    }

    const time = clock.elapsedTime;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const stride = i * 3;
      const phase = particleState.phase[i];
      const swirl = particleState.swirlAmp[i];

      const driftHeight = (particleState.baseHeight[i] + time * particleState.verticalSpeed[i]) % COLUMN_HEIGHT;

      particleState.positions[stride] =
        particleState.baseX[i] + Math.sin(time * 0.21 + phase) * swirl;
      particleState.positions[stride + 1] =
        driftHeight + Math.sin(time * 0.09 + phase * 0.7) * 0.65;
      particleState.positions[stride + 2] =
        particleState.baseZ[i] + Math.cos(time * 0.18 + phase * 0.85) * swirl;
    }

    attribute.needsUpdate = true;
  });

  return (
    <group position={[WATER_SUN_POSITION[0], 4, WATER_SUN_POSITION[2]]}>
      <points ref={pointsRef} frustumCulled={false} renderOrder={5}>
        <primitive object={geometry} attach="geometry" />
        <primitive object={material} attach="material" />
      </points>
    </group>
  );
}
