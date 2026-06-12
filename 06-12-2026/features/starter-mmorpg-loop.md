# Starter MMORPG Loop

## Implemented

- Character builder on the title screen with name and class selection.
- Briar Glen starter town with cottages, grass patches, road, guide marker, training yard, and fenced edge.
- Player spawn inside town at a stable ground height.
- Beginner meadow slimes outside town.
- MMORPG HUD with character plate, HP, level, gold, target frame, quest tracker, combat log, and numbered hotbar.
- Tutorial quest: target a meadow slime with Tab, use slot 1 to strike, defeat 2 slimes.
- Combat reward: defeated slimes award 6 gold.
- Slot 2 is a small self-heal.
- Jumping is enabled through Space and uses the existing terrain grounding path.

## Controls

- Move: WASD or arrow keys.
- Sprint: Shift.
- Jump: Space.
- Look: Q/E for left/right, R/F for up/down, or drag-look with the mouse.
- Target: Tab.
- Hotbar slot 1: Strike.
- Hotbar slot 2: Mend.
- Debug HUD: T.
- Settings: Escape or Settings button.

## Extensibility Notes

- Character rules live in `src/game/Character.ts`.
- Combat rules live in `src/game/CombatSystem.ts`.
- Tutorial state lives in `src/game/QuestSystem.ts`.
- Starter town placement lives in `src/world/StarterTown.ts`.
- The renderer-facing enemy actors in `src/core/AeolianWilds.ts` are thin adapters around the pure combat state.

This keeps gameplay data movable and testable without loading Three.js or the renderer.
