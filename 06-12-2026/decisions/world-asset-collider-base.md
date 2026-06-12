# Decision: WorldAsset Collider Base

## Decision

Use `WorldAsset` as the shared base for world objects that own their own collision list.

## Reasoning

The town was the first asset group with many blockers, but the same pattern will apply to buildings, NPC clusters, enemy camps, and future object sets. Keeping colliders with the asset that creates the meshes makes debugging easier and keeps object ownership clear.

## Current Shape

`WorldAsset` extends `THREE.Group` and owns:

- `assetKind`, for broad categorization.
- `colliders`, as a list of circle blockers.
- `addCircleCollider`, for asset construction.
- `resolveCollision`, for callers that only need a hit count.
- `resolveCollisionDetailed`, for callers that need the most recent collider source and push metadata.

The active player collision pass still resolves town, streamed terrain, and enemy blockers explicitly in `AeolianWilds` so the debug HUD can report separate blocker counts.

## Follow-Up

Future assets should inherit from `WorldAsset` when they bundle meshes and blockers together.

Enemies now use `EnemyAsset extends WorldAsset`. The enemy asset owns the combat state, slime mesh, spawn point, circle collider, reset behavior, terrain sync, health scaling, and bounce/hit-pulse visual update. Its collider stays at the logical spawn point while short hit recoil is visual-only, which keeps collision stable during squash/stretch feedback.

`CombatDebugRoom` also extends `WorldAsset`. It owns sampled wall colliders, pillar colliders, and a dummy prop collider so isolated collision tests can run outside the town.

The player collision pass now uses the detailed resolver for streamed tree chunks, `StarterTown`, `CombatDebugRoom`, and live `EnemyAsset` instances. This keeps debug output consistent while preserving separate tree/town/enemy blocker counts in the HUD.

## June 12 Diagnostic Tightening

Town colliders now carry object-level owner labels instead of reporting only `starter-town`. High-value blockers identify as cottages, market stalls, training posts, crates, barrels, hay bales, lamp posts, fences, the plaza statue base, town NPCs, or the tutorial guide NPC. The debug HUD also reports combat-room blockers separately from town blockers, so browser QA can tell whether a collision came from streamed trees, Briar Glen, the arena room, or live enemies.
