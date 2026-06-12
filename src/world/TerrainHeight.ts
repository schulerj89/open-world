import type { HeightSampler } from "./HeightSampler";
import { Noise } from "./Noise";

export class TerrainHeight implements HeightSampler {
  private readonly noise = new Noise(8421);

  getHeight(x: number, z: number): number {
    const base = this.getBaseHeight(x, z);
    const river = this.getRiverInfo(x, z);

    if (river.influence <= 0) {
      return base;
    }

    const bed = river.surfaceY - 2.2 - river.influence * 1.4;
    return base + (Math.min(base, bed) - base) * river.influence;
  }

  getMoisture(x: number, z: number): number {
    const river = this.getRiverInfo(x, z);
    return Math.min(1, this.noise.fbm(x * 0.02 + 500, z * 0.02 - 300, 4) + river.influence * 0.45);
  }

  getRiverInfo(x: number, z: number): {
    distance: number;
    influence: number;
    surfaceY: number;
    width: number;
  } {
    const centerZ = this.getRiverCenterZ(x);
    const distance = Math.abs(z - centerZ);
    const width = 15 + this.noise.fbm(x * 0.012 + 30, centerZ * 0.014 - 20, 3) * 8;
    const bank = width + 10;
    const influence = smoothstep(bank, width * 0.28, distance);
    const surfaceY = this.getBaseHeight(x, centerZ) - 5.8;

    return { distance, influence, surfaceY, width };
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

  private getRiverCenterZ(x: number): number {
    return Math.sin(x * 0.006) * 86 + Math.sin(x * 0.019 + 1.8) * 28;
  }
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}
