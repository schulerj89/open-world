# Testing Notes

Aeolian Wilds should be tested with numeric debug values, not screenshots alone. The on-screen `World Debug` panel exposes the values used for movement, look, jump, and render-integrity checks.

## Movement Coordinates

The world uses Three.js coordinates:

- `X`: east/west ground movement
- `Y`: elevation and jump height
- `Z`: forward/back ground movement

Forward movement is valid when `X` or `Z` changes over time. Jump is valid when `Y` rises and `Grounded` flips from `yes` to `no`, then returns to `yes` after landing.

Game keys are normalized from both `KeyboardEvent.code` and `KeyboardEvent.key` so manual input and browser automation can exercise the same control path. The app prevents default browser handling for movement, look, sprint, and jump keys while the world is running.

## Look Controls

The primary look path is pointer lock mouse movement. If pointer lock is denied or unavailable, the app falls back to drag-look on the canvas.

Keyboard look controls are also available for deterministic testing:

- `Q`: look left
- `E`: look right
- `R`: look up
- `F`: look down

The debug panel exposes `Look` as `Yaw / Pitch`, plus `Pointer` as `locked`, `drag`, or `free`.

## Tree Render Integrity

Trees are instanced for performance, but each rendered trunk should have matching crown geometry. The debug panel exposes:

- `Trees`: trunk count and crown-part count
- `Grass cards`: visible instanced grass cards

For conifers, one trunk has three crown parts. For broadleaf trees, one trunk has one crown part. A crown-part count lower than the trunk count is a likely trunk-only rendering bug.

## WebGPU Debug Values

The HUD includes WebGPU values from the browser runtime:

- `GPU`: support/adapter status, core-vs-compatibility signal, preferred canvas format, and max 2D texture dimension
- `Adapter`: browser-exposed vendor, architecture, device, or private adapter placeholder
- `Features`: number of reported WebGPU feature flags

These values help separate app bugs from renderer/platform differences. For example, a WebGL fallback, missing adapter, compatibility-mode adapter, unusually low texture limit, or private/unknown adapter data should be captured alongside screenshots when reporting incomplete rendering.

## Browser Test Checklist

1. Start the world.
2. Confirm WebGPU is active and no console warnings/errors appear.
3. Hold or repeatedly press `W`; `X` or `Z` must change.
4. Press `A` and `D`; `X` or `Z` must change in opposite strafe directions.
5. Press `Q` then `E`; `Yaw` must change left and right.
6. Press `R` then `F`; `Pitch` must change up and down.
7. Press `Space`; `Y` must rise and `Grounded` should briefly show `no`.
8. Move near trees and verify trunks have crowns.
9. Confirm the `GPU`, `Adapter`, and `Features` rows are populated.
10. Confirm the HUD remains near 60 FPS after the chunk queue settles.
