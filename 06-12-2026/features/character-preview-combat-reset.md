# Character Preview, Combat Feedback, And Reset Tools

## Character Preview

The title screen now has a live 3D character preview rendered in the same world scene as gameplay.

- Name, class, outfit, primary color, and accent color controls emit preview changes.
- The preview uses `createHumanoidModel`, so it is the same procedural model family used for the player and NPCs.
- The preview is visible on title/settings screens and hidden during gameplay.

## Combat Feedback

Strike actions now create immediate feedback:

- Player model swings briefly during a strike.
- Hit slimes recoil and squash/stretch for a short pulse.
- Defeated slimes linger through the hit pulse before hiding.
- Procedural strike and hit sounds play through `AmbientSound`.

No external SFX assets were added. The sounds are short oscillator/noise bursts layered on top of the existing procedural music and wind.

## Reset Tools

Added `6 Reset` to the quick tools and keyboard actions.

Reset behavior:

- Restores the tutorial quest to `0 / 2`.
- Respawns all meadow slimes.
- Clears the selected target and active hit pulses.
- Keeps the current character, HP, and gold intact so combat rewards can still be inspected.

