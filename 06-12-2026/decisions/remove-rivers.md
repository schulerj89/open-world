# Decision: Remove Rivers

## Decision

Remove rivers from the current terrain pass.

## Why

The user asked to remove rivers and spend the geometry/memory budget on higher-detail town, trees, mountains, characters, buildings, people, and enemies.

## Implementation

- `TerrainHeight.getHeight` now returns base terrain without river carving.
- `TerrainHeight.getMoisture` no longer boosts moisture near rivers.
- `TerrainChunk` no longer builds river water meshes.
- Existing `getRiverInfo` remains only as a compatibility shim with zero influence.
