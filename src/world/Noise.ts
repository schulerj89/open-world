export class Noise {
  private readonly seed: number;

  constructor(seed = 1337) {
    this.seed = seed;
  }

  value(x: number, z: number): number {
    const n = Math.sin(x * 127.1 + z * 311.7 + this.seed * 17.17) * 43758.5453123;
    return n - Math.floor(n);
  }

  smooth(x: number, z: number): number {
    const ix = Math.floor(x);
    const iz = Math.floor(z);
    const fx = x - ix;
    const fz = z - iz;
    const ux = fx * fx * (3 - 2 * fx);
    const uz = fz * fz * (3 - 2 * fz);

    const a = this.value(ix, iz);
    const b = this.value(ix + 1, iz);
    const c = this.value(ix, iz + 1);
    const d = this.value(ix + 1, iz + 1);

    return lerp(lerp(a, b, ux), lerp(c, d, ux), uz);
  }

  fbm(x: number, z: number, octaves = 5): number {
    let total = 0;
    let amplitude = 0.5;
    let frequency = 1;
    let norm = 0;

    for (let i = 0; i < octaves; i += 1) {
      total += this.smooth(x * frequency, z * frequency) * amplitude;
      norm += amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }

    return total / norm;
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

