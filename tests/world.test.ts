import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { CHUNK_SIZE, SEA_LEVEL } from '../src/world/constants';
import { EnvironmentSystem } from '../src/world/environment';
import { ObjectiveSystem } from '../src/world/objective';
import { movementDirectionFromInput } from '../src/world/player';
import { WeatherSystem, weatherAt } from '../src/world/weather';
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

  it('maps forward input away from the chase camera direction', () => {
    const forward = movementDirectionFromInput(0, 0, -1);
    const backward = movementDirectionFromInput(0, 0, 1);

    expect(forward.z).toBeLessThan(-0.99);
    expect(backward.z).toBeGreaterThan(0.99);
  });

  it('keeps environment placement stats stable for the same loaded chunks', () => {
    const chunks = [
      { cx: 20, cz: -3 },
      { cx: 21, cz: -3 },
      { cx: 20, cz: -2 },
      { cx: 21, cz: -2 }
    ];
    const first = new EnvironmentSystem();
    const second = new EnvironmentSystem();

    const firstStats = first.sync(chunks);
    const secondStats = second.sync([...chunks].reverse());
    const firstTotal =
      firstStats.rocks + firstStats.flowers + firstStats.waystones + firstStats.crystals + firstStats.ruins;

    expect(firstTotal).toBeGreaterThan(0);
    expect(secondStats.rocks).toBe(firstStats.rocks);
    expect(secondStats.flowers).toBe(firstStats.flowers);
    expect(secondStats.waystones).toBe(firstStats.waystones);
    expect(secondStats.crystals).toBe(firstStats.crystals);
    expect(secondStats.ruins).toBe(firstStats.ruins);
    expect(firstStats.estimatedInstanceMB).toBeLessThan(1);
  });

  it('selects deterministic weather and produces forced precipitation particles', () => {
    expect(weatherAt(256, -512)).toBe(weatherAt(256, -512));

    const weather = new WeatherSystem();
    const player = new THREE.Vector3(0, 42, 0);

    weather.setOverride('rain');
    const rain = weather.update(player, 12);
    expect(rain.kind).toBe('rain');
    expect(rain.particles).toBeGreaterThan(500);

    weather.setOverride('snow');
    const snow = weather.update(player, 13);
    expect(snow.kind).toBe('snow');
    expect(snow.particles).toBeGreaterThan(450);

    weather.setOverride('clear');
    const clear = weather.update(player, 14);
    expect(clear.kind).toBe('clear');
    expect(clear.particles).toBe(0);
  });

  it('advances the weather beacon objective when targets are reached', () => {
    const origin = new THREE.Vector3(0, heightAt(0, 0), 0);
    const objective = new ObjectiveSystem(origin);

    for (let index = 0; index < 3; index += 1) {
      const target = objective.getActiveTarget();
      expect(target.y).toBeGreaterThan(SEA_LEVEL);
      objective.update(new THREE.Vector3(target.x, target.y, target.z), index);
    }

    expect(objective.getStats(origin).complete).toBe(true);
  });
});
