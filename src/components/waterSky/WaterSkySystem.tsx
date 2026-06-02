import { RefractedSun } from './RefractedSun';
import { SuspendedCausticParticles } from './SuspendedCausticParticles';
import { WaterLightShafts } from './WaterLightShafts';
import { WaterSkyDome } from './WaterSkyDome';

export function WaterSkySystem() {
  return (
    <>
      <WaterSkyDome />
      <RefractedSun />
      <WaterLightShafts />
      <SuspendedCausticParticles />
    </>
  );
}
