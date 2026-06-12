export type TutorialQuestState = {
  id: "first-hunt";
  title: string;
  killsRequired: number;
  kills: number;
  completed: boolean;
};

export function createTutorialQuest(): TutorialQuestState {
  return {
    id: "first-hunt",
    title: "First Hunt",
    killsRequired: 2,
    kills: 0,
    completed: false
  };
}

export function recordTutorialKill(quest: TutorialQuestState): TutorialQuestState {
  const kills = Math.min(quest.killsRequired, quest.kills + 1);
  return {
    ...quest,
    kills,
    completed: kills >= quest.killsRequired
  };
}

export function getTutorialInstruction(quest: TutorialQuestState): string {
  if (quest.completed) {
    return "Tutorial complete. Keep exploring beyond town.";
  }

  if (quest.kills === 0) {
    return "Press Tab to target a meadow slime outside town, then press 1 to strike.";
  }

  return "Defeat one more meadow slime to finish the tutorial.";
}
