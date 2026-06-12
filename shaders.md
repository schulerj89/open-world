# Shader Approach

Aeolian Wilds runs through Three.js with a WebGPU-first renderer and a WebGL fallback. The current shader strategy uses Three's WebGPU-compatible material pipeline rather than raw GLSL `ShaderMaterial`.

## Why This Approach

Three's `WebGPURenderer` does not use the same raw GLSL shader path as `WebGLRenderer`. To keep the app stable on WebGPU, the world currently uses Three material classes that compile into renderer-native GPU shaders. This keeps the renderer portable while still moving terrain, foliage, water, and sky rendering onto the GPU.

Raw custom shaders should be added through Three's WebGPU node/TSL path when we need fully custom WGSL-style behavior. That keeps custom shader work compatible with the WebGPU backend instead of accidentally forcing a WebGL-only path.

The debug HUD follows the WebGPU access model documented by MDN: detect `navigator.gpu`, request an adapter, read supported features and limits, and record the preferred canvas format. Those values are shown during gameplay so shader/rendering issues can be compared against the actual browser GPU path instead of assuming every machine is on the same backend. Reference: https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API

## Active Shader Pipelines

### Starter Town, Character, And Enemy Surface Shaders

- Code: `src/render/TextureAssets.ts`, `src/world/StarterTown.ts`, `src/world/TownGroundAsset.ts`, `src/world/TownBuildingAsset.ts`, `src/world/TownNpcAsset.ts`, `src/world/CombatDebugRoom.ts`, `src/world/HumanoidModel.ts`, `src/world/CreatureModels.ts`, `src/world/ContactShadow.ts`, `src/core/AeolianWilds.ts`
- Material: `THREE.MeshStandardMaterial` and `THREE.MeshLambertMaterial`
- Inputs: higher-segment town prop geometry, procedural town textures, terrain-conforming ground patch geometry, debug-room floor/wall/pillar/dummy geometry, instanced pavers/trim/roof ridges/ground detail, procedural humanoid class meshes, procedural slime meshes, generated transforms, shared lighting, short-lived attack/hit transforms, town window glow transforms
- Purpose: renders the third-person MMORPG starter loop without adding heavy imported assets or unique material branches.

These props intentionally use the same renderer-generated shader path as the rest of the world. The goal for this pass is stable WebGPU/WebGL compatibility and 60 FPS while the gameplay loop takes shape.

The June 12 town polish pass keeps custom visual motion in object transforms instead of raw shader code: tutorial markers bob and rotate, window glows pulse through scale, NPCs idle through yaw/height offsets, and attack/hit feedback uses player/enemy transform pulses. This keeps the WebGPU path on Three's renderer-native material shaders while still giving visible motion.

The sharper town-detail pass adds generated `CanvasTexture` patterns for stone, road, wall, roof, and wood surfaces. These still flow through Three's material shader compilation path; they are not custom GLSL/WGSL shaders. Contact shadows use transparent `MeshBasicMaterial` circles as cheap blob shadows, intentionally avoiding renderer shadow maps. Terrain-conforming plaza and road patches are generated as custom `BufferGeometry` on the CPU, then rendered through the same Lambert material shader path.

`TownGroundAsset` owns the town's terrain-following stone, road, yard, and meadow patch geometry. It still renders through Lambert material shaders with shared procedural textures; the extraction changes asset ownership, not the shader path.

`TownBuildingAsset` uses the same renderer-native shader path for richer cottages: Lambert-lit wall, roof, stone, trim, wood, and window meshes plus basic-material glow panes. The extraction changes ownership and mesh detail, not the shader family.

`TownNpcAsset` uses `createHumanoidModel`, so townspeople share the same Lambert-lit procedural character shader path as the player preview, player avatar, and other humanoids. The extraction changes ownership and collision, not the material path.

`TownPlazaAsset` uses the same renderer-native shader path for the central paved disc, stone rings, statue base, cap, and marker crystal. The crystal animation is CPU transform motion on a Lambert-lit mesh; no raw GLSL/WGSL shader is introduced for this pass.

`CombatDebugRoom` uses the same renderer-native shader path: Lambert-lit floor, walls, pillars, spawn rings, and dummy geometry. The room is intentionally procedural and does not require web assets. Combat-room motion remains CPU transform animation for the player, slime, hit pulse, and selection ring; WebGPU data is used for diagnostics rather than direct WGSL/device-level control.

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

Instanced grass and tree meshes now disable frustum culling and recompute bounds after instance matrices are written. This is a conservative rendering choice for debugging partial trees near the camera.

### Sky Shader

- Code: `src/world/Sky.ts`
- Material: `THREE.MeshBasicMaterial`
- Purpose: renders the unlit sky dome and sun marker.

## Memory And Performance Notes

- World geometry is streamed by chunk rings in `WorldStreamer`.
- Near chunks carry higher geometry, grass, trees, and town/enemy detail.
- Far chunks use lower LOD terrain and avoid expensive foliage.
- The adaptive budget lowers horizon radius, density, and resolution scale when frame time rises.
- The debug HUD shows live chunks, queued chunks, LOD rings, memory estimate, and current horizon.
- The debug HUD also shows WebGPU adapter status, core/compatibility signal, preferred canvas format, max 2D texture dimension, adapter metadata when exposed, feature count, bind group limit, sampled texture limit, max buffer size, max storage-buffer binding size, and max vertex attributes.
- The combat debug room uses those same WebGPU HUD fields during QA: adapter ready/core/format, feature and limit readback, render estimates, and frame timing are captured while testing movement, collision, targeting, and strikes.

As of June 12, 2026, those fields follow the MDN WebGPU capability model: detect `navigator.gpu`, request an adapter, read features and limits, then show the actual browser path in debug.

## June 12, 2026 Shader/WebGPU Upgrade

- The world uses renderer-native material shaders instead of hand-written GLSL. Terrain, trees, grass, characters, enemies, and town props use Three material classes that compile through the active WebGPU/WebGL backend.
- Characters, NPCs, slimes, town stone, and town trim use `MeshLambertMaterial` after visible Chrome testing showed the heavier PBR path was unnecessary for the low-poly style. Lamp bulbs and the targeting ring use `MeshBasicMaterial`; terrain and foliage continue using `MeshLambertMaterial`; textured terrain still uses Lambert lighting plus vertex colors.
- Rivers were removed from terrain carving and chunk mesh generation. This frees per-chunk geometry and shader work for higher-poly land, town, characters, trees, and enemies.
- WebGPU MSAA stays disabled. A visible Chrome pass on the higher-poly build showed 4x MSAA pushed the frame well under the 60 FPS target, so resolution scale and adaptive budget remain the active quality controls.
- Default/Balanced resolution scale is currently `0.45`, High Quality is `0.72`, and adaptive resolution now floors at `0.32`. The town-detail checkpoint used `0.50`; the character-detail checkpoint lowered the default slightly to preserve render headroom with `4k-8k` triangle humanoids.
- The debug HUD estimates draw calls and triangles from visible scene geometry when WebGPU renderer counters are zero or cumulative.
- Tree crowns now sway through CPU-updated instanced matrices while trunks remain fixed to the terrain. This was chosen for immediate visual verification and browser compatibility.
- Attack, hit, quest-marker, NPC idle, and window-glow animation currently run as CPU-updated object transforms. They intentionally do not use raw GLSL so the project stays on the same WebGPU-compatible material path.
- Near-town rocks, shrubs, and flowers are now batched with `InstancedMesh`. They add visible ground detail without introducing new shader branches or a large draw-call increase.
- The next custom shader should be a Three TSL/node-material wind path for grass and tree crowns so the CPU-side matrix update can be replaced with GPU vertex displacement. Three's WebGPU renderer can target WebGPU first and fall back to WebGL2, so raw GLSL-only `ShaderMaterial` should remain avoided for this project.
