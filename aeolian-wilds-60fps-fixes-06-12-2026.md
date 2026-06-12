# Aeolian Wilds 60 FPS Fix Plan - 06/12/2026

## Goal

Maintain 60 FPS as closely as possible during movement, drag-look, and longer travel by reducing steady-state render cost and travel-time chunk/cache pressure.

## Plan

1. Reduce far-tree draw submissions.

   LOD 2 chunks should stop rendering full tree geometry. The current implementation can create five instanced tree meshes per far chunk for only a few trees. Keeping trees in near/mid chunks preserves the local forest while removing a large amount of distant draw overhead.

   Status: implemented. LOD 2 no longer builds tree meshes, and near/mid tree counts were reduced.

2. Throttle debug HUD DOM updates.

   Keep the HUD values useful, but stop rebuilding the whole debug panel every frame. Updating around 8-10 times per second is enough for debugging and avoids constant layout/style churn.

   Status: implemented. The HUD updates at 8 Hz instead of every render frame.

3. Make wind animation cheaper.

   Because grass materials are shared, update each shared grass material once per frame instead of walking all chunk wind targets and setting the same material colors repeatedly.

   Status: implemented. Shared grass materials are updated once per frame.

4. Add better render/cache telemetry.

   Keep the WebGPU rows, tree counts, grass counts, live chunks, queue, LOD rings, and memory estimate visible. These fields let us tell whether a performance drop is from GPU mode, draw volume, streaming backlog, or memory pressure.

   Status: implemented. The HUD now separates visible `Live` chunks from `Cached chunks`.

5. Retest with longer travel.

   Repeat the browser test after implementation:

   - sustained forward movement
   - drag-look while moving
   - longer travel than the baseline
   - wait for queue settle
   - capture min FPS, average FPS, frame time, live chunks, queue, tree counts, grass counts, and WebGPU debug state

   Status: completed against the production preview. The post-fix run traveled 140.7 world units, averaged 58.7 FPS, bottomed at 54 FPS, and recovered with queue `0`.

## Additional Implemented Fixes

- Chunk generation now backs off completely under heavy frame pressure once a minimum playable cache exists.
- Chunk selection no longer sorts the whole queue every frame; it selects the nearest job with a linear scan.
- Cached chunks are hidden unless they are inside the current render ring, so warm cache does not add draw cost.
- Shared grass/tree geometries are reused across chunks and skipped during per-chunk disposal.
- Terrain chunks cache height and river samples per build, reducing duplicate procedural noise calls.
- Terrain segment counts were reduced by LOD.
- Default and emergency resolution scales were lowered for better frame recovery.
- Adaptive render distance can drop to a smaller emergency horizon under pressure.

## WebGPU Follow-Up Options

The current pass stays inside Three's WebGPU renderer path. If the draw-count and DOM fixes are not enough, the next WebGPU-specific improvements should be:

- GPU-side wind animation using Three TSL/WebGPU node materials instead of CPU material updates.
- Coarser distant vegetation impostors so far chunks draw as one or two batches.
- Worker-based chunk generation so CPU terrain/nature construction does not block the render loop.
- More explicit feature/limit based quality presets using the adapter and limit data already captured in the HUD.

Reference: https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API
