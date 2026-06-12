import assert from "node:assert/strict";
import test from "node:test";
import { createCharacter, healCharacter } from "../src/game/Character.js";
import { createBeginnerEnemy, strikeEnemy } from "../src/game/CombatSystem.js";
import { performancePresets, resolvePerformanceSettings } from "../src/game/PerformancePresets.js";
import { createTutorialQuest, getTutorialInstruction, recordTutorialKill } from "../src/game/QuestSystem.js";

test("character creation sanitizes names and applies class stats", () => {
  const character = createCharacter({ name: "  Nyx!!   Star  ", classKey: "arcanist" });

  assert.equal(character.name, "Nyx Star");
  assert.equal(character.classLabel, "Arcanist");
  assert.equal(character.hp, character.maxHp);
  assert.equal(character.attackPower, 38);
});

test("combat defeats beginner enemies and awards gold once", () => {
  const character = createCharacter({ name: "Mira", classKey: "wayfarer" });
  let enemy = createBeginnerEnemy(0);
  let current = character;

  const first = strikeEnemy(current, enemy);
  enemy = first.enemy;
  current = first.character;
  assert.equal(first.defeated, false);
  assert.equal(current.gold, 0);

  const second = strikeEnemy(current, enemy);
  assert.equal(second.defeated, true);
  assert.equal(second.character.gold, 6);

  const third = strikeEnemy(second.character, second.enemy);
  assert.equal(third.goldAwarded, 0);
  assert.equal(third.character.gold, 6);
});

test("tutorial quest advances through two kills", () => {
  let quest = createTutorialQuest();
  assert.match(getTutorialInstruction(quest), /Tab/);

  quest = recordTutorialKill(quest);
  assert.equal(quest.completed, false);
  assert.match(getTutorialInstruction(quest), /one more/);

  quest = recordTutorialKill(quest);
  assert.equal(quest.completed, true);
  assert.match(getTutorialInstruction(quest), /complete/);
});

test("performance presets bundle quality controls and memory cap", () => {
  const settings = resolvePerformanceSettings("performance", 520);

  assert.equal(settings.memoryBudgetMb, 520);
  assert.equal(settings.renderDistance, performancePresets.performance.settings.renderDistance);
  assert.ok(settings.resolutionScale < performancePresets.quality.settings.resolutionScale);
});

test("healing is capped at max hp", () => {
  const wounded = { ...createCharacter({ name: "Tor", classKey: "sentinel" }), hp: 35 };
  const result = healCharacter(wounded, 500);

  assert.equal(result.character.hp, wounded.maxHp);
  assert.equal(result.healed, wounded.maxHp - 35);
});
