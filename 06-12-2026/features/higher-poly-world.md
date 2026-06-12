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
