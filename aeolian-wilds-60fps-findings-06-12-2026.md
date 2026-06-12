# Aeolian Wilds 60 FPS Findings - 06/12/2026

## Baseline Test

Test target: `http://127.0.0.1:5188/`

Test path:

- Started gameplay from a clean browser tab.
- Repeated forward movement for sustained travel.
- Drag-looked while continuing forward movement.
- Continued traveling after drag-look to force chunk center changes.
- Captured HUD values for FPS, frame time, live chunks, queue, LOD rings, tree counts, grass counts, position, look, and WebGPU status.

Baseline result:

- Sample count: 25 HUD samples.
- Minimum FPS: 24.
- Average FPS: 27.6.
- Worst smoothed frame time: 42.0 ms.
- Approximate travel distance during the run: 69.9 world units.
- Console errors/warnings from the page: none.
- WebGPU path: adapter ready, core mode, `bgra8unorm`, 16384 px max 2D texture, NVIDIA/Ampere, 19 feature flags.

## What The Baseline Shows

The app was not mainly dropping frames because the chunk queue was overloaded. During the worst samples, `Queue` was usually `0`, `Live` was usually `37`, and `Horizon` was already adaptively clamped to `3 chunks`. FPS still stayed near 24-30.

That means the dominant cost is steady-state rendering and per-frame UI work after chunks are built, not only chunk generation while traveling.

## Primary Bottlenecks

1. Far tree draw-call cost is too high.

   `NatureFactory.buildTrees()` creates up to five instanced meshes per chunk: trunk, three conifer crown tiers, and broadleaf crown. Even LOD 2 chunks create tree meshes. With 28 far chunks, that can mean roughly 140 far-tree draw submissions for very small visual payoff.

2. HUD rebuilds its full DOM every frame.

   `Overlay.updateHud()` replaces `innerHTML` every animation frame. The HUD is useful, but rebuilding a large panel at 60 Hz adds layout/style work exactly when the renderer is trying to stay under 16.7 ms.

3. Wind animation loops over every chunk's grass target every frame.

   `WorldStreamer.animateWind()` walks chunk wind targets and repeatedly changes shared grass material colors. Since the materials are shared, this does redundant work.

4. Chunk work is synchronous.

   `WorldStreamer.processQueue()` builds chunks synchronously. This was not the main baseline issue when the queue was empty, but it can still create travel hitches when moving far enough to enqueue chunks.

## WebGPU Notes

MDN's WebGPU documentation describes the intended access path as `navigator.gpu`, `requestAdapter()`, `requestDevice()`, feature/limit checks, and the preferred canvas format. It also notes that WebGPU can make individual object rendering cheaper on the CPU side and can handle expensive work such as culling or transforms on the GPU.

For this app, the immediate low-risk step is to reduce CPU-side draw submissions and per-frame DOM work before introducing lower-level custom WebGPU pipelines. The HUD already captures the useful WebGPU facts for comparison between machines:

- support and adapter availability
- core versus compatibility signal
- preferred canvas format
- max 2D texture dimension
- adapter metadata when exposed
- feature count

Reference: https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API

## Fix Direction

The first fix pass should reduce steady-state draw and DOM overhead while keeping visual quality acceptable:

- Remove tree meshes from far LOD 2 chunks or replace them with a cheaper distant representation later.
- Throttle the HUD DOM update cadence.
- Make wind material updates constant-time per frame.
- Tighten adaptive defaults around draw count and render distance.
- Re-test by traveling farther than the baseline and verifying queue recovery plus FPS.

## Post-Fix Verification

Production preview target: `http://127.0.0.1:4188/`

The production build is the authoritative performance target. The Vite dev server includes HMR/debug overhead and, in browser automation, reported a misleading 20-30 FPS even after draw volume was reduced. The production preview showed the expected performance.

Post-fix movement test:

- Test path: forward movement, drag-look while moving, continued far travel, then queue settle.
- Travel distance: 140.7 world units.
- Minimum FPS: 54.
- Average FPS: 58.7.
- Worst sampled frame time: 17.9 ms.
- Final FPS after settle: 58.
- Queue after settle: 0.
- Console errors/warnings from the page: none.
- WebGPU path: adapter ready, core mode, `bgra8unorm`, 16384 px max 2D texture, NVIDIA/Ampere, 19 feature flags.

The post-fix run stayed close to 60 FPS during movement and drag-look. The lowest sampled value was 54 FPS during a drag-look segment, and the app recovered back to 58-60 FPS with the queue at 0.
