# Water Lab Notes

This branch isolates the water-sky render work at `/water-lab`. The main False Garden world is not rendered or modified on that route.

## Source References

- Three.js WebGPU `WaterMesh`: https://github.com/mrdoob/three.js/blob/dev/examples/jsm/objects/WaterMesh.js
- Three.js WebGL `Water`: https://github.com/mrdoob/three.js/blob/dev/examples/jsm/objects/Water.js
- Three.js `Water2`: https://github.com/mrdoob/three.js/blob/dev/examples/jsm/objects/Water2.js
- Drei Sparkles particle approach: https://github.com/pmndrs/drei/blob/master/src/core/Sparkles.tsx
- Postprocessing reference: https://github.com/pmndrs/postprocessing
- False Earth quality bar: https://tympanus.net/codrops/2026/04/21/false-earth-from-webgl-limits-to-a-webgpu-driven-world/

## WaterMesh Attempt

The first direct `WaterMesh` attempt was PR #6. It was rejected and closed unmerged after producing a black screen in the existing False Earth WebGPU/postprocessing scene. The observed failure was the full frame rendering black after adding `WaterMesh` as an active scene object. Browser-console capture was unavailable in this Codex session because the in-app browser backend returned `Browser is not available: iab`, and the project has no local Playwright dependency.

Because an exact console exception could not be captured, this branch does not silently use `WaterMesh` in production or hide the result behind a weak fallback. The lab route first tested the compatible Three.js `Water.js` render system in isolation, but the captured result looked like a flat grey ceiling and did not meet the visual gate. The active implementation is therefore a custom real-geometry water mesh shader built specifically for the lab.

## Active Implementation

`/water-lab` is a standalone Three.js/WebGL scene with:

- camera below a real water mesh, looking upward
- custom overhead water mesh with dense geometry
- procedural FBM/noise animated normals with multiple scrolling layers
- Fresnel shimmer, sun specular, and distorted sun-through-water shading
- sun and warm light above/behind the water
- bloom/tone mapping/vignette-style postprocessing
- soft additive volumetric shaft meshes aligned to the sun
- shader-driven underwater dust points inspired by Sparkles
- optional dark lower silhouettes for scale only

No grass, character, marble, terrain, weather UI, starfield, galaxy, orbit/debug rings, or main-world systems are rendered on `/water-lab`.
