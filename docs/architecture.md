# Architecture

## Terrain

`TerrainSystem` streams a circular footprint of chunks around the player. Required chunks are sorted by distance to the player and generated until the frame budget is exhausted. Chunk meshes are disposed when they leave the keep radius.

The height field is deterministic from world coordinates:

- Domain-warped fBm for continents and ocean basins
- Low-frequency masks for mountain ranges
- Ridged multifractal peaks gated by continent and range masks
- Billow dune layers in dry mid-elevation terrain
- Independent low-frequency moisture for biome wetness
- Detail octaves for small surface variation

Vertex normals use neighbor height samples in world coordinates, so duplicated border vertices on adjacent chunks receive matching normals.

## Biomes

Biome colors are blended per vertex from elevation and moisture:

- Deep water to shallow water
- Wide shallow-water to sandy-shore band
- Dry sand to wet grass
- Moist forest tint
- High rock
- Snow caps

## Runtime Systems

- `FoliageSystem`: deterministic clustered tree and bush placements rendered through `InstancedMesh`.
- `EnvironmentSystem`: deterministic instanced rocks, flowers, waystones, crystals, and ruin fragments for biome-scale exploration hooks.
- `SettlementSystem`: deterministic procedural hamlets, low-poly building modules, local repair contracts, collectible resource nodes, and completed-town repair markers.
- `WaterSystem`: recentered sea-level `MeshPhongMaterial` plane sized under the loaded terrain footprint, with a scrolling procedural normal map for light-based shimmer.
- `WeatherSystem`: deterministic clear/cloudy/rain/snow selection from world coordinates, with camera-relative rain lines and snow points plus weather-driven fog and lighting.
- `ObjectiveSystem`: three deterministic weather beacons placed on playable terrain around the start area.
- `SkySystem`: dithered gradient dome with fog-matched horizon haze, sun sprite, directional light, hemisphere light, and low ambient.
- `CloudSystem`: camera-facing billboard puffs recentered around the player with per-session variation.
- `PlayerController`: low-poly character movement, animation, terrain following, and water rejection.

## Instrumentation

`window.__OPEN_WORLD_DEBUG__.getSnapshot()` returns FPS, frame time, chunk counts, foliage counts, environmental detail counts, settlement and contract stats, water stats, weather state, objective state, renderer calls, triangles, render scale, geometry/texture counts, heap usage when available, player position, biome, terrain height, and sea level.
It also reports per-frame chunk build time and an app-owned terrain geometry byte estimate because `renderer.info` is useful trend data, not a complete memory report.
