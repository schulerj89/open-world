# Performance, Debugging, And Movement Testing

## Performance Settings

The settings menu now uses two dropdowns instead of raw sliders:

- Quality preset: Performance, Balanced, High Quality.
- Memory cap: 360 MB, 520 MB, 680 MB, 840 MB.

The preset expands to CPU stream budget, render distance, grass density, tree density, and resolution scale through `src/game/PerformancePresets.ts`.

## Debug HUD

The debug HUD is hidden by default and toggled with `T`.

It reports:

- FPS and frame time.
- Live chunks, queued chunks, cached chunks, cache memory used versus cap.
- LOD rings and horizon radius.
- Player X/Y/Z coordinates.
- Yaw and pitch.
- Speed, grounded state, pointer mode.
- Tree trunk and crown-part counts.
- Grass card count.
- WebGPU support, adapter availability, core/compat signal, preferred canvas format, feature count, and adapter limits.

## Tree Rendering Debug

Instanced grass and tree meshes now disable frustum culling and recompute instance bounds after writing matrices. This avoids close-range partial tree rendering where crowns or trunks can disappear due stale instanced bounds.

Tree counts are intentionally visible in debug because trunk/crown mismatches are the first signal that a render path or instance count is wrong.

## Verification

Automated browser checks were run against production preview on `127.0.0.1:4190`.

- Movement changed X/Z by 45.30 units.
- Keyboard look changed yaw by 68.80 degrees and pitch by 32.20 degrees.
- Drag look changed yaw by 79.30 degrees.
- Jump raised Y from 7.70 to 8.80.
- Tab selected a meadow slime.
- Hotbar slot 1 and slot 2 responded.
- A fresh combat run defeated a slime and awarded 6 gold.
- Production preview reported 60 FPS and 16.7 ms frame time after warmup and movement.

Console notes from headless Chromium showed WebGPU adapter unavailable, so it used the WebGL fallback. The debug HUD still reported WebGPU feature detection and limits as intended.

## Visible Chrome Audit

After the first automation pass, the same gameplay path was also verified in the visible Chrome browser on `127.0.0.1:4191`.

- Settings dropdowns changed to Performance preset and 520 MB memory cap.
- Character builder created `Browser Hero`, class `Wayfarer`.
- Debug HUD was toggled with `T`.
- Movement used live X/Y/Z debug coordinates to reach two slime spawns.
- Slot 1 defeated Meadow Slime 1 and Meadow Slime 2.
- Final HUD showed `12g`, `2 / 2 slimes defeated`, and `Tutorial complete`.
- Slot labels `1 Strike` and `2 Mend` remained visible.
- Debug HUD reported 60 FPS and 16.7 ms frame time.
- Chrome WebGPU debug reported adapter ready, core mode, `bgra8unorm`, and `16384px texture`.
- The Chrome tab was left open for user inspection.
