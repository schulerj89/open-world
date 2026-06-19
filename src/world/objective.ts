import * as THREE from 'three';
import { SEA_LEVEL, WATER_BLOCK_MARGIN } from './constants';
import { smoothstep } from './noise';
import { heightAt, sampleWorld, slopeAt } from './world';

interface ObjectiveSite {
  name: string;
  x: number;
  y: number;
  z: number;
}

interface BeaconVisual {
  group: THREE.Group;
  core: THREE.Mesh<THREE.ConeGeometry, THREE.MeshPhongMaterial>;
  ring: THREE.Mesh<THREE.TorusGeometry, THREE.MeshPhongMaterial>;
  beam: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshBasicMaterial>;
}

export interface ObjectiveStats {
  title: string;
  completed: number;
  total: number;
  activeIndex: number;
  activeName: string;
  distance: number;
  bearing: string;
  target: { x: number; y: number; z: number };
  complete: boolean;
}

const OBJECTIVE_RADIUS = 12;

export class ObjectiveSystem {
  readonly group = new THREE.Group();

  private readonly sites: ObjectiveSite[];
  private readonly visuals: BeaconVisual[] = [];
  private activeIndex = 0;
  private lastDistance = Infinity;

  constructor(origin: THREE.Vector3) {
    this.group.name = 'weather-beacon-objectives';
    this.sites = findObjectiveSites(origin);
    this.sites.forEach((site, index) => this.addBeacon(site, index));
  }

  update(player: THREE.Vector3, time: number): ObjectiveStats {
    const target = this.getActiveSite();
    if (target) {
      this.lastDistance = Math.hypot(target.x - player.x, target.z - player.z);
      if (this.lastDistance < OBJECTIVE_RADIUS) {
        this.activeIndex += 1;
      }
    }

    this.visuals.forEach((visual, index) => {
      const completed = index < this.activeIndex;
      const active = index === this.activeIndex;
      const pulse = active ? 1 + Math.sin(time * 3.2) * 0.08 : 1;
      visual.group.scale.setScalar(pulse);
      visual.core.material.emissive.setHex(active ? 0x335766 : completed ? 0x1d402e : 0x1c262b);
      visual.core.material.color.setHex(active ? 0x76d2dd : completed ? 0x85c77f : 0x7f8f8a);
      visual.ring.material.emissive.setHex(active ? 0x2a6e7f : completed ? 0x294f2e : 0x1b2b2e);
      visual.beam.material.opacity = active ? 0.42 : completed ? 0.24 : 0.12;
      visual.ring.rotation.y = time * (active ? 0.85 : 0.18) + index;
    });

    return this.getStats(player);
  }

  getActiveTarget(): { x: number; y: number; z: number } {
    const site = this.getActiveSite() ?? this.sites[this.sites.length - 1];
    return { x: site.x, y: site.y, z: site.z };
  }

  getStats(player?: THREE.Vector3): ObjectiveStats {
    const complete = this.activeIndex >= this.sites.length;
    const site = this.getActiveSite() ?? this.sites[this.sites.length - 1];
    const distance = player ? Math.hypot(site.x - player.x, site.z - player.z) : this.lastDistance;
    return {
      title: complete ? 'Weather beacons stabilized' : 'Find the weather beacons',
      completed: Math.min(this.activeIndex, this.sites.length),
      total: this.sites.length,
      activeIndex: Math.min(this.activeIndex, this.sites.length - 1),
      activeName: complete ? 'Complete' : site.name,
      distance,
      bearing: player ? cardinalBearing(site.x - player.x, site.z - player.z) : '--',
      target: { x: site.x, y: site.y, z: site.z },
      complete
    };
  }

  private getActiveSite(): ObjectiveSite | null {
    return this.sites[this.activeIndex] ?? null;
  }

  private addBeacon(site: ObjectiveSite, index: number): void {
    const group = new THREE.Group();
    group.name = `objective-${index + 1}-${site.name.toLowerCase().replaceAll(' ', '-')}`;
    group.position.set(site.x, site.y + 0.08, site.z);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.35, 0.38, 6),
      new THREE.MeshLambertMaterial({ color: 0x5f685f, fog: true })
    );
    base.position.y = 0.2;

    const core = new THREE.Mesh(
      new THREE.ConeGeometry(0.72, 4.2, 6),
      new THREE.MeshPhongMaterial({
        color: 0x76d2dd,
        emissive: 0x335766,
        specular: 0xd7ffff,
        shininess: 38,
        fog: true
      })
    );
    core.position.y = 2.48;

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.18, 0.06, 5, 12),
      new THREE.MeshPhongMaterial({
        color: 0xb8f0e6,
        emissive: 0x2a6e7f,
        specular: 0xffffff,
        shininess: 50,
        fog: true
      })
    );
    ring.position.y = 4.25;
    ring.rotation.x = Math.PI * 0.5;

    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.28, 8.5, 6, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0x9ff5ee,
        transparent: true,
        opacity: 0.34,
        depthWrite: false,
        fog: true
      })
    );
    beam.position.y = 4.65;

    group.add(base, core, beam, ring);
    this.group.add(group);
    this.visuals.push({ group, core, ring, beam });
  }
}

function findObjectiveSites(origin: THREE.Vector3): ObjectiveSite[] {
  return [
    findSite(origin, 'Shore Beacon', 0),
    findSite(origin, 'Canopy Beacon', 1),
    findSite(origin, 'Ridge Beacon', 2)
  ];
}

function findSite(origin: THREE.Vector3, name: string, stage: number): ObjectiveSite {
  let best = { x: origin.x + 160 + stage * 110, z: origin.z + 100, y: 0, score: -Infinity };
  const minRadius = 180 + stage * 190;
  const maxRadius = 430 + stage * 260;
  for (let radius = minRadius; radius <= maxRadius; radius += 42) {
    for (let step = 0; step < 40; step += 1) {
      const angle = step * 0.157 + stage * 1.7;
      const x = origin.x + Math.cos(angle) * radius;
      const z = origin.z + Math.sin(angle) * radius;
      const y = heightAt(x, z);
      if (y <= SEA_LEVEL + WATER_BLOCK_MARGIN || y > 142) continue;
      const slope = slopeAt(x, z);
      if (slope > 0.32) continue;
      const sample = sampleWorld(x, z);
      const score =
        stageScore(stage, sample.biome, y, sample.moisture) -
        Math.abs(radius - (minRadius + maxRadius) * 0.5) * 0.002 -
        slope * 1.8 +
        Math.sin(x * 0.037 + z * 0.021) * 0.12;
      if (score > best.score) {
        best = { x, y, z, score };
      }
    }
  }

  if (best.score === -Infinity) return fallbackSite(origin, name, stage);
  return { name, x: best.x, y: best.y, z: best.z };
}

function fallbackSite(origin: THREE.Vector3, name: string, stage: number): ObjectiveSite {
  let best = { x: origin.x + 180 + stage * 120, z: origin.z + 80, y: 0, score: -Infinity };
  for (let radius = 120; radius <= 2600; radius += 64) {
    for (let step = 0; step < 56; step += 1) {
      const angle = step * 0.112 + stage * 1.1;
      const x = origin.x + Math.cos(angle) * radius;
      const z = origin.z + Math.sin(angle) * radius;
      const y = heightAt(x, z);
      if (y <= SEA_LEVEL + WATER_BLOCK_MARGIN || y > 148) continue;
      const slope = slopeAt(x, z);
      if (slope > 0.36) continue;
      const score = y * 0.015 - slope * 1.6 - Math.abs(radius - (260 + stage * 220)) * 0.001;
      if (score > best.score) best = { x, y, z, score };
    }
  }
  if (best.score === -Infinity) {
    best.y = Math.max(SEA_LEVEL + WATER_BLOCK_MARGIN + 1, heightAt(best.x, best.z));
  }
  return { name, x: best.x, y: best.y, z: best.z };
}

function stageScore(stage: number, biome: string, height: number, moisture: number): number {
  if (stage === 0) {
    return 1.2 - Math.abs(height - (SEA_LEVEL + 6)) * 0.08 + smoothstep(0.28, 0.62, moisture) * 0.4;
  }
  if (stage === 1) {
    return (biome === 'forest' ? 1.8 : 0.2) + smoothstep(0.5, 0.82, moisture);
  }
  return (biome === 'rock' || biome === 'snow' ? 1.6 : 0.1) + smoothstep(72, 132, height) * 1.2;
}

function cardinalBearing(dx: number, dz: number): string {
  const angle = Math.atan2(dx, -dz);
  const sectors = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(((angle + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4)) % sectors.length;
  return sectors[index];
}
