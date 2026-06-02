import { Canvas } from '@react-three/fiber';
import { AdaptiveDpr, Stars } from '@react-three/drei';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
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

export function Experience() {
  const mode = useWorldStore((state) => state.mode);
  const theme = worldThemes[mode];

  return (
    <Canvas
      camera={{ position: [0, 9, 28], fov: 50, near: 0.1, far: 220 }}
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 1.75]}
      shadows
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
      <EnergyBeams />
      <FloatingFragments />
      <MarbleSystem />
      <SunController />
      <Player />
      <AdaptiveDpr pixelated />
      <EffectComposer multisampling={0}>
        <Bloom luminanceThreshold={0.18} luminanceSmoothing={0.25} intensity={theme.bloom} />
        <Vignette darkness={0.58} offset={0.24} />
      </EffectComposer>
    </Canvas>
  );
}
