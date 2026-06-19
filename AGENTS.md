# AGENTS.md

This repo is a clean-start procedural Three.js open-world project. Keep edits scoped to the current feature and preserve `.git`.

## Runtime Priorities

- Endless world behavior comes from pure functions of world `x,z`; do not introduce saved terrain maps.
- Terrain chunks must be built nearest-first within the per-frame budget and distant chunks must be disposed.
- Normals must come from height-field gradients sampled in world coordinates, including border vertices.
- Foliage should stay instanced or pooled; avoid one Mesh per tree.
- Water must use a light-reactive non-PBR material such as `MeshPhongMaterial`.
- Keep the debug API and overlay current when adding systems.

## Budgets

- Target visible-browser FPS: 60.
- Hard smoke lower bound: 45 FPS in Chromium headless.
- Target JS heap: under 100 MB when `performance.memory` is available.
- Exploration render calls: under 145.
- Triangles: under 150k for the default camera and terrain radius.
- Textures: under 12 unless a feature bump explicitly justifies more.

## Required Checks

Run these before handing off meaningful changes:

```bash
npm run build
npm test
npm run test:smoke
```

For visual changes, also run:

```bash
npm run capture:screenshots
```

Store screenshots under `artifacts/screenshots/<version>/` and mention the names in the handoff.

## Versioning

- Use semver.
- Major: renderer/world architecture changes or new gameplay modes.
- Minor: additive systems such as new biomes, weather, AI, or traversal.
- Patch: bug fixes, tuning, tests, and polish.
- Update `CHANGELOG.md`, `src/version.ts`, and screenshot artifact folders together.

## Reusable Expert Roles

- Three.js open-world expert: focus on BufferGeometry, InstancedMesh, material choice, renderer instrumentation, and Vite integration.
- WebGL/WebGPU performance expert: focus on draw calls, disposal, GPU resource pressure, shader cost, and measurement limits.
