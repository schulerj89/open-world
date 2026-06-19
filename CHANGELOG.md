# Changelog

## 1.2.0 - 2026-06-19

### Minor

- Raised terrain density from 20 to 24 segments per chunk and increased procedural foliage/environment instance caps.
- Added deterministic clear, cloudy, rain, and snow weather with fog, sky, cloud, light, and precipitation updates.
- Improved water with a scrolling procedural normal map on the existing light-based `MeshPhongMaterial` sea plane.
- Added a three-step weather beacon objective loop with in-world markers, HUD direction/distance, and debug API support.
- Added v1.2.0 water/weather/objective decision documentation with open-source Three.js water research.
- Added v1.2.0 smoke coverage for denser terrain memory, weather particles, water stats, and objective progress.
- Expanded screenshot capture to include rain, snow, and objective beacon verification frames.

## 1.1.0 - 2026-06-18

### Minor

- Increased terrain mesh density while keeping the loaded chunk ring stable for performance.
- Added a deterministic instanced environment layer with stones, flowers, waystones, crystals, and ruin fragments.
- Added environment debug metrics for object counts, placement rebuild time, and instance-buffer memory.
- Swapped the title music to the CC0 RPG/fantasy track `The Field Of Dreams` by pauliuw.
- Added v1.1.0 decision docs for environment direction and rendering budget.
- Added versioned v1.1.0 screenshot artifact workflow with shoreline, forest, and rocky terrain captures.

### Patch

- Fixed third-person forward/backward movement direction.

## 1.0.0 - 2026-06-18

### Major

- Replaced the previous project with a clean Vite, TypeScript, and Three.js open-world implementation.
- Added endless chunked terrain generated from pure world-coordinate functions and streamed nearest-first inside a per-frame budget.
- Added layered procedural height fields: domain-warped fBm continents, gated ridged mountain ranges, dry-area billow dunes, detail octaves, and independent moisture.
- Added gradient-derived smooth normals sampled across chunk borders and per-vertex blended biome colors.
- Added a recentered sea-level water plane using `MeshPhongMaterial` specular glints instead of PBR metalness.
- Added procedural instanced tree and bush foliage clustered by forest-density noise.
- Added dithered gradient sky dome, far fog, sun sprite, warm directional light, hemisphere light, and drifting billboard clouds.
- Added a low-poly player with third-person camera, walking animation, and water-blocked movement.
- Added title screen with CC0 OpenGameArt music.

### Minor

- Added debug overlay and `window.__OPEN_WORLD_DEBUG__` smoke-test API.
- Added screenshot artifact workflow under `artifacts/screenshots/v1.0.0`.
- Added AGENTS.md with repo-specific agent operating rules.

### Patch

- Added unit coverage for deterministic world fields and border-normal consistency.
- Added Playwright smoke budget assertions for chunk streaming, render calls, triangles, resources, FPS, and heap when available.
