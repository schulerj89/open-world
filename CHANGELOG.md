# Changelog

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
