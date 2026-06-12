# Music And Assets

## Current App Audio

The app currently uses self-contained procedural audio so the prototype can run without downloading bundled music files.

`src/audio/AmbientSound.ts` now has a two-track procedural playlist:

- Town Green Procedural
- Meadow Hunt Procedural

When one phrase ends, the next starts. The HUD combat log includes the current track name.

## Royalty-Free Music Candidates

Recommended zero-attribution prototype path:

- `Loop_The_Bards_Tale.wav` from OpenGameArt, Medieval: The Bard's Tale by RandomMind.
- `Forest_Ambience.mp3` from OpenGameArt, Forest Ambience by TinyWorlds.

Both OpenGameArt pages list CC0 licenses. CC0 avoids attribution requirements for prototype and commercial use.

Optional higher-attribution path:

- Chris "Torone" CB, Music loops pack 1 - Dark Fantasy on itch.io.
- License: CC BY 4.0, which permits commercial use but requires attribution, source/license link, and change notices.

## Terrain Concept

Generated concept map:

`public/assets/concepts/starter-town-terrain-06-12-2026.png`

The concept shows the target starter-zone direction: small town, road to meadow enemies, dense grass, tree clusters, river bends, and hills.

## Web Assets

No extra web assets are required to solve the current grass/detail issue. The app already uses local CC0 ambientCG texture files in `public/assets/textures`. More detail should come from better placement, LOD, grass density, town props, and later authored models before adding random web assets.
