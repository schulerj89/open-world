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
- `resolveCollision`, for callers that want the asset to test all owned colliders.

The active player collision pass still resolves town, streamed terrain, and enemy blockers explicitly in `AeolianWilds` so the debug HUD can report separate blocker counts.

## Follow-Up

Future assets should inherit from `WorldAsset` when they bundle meshes and blockers together. Enemy groups are the next likely candidate once enemies move beyond the starter slime actors.

