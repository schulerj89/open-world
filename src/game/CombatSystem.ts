import { addGold, type PlayerCharacter } from "./Character.js";

export type EnemyState = {
  id: string;
  name: string;
  maxHp: number;
  hp: number;
  attackPower: number;
  goldReward: number;
  alive: boolean;
};

export type AttackResult = {
  character: PlayerCharacter;
  enemy: EnemyState;
  damage: number;
  defeated: boolean;
  goldAwarded: number;
};

export function createBeginnerEnemy(index: number): EnemyState {
  return {
    id: `meadow-slime-${index}`,
    name: `Meadow Slime ${index + 1}`,
    maxHp: 52,
    hp: 52,
    attackPower: 5,
    goldReward: 6,
    alive: true
  };
}

export function strikeEnemy(character: PlayerCharacter, enemy: EnemyState): AttackResult {
  if (!enemy.alive) {
    return { character, enemy, damage: 0, defeated: false, goldAwarded: 0 };
  }

  const damage = Math.max(1, character.attackPower);
  const hp = Math.max(0, enemy.hp - damage);
  const defeated = hp === 0;
  const goldAwarded = defeated ? enemy.goldReward : 0;

  return {
    character: defeated ? addGold(character, goldAwarded) : character,
    enemy: {
      ...enemy,
      hp,
      alive: !defeated
    },
    damage,
    defeated,
    goldAwarded
  };
}
