# Decision: Procedural Before Imported Assets

## Decision

Use procedural low-poly geometry for this pass instead of importing external GLB/FBX packs.

## Why

The app already streams procedural terrain and uses shared/instanced geometry. Procedural town, characters, trees, and enemies are faster to integrate, easier to customize, and easier to keep under the memory cap.

## Asset Sources Researched

- Quaternius: CC0 low-poly characters, modular outfits, nature, medieval village, monsters, and glTF/FBX/OBJ options. Primary reference: https://quaternius.com/
- Kenney: CC0/public-domain town and game asset packs, including fantasy-town style assets. Primary reference: https://kenney.nl/
- OpenGameArt: useful as a discovery source, but each upload needs license checks.

## Future Import Rule

Only import assets after adding an `ASSET_LICENSES.md` record with source URL, author, license, format, and memory budget note.
