import { Canvas } from '@react-three/fiber';
import { AdaptiveDpr, Stars } from '@react-three/drei';
import { Bloom, EffectComposer, Noise, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { useWorldStore } from '../store/worldStore';
import { worldThemes } from '../utils/theme';
import { Terrain } from './Terrain';
import { GrassField } from './GrassField';
import { Player } from './Player';
import { SunController } from './SunController';
import { MarbleSystem } from './MarbleSystem';
import { EnergyBeams } from './EnergyBeams';
import { SnakeSystem } from './SnakeSystem';
import { CameraRig } from './CameraRig';
import { FloatingFragments } from './FloatingFragments';
import { AtmosphereParticles } from './AtmosphereParticles';
import { SingularityFragments } from './SingularityFragments';

export function Experience() {
  const mode = useWorldStore((state) => state.mode);
  const theme = worldThemes[mode];

  return (
    <Canvas
      camera={{ position: [0, 7, 22], fov: 48, near: 0.08, far: 520 }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      dpr={[1, 1.75]}
      shadows
      onCreated={({ gl }) => {
        gl.outputColorSpace = THREE.SRGBColorSpace;
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.08;
      }}
    >
      <color attach="background" args={[theme.background]} />
      <fog attach="fog" args={[theme.fog, theme.fogNear, theme.fogFar]} />
      <ambientLight intensity={theme.ambient} color={theme.grassTip} />
      <directionalLight
        position={[-18, 26, 12]}
        intensity={theme.directional}
        color={theme.sunCore}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <CameraRig />
      <Stars radius={95} depth={42} count={mode === 'Golden Day' ? 80 : 260} factor={3} fade speed={0.35} />
      <Terrain />
      <GrassField />
      <SnakeSystem />
      <AtmosphereParticles />
      <SingularityFragments />
      <EnergyBeams />
      <FloatingFragments />
      <MarbleSystem />
      <SunController />
      <Player />
      <AdaptiveDpr pixelated />
      <EffectComposer multisampling={0}>
        <Bloom luminanceThreshold={0.24} luminanceSmoothing={0.48} intensity={theme.bloom * 0.82} mipmapBlur />
        <Noise opacity={0.035} blendFunction={BlendFunction.SOFT_LIGHT} />
        <Vignette darkness={0.44} offset={0.18} />
      </EffectComposer>
    </Canvas>
  );
}
