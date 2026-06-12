import type { QualitySettings } from "../config/QualitySettings";

export class AdaptiveBudget {
  private pressure = 0;

  update(frameMs: number): void {
    const targetMs = 16.7;
    const overload = (frameMs - targetMs) / targetMs;
    const targetPressure = Math.max(0, Math.min(1, overload));
    const speed = targetPressure > this.pressure ? 0.18 : 0.025;
    this.pressure += (targetPressure - this.pressure) * speed;
  }

  derive(settings: QualitySettings): QualitySettings {
    const p = this.pressure;
    return {
      cpuBudget: Math.max(1, Math.round(settings.cpuBudget * (1 - p * 0.65))),
      memoryBudgetMb: settings.memoryBudgetMb,
      renderDistance: Math.max(1, Math.round(settings.renderDistance * (1 - p * 0.92))),
      grassDensity: Math.max(0.03, settings.grassDensity * (1 - p * 0.9)),
      treeDensity: Math.max(0.06, settings.treeDensity * (1 - p * 0.82)),
      resolutionScale: Math.max(0.1, settings.resolutionScale * (1 - p * 0.84))
    };
  }

  getPressure(): number {
    return this.pressure;
  }
}
