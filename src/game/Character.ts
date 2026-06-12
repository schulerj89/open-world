export type CharacterClassKey = "sentinel" | "wayfarer" | "arcanist";

export type CharacterClass = {
  key: CharacterClassKey;
  label: string;
  maxHp: number;
  attackPower: number;
};

export type CharacterDraft = {
  name: string;
  classKey: CharacterClassKey;
  primaryColor: string;
  accentColor: string;
  outfitVariant: OutfitVariant;
};

export type OutfitVariant = "traveler" | "guard" | "mage";

export type PlayerCharacter = {
  name: string;
  classKey: CharacterClassKey;
  classLabel: string;
  primaryColor: string;
  accentColor: string;
  outfitVariant: OutfitVariant;
  level: number;
  maxHp: number;
  hp: number;
  attackPower: number;
  gold: number;
};

export const characterClasses: Record<CharacterClassKey, CharacterClass> = {
  sentinel: {
    key: "sentinel",
    label: "Sentinel",
    maxHp: 130,
    attackPower: 24
  },
  wayfarer: {
    key: "wayfarer",
    label: "Wayfarer",
    maxHp: 105,
    attackPower: 30
  },
  arcanist: {
    key: "arcanist",
    label: "Arcanist",
    maxHp: 86,
    attackPower: 38
  }
};

export function createCharacter(draft: Partial<CharacterDraft>): PlayerCharacter {
  const classKey = isCharacterClassKey(draft.classKey) ? draft.classKey : "sentinel";
  const characterClass = characterClasses[classKey];
  const name = sanitizeName(draft.name);
  const primaryColor = sanitizeColor(draft.primaryColor, defaultPrimaryColor(classKey));
  const accentColor = sanitizeColor(draft.accentColor, defaultAccentColor(classKey));
  const outfitVariant = isOutfitVariant(draft.outfitVariant) ? draft.outfitVariant : defaultOutfitVariant(classKey);

  return {
    name,
    classKey,
    classLabel: characterClass.label,
    primaryColor,
    accentColor,
    outfitVariant,
    level: 1,
    maxHp: characterClass.maxHp,
    hp: characterClass.maxHp,
    attackPower: characterClass.attackPower,
    gold: 0
  };
}

export function addGold(character: PlayerCharacter, amount: number): PlayerCharacter {
  return {
    ...character,
    gold: character.gold + Math.max(0, Math.floor(amount))
  };
}

export function healCharacter(character: PlayerCharacter, amount: number): { character: PlayerCharacter; healed: number } {
  const nextHp = Math.min(character.maxHp, character.hp + Math.max(0, Math.floor(amount)));
  return {
    character: {
      ...character,
      hp: nextHp
    },
    healed: nextHp - character.hp
  };
}

export function sanitizeName(value: unknown): string {
  const name = String(value ?? "")
    .replace(/[^\w '-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 18);

  return name.length > 0 ? name : "Rowan";
}

export function sanitizeColor(value: unknown, fallback: string): string {
  const color = String(value ?? "").trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color : fallback;
}

function defaultPrimaryColor(classKey: CharacterClassKey): string {
  if (classKey === "arcanist") {
    return "#5d6edb";
  }
  if (classKey === "wayfarer") {
    return "#4c9f63";
  }
  return "#b44f42";
}

function defaultAccentColor(classKey: CharacterClassKey): string {
  if (classKey === "arcanist") {
    return "#e0c36c";
  }
  if (classKey === "wayfarer") {
    return "#d7b15f";
  }
  return "#c8d2df";
}

function defaultOutfitVariant(classKey: CharacterClassKey): OutfitVariant {
  if (classKey === "arcanist") {
    return "mage";
  }
  if (classKey === "wayfarer") {
    return "traveler";
  }
  return "guard";
}

function isCharacterClassKey(value: unknown): value is CharacterClassKey {
  return typeof value === "string" && value in characterClasses;
}

function isOutfitVariant(value: unknown): value is OutfitVariant {
  return value === "traveler" || value === "guard" || value === "mage";
}
