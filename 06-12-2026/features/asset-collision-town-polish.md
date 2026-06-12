# Asset Collision And Town Polish

## What Changed

- Added `WorldAsset` as a shared base for scene-owned assets that need collision metadata.
- Migrated `StarterTown` to extend `WorldAsset`, keeping the old `town.group` access path as a compatibility alias.
- Expanded Briar Glen with a wider stone plaza, longer roads, more cottages, taller cottage geometry, extra NPCs, and more distant slime spawns.
- Added town detail props: crates, barrels, hay bales, flower clumps, cobblestones, glowing windows, extra fences, lamps, and a stronger tutorial quest marker.
- Added collision blockers for buildings, fences, NPCs, market stalls, training posts, crates, barrels, hay, slimes, trees, and selected props.

## Asset Approach

The project still uses procedural low-poly assets rather than imported web asset packs. That avoids licensing and bundle-size churn while the gameplay surface is changing quickly.

The town detail pass reuses small shared geometry/material patterns and keeps collision coarse:

- Buildings use one circle collider per cottage.
- Cottages are now `TownBuildingAsset` child assets instead of inline `StarterTown` mesh blocks.
- Walkable stone, road, training-yard, and meadow surfaces are now `TownGroundAsset` child assets instead of inline `StarterTown` meshes.
- The central plaza/statue is now a `TownPlazaAsset` child asset with its own statue collider.
- Fences use sampled circle colliders along the rail.
- Props that should block movement get a small circle collider.
- Decorative flowers and window glows are visual-only.
- Slimes now use `EnemyAsset` ownership: each enemy owns its combat state, mesh, spawn point, reset behavior, visual pulse, and circle collider.
- Townspeople now use `TownNpcAsset` ownership: each NPC owns its humanoid model, idle metadata, and circle collider.
- The combat debug room is a separate non-town `WorldAsset` collision sandbox with wall, pillar, dummy, and arena-enemy blockers.

## Debug Support

The debug HUD now separates blocker counts:

- Tree blockers from streamed terrain chunks.
- Town blockers from `StarterTown.getColliderCount()`, including child building assets.
- Room blockers from the combat debug room.
- Enemy blockers from live enemy actors.

The `0 Collide` quick tool now targets the current expanded cottage collider, and collision hit display holds long enough to be captured in browser QA. Town blocker owner labels now identify specific collision sources such as cottages, the tutorial guide NPC, market stalls, the plaza statue, crates, barrels, hay bales, lamp posts, and fence runs.

## Building Asset Extraction

The cottage mesh/collider path was moved into `TownBuildingAsset extends WorldAsset`.

- Each cottage owns its own coarse circle collider and reports its cottage name in `Last hit`.
- `StarterTown` registers cottages as child assets, and `WorldAsset` resolves child collisions recursively.
- Cottage visuals now include a stone foundation, lower and upper wall volumes, taller roof, chimney, door lintel, more windows, sills, wood beams, roof ribs, balcony posts/rail, and a contact shadow.
- Materials are still shared from `StarterTown` so the extraction does not create unique texture resources per building.
- This improves the town's visual structure and moves buildings into the same inherited asset/collision pattern as enemies and the debug room.

## NPC Asset Extraction

The townsperson mesh/collider path was moved into `TownNpcAsset extends WorldAsset`.

- Each NPC is registered as a `StarterTown` child asset.
- Each NPC owns one circle collider and keeps its owner label for debug hits.
- The guide NPC still reports `tutorial-guide-npc`, preserving the tutorial collision/debug identity.
- Idle bob/turn moved onto the asset itself through `TownNpcAsset.update`, so NPC animation is no longer coupled to the core app's scene traversal.
- Building window glow animation also moved onto `TownBuildingAsset.update`; `StarterTown.update` now recursively updates child assets and only owns the quest marker bob/rotation.

## Ground Asset Extraction

The terrain-following town patch path was moved into `TownGroundAsset extends WorldAsset`.

- Stone center, road strips, training-yard ground, and meadow ground are registered as child assets.
- Each ground asset builds a segmented terrain-following `BufferGeometry` by sampling the shared height field per vertex.
- Ground assets intentionally own no colliders; buildings, props, NPCs, enemies, fences, and trees remain the blocking systems.
- Cobblestones, road-edge stones, shrubs, flowers, and rocks stay in the existing instanced batches to preserve draw-call efficiency.

## Plaza Asset Extraction

The central plaza/statue path was moved into `TownPlazaAsset extends WorldAsset`.

- The plaza asset is registered as a `StarterTown` child asset.
- It owns the paved disc, stone rings, statue base, cap, animated crystal, and contact shadow.
- It owns one coarse prop collider and preserves the debug label `plaza-statue-base`.
- The plaza floor remains decorative and walkable; collision is limited to the statue base so movement around the town center stays predictable.

## Second Detail Pass

The next pass improved visible density without multiplying mesh submissions:

- Town roads, plaza stone, cottage walls, roof tiles, and wood trim now use generated procedural town textures instead of flat colors or the dark generic rock texture.
- Cobblestones, road-edge stones, cottage beams, and roof ridges are batched into a few `InstancedMesh` groups.
- The plaza paver count increased substantially while draw calls stayed controlled.
- Cottages gained beam/trim silhouettes and roof ridge detail.
- Characters, slimes, cottages, stalls, crates, barrels, and hay bales gained cheap contact shadows.
- The collision debug warp now faces away from the cottage blocker so the camera does not clip under the roof during QA.

This keeps the current procedural asset strategy but moves the town closer to a more authored look: patterned surfaces, layered trim, grounded props, and higher local detail density.

## Terrain-Conforming Ground Detail Pass

The latest pass focuses on the ground issue seen in browser QA:

- Plaza and road patches now generate terrain-following `BufferGeometry` by sampling `StarterTown.getHeight` per vertex instead of floating as flat planes.
- Near-town rocks, shrubs, and flower clumps are batched into three solid `InstancedMesh` groups so there is more visible ground detail without relying on alpha grass cards.
- The extra ground clutter is decorative only; collision remains on buildings, fences, NPCs, props, trees, and live enemies to keep movement predictable.
- Default and Balanced resolution scale were settled at `0.50` for this town-detail checkpoint after visible Chrome testing, preserving a sharper image than the earlier `0.42` default while keeping the latest town detail pass at 60 FPS after warmup. A later character-detail checkpoint lowered the current default to `0.45` to preserve render headroom with higher-poly humanoids.
