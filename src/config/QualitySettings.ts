export type QualitySettings = {
  cpuBudget: number;
  memoryBudgetMb: number;
  renderDistance: number;
  grassDensity: number;
  treeDensity: number;
  resolutionScale: number;
};

export const defaultSettings: QualitySettings = {
  cpuBudget: 3,
  memoryBudgetMb: 680,
  renderDistance: 7,
  grassDensity: 0.82,
  treeDensity: 0.82,
  resolutionScale: 0.42
};

export type SettingsKey = keyof QualitySettings;
