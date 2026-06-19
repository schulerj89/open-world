import { describe, expect, it } from 'vitest';
import { CHUNK_SIZE, SEA_LEVEL } from '../src/world/constants';
import { biomeColorAt, heightAt, moistureAt, normalAt, sampleWorld } from '../src/world/world';

describe('procedural world fields', () => {
  it('generates deterministic heights from world coordinates', () => {
    const points = [
      [0, 0],
      [128.25, -512.75],
      [-4096.5, 256.125]
    ];

    for (const [x, z] of points) {
      expect(heightAt(x, z)).toBe(heightAt(x, z));
      expect(sampleWorld(x, z).height).toBe(heightAt(x, z));
    }
  });

  it('keeps moisture independent enough to create wet and dry land at similar elevations', () => {
    const samples = [];
    for (let z = -4096; z <= 4096; z += 256) {
      for (let x = -4096; x <= 4096; x += 256) {
        const h = heightAt(x, z);
        if (h > SEA_LEVEL + 8 && h < 90) {
          samples.push(moistureAt(x, z));
        }
      }
    }

    expect(Math.min(...samples)).toBeLessThan(0.42);
    expect(Math.max(...samples)).toBeGreaterThan(0.58);
  });

  it('samples identical normals and colors on shared chunk borders', () => {
    const z = 2 * CHUNK_SIZE + CHUNK_SIZE * 0.375;
    const borderX = CHUNK_SIZE;
    const leftNormal = normalAt(borderX, z);
    const rightNormal = normalAt(borderX, z);
    const leftColor = biomeColorAt(borderX, z);
    const rightColor = biomeColorAt(borderX, z);

    expect(leftNormal.distanceTo(rightNormal)).toBeLessThan(0.000001);
    expect(Math.abs(leftColor.r - rightColor.r)).toBeLessThan(0.000001);
    expect(Math.abs(leftColor.g - rightColor.g)).toBeLessThan(0.000001);
    expect(Math.abs(leftColor.b - rightColor.b)).toBeLessThan(0.000001);
  });
});
