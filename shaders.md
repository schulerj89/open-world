# Shader Approach

Aeolian Wilds runs through Three.js with a WebGPU-first renderer and a WebGL fallback. The current shader strategy uses Three's WebGPU-compatible material pipeline rather than raw GLSL `ShaderMaterial`.

## Why This Approach

Three's `WebGPURenderer` does not use the same raw GLSL shader path as `WebGLRenderer`. To keep the app stable on WebGPU, the world currently uses Three material classes that compile into renderer-native GPU shaders. This keeps the renderer portable while still moving terrain, foliage, water, and sky rendering onto the GPU.

Raw custom shaders should be added through Three's WebGPU node/TSL path when we need fully custom WGSL-style behavior. That keeps custom shader work compatible with the WebGPU backend instead of accidentally forcing a WebGL-only path.

The debug HUD follows the WebGPU access model documented by MDN: detect `navigator.gpu`, request an adapter, read supported features and limits, and record the preferred canvas format. Those values are shown during gameplay so shader/rendering issues can be compared against the actual browser GPU path instead of assuming every machine is on the same backend. Reference: https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API

## Active Shader Pipelines

### Terrain Surface Shader

- Code: `src/world/TerrainChunk.ts`
- Material: `THREE.MeshLambertMaterial`
- Inputs: ambientCG grass and rock color textures, terrain vertex colors, generated UVs, computed normals
- Purpose: renders the streamed terrain chunks with texture detail and biome tinting.

The chunk builder chooses a grass or rock material based on slope and altitude. Vertex colors tint each chunk for snow, rock, banks, and lowland grass.

### Foliage Cutout Shader

- Code: `src/world/NatureFactory.ts`
- Material: `THREE.MeshLambertMaterial`
- Inputs: ambientCG foliage color and opacity maps, instanced transforms, alpha test
- Purpose: renders grass clumps as alpha-tested foliage cards without expensive transparency sorting.

The grass uses instanced crossed cards. Alpha testing gives a textured grass silhouette while staying much faster than blending thousands of transparent quads.

### Tree Shader

- Code: `src/world/NatureFactory.ts`
- Material: `THREE.MeshLambertMaterial`
- Inputs: instanced trunks, instanced conifer tiers, instanced broadleaf crowns, foliage texture tinting
- Purpose: renders more trees with few draw calls.

Trees are grouped by trunk/crown geometry into instanced meshes so the world can show denser forests without creating one mesh per tree.

The debug HUD reports trunk and crown-part totals. This is intentional: if tree instance buffers are miscounted, the first visible symptom is a trunk without matching crown geometry.

### River Water Shader

- Code: `src/world/TerrainChunk.ts`
- Material: `THREE.MeshLambertMaterial`
- Inputs: generated river mesh, transparent blue water material
- Purpose: renders water strips in chunks intersecting the procedural river corridor.

The river mesh is generated per chunk from the same height sampler that carves the terrain, so the water follows the memory-mapped world model.

### Sky Shader

- Code: `src/world/Sky.ts`
- Material: `THREE.MeshBasicMaterial`
- Purpose: renders the unlit sky dome and sun marker.

## Memory And Performance Notes

- World geometry is streamed by chunk rings in `WorldStreamer`.
- Near chunks carry higher geometry, grass, trees, and river detail.
- Far chunks use lower LOD terrain and avoid expensive foliage.
- The adaptive budget lowers horizon radius, density, and resolution scale when frame time rises.
- The debug HUD shows live chunks, queued chunks, LOD rings, memory estimate, and current horizon.
- The debug HUD also shows WebGPU adapter status, core/compatibility signal, preferred canvas format, max 2D texture dimension, adapter metadata when exposed, and feature count.

## Next Shader Upgrade

The next major shader step should be a Three TSL/WebGPU node material for grass wind and water shimmer. That would let us animate blade tips and river highlights directly in the vertex/fragment shader while keeping the WebGPU path intact.
