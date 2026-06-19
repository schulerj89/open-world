import * as THREE from 'three';
import { SEA_LEVEL, WORLD_SEED } from './constants';
import { billowFbm, clamp, fbm, hash2, lerp, ridgedFbm, smoothstep } from './noise';

export type BiomeName =
  | 'deep-water'
  | 'shallow-water'
  | 'shore'
  | 'desert'
  | 'grassland'
  | 'forest'
  | 'rock'
  | 'snow';

export interface WorldSample {
  x: number;
  z: number;
  height: number;
  moisture: number;
  continent: number;
  mountain: number;
  dryness: number;
  biome: BiomeName;
}

const COLORS = {
  deepWater: new THREE.Color(0x145177),
  shallowWater: new THREE.Color(0x4fa9b8),
  shore: new THREE.Color(0xd7bd79),
  dune: new THREE.Color(0xbca35c),
  grass: new THREE.Color(0x6aa857),
  forest: new THREE.Color(0x2f6f3d),
  rock: new THREE.Color(0x777771),
  snow: new THREE.Color(0xe8f0ee)
};

export function moistureAt(x: number, z: number): number {
  const a = fbm((x - 4200) * 0.00155, (z + 9100) * 0.00155, WORLD_SEED + 81, 5);
  const b = fbm((x + 1100) * 0.004, (z - 2300) * 0.004, WORLD_SEED + 95, 2);
  return clamp(0.5 + a * 0.45 + b * 0.12);
}

export function forestDensityAt(x: number, z: number): number {
  const broad = fbm((x + 500) * 0.0062, (z - 700) * 0.0062, WORLD_SEED + 211, 4);
  const breaks = fbm((x - 1300) * 0.018, (z + 900) * 0.018, WORLD_SEED + 225, 2);
  return clamp(0.5 + broad * 0.62 + breaks * 0.18);
}

export function heightAt(x: number, z: number): number {
  const warpX = fbm(x * 0.0017, z * 0.0017, WORLD_SEED + 11, 4) * 210;
  const warpZ = fbm((x + 7000) * 0.0017, (z - 3000) * 0.0017, WORLD_SEED + 17, 4) * 210;
  const wx = x + warpX;
  const wz = z + warpZ;

  const continentRaw = fbm(wx * 0.00092, wz * 0.00092, WORLD_SEED + 31, 6);
  const continent = smoothstep(-0.22, 0.78, continentRaw);
  const shelf = smoothstep(0.18, 0.72, continentRaw);
  let height = lerp(-42, 58, continent) + shelf * 10;

  const rangeMask = smoothstep(0.42, 0.82, fbm((wx - 800) * 0.0018, (wz + 1400) * 0.0018, WORLD_SEED + 43, 4));
  const ridge = ridgedFbm((wx + 1600) * 0.006, (wz - 1100) * 0.006, WORLD_SEED + 57, 5);
  const mountainGate = smoothstep(0.35, 0.72, continent) * rangeMask;
  height += Math.pow(ridge, 1.65) * mountainGate * 190;

  const moisture = moistureAt(x, z);
  const dryness = 1 - moisture;
  const duneGate =
    smoothstep(0.58, 0.86, dryness) *
    smoothstep(2, 22, height) *
    (1 - smoothstep(72, 115, height));
  const dunes = billowFbm((x + 400) * 0.024, (z - 900) * 0.016, WORLD_SEED + 63, 4);
  height += (dunes * 8 + Math.sin((x + z * 0.37) * 0.045) * 1.7) * duneGate;

  height += fbm(x * 0.032, z * 0.032, WORLD_SEED + 71, 2) * 2.8;
  return height;
}

export function normalAt(x: number, z: number, step = 2): THREE.Vector3 {
  const hL = heightAt(x - step, z);
  const hR = heightAt(x + step, z);
  const hD = heightAt(x, z - step);
  const hU = heightAt(x, z + step);
  return new THREE.Vector3(hL - hR, step * 2, hD - hU).normalize();
}

export function slopeAt(x: number, z: number): number {
  const n = normalAt(x, z, 2);
  return clamp(1 - n.y);
}

export function classifyBiome(height: number, moisture: number): BiomeName {
  if (height < SEA_LEVEL - 12) return 'deep-water';
  if (height < SEA_LEVEL - 1.5) return 'shallow-water';
  if (height < SEA_LEVEL + 7) return 'shore';
  if (height > 150) return 'snow';
  if (height > 102) return 'rock';
  if (moisture > 0.58 && height > 10 && height < 96) return 'forest';
  if (moisture < 0.36) return 'desert';
  return 'grassland';
}

export function sampleWorld(x: number, z: number): WorldSample {
  const height = heightAt(x, z);
  const moisture = moistureAt(x, z);
  const continent = smoothstep(-0.22, 0.78, fbm(x * 0.00092, z * 0.00092, WORLD_SEED + 31, 6));
  const mountain = ridgedFbm(x * 0.006, z * 0.006, WORLD_SEED + 57, 5);
  return {
    x,
    z,
    height,
    moisture,
    continent,
    mountain,
    dryness: 1 - moisture,
    biome: classifyBiome(height, moisture)
  };
}

export function biomeColorAt(x: number, z: number, target = new THREE.Color()): THREE.Color {
  const sample = sampleWorld(x, z);
  const h = sample.height;
  const m = sample.moisture;

  if (h < SEA_LEVEL + 7) {
    const waterDepth = smoothstep(SEA_LEVEL - 46, SEA_LEVEL - 5, h);
    target.copy(COLORS.deepWater).lerp(COLORS.shallowWater, waterDepth);
    const shoreBlend = smoothstep(SEA_LEVEL - 4, SEA_LEVEL + 8, h);
    target.lerp(COLORS.shore, shoreBlend);
    return target;
  }

  const wet = smoothstep(0.18, 0.62, m);
  target.copy(COLORS.dune).lerp(COLORS.grass, wet);

  const forestBlend =
    smoothstep(0.48, 0.76, m) * smoothstep(8, 32, h) * (1 - smoothstep(82, 118, h));
  target.lerp(COLORS.forest, forestBlend * 0.72);

  const rockBlend = smoothstep(82, 132, h);
  const snowBlend = smoothstep(138, 176, h);
  target.lerp(COLORS.rock, rockBlend * (1 - snowBlend * 0.35));
  target.lerp(COLORS.snow, snowBlend);

  return target;
}

export function seededUnit(x: number, z: number, salt: number): number {
  return hash2(Math.floor(x), Math.floor(z), WORLD_SEED + salt);
}
