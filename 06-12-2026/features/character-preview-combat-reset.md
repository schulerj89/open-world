# Character Preview, Combat Feedback, And Reset Tools

## Character Preview

The title screen now has a live 3D character preview rendered in the same world scene as gameplay.

- Name, class, outfit, primary color, and accent color controls emit preview changes.
- The preview uses `createHumanoidModel`, so it is the same procedural model family used for the player and NPCs.
- The preview is visible on title/settings screens and hidden during gameplay.
- Humanoid models now target the `4k-8k` triangle band for key characters. Current class/outfit variants measure about `5.9k-6.8k` triangles and include readable face features, hair, clothing layers, gloves, boots, accessories, and class gear.

## Combat Feedback

Strike actions now create immediate feedback:

- Player right arm and held weapon swing briefly during a strike, with a translucent slash trail.
- Hit slimes recoil and squash/stretch for a short pulse.
- Defeated slimes linger through the hit pulse before hiding.
- Floating damage and heal numbers appear over the target/player.
- Procedural strike and hit sounds play through `AmbientSound`.
- Strike input has a short recovery window and ignores keyboard repeat so Web Audio nodes cannot be spammed faster than the animation.
- Hotbar buttons now route through the same Strike/Mend actions as keyboard slots.

No external SFX assets were added. The sounds are short oscillator/noise bursts layered on top of the existing procedural music and wind.

## Reset Tools

Added `6 Reset` to the quick tools and keyboard actions.

Reset behavior:

- Restores the tutorial quest to `0 / 2`.
- Respawns all meadow slimes.
- Clears the selected target and active hit pulses.
- Keeps the current character, HP, and gold intact so combat rewards can still be inspected.

## Combat Debug Room

Added an isolated collision and fighting sandbox outside Briar Glen.

- `5 Arena` warps the player to the debug room near `X 176 / Z -174`.
- The room center is around `X 182 / Z -180`.
- A dedicated arena meadow slime spawns around `X 188 / Z -184` and is selected on arena warp when alive.
- The top-right debug controls include numeric X/Z inputs and `Warp` so coordinate-specific collision and combat cases can be reproduced quickly.
- The room has its own walls, pillars, dummy blocker, spawn rings, and live slime collider. It is a debug sandbox for movement, looking, jumping, collision, targeting, and fighting iteration, not a shipped Briar Glen location.
