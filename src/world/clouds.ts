import * as THREE from 'three';
import { WeatherVisuals } from './weather';

interface CloudPuff {
  sprite: THREE.Sprite;
  baseOpacity: number;
  baseColor: THREE.Color;
  offsetX: number;
  offsetZ: number;
  altitude: number;
  drift: number;
  speed: number;
}

export class CloudSystem {
  readonly group = new THREE.Group();

  private readonly puffs: CloudPuff[] = [];
  private readonly range = 640;
  private readonly texture: THREE.Texture;
  private readonly seed = Math.random() * 1000;

  constructor() {
    this.group.name = 'billboard-clouds';
    this.texture = createCloudTexture();

    for (let i = 0; i < 26; i += 1) {
      const genera = i % 3;
      const opacity = genera === 2 ? 0.62 : 0.78;
      const material = new THREE.SpriteMaterial({
        map: this.texture,
        color: genera === 0 ? 0xffffff : genera === 1 ? 0xf0f5f2 : 0xdde8e7,
        transparent: true,
        opacity,
        depthWrite: false,
        fog: true
      });
      const sprite = new THREE.Sprite(material);
      const size = 34 + random(i, this.seed) * 46 + genera * 20;
      sprite.scale.set(size * (1.6 + random(i + 31, this.seed) * 1.6), size * 0.42, 1);
      this.group.add(sprite);
      this.puffs.push({
        sprite,
        baseOpacity: opacity,
        baseColor: material.color.clone(),
        offsetX: random(i + 7, this.seed) * this.range - this.range * 0.5,
        offsetZ: random(i + 13, this.seed) * this.range - this.range * 0.5,
        altitude: 44 + genera * 24 + random(i + 17, this.seed) * 22,
        drift: random(i + 19, this.seed) * 100,
        speed: 2 + random(i + 23, this.seed) * 4
      });
    }
  }

  update(player: THREE.Vector3, time: number): void {
    for (const puff of this.puffs) {
      const x = wrapOffset(puff.offsetX + time * puff.speed + puff.drift, this.range);
      const z = wrapOffset(puff.offsetZ + time * puff.speed * 0.38, this.range);
      puff.sprite.position.set(player.x + x, puff.altitude, player.z + z);
    }
  }

  setWeather(visuals: WeatherVisuals): void {
    const weatherColor = new THREE.Color(visuals.horizonColor);
    const tintAmount = Math.max(0, visuals.cloudOpacityScale - 1) * 0.28;
    for (const puff of this.puffs) {
      const material = puff.sprite.material as THREE.SpriteMaterial;
      material.opacity = Math.min(0.92, puff.baseOpacity * visuals.cloudOpacityScale);
      material.color.copy(puff.baseColor).lerp(weatherColor, tintAmount);
    }
  }
}

function createCloudTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create cloud canvas');
  ctx.clearRect(0, 0, 256, 128);
  const circles = [
    [66, 72, 40],
    [104, 54, 50],
    [150, 62, 45],
    [188, 74, 34],
    [128, 84, 54]
  ];
  for (const [x, y, r] of circles) {
    const gradient = ctx.createRadialGradient(x, y, r * 0.15, x, y, r);
    gradient.addColorStop(0, 'rgba(255,255,255,0.84)');
    gradient.addColorStop(0.58, 'rgba(255,255,255,0.52)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function random(index: number, seed: number): number {
  return Math.abs(Math.sin(index * 127.1 + seed * 311.7) * 43758.5453) % 1;
}

function wrapOffset(value: number, range: number): number {
  return ((((value + range * 0.5) % range) + range) % range) - range * 0.5;
}
