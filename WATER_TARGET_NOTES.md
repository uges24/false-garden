# Water Target Notes

## Locked Target

`docs/visual-targets/water-sky/target-reference-v1.png`

## Current Pass

P1 composition complete. Stop here until this composition is reviewed before proceeding to P2.

## Renderer Backend

Current harness uses a standalone Three.js WebGL route at `/water-target-match`.

The main False Garden route remains on the accepted marble baseline and is not modified.

## Blockers

None for P1. The target image exists locally and is committed in the required path.

## Bad Visual Attempts

- PR #10 attempted a direct target composition before the visual harness existed. The side-by-side showed the output did not match the locked target closely enough.

## Fallback Decisions

P1 intentionally uses placeholder water and sun only. No final water shader, caustics, volumetric beams, particles, or postprocessing polish are included.

## Performance Notes

P1 uses simple WebGL geometry and basic materials. It is intended as a composition lock, not a final rendering benchmark.

## Screenshot Artifacts

- Target: `docs/visual-targets/water-sky/target-reference-v1.png`
- Current P1: `docs/visual-targets/water-sky/p1-composition-current.png`
- P1 comparison: `docs/visual-targets/water-sky/p1-composition-comparison.png`

## P1 Result

P1 establishes the visual harness and target framing only:

- fixed low grass-level camera
- centered marble in lower foreground
- rough dense grass foreground silhouette
- rough ruin/rock silhouettes for scale
- placeholder water ceiling
- placeholder sun position

P1 intentionally does not include final water shader, caustics, volumetric beams, particles, or postprocessing polish.
