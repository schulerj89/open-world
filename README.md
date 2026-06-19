# Aeolian Wilds

Version `1.3.0` is an endless procedural low-poly Three.js world with procedural hamlets, settlement repair contracts, denser terrain, weather, improved Phong water shimmer, upbeat chiptune music, and third-person exploration.

## Run

```bash
npm install
npm run dev
```

Open the URL Vite prints. The local verification port for this repo is `http://127.0.0.1:5176`.

## Controls

- `WASD` or arrow keys: move
- `Shift`: run
- Drag mouse: rotate camera
- `M`: mute music
- `C`: cycle weather override

## Verification

```bash
npm run build
npm test
npm run test:smoke
npm run capture:screenshots
```

The in-game debug overlay exposes FPS, chunk queue pressure, renderer calls, triangle count, render scale, resource counts, heap usage when Chromium exposes it, terrain/environment/water/settlement memory estimates, current weather, settlement contract progress, objective progress, player coordinates, biome, terrain height, and water-blocking counts.

Versioned screenshots are written under `artifacts/screenshots/v1.3.0`.

## Music

Title music is `Happy Adventure (Loop)` by TinyWorlds from OpenGameArt, licensed CC0:
https://opengameart.org/content/happy-adventure-loop
