# Higher-Poly World Pass

## Implemented

- Removed river mesh generation.
- Neutralized terrain river carving and river moisture influence.
- Increased near terrain chunk mesh density.
- Increased tree trunk/crown segment counts.
- Upgraded starter town geometry:
  - segmented plaza and road patches,
  - chimneys,
  - shutters,
  - lamps,
  - market stalls,
  - richer roof geometry,
  - more detailed fences.
- Added four town NPCs using the same procedural humanoid model builder.
- Replaced single-mesh slime enemies with multi-part procedural creature models.

## Budget Approach

This pass increases visible polygon density through shared procedural geometry rather than imported unique assets. That keeps draw calls and memory predictable while raising detail in the areas the player inspects most closely.

Imported CC0 assets are still planned for later, but only after each pack is logged and budgeted.

## Character Graphics Target

The character graphics goal is now explicit: key humanoid characters should land around `4,000-8,000` triangles each, including the main character, visible preview character, and important town NPCs. That budget is high enough for readable faces and gear while still small enough for the current WebGPU browser target.

Current procedural humanoid estimates from the actual Three geometries:

- Sentinel / Traveler: about `6,376` triangles.
- Sentinel / Guard: about `6,752` triangles.
- Wayfarer / Traveler: about `5,892` triangles.
- Arcanist / Mage: about `6,544` triangles.

The June 12 character detail pass used an image-generated concept reference for direction only. The runtime character remains procedural Three.js geometry, not a generated bitmap asset.

Added detail:

- Face meshes: eyes, brows, nose, mouth, hair cap, and hair tufts.
- Gear layers: tunic panel, diagonal strap, belt buckle, gloves, boot cuffs, satchel/quiver/robe/guard variants.
- Class equipment: held sword/dagger/wand, shield, staff, shoulders, quiver, and robe options.
- Named right arm and weapon objects so combat animation can swing character parts instead of only rotating the whole model.
