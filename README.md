# Aeolian Wilds

Version `1.0.0` is a clean rebuild of the old open-world repo into an endless procedural low-poly Three.js world.

## Run

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173`.

## Controls

- `WASD` or arrow keys: move
- `Shift`: run
- Drag mouse: rotate camera
- `M`: mute music

## Verification

```bash
npm run build
npm test
npm run test:smoke
npm run capture:screenshots
```

The in-game debug overlay exposes FPS, chunk queue pressure, renderer calls, triangle count, resource counts, heap usage when Chromium exposes it, player coordinates, biome, terrain height, and water-blocking counts.

## Music

Title music is `Happy Adventure (Loop)` by TinyWorlds from OpenGameArt, licensed CC0:
https://opengameart.org/content/happy-adventure-loop
