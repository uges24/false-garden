# Source Audit

Phase 0 was completed before Phase 1 implementation. The linked repositories were inspected as a practical source pack. This project will not vendor those repositories or copy their visual compositions. Compatible MIT-licensed ideas are ported or adapted into a new False Garden implementation.

## Summary

| Repo | License | Useful systems/components/shaders found | False Garden use |
| --- | --- | --- | --- |
| `momentchan/false-earth` | MIT | Vite/R3F world structure, cinematic camera, small character scale, terrain helpers, grass system organization, cosmic beams/waves, postprocessing strategy, performance/debug concepts. | Strongest base/reference for component boundaries and world behavior. WebGPU/TSL compute grass is rewritten for WebGL/R3F Phase 1. Beams, terrain scale, camera mood, and performance thinking are adapted. |
| `thebenezer/FluffyGrass` | MIT | `MeshSurfaceSampler` placement, instanced grass, custom grass material with wind/noise color variation, fluffy blade density approach. | Direct practical reference for Phase 1 grass density, instancing, wind animation, and teal/emerald color variation. Geometry/material are rewritten in R3F/TypeScript without external GLB assets. |
| `mattrossman/magic-marble-tutorial` | MIT | R3F glassy/magic marble shader idea, volumetric/refraction-like portal orb presentation. | Adapted into original portal marbles using transparent emissive spheres, inner glow, hover scaling, pulse rings, and False Garden palette. No copied composition. |
| `Mamboleoo/SurfaceSampling` | MIT | Three.js `MeshSurfaceSampler` demos for distributing objects over mesh surfaces. | Placement logic is adapted for marbles/beam anchors using deterministic sampled terrain positions. In Phase 1 the actual sampler is simplified because the terrain is procedural and height can be computed directly. |
| `Sujenphea/procedural-snake` | MIT | Procedural snake motion, endless curve thinking, instanced body rendering, shader-driven body detail. | Adapted as a simpler segmented snake/trail moving beneath grass with sinusoidal motion and night/eclipse glow. Full shader/steering system is deferred. |
| `niccolofanton/codrops-singularity-demo` | MIT | R3F dramatic object events, orbit control feel, postprocessing, floating/spiraling fragments. | Adapted only as a rare-energy-event reference: small floating shards and beam drama. No branded assets/models or copied scene identity. |
| `cartuhok/3d-weather-codrops` | No license file found | Sun/orb, atmospheric particles, lens flare, day/night/weather visualization ideas. | Conceptual reference only because no license file was found. No code or assets are copied. Weather UI/API/dashboard are explicitly excluded. |
| `ektogamat/threejs-andy-boilerplate` | MIT | General Three.js app structure, camera/light/debug setup, OrbitControls constraints. | Low-priority reference only. The project uses Vite/R3F instead of this boilerplate. |

## Attribution Notes

The MIT-licensed repositories require preserving copyright/license notices when substantial code is reused. Phase 1 uses source-informed rewrites and adaptations rather than vendored source files, but these projects remain credited here because their systems shaped the implementation:

- False Earth by `momentchan`
- FluffyGrass by `thebenezer`
- Magic Marble Tutorial by `mattrossman` / Codrops
- SurfaceSampling by `Mamboleoo` / Codrops
- Procedural Snake by `Sujenphea` / Codrops
- Codrops Singularity Demo by `niccolofanton` / Codrops
- Three.js Andy Boilerplate by `ektogamat` / Anderson Mancini

`cartuhok/3d-weather-codrops` has no license file in the inspected repository, so it is not used as a code or asset source.

## Reuse Plan

### Reused or adapted

- False Earth component organization: scene root, terrain, grass, character scale, cosmic beams, mode-driven visual state.
- False Earth world feel: huge grass field, low cinematic camera, small human figure, reactive cosmic events.
- FluffyGrass instancing strategy: repeated grass blade geometry, wind/noise-driven material animation, performance-mode blade count reduction.
- SurfaceSampling distribution idea: scatter important objects across terrain rather than placing them in UI-like rows.
- Magic Marble interaction language: glassy glowing orbs that pulse, expand, and open portal content.
- Procedural Snake motion: segmented body following a sine/noise path below the grass canopy.
- Singularity Demo event language: rare floating fragments and dramatic vertical energy accents.

### Rewritten

- Grass renderer: False Earth's WebGPU/TSL compute grass is not practical for the required WebGL/R3F Phase 1, so it is rewritten as InstancedMesh blades with custom shader material.
- Terrain: rewritten as procedural plane geometry with shared CPU height sampling for objects and a matching vertex shader displacement feel.
- Marbles: rewritten as False Garden portal marbles with cyan/violet/magenta/pearl glow, labels, overlay cards, and no copied visual layout.
- Snake: rewritten as a simple R3F segmented creature/trail rather than porting full shader/curve infrastructure.
- Sun/mood system: rewritten as an original four-mode world controller; weather data and weather dashboard are not included.
- HUD: rewritten as a minimal cinematic overlay, not a dashboard or landing-page UI.

## Phase 1 Direction

False Garden will use `momentchan/false-earth` as the strongest structural reference where practical, while keeping the first shipped build WebGL/R3F-compatible:

- Emerald/teal grass world at large scale.
- Gold/eclipsing sun as the primary mood controller.
- Portal marbles as the main interaction/navigation layer.
- Cyan/violet beams and ripples as environmental events.
- A partially hidden surprise snake beneath grass, more visible at night/eclipse.
- No weather API, weather dashboard, copied assets, or copied visual composition.
