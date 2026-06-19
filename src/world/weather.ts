import * as THREE from 'three';
import {
  FOG_COLOR,
  FOG_FAR,
  FOG_NEAR,
  SEA_LEVEL,
  WORLD_SEED
} from './constants';
import { fbm, smoothstep } from './noise';
import { sampleWorld } from './world';

export const WEATHER_KINDS = ['auto', 'clear', 'cloudy', 'rain', 'snow'] as const;
export type WeatherOverride = (typeof WEATHER_KINDS)[number];
export type WeatherKind = Exclude<WeatherOverride, 'auto'>;

export interface WeatherStats {
  kind: WeatherKind;
  override: WeatherOverride;
  intensity: number;
  particles: number;
  windX: number;
  windZ: number;
}

export interface WeatherVisuals {
  fogColor: number;
  fogNear: number;
  fogFar: number;
  zenithColor: number;
  horizonColor: number;
  sunIntensity: number;
  sunOpacity: number;
  hemisphereIntensity: number;
  ambientIntensity: number;
  cloudOpacityScale: number;
}

const RAIN_STREAKS = 900;
const SNOW_FLAKES = 720;
const WEATHER_RANGE = 86;
const WEATHER_HEIGHT = 38;
const FOG_TINT = {
  clear: FOG_COLOR,
  cloudy: 0xc9d8d5,
  rain: 0x9fb7bd,
  snow: 0xdde8e9
} satisfies Record<WeatherKind, number>;

export class WeatherSystem {
  readonly group = new THREE.Group();

  private readonly rainPositions = new Float32Array(RAIN_STREAKS * 2 * 3);
  private readonly snowPositions = new Float32Array(SNOW_FLAKES * 3);
  private readonly rainGeometry = new THREE.BufferGeometry();
  private readonly snowGeometry = new THREE.BufferGeometry();
  private readonly rain = new THREE.LineSegments(
    this.rainGeometry,
    new THREE.LineBasicMaterial({
      color: 0xb8d3dc,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
      fog: false
    })
  );
  private readonly snow = new THREE.Points(
    this.snowGeometry,
    new THREE.PointsMaterial({
      color: 0xf4fbff,
      transparent: true,
      opacity: 0.78,
      size: 0.18,
      depthWrite: false,
      fog: false
    })
  );
  private override: WeatherOverride = 'auto';
  private current: WeatherKind = 'clear';
  private intensity = 0;
  private wind = new THREE.Vector2(2.8, -1.1);
  private lastSampleTime = -Infinity;
  private lastSampleX = Infinity;
  private lastSampleZ = Infinity;
  private lastSampleOverride: WeatherOverride = 'auto';
  private stats: WeatherStats = {
    kind: 'clear',
    override: 'auto',
    intensity: 0,
    particles: 0,
    windX: this.wind.x,
    windZ: this.wind.y
  };

  constructor() {
    this.group.name = 'weather-particles';
    this.rain.name = 'rain-streaks';
    this.snow.name = 'snow-flakes';
    this.rainGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.rainPositions, 3).setUsage(THREE.DynamicDrawUsage)
    );
    this.snowGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.snowPositions, 3).setUsage(THREE.DynamicDrawUsage)
    );
    this.rain.frustumCulled = false;
    this.snow.frustumCulled = false;
    this.group.add(this.rain, this.snow);
  }

  setOverride(next: WeatherOverride): void {
    this.override = WEATHER_KINDS.includes(next) ? next : 'auto';
  }

  cycleOverride(): WeatherOverride {
    const index = WEATHER_KINDS.indexOf(this.override);
    this.override = WEATHER_KINDS[(index + 1) % WEATHER_KINDS.length];
    return this.override;
  }

  getOverride(): WeatherOverride {
    return this.override;
  }

  update(player: THREE.Vector3, time: number): WeatherStats {
    const moved = (player.x - this.lastSampleX) ** 2 + (player.z - this.lastSampleZ) ** 2 > 48 ** 2;
    const shouldSample =
      this.override !== this.lastSampleOverride || moved || time - this.lastSampleTime > 0.9;
    if (shouldSample) {
      const auto = weatherAt(player.x, player.z);
      this.current = this.override === 'auto' ? auto : this.override;
      this.intensity = intensityFor(this.current, player.x, player.z);
      this.wind.set(
        1.6 + fbm(player.x * 0.0015, player.z * 0.0015, WORLD_SEED + 909, 3) * 4.2,
        -1.1 + fbm(player.x * 0.0015, player.z * 0.0015, WORLD_SEED + 917, 3) * 3.8
      );
      this.lastSampleTime = time;
      this.lastSampleX = player.x;
      this.lastSampleZ = player.z;
      this.lastSampleOverride = this.override;
    }

    const rainParticles = this.current === 'rain' ? this.updateRain(player, time) : 0;
    const snowParticles = this.current === 'snow' ? this.updateSnow(player, time) : 0;
    this.rain.visible = rainParticles > 0;
    this.snow.visible = snowParticles > 0;

    this.stats = {
      kind: this.current,
      override: this.override,
      intensity: this.intensity,
      particles: rainParticles + snowParticles,
      windX: this.wind.x,
      windZ: this.wind.y
    };
    return this.stats;
  }

  getVisuals(): WeatherVisuals {
    return visualsFor(this.current, this.intensity);
  }

  getStats(): WeatherStats {
    return { ...this.stats };
  }

  private updateRain(player: THREE.Vector3, time: number): number {
    const count = Math.floor(RAIN_STREAKS * (0.72 + this.intensity * 0.28));
    const range = WEATHER_RANGE;
    for (let i = 0; i < count; i += 1) {
      const rx = seeded(i, 3) * range - range * 0.5;
      const rz = seeded(i, 7) * range - range * 0.5;
      const drop = wrap(seeded(i, 11) * WEATHER_HEIGHT - time * (24 + this.intensity * 14), WEATHER_HEIGHT);
      const x = player.x + wrap(rx + this.wind.x * time * 3.4, range);
      const z = player.z + wrap(rz + this.wind.y * time * 3.4, range);
      const y = player.y + 4 + drop;
      const base = i * 6;
      this.rainPositions[base] = x;
      this.rainPositions[base + 1] = y;
      this.rainPositions[base + 2] = z;
      this.rainPositions[base + 3] = x - this.wind.x * 0.08;
      this.rainPositions[base + 4] = y - 1.8;
      this.rainPositions[base + 5] = z - this.wind.y * 0.08;
    }
    this.rainGeometry.setDrawRange(0, count * 2);
    this.rainGeometry.attributes.position.needsUpdate = true;
    return count;
  }

  private updateSnow(player: THREE.Vector3, time: number): number {
    const count = Math.floor(SNOW_FLAKES * (0.68 + this.intensity * 0.32));
    const range = WEATHER_RANGE;
    for (let i = 0; i < count; i += 1) {
      const sway = Math.sin(time * 0.9 + i * 1.73) * 1.7;
      const rx = seeded(i, 29) * range - range * 0.5;
      const rz = seeded(i, 31) * range - range * 0.5;
      const fall = wrap(seeded(i, 37) * WEATHER_HEIGHT - time * (4.6 + this.intensity * 2.8), WEATHER_HEIGHT);
      const base = i * 3;
      this.snowPositions[base] = player.x + wrap(rx + this.wind.x * time * 0.7 + sway, range);
      this.snowPositions[base + 1] = player.y + 4 + fall;
      this.snowPositions[base + 2] = player.z + wrap(rz + this.wind.y * time * 0.52, range);
    }
    this.snowGeometry.setDrawRange(0, count);
    this.snowGeometry.attributes.position.needsUpdate = true;
    return count;
  }
}

export function weatherAt(x: number, z: number): WeatherKind {
  const sample = sampleWorld(x, z);
  const weatherBand = fbm(x * 0.00125, z * 0.00125, WORLD_SEED + 701, 4);
  const cold = smoothstep(92, 148, sample.height);
  const wet = smoothstep(0.5, 0.78, sample.moisture);

  if (sample.height > 128 && sample.moisture > 0.38 && weatherBand > -0.34) return 'snow';
  if (sample.height > 88 && wet > 0.58 && weatherBand > 0.2) return 'snow';
  if (sample.height > SEA_LEVEL + 3 && wet > 0.7 && weatherBand > -0.18) return 'rain';
  if (wet > 0.48 || weatherBand + cold * 0.3 > 0.18) return 'cloudy';
  return 'clear';
}

function intensityFor(kind: WeatherKind, x: number, z: number): number {
  if (kind === 'clear') return 0;
  const storm = smoothstep(-0.55, 0.72, fbm(x * 0.0018, z * 0.0018, WORLD_SEED + 733, 4));
  if (kind === 'cloudy') return 0.45 + storm * 0.3;
  if (kind === 'rain') return 0.58 + storm * 0.36;
  return 0.52 + storm * 0.4;
}

function visualsFor(kind: WeatherKind, intensity: number): WeatherVisuals {
  const fogScale = {
    clear: [1, 1],
    cloudy: [0.9, 0.98],
    rain: [0.78, 0.88],
    snow: [0.7, 0.82]
  } satisfies Record<WeatherKind, [number, number]>;
  const light = {
    clear: [2.15, 1, 1.82, 0.18, 1],
    cloudy: [1.5, 0.72, 1.72, 0.2, 1.36],
    rain: [1.05, 0.38, 1.55, 0.22, 1.62],
    snow: [1.22, 0.42, 1.7, 0.24, 1.52]
  } satisfies Record<WeatherKind, [number, number, number, number, number]>;
  const sky = {
    clear: [0x1e67b4, FOG_COLOR],
    cloudy: [0x6e9fb4, 0xc9d8d5],
    rain: [0x506f82, 0x9fb7bd],
    snow: [0x9abbd0, 0xdde8e9]
  } satisfies Record<WeatherKind, [number, number]>;

  const [nearScale, farScale] = fogScale[kind];
  const [sunIntensity, sunOpacity, hemi, ambient, cloudOpacity] = light[kind];
  const [zenith, horizon] = sky[kind];
  return {
    fogColor: FOG_TINT[kind],
    fogNear: FOG_NEAR * (nearScale - intensity * 0.05),
    fogFar: FOG_FAR * (farScale - intensity * 0.04),
    zenithColor: zenith,
    horizonColor: horizon,
    sunIntensity,
    sunOpacity,
    hemisphereIntensity: hemi,
    ambientIntensity: ambient,
    cloudOpacityScale: cloudOpacity
  };
}

function seeded(index: number, salt: number): number {
  return Math.abs(Math.sin(index * 127.1 + salt * 311.7 + WORLD_SEED * 0.017) * 43758.5453) % 1;
}

function wrap(value: number, range: number): number {
  return ((((value % range) + range) % range) + range * 0.5) % range - range * 0.5;
}
