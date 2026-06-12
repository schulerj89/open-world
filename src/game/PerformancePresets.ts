import type { QualitySettings } from "../config/QualitySettings.js";

export type PerformancePresetKey = "performance" | "balanced" | "quality";

export type PerformancePreset = {
  key: PerformancePresetKey;
  label: string;
  description: string;
  settings: Omit<QualitySettings, "memoryBudgetMb">;
};

export const performancePresets: Record<PerformancePresetKey, PerformancePreset> = {
  performance: {
    key: "performance",
    label: "Performance",
    description: "Lower horizon and foliage for older GPUs or laptops on battery.",
    settings: {
      cpuBudget: 2,
      renderDistance: 5,
      grassDensity: 0.55,
      treeDensity: 0.55,
      resolutionScale: 0.34
    }
  },
  balanced: {
    key: "balanced",
    label: "Balanced",
    description: "Default 60 FPS target with town, grass, and forest detail.",
    settings: {
      cpuBudget: 3,
      renderDistance: 7,
      grassDensity: 0.82,
      treeDensity: 0.82,
      resolutionScale: 0.42
    }
  },
  quality: {
    key: "quality",
    label: "High Quality",
    description: "Longer views and denser foliage for stronger desktop GPUs.",
    settings: {
      cpuBudget: 5,
      renderDistance: 9,
      grassDensity: 1,
      treeDensity: 1,
      resolutionScale: 0.56
    }
  }
};

export const memoryCapOptions = [360, 520, 680, 840] as const;
export type MemoryCapMb = (typeof memoryCapOptions)[number];

export function resolvePerformanceSettings(
  presetKey: PerformancePresetKey,
  memoryBudgetMb: number
): QualitySettings {
  const preset = performancePresets[presetKey] ?? performancePresets.balanced;

  return {
    ...preset.settings,
    memoryBudgetMb: Math.max(240, Math.min(1024, Math.round(memoryBudgetMb)))
  };
}
