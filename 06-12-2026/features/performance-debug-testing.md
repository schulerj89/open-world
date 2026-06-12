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
- Recent collision hits and visible tree blocker count.
- Grass card count.
- WebGPU support, adapter availability, core/compat signal, preferred canvas format, feature count, and adapter limits.
- Render calls, rendered triangles, geometry count, and texture count.
- The WebGPU path can expose cumulative or zeroed renderer counters depending on backend behavior, so the HUD falls back to visible-scene estimates for draw calls and triangles when native counters are misleading.
- RAF interval, renderer submit time, simulation time, streaming time, HUD update time, and page visibility.

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

## Third-Person Visible Audit

The third-person/higher-detail pass was tested only through visible Chrome, with the final production preview on `127.0.0.1:4198`.

- WebGPU renderer initialized and debug reported adapter ready, core mode, `bgra8unorm`, `16384px texture`, Nvidia/Ampere adapter metadata, 19 features, bind-group and buffer limits.
- Render debug used estimated scene values where WebGPU counters were cumulative or zero. Final town view showed about `48-62 calls` and `31k estimated tris`.
- WASD movement changed X/Z coordinates in the debug HUD.
- Keyboard look changed yaw and pitch in the debug HUD.
- Jump is now edge-triggered on `Space` and `J`; final visible screenshot showed Y at `9.1`, speed `5.8`, and grounded `no`.
- `8 Slimes`, `Tab`, and repeated `1` strikes defeated a slime and awarded `6g`.
- `9 Equip` swapped outfit colors/gear.
- `0 Collide` placed the player against a cottage blocker; debug showed `Collision 1 hits / 74 tree blockers` and the resolver pushed the player to the edge of the blocker.
- `M`/Menu returned to the title screen.

The first third-person visible Chrome session reported about `21-24 FPS` even after the adaptive budget collapsed to a small horizon and render calls dropped near `50`. A WebGL override (`?renderer=webgl`) showed the same range, so additional debug timing was added instead of treating the single FPS number as enough evidence.

## Animation And Compositor Follow-Up

A later visible Chrome run on `127.0.0.1:4200` removed gameplay `backdrop-filter` blur from the HUD/buttons and added timing rows to separate browser RAF cadence from app work.

- Final HUD reported `60 FPS` and `16.7 ms` frame time.
- Timing showed RAF around `16.6 ms`, render submit around `1.4-1.9 ms`, sim around `0.0-0.2 ms`, stream around `0.0-0.2 ms`, HUD around `0.0 ms`, and page visibility `visible`.
- Debug reported WebGPU adapter ready, core mode, `bgra8unorm`, Nvidia/Ampere metadata, and `16384px texture`.
- Town view reported about `418 calls / 65,690 estimated tris` while holding 60 FPS.
- Static-camera screenshot comparisons proved ambient animation while holding 60 FPS:
  - Town/tree/NPC view changed by `135,660` PNG bytes over 1.8 seconds.
  - Slime view changed by `147,211` PNG bytes over 1.2 seconds.
- Collision verification on `127.0.0.1:4202` held `60 FPS` while resolving the cottage collision probe.

## Asset, Collision, And Combat Visible Audit

A later visible Chrome pass tested production preview on `127.0.0.1:4203`.

- Title screen showed the live 3D character preview and the character controls updated the preview model before entering the world.
- Gameplay launched with WebGPU renderer, adapter ready, core mode, `bgra8unorm`, Nvidia/Ampere metadata, and `16384px texture`.
- The debug HUD reported separate blocker counts: `72 tree / 81 town / 3 enemy blockers` near the final collision probe.
- Movement changed X/Z from `-8.0 / 10.0` to `2.7 / -9.8`.
- Keyboard look changed yaw/pitch from `-31.5 / 16.0` to `-132.2 / -11.5`.
- Jump raised Y from `9.0` to `10.0`, changed grounded to `no`, then returned to grounded.
- Slime warp, target, and strike were verified. Strike reduced Meadow Slime 1 from `52 / 52` to `22 / 52`.
- Attack animation evidence was captured by screenshot byte delta of `157,908` changed bytes immediately after a strike.
- Ambient/world animation evidence was captured by screenshot byte delta of `156,800` changed bytes over 1.2 seconds on the slime view.
- Defeating Meadow Slime 1 awarded `6g` and reduced live enemy blockers from `3` to `2`.
- `6 Reset` restored the quest to `0 / 2`, cleared the target, and restored live enemy blockers to `3`.
- `0 Collide` placed the player against the expanded cottage blocker; final HUD showed `Collision 1 hits / 72 tree / 81 town / 3 enemy blockers`.
- Final collision probe held `60 FPS`, `16.7 ms` frame time, and about `368 calls / 85,224 estimated tris`.

## Sharper Town Detail Visible Audit

A follow-up visible Chrome pass tested production preview on `127.0.0.1:4204`.

- Default and Balanced resolution scale increased from `0.42` to `0.56`; High Quality increased to `0.72`; adaptive resolution now bottoms at `0.32` instead of `0.1`.
- Title canvas rendered at about `1359x796` to `1464x857` depending on window size, up from the prior visibly softer default.
- Procedural town textures replaced the dark rock-map reuse on road/stone/roof/wall materials.
- Instanced pavers, road-edge stones, cottage beams, and roof ridges raised visible town detail while preserving batching.
- Contact shadows were added under major characters, enemies, buildings, and props without enabling real shadow maps.
- Town view held `60 FPS` and `16.7 ms` at about `520 calls / 89,196 estimated tris`.
- Collision probe held `60 FPS`, showed `Collision 1 hits / 72 tree / 81 town / 3 enemy blockers`, and rendered from a corrected camera-facing yaw with about `408 calls / 91,772 estimated tris`.
- Movement/look/jump, slime strike, `6 Reset`, and `0 Collide` were smoke-tested in Chrome after the visual pass.

## Terrain Ground Detail Visible Audit

A follow-up visible Chrome pass tested production preview on `127.0.0.1:4205`.

- Plaza and road patch geometry now conforms to terrain height instead of moving as flat planes away from the ground.
- Near-town rocks, shrubs, and flower clumps render as batched solid ground detail around Briar Glen.
- Balanced/default resolution scale was settled at `0.50` after an intermediate `0.52` test with the added ground detail. The first warmup sample still dipped while chunk work was queued, then settled at 60 FPS once streaming completed.
- Final town baseline held `60 FPS`, `16.7 ms` frame time, `177` live chunks, queue `0`, and about `828 calls / 106,824 estimated tris`.
- Combat smoke test via `8 Slimes`, `Tab`, and `1 Strike` held `60 FPS`, reduced Meadow Slime 1 to `28 / 52 HP`, and reported about `1020 calls / 107,336 estimated tris`.
- `6 Reset` restored the quest to `0 / 2`, cleared the target, restored enemy blockers, and held `60 FPS`.
- `0 Collide` showed `Collision 1 hits / 72 tree / 81 town / 3 enemy blockers`, player position `X -23.1 / Y 9.0 / Z -16.0`, yaw `90.0`, and held `60 FPS` at about `1132 calls / 106,824 estimated tris`.
- WebGPU debug reported adapter ready, core mode, `bgra8unorm`, and `16384px texture`; timing showed RAF near `16.4-16.7 ms` and render submit around `2.0-3.7 ms`.

## Character Detail And Audio Visible Audit

A follow-up visible Chrome pass tested production preview on `127.0.0.1:4206`.

- Character creation now shows the face side of the live preview model after a preview-only orientation fix.
- The richer procedural humanoid model includes face, hair, gear layers, class equipment, named right arm, and named weapon parts.
- Measured character variants are in the new `4k-8k` target band, with current variants around `5.9k-6.8k` triangles.
- Hotbar buttons are now clickable; `1 Strike` through the hotbar reduced Meadow Slime 1 from `52 / 52` to `28 / 52 HP`.
- Audio debug reported `running`, the current procedural track, phrase countdown, and `hit impact` immediately after the strike.
- WebGPU debug reported adapter ready, core mode, `bgra8unorm`, Nvidia/Ampere adapter metadata, `19` features, and `16384px texture`.
- The current default/Balanced resolution scale is `0.45` after the character-detail pass.
- Final HUD sample showed `30 FPS`, `RAF 33.3 ms`, page `visible`, about `508 calls / 95,872 estimated tris`, and render submit around `2.8 ms`. CPU work stayed low (`sim 0.1 / stream 0.1 / hud 0.0 ms`), so this Chrome session appeared RAF-paced at 30 Hz rather than app-work limited. This does not prove the full 60 FPS goal for the new character pass; it proves render/CPU headroom was under budget in that session.
