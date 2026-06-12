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
- Fences use sampled circle colliders along the rail.
- Props that should block movement get a small circle collider.
- Decorative flowers and window glows are visual-only.
- Slimes continue to use enemy circle colliders in the core collision pass.

## Debug Support

The debug HUD now separates blocker counts:

- Tree blockers from streamed terrain chunks.
- Town blockers from `StarterTown.colliders`.
- Enemy blockers from live enemy actors.

The `0 Collide` quick tool now targets the current expanded cottage collider, and collision hit display holds long enough to be captured in browser QA.

