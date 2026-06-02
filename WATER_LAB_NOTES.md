# Water Lab Notes

This branch isolates the water-sky work at `/water-lab` and does not modify the main False Garden world.

## WaterMesh Attempt

PR #6 tried to use Three.js `WaterMesh` directly in the main scene. The user-reported runtime result was a black screen. The branch was closed unmerged and not continued.

The likely failure point was the active `WaterMesh` reflector path inside the existing False Earth WebGPU plus postprocessing render stack. Browser-console capture was not available in this Codex session because the in-app browser backend returned `Browser is not available: iab`, and the project has no local Playwright dependency installed. Because the exact browser console exception could not be captured, this branch does not silently fallback in the main scene. Instead it moves all water work into an isolated `/water-lab` route and uses a custom water test scene.

## Current Lab Direction

The `/water-lab` route renders only the water-ceiling study:

- upward camera under the water surface
- standalone Three/WebGL shader scene
- animated displaced water geometry
- procedural FBM water shading
- distorted sun glow behind the moving water
- volumetric-looking light shafts
- procedural caustic curtains
- suspended mist particles

No grass, character, marble, terrain, weather UI, or main-world systems are rendered on this route.
