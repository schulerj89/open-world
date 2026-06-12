import type { QualitySettings } from "../config/QualitySettings";

export class AdaptiveBudget {
  private pressure = 0;

  update(frameMs: number): void {
    const targetMs = 16.7;
    const overload = (frameMs - targetMs) / targetMs;
    const targetPressure = Math.max(0, Math.min(1, overload));
    const speed = targetPressure > this.pressure ? 0.08 : 0.025;
    this.pressure += (targetPressure - this.pressure) * speed;
  }

  derive(settings: QualitySettings): QualitySettings {
    const p = this.pressure;
    return {
      cpuBudget: Math.max(1, Math.round(settings.cpuBudget * (1 - p * 0.65))),
      memoryBudgetMb: settings.memoryBudgetMb,
      renderDistance: Math.max(3, Math.round(settings.renderDistance - p * 5)),
      grassDensity: Math.max(0.05, settings.grassDensity * (1 - p * 0.86)),
      treeDensity: Math.max(0.12, settings.treeDensity * (1 - p * 0.6)),
      resolutionScale: Math.max(0.28, settings.resolutionScale * (1 - p * 0.68))
    };
  }

  getPressure(): number {
    return this.pressure;
  }
}
