# Aeolian Wilds

Version `1.2.0` is an endless procedural low-poly Three.js world with denser terrain, weather, improved Phong water shimmer, a three-beacon objective loop, RPG music, and third-person exploration.

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

The in-game debug overlay exposes FPS, chunk queue pressure, renderer calls, triangle count, render scale, resource counts, heap usage when Chromium exposes it, terrain/environment/water memory estimates, current weather, objective progress, player coordinates, biome, terrain height, and water-blocking counts.

Versioned screenshots are written under `artifacts/screenshots/v1.2.0`.

## Music

Title music is `The Field Of Dreams` by pauliuw from OpenGameArt, licensed CC0:
https://opengameart.org/content/the-field-of-dreams
