import type { HeightSampler } from "./HeightSampler";
import { Noise } from "./Noise";

export class TerrainHeight implements HeightSampler {
  private readonly noise = new Noise(8421);

  getHeight(x: number, z: number): number {
    return this.getBaseHeight(x, z);
  }

  getMoisture(x: number, z: number): number {
    return Math.min(1, this.noise.fbm(x * 0.02 + 500, z * 0.02 - 300, 4));
  }

  getRiverInfo(x: number, z: number): {
    distance: number;
    influence: number;
    surfaceY: number;
    width: number;
  } {
    return { distance: Number.POSITIVE_INFINITY, influence: 0, surfaceY: this.getBaseHeight(x, z), width: 0 };
  }

  private getBaseHeight(x: number, z: number): number {
    const rolling = this.noise.fbm(x * 0.007, z * 0.007, 5) * 28;
    const detail = this.noise.fbm(x * 0.032 + 80, z * 0.032 - 40, 4) * 6;
    const ridgeSource = this.noise.fbm(x * 0.0035 - 200, z * 0.0045 + 80, 6);
    const ridges = Math.pow(Math.max(0, ridgeSource - 0.43) * 2.45, 2.05) * 148;
    const farRange = this.noise.fbm(x * 0.0018 + 1200, z * 0.0018 - 900, 5) * 88;
    const valley = Math.sin(x * 0.0025) * Math.cos(z * 0.0038) * 9;

    return rolling + detail + ridges + farRange + valley - 44;
  }
}
