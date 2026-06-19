export function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

export function hash2(ix: number, iz: number, seed = 0): number {
  let h = Math.imul(ix, 374_761_393) ^ Math.imul(iz, 668_265_263) ^ Math.imul(seed, 2_246_822_519);
  h = Math.imul(h ^ (h >>> 13), 1_274_126_177);
  return ((h ^ (h >>> 16)) >>> 0) / 4_294_967_295;
}

export function signedHash2(ix: number, iz: number, seed = 0): number {
  return hash2(ix, iz, seed) * 2 - 1;
}

export function valueNoise2(x: number, z: number, seed = 0): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);

  const a = signedHash2(ix, iz, seed);
  const b = signedHash2(ix + 1, iz, seed);
  const c = signedHash2(ix, iz + 1, seed);
  const d = signedHash2(ix + 1, iz + 1, seed);

  return lerp(lerp(a, b, ux), lerp(c, d, ux), uz);
}

export function fbm(
  x: number,
  z: number,
  seed: number,
  octaves: number,
  lacunarity = 2,
  gain = 0.5
): number {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  let norm = 0;

  for (let i = 0; i < octaves; i += 1) {
    sum += valueNoise2(x * freq, z * freq, seed + i * 101) * amp;
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }

  return sum / norm;
}

export function ridgedFbm(x: number, z: number, seed: number, octaves: number): number {
  let sum = 0;
  let amp = 0.58;
  let freq = 1;
  let norm = 0;

  for (let i = 0; i < octaves; i += 1) {
    const n = valueNoise2(x * freq, z * freq, seed + i * 157);
    const ridge = 1 - Math.abs(n);
    sum += ridge * ridge * amp;
    norm += amp;
    amp *= 0.48;
    freq *= 2.05;
  }

  return clamp(sum / norm);
}

export function billowFbm(x: number, z: number, seed: number, octaves: number): number {
  let sum = 0;
  let amp = 0.54;
  let freq = 1;
  let norm = 0;

  for (let i = 0; i < octaves; i += 1) {
    const n = Math.abs(valueNoise2(x * freq, z * freq, seed + i * 193));
    sum += n * amp;
    norm += amp;
    amp *= 0.52;
    freq *= 2;
  }

  return sum / norm;
}
