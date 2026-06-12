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
  - Warp to town.
  - Warp to slimes.
  - Debug equip swap.
  - Return to menu.
- Added higher-detail procedural slimes.
- Added NPC people in town.

## Controls

- `T`: toggle debug.
- `Space` or `J`: jump.
- `7`: warp to town.
- `8`: warp near slimes.
- `9`: equip debug outfit.
- `M`: return to menu.

The same actions also have visible buttons in the top-right quick tool bar during gameplay.

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
