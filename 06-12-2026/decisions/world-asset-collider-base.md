# Decision: WorldAsset Collider Base

## Decision

Use `WorldAsset` as the shared base for world objects that own their own collision list.

## Reasoning

The town was the first asset group with many blockers, but the same pattern will apply to buildings, NPC clusters, enemy camps, and future object sets. Keeping colliders with the asset that creates the meshes makes debugging easier and keeps object ownership clear.

## Current Shape

`WorldAsset` extends `THREE.Group` and owns:

- `assetKind`, for broad categorization.
- `colliders`, as a list of circle blockers.
- `childAssets`, as nested `WorldAsset` children whose colliders should resolve with the parent.
- `addCircleCollider`, for asset construction.
- `addChildAsset`, for parent assets such as towns that own building or prop assets.
- `getColliderCount`, for recursive debug counts.
- `update`, for per-frame child asset behavior.
- `resolveCollision`, for callers that only need a hit count.
- `resolveCollisionDetailed`, for callers that need the most recent collider source and push metadata. This resolves the asset's own colliders and any registered child assets.

The active player collision pass still resolves town, streamed terrain, and enemy blockers explicitly in `AeolianWilds` so the debug HUD can report separate blocker counts.

## Follow-Up

Future assets should inherit from `WorldAsset` when they bundle meshes and blockers together.

Enemies now use `EnemyAsset extends WorldAsset`. The enemy asset owns the combat state, slime mesh, spawn point, circle collider, reset behavior, terrain sync, health scaling, and bounce/hit-pulse visual update. Its collider stays at the logical spawn point while short hit recoil is visual-only, which keeps collision stable during squash/stretch feedback.

`CombatDebugRoom` also extends `WorldAsset`. It owns sampled wall colliders, pillar colliders, and a dummy prop collider so isolated collision tests can run outside the town.

The player collision pass now uses the detailed resolver for streamed tree chunks, `StarterTown`, `CombatDebugRoom`, and live `EnemyAsset` instances. This keeps debug output consistent while preserving separate tree/town/enemy blocker counts in the HUD.

## June 12 Diagnostic Tightening

Town colliders now carry object-level owner labels instead of reporting only `starter-town`. High-value blockers identify as cottages, market stalls, training posts, crates, barrels, hay bales, lamp posts, fences, the plaza statue base, town NPCs, or the tutorial guide NPC. The debug HUD also reports combat-room blockers separately from town blockers, so browser QA can tell whether a collision came from streamed trees, Briar Glen, the arena room, or live enemies.

## June 12 Building Asset Extraction

`TownBuildingAsset` now represents each cottage as a `WorldAsset` child of `StarterTown`. The town registers each cottage with `addChildAsset`, and recursive collision resolution keeps the building collider active without flattening it into `StarterTown.colliders`. The HUD uses `getColliderCount()` so extracted child assets remain visible in town blocker counts.

The building asset owns its foundation, lower and upper wall volumes, roof, chimney, door, windows, trim, balcony, contact shadow, and one coarse building circle collider. This makes buildings follow the same inheritance/collision pattern as enemies and the debug room while keeping collision simple.

## June 12 NPC Asset Extraction

`TownNpcAsset` now represents each townsperson as a `WorldAsset` child of `StarterTown`. Each NPC owns its humanoid model, idle animation, and one circle collider. The tutorial guide keeps the owner label `tutorial-guide-npc`, while other townspeople report labels such as `town-npc-2`.

This moves people into the same inherited asset/collision path as buildings, enemies, and the debug room. Recursive collision resolution and `getColliderCount()` keep NPC blockers active and visible after extraction.

The town no longer scans every object for `idleNpc` and `windowGlow` flags from the core app loop. `AeolianWilds` calls `StarterTown.update(elapsed)`, then the town updates child assets recursively. `TownNpcAsset` owns NPC idle bob/turn behavior, `TownBuildingAsset` owns window glow animation, and `StarterTown` keeps the quest marker bob/rotation.

## June 12 Ground Asset Extraction

`TownGroundAsset` now represents walkable town ground surfaces such as the stone town center, roads, training yard, and meadow ground. These assets are `WorldAsset` children with zero blockers because they are visual walking surfaces, not collision obstacles.

The ground asset owns the terrain-following segmented `BufferGeometry`, samples the shared `HeightSampler`, and keeps the previous road/stone materials. This moves ground/flooring into the inherited asset tree without changing collision semantics or adding per-stone draw calls.

## June 12 Plaza Asset Extraction

`TownPlazaAsset` now represents the central Briar Glen plaza/statue as a `WorldAsset` child of `StarterTown`. It owns the paved disc, stone rings, statue base, statue cap, animated crystal, contact shadow, and one coarse prop collider.

The collider owner label stays `plaza-statue-base`, so existing browser QA and HUD checks still report `prop / plaza-statue-base`. The surrounding plaza floor remains walkable visual geometry; only the statue base blocks movement.

## June 12 Market Asset Extraction

`TownMarketAsset` now represents the Briar Glen market stalls as a `WorldAsset` child of `StarterTown`. It owns the three stall meshes, awnings, counters, awning posts, produce props, hanging lanterns, contact shadows, and three coarse prop colliders.

The collider owner labels stay `market-stall-1`, `market-stall-2`, and `market-stall-3`, so the HUD can still distinguish market blockers after the colliders moved out of `StarterTown.colliders` and into the child asset tree.

## June 12 Fence Asset Extraction

`TownFenceLineAsset` now represents each Briar Glen fence run as a `WorldAsset` child of `StarterTown`. Each asset owns its rail mesh, repeated post detail, and sampled fence colliders.

The collider owner labels keep the old endpoint format, such as `fence-48--34-86--34`, and the sampling rule remains unchanged. This preserves recursive collision behavior and the expected town blocker count while moving another large static blocker group out of the town class.
