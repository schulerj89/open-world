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

## Collision Diagnostics Visible Audit

A follow-up visible Chrome pass tested production preview on `127.0.0.1:4207`.

- The collision resolver now returns detailed hit metadata, and the debug HUD includes `Last hit`.
- `0 Collide` placed the player against the cottage blocker and immediately reported `Collision 1 hits / 57 tree / 81 town / 3 enemy blockers`.
- Immediate HUD readback showed `Last hit building / starter-town / push 2.06 / at X -30.0 Z -16.0`.
- After returning to the stable manual RAF loop, one warm-cache sample held `60 FPS`, `16.7 ms` frame time, `177` live chunks, queue `0`, and about `787 calls / 138,068 estimated tris`.
- A fresh reload later exposed a streamer pressure bug: when RAF was already paced at about `33.3 ms`, the old pressure path could leave the chunk queue stuck. The streamer now builds one queued chunk per pressure frame instead of returning early.
- The fresh reload after that fix drained to queue `0`; final sample showed `30 FPS`, `RAF 33.3 ms`, page `visible`, `21` live chunks, about `524 calls / 100,664 estimated tris`, render submit around `1.8 ms`, and CPU work around `sim 0.1 / stream 0.0 / hud 0.0 ms`.
- WebGPU debug reported adapter ready, core mode, `bgra8unorm`, and `16384px texture`.
- The Three `renderer.setAnimationLoop` experiment was not kept because the visible Chrome/WebGPU QA path regressed to about `1 FPS` / `RAF ~1017 ms`.

## Combat Debug Room Visible Audit

A follow-up in-app browser pass tested the debug arena on `127.0.0.1:4208`.

- `5 Arena` warped the player to the isolated room at about `X 176.0 / Y 22.3 / Z -174.0` and selected `Meadow Slime 4`.
- Live blocker counts showed `9 tree / 81 town / 4 enemy blockers`, confirming the arena slime is part of the enemy-collider path.
- Movement testing changed X/Z from `176.0 / -174.0` to `177.1 / -174.0`.
- Keyboard look changed yaw/pitch from `-45.8 / 16.0` to `-40.5 / 12.7`.
- Jump testing changed Y from `22.4` to `22.8` and changed grounded from `yes` to `no`.
- Coordinate warp to `X 182 / Z -174` hit the arena dummy and reported `Last hit prop / debug-combat-dummy / push 1.92 / at X 182.0 Z -174.0`.
- Coordinate warp to `X 188 / Z -184` hit the arena slime and reported `Last hit enemy / Meadow Slime 4 / push 2.47 / at X 188.0 Z -184.0`.
- Pressing `1 Strike` near the arena slime reduced it from `52 / 52 HP` to `28 / 52 HP`.
- Strike animation/feedback changed the canvas screenshot by `156,308` bytes immediately after the hit.
- WebGPU debug reported adapter ready, core mode, `bgra8unorm`, Nvidia/Ampere metadata, `19` features, `16384px texture`, `4` bind groups, `48` sampled textures, `2147483648` max buffer size, and `30` vertex attributes.
- No browser console warnings or errors were captured during the arena pass.
- This in-app browser session was RAF-throttled despite low render submit time: final sample showed `1 FPS`, frame `807.6 ms`, queue `0`, about `316 calls / 96,476 estimated tris`, and render submit around `3.3 ms`. One post-strike sample briefly showed `RAF 16.7 ms`, but the final warmed cadence returned to about `1000 ms`, so this run verifies behavior and diagnostics, not the 60 FPS target.

## Collider Owner Label Follow-Up

The next collision-diagnostics slice adds object-level owner labels for town blockers and a separate room blocker count in the HUD.

- The collision row now reports tree, town, room, and enemy blocker groups.
- Town collisions no longer collapse to only `starter-town`; colliders identify specific objects such as cottages, the tutorial guide NPC, market stalls, props, lamps, and fence runs.
- This is intended to make `0 Collide`, arena coordinate warp, and future building/NPC collision probes easier to audit in the visible browser.

A visible in-app browser check on `127.0.0.1:4208` verified the diagnostic change:

- `0 Collide` reported `Collision 1 hits / 28 tree / 81 town / 55 room / 4 enemy blockers`.
- The town collision source reported `Last hit building / cottage--30--16 / push 2.06 / at X -30.0 Z -16.0`.
- `5 Arena` plus coordinate warp to `X 182 / Z -174` reported `Collision 1 hits / 12 tree / 81 town / 55 room / 4 enemy blockers`.
- The room collision source reported `Last hit prop / debug-combat-dummy / push 1.92 / at X 182.0 Z -174.0`.
- WebGPU still reported adapter ready, core mode, `bgra8unorm`, and `16384px texture`.
- No browser console warnings or errors were captured.
- The in-app browser session remained RAF-throttled around `1 FPS` with low render submit time, so this pass verifies collision diagnostics and WebGPU readback, not final 60 FPS performance.

## Building Asset Extraction Visible Audit

A visible in-app browser check on `127.0.0.1:4208` verified the `TownBuildingAsset` extraction.

- `0 Collide` still resolved the extracted cottage child asset and reported `Last hit building / cottage--30--16 / push 2.38 / at X -30.0 Z -16.0`.
- Recursive town collider counting preserved the expected town blocker count: `Collision 1 hits / 28 tree / 81 town / 55 room / 4 enemy blockers`.
- Render debug reported about `66 calls / 107,200 estimated tris` in the cottage collision view after the richer building asset extraction.
- WebGPU still reported adapter ready, core mode, `bgra8unorm`, Nvidia/Ampere metadata, `19` features, `16384px texture`, `4` bind groups, `48` sampled textures, `2147483648` max buffer size, and `30` vertex attributes.
- No browser console warnings or errors were captured.
- This in-app browser run again showed RAF throttling around `1 FPS` with low render submit time (`render 5.3 ms`), so it verifies the building asset/collision path and diagnostics but not final 60 FPS performance.

## NPC Asset Extraction Visible Audit

A visible in-app browser check on `127.0.0.1:4208` verified the `TownNpcAsset` extraction.

- Coordinate warp to the guide NPC at `X -2 / Z 2` reported `Last hit npc / tutorial-guide-npc / push 1.48 / at X -2.0 Z 2.0`.
- Recursive town collider counting preserved the expected town blocker count: `Collision 2 hits / 28 tree / 81 town / 55 room / 4 enemy blockers`.
- Render debug reported about `76 calls / 107,200 estimated tris` in the guide collision view.
- WebGPU still reported adapter ready, core mode, `bgra8unorm`, `19` features, `16384px texture`, and `48` sampled textures.
- A 1.6 second guide-view screenshot comparison changed by `235,560` bytes, confirming visible animation still updates after moving NPC idle and building window glow into asset `update()` hooks.
- No browser console warnings or errors were captured.
- This in-app browser run also remained RAF-throttled around `1 FPS` with low render submit time (`render 3.2 ms`), so it verifies the NPC asset/collision/update path and diagnostics but not final 60 FPS performance.

## Ground Asset Extraction Visible Audit

A visible in-app browser check on `127.0.0.1:4208` verified the `TownGroundAsset` extraction.

- Town spawn showed `Collision 0 hits / 28 tree / 81 town / 55 room / 4 enemy blockers`, confirming walkable ground patches did not add blockers and existing recursive town collider counts stayed stable.
- Render debug reported about `58 calls / 106,176 estimated tris` in the town spawn view after the ground patch extraction.
- WebGPU still reported adapter ready, core mode, `bgra8unorm`, `19` features, `16384px texture`, and `48` sampled textures.
- A 1.5 second town-ground-view screenshot comparison changed by `235,135` bytes, confirming visible town animation still updates while ground patches render through child assets.
- No browser console warnings or errors were captured.
- This in-app browser run remained RAF-throttled around `1 FPS` with low render submit time (`render 4.3 ms`), so it verifies the ground asset/render path and diagnostics but not final 60 FPS performance.

## Plaza Asset Extraction Visible Audit

A visible in-app browser check on `127.0.0.1:4208` verified the `TownPlazaAsset` extraction.

- Before coordinate warp, the town HUD still reported `Collision 0 hits / 28 tree / 81 town / 55 room / 4 enemy blockers`, confirming recursive child collider counting stayed at the expected town blocker total.
- Coordinate warp to `X 0 / Z 0` resolved the extracted plaza child asset and reported `Collision 1 hits / 28 tree / 81 town / 55 room / 4 enemy blockers`.
- The collision source reported `Last hit prop / plaza-statue-base / push 3.02 / at X 0.0 Z 0.0`, preserving the stable statue debug label after extraction.
- The plaza view showed the added stone rings, statue cap, contact shadow, and animated marker crystal in the in-app browser.
- Movement/look/jump smoke testing changed HUD values after player controls: `Position X 3.0 / Y 10.1 / Z 0.0`, `Look Yaw -32.8 / Pitch 16.0`, `Speed 4.4 u/s`, and `Grounded no`.
- WebGPU debug reported adapter ready, core mode, `bgra8unorm`, Nvidia/Ampere metadata, `19` features, `16384px texture`, `4` bind groups, `48` sampled textures, `2147483648` max buffer size, and `30` vertex attributes.
- Render debug in the movement smoke view reported about `252 calls / 109,240 estimated tris`, with `787 geos / 11 tex`.
- No browser console warnings or errors were captured.
- This in-app browser run remained RAF-throttled around `1 FPS` with low render submit time (`render 6.1 ms` to `7.8 ms`), so it verifies the plaza asset/collision/update path and diagnostics but not final 60 FPS performance.
