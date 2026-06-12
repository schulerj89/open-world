# Third-Person Upgrade

## Implemented

- Replaced the first-person controller with a third-person follow camera.
- Added a visible procedural player avatar.
- Added class-specific model parts:
  - Sentinel: shield and shoulder gear.
  - Wayfarer: cape and quiver.
  - Arcanist: robe hem and staff.
- Added simple character customization:
  - Main color.
  - Accent color.
  - Outfit variant.
- Added visible quick tools:
  - Debug toggle.
  - Warp to arena.
  - Warp to town.
  - Warp to slimes.
  - Coordinate X/Z warp.
  - Debug equip swap.
  - Collision probe.
  - Return to menu.
- Added higher-detail procedural slimes.
- Added NPC people in town.
- Added visible procedural animation:
  - player walk bob,
  - NPC idle bob/turn,
  - horizontal tree-crown wind sway with fixed trunks,
  - slime bounce and squash.

## Controls

- `T`: toggle debug.
- `Space` or `J`: jump.
- `5`: warp to the combat debug arena.
- `7`: warp to town.
- `8`: warp near slimes.
- `9`: equip debug outfit.
- `0`: collision probe near a cottage blocker.
- `M`: return to menu.

The same actions also have visible buttons in the top-right quick tool bar during gameplay.

Movement testing should verify X/Z movement, yaw/pitch look, and jump Y/grounded state in both the town and the arena. The coordinate warp controls exist so specific collision and combat positions can be revisited without walking across the map.

## Camera

The third-person camera follows behind the player with keyboard/mouse orbit controls. Movement stays relative to camera yaw, and the visible avatar turns toward the movement direction.

## Visible Browser Audit

Final Chrome-visible testing ran against production preview `127.0.0.1:4198`.

- Third-person avatar rendered with customized class/outfit colors.
- Debug quick tools were visible in gameplay.
- Keyboard movement changed X/Z from `-8.0 / 10.0` to `-7.7 / 9.5`.
- Keyboard look changed yaw from `-31.5` to `-36.8`.
- Queued jump input was fixed after Space/J taps were initially missed; final HUD showed Y rising to `9.1`, speed `5.8`, and grounded `no`.
- Menu returned cleanly to the title screen.

## Animation Follow-Up

Visible Chrome testing on `127.0.0.1:4200` confirmed ambient motion with the camera standing still. Two static-camera screenshots taken 1.8 seconds apart changed by `135,660` bytes while the debug HUD held `60 FPS`, `16.6 ms` frame time, and about `1.5 ms` render submit time.

Slime-side testing after `8 Slimes` produced the same result: two screenshots 1.2 seconds apart changed by `147,211` bytes while the HUD held `60 FPS`. The tree animation is horizontal crown sway only; trunks stay fixed to the terrain so trees do not float up/down away from the ground.

## Collision Follow-Up

Player movement now resolves simple circle collisions against:

- starter-town cottages, fences, posts, market stalls, statue base, NPCs, and props,
- live meadow slimes,
- the combat debug room's walls, pillars, dummy blocker, and arena slime,
- streamed tree trunks from visible terrain chunks.

The debug HUD reports recent collision pushes and visible tree blocker count. A new `0 Collide` quick tool places the player against a known cottage blocker for fast verification.

Visible Chrome testing on `127.0.0.1:4202` confirmed the collision probe produced `Collision 1 hits / 74 tree blockers`, pushed the player out to `X -13.7`, and held `60 FPS` with RAF around `16.6 ms`.
