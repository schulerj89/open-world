# Decision: Performance Presets

## Decision

Replace exposed tuning sliders with bundled dropdown presets plus a memory cap dropdown.

## Why

The prior settings were useful during engine tuning but too granular for normal gameplay. Presets are easier to test and easier for players to reason about.

## Preset Mapping

- Performance: lower horizon, lower foliage, lower resolution scale.
- Balanced: default 60 FPS target.
- High Quality: longer horizon, full foliage, higher resolution scale.

Memory cap remains separate because it is a useful debug and device-control knob.

## Testability

`tests/game-systems.test.ts` verifies that presets expand into the expected render settings and preserve the chosen memory cap.
