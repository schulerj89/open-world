# Decision: Starter Town Scope

## Decision

Build the first offline MMORPG slice around a compact starter town instead of expanding the wilderness first.

## Why

The user needs a playable loop, not just terrain travel. A town gives the world an anchor for character creation, spawn, tutorial text, combat onboarding, settings, and debug verification.

## Result

- Added `StarterTown` as a movable world module.
- Added fixed enemy spawns outside the town.
- Kept combat and quest state in pure TypeScript modules.
- Kept meshes simple to preserve the 60 FPS target.

## Next

The next content pass should replace placeholder geometry with authored modular props and add NPC interaction, but only after the current loop remains stable under movement and combat tests.
