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
};

export type PlayerCharacter = {
  name: string;
  classKey: CharacterClassKey;
  classLabel: string;
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

  return {
    name,
    classKey,
    classLabel: characterClass.label,
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

function isCharacterClassKey(value: unknown): value is CharacterClassKey {
  return typeof value === "string" && value in characterClasses;
}
