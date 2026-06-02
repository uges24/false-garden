# False Garden Build Instructions

This project is a creative interactive 3D web experience called **False Garden**.

The goal is not a normal website. It is a mysterious living world:

- endless-feeling grass terrain
- tiny human scale
- magical sun as world-state controller
- hidden portal marbles
- rare surprise snake movement
- cosmic atmosphere and energy waves

Use **React + TypeScript + Vite + React Three Fiber + Drei + Three.js**.

## Core art direction

Do not copy False Earth visually.
Borrow only the structural ideas:

- large grass field
- tiny human scale
- cinematic camera
- reactive environment
- cosmic beams
- living world events

Our identity:

- emerald / teal grass
- gold sun
- violet / cyan energy
- iridescent marbles
- deep navy shadows
- mysterious false-garden mood

The world should feel like:

> An endless false garden where the sun controls the mood, hidden marbles open ideas, and a rare snake moves beneath the living grass.

## Important product idea

The marbles are not decoration. They are the main interaction/navigation layer.

Each marble represents an idea/project/section. The user should discover marbles naturally in the world, not through a normal website navbar.

Marble interaction states:

1. Sleeping marble: half-hidden in grass, subtle glow.
2. Calling marble: pulses when the user comes near.
3. Hover marble: grows, glows, floating label appears.
4. Clicked marble: expands, color-shifts, portal ring spreads.
5. Portal marble: opens a minimal overlay card with title, short description, and button.

Initial marble types:

- Dream Marble — experiments / art projects
- System Marble — UX/product case studies
- AI Marble — AI tools/workflows/builds
- Archive Marble — old work, brand, graphics, research
- Contact Marble — contact / signal
- Hidden Marble — secret/night-only object, can be added later

## Sun mechanic

Keep the sun. Do not use weather data.

The sun is a powerful world-state controller.
Clicking the sun should cycle through:

- Golden Day
- Blood Sunset
- Deep Night
- Eclipse

Each mode should alter:

- sun color/shape
- lighting intensity
- fog color
- background color
- grass tint
- marble glow
- snake visibility
- energy beam intensity

## Snake mechanic

The snake is a surprise creature, not a main enemy.

It should:

- be partially hidden by grass
- appear as a moving trail first
- reveal a glowing spine/body briefly
- become more visible in night/eclipse mode
- sometimes circle marbles or chase glowing pebbles in later phases

Avoid making it look like a normal game monster.
It should feel strange, rare, and alive.

## Code architecture

Use modular components:

- App
- Scene / Experience
- Terrain
- GrassField
- Player
- SunController
- MarbleSystem
- PortalMarble
- SnakeSystem
- EnergyBeams
- HUD
- worldStore

Prefer simple working systems first over over-engineered incomplete systems.

## Performance guidance

- Use instancing where possible.
- Avoid huge geometry counts without optimization.
- Add a performance mode toggle.
- The app must compile and run.
- WebGL/R3F first. Do not attempt full WebGPU in Phase 1.
- WebGPU-style grass optimization can come later after the visual direction works.

## Visual quality bar

The app should not feel like a generic landing page.
Avoid:

- big navbars
- card-heavy SaaS UI
- generic gradients
- normal dashboard layout
- default demo scene feel

Prefer:

- cinematic low camera
- fog and depth
- glowing atmospheric effects
- world-scale composition
- premium minimal HUD
- discovery-based interaction

## Required commands

After changes, run:

```bash
npm install
npm run build
```

Fix TypeScript/build errors before finishing.

## Build philosophy

Build in phases:

1. Working world foundation.
2. Better grass density and cinematic scale.
3. Strong marble portal interactions.
4. Rare snake surprise behavior.
5. Energy beams and ring ripples.
6. Shader/postprocessing polish.
7. Optional WebGPU-like optimization later.

Do not clone external repos directly into this project. Recreate the ideas cleanly and coherently in this codebase.