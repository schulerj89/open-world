import * as THREE from 'three';
import {
  CHUNK_SIZE,
  MAX_FLOWER_INSTANCES,
  MAX_LANDMARK_INSTANCES,
  MAX_ROCK_INSTANCES,
  SEA_LEVEL
} from './constants';
import { ChunkCoord } from './terrain';
import { forestDensityAt, heightAt, moistureAt, seededUnit, slopeAt } from './world';

interface Placement {
  x: number;
  y: number;
  z: number;
  scale: number;
  rotation: number;
  tint: number;
}

export interface EnvironmentStats {
  rocks: number;
  flowers: number;
  waystones: number;
  crystals: number;
  ruins: number;
  lastSyncMs: number;
  estimatedInstanceMB: number;
  sourceChunks: number;
}

const rockMaterial = new THREE.MeshLambertMaterial({ color: 0x6d6a5f, fog: true });
const flowerMaterial = new THREE.MeshLambertMaterial({ color: 0xd0ca62, fog: true });
const waystoneMaterial = new THREE.MeshLambertMaterial({ color: 0x777768, fog: true });
const crystalMaterial = new THREE.MeshPhongMaterial({
  color: 0x79b8c7,
  emissive: 0x173849,
  specular: 0xd9ffff,
  shininess: 46,
  fog: true
});
const ruinMaterial = new THREE.MeshLambertMaterial({ color: 0x8b8069, fog: true });

export class EnvironmentSystem {
  readonly group = new THREE.Group();

  private readonly rockMesh = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(1, 0),
    rockMaterial,
    MAX_ROCK_INSTANCES
  );
  private readonly flowerMesh = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.18, 0.42, 5),
    flowerMaterial,
    MAX_FLOWER_INSTANCES
  );
  private readonly waystoneMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.55, 1.8, 0.34),
    waystoneMaterial,
    MAX_LANDMARK_INSTANCES
  );
  private readonly crystalMesh = new THREE.InstancedMesh(
    new THREE.OctahedronGeometry(0.7, 0),
    crystalMaterial,
    MAX_LANDMARK_INSTANCES
  );
  private readonly ruinMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1.25, 0.72, 0.5),
    ruinMaterial,
    MAX_LANDMARK_INSTANCES
  );

  private readonly dummy = new THREE.Object3D();
  private signature = '';
  private stats: EnvironmentStats = {
    rocks: 0,
    flowers: 0,
    waystones: 0,
    crystals: 0,
    ruins: 0,
    lastSyncMs: 0,
    estimatedInstanceMB: 0,
    sourceChunks: 0
  };

  constructor() {
    this.group.name = 'instanced-environment-detail';
    for (const mesh of [
      this.rockMesh,
      this.flowerMesh,
      this.waystoneMesh,
      this.crystalMesh,
      this.ruinMesh
    ]) {
      mesh.count = 0;
      this.group.add(mesh);
    }
  }

  sync(chunks: ChunkCoord[]): EnvironmentStats {
    const signature = chunks
      .map((coord) => `${coord.cx},${coord.cz}`)
      .sort()
      .join('|');
    if (signature === this.signature) return this.stats;

    this.signature = signature;
    const started = performance.now();
    const rocks: Placement[] = [];
    const flowers: Placement[] = [];
    const waystones: Placement[] = [];
    const crystals: Placement[] = [];
    const ruins: Placement[] = [];

    for (const chunk of chunks) {
      this.collectChunk(chunk, rocks, flowers, waystones, crystals, ruins);
    }

    this.applyPlacements(this.rockMesh, rocks.slice(0, MAX_ROCK_INSTANCES), 'rock');
    this.applyPlacements(this.flowerMesh, flowers.slice(0, MAX_FLOWER_INSTANCES), 'flower');
    this.applyPlacements(this.waystoneMesh, waystones.slice(0, MAX_LANDMARK_INSTANCES), 'waystone');
    this.applyPlacements(this.crystalMesh, crystals.slice(0, MAX_LANDMARK_INSTANCES), 'crystal');
    this.applyPlacements(this.ruinMesh, ruins.slice(0, MAX_LANDMARK_INSTANCES), 'ruin');

    this.stats = {
      rocks: Math.min(rocks.length, MAX_ROCK_INSTANCES),
      flowers: Math.min(flowers.length, MAX_FLOWER_INSTANCES),
      waystones: Math.min(waystones.length, MAX_LANDMARK_INSTANCES),
      crystals: Math.min(crystals.length, MAX_LANDMARK_INSTANCES),
      ruins: Math.min(ruins.length, MAX_LANDMARK_INSTANCES),
      lastSyncMs: performance.now() - started,
      estimatedInstanceMB: estimateInstanceMB(
        Math.min(rocks.length, MAX_ROCK_INSTANCES) +
          Math.min(flowers.length, MAX_FLOWER_INSTANCES) +
          Math.min(waystones.length, MAX_LANDMARK_INSTANCES) +
          Math.min(crystals.length, MAX_LANDMARK_INSTANCES) +
          Math.min(ruins.length, MAX_LANDMARK_INSTANCES)
      ),
      sourceChunks: chunks.length
    };
    return this.stats;
  }

  getStats(): EnvironmentStats {
    return { ...this.stats };
  }

  private collectChunk(
    chunk: ChunkCoord,
    rocks: Placement[],
    flowers: Placement[],
    waystones: Placement[],
    crystals: Placement[],
    ruins: Placement[]
  ): void {
    this.collectScatter(chunk, rocks, flowers, crystals);
    this.collectLandmarks(chunk, waystones, ruins);
  }

  private collectScatter(
    chunk: ChunkCoord,
    rocks: Placement[],
    flowers: Placement[],
    crystals: Placement[]
  ): void {
    const cell = 11.5;
    for (let z = 5; z < CHUNK_SIZE; z += cell) {
      for (let x = 5; x < CHUNK_SIZE; x += cell) {
        const baseX = chunk.cx * CHUNK_SIZE + x;
        const baseZ = chunk.cz * CHUNK_SIZE + z;
        const wx = baseX + (seededUnit(baseX, baseZ, 801) - 0.5) * cell * 0.75;
        const wz = baseZ + (seededUnit(baseX, baseZ, 803) - 0.5) * cell * 0.75;
        const y = heightAt(wx, wz);
        if (y <= SEA_LEVEL + 1.4 || y > 150) continue;

        const moisture = moistureAt(wx, wz);
        const slope = slopeAt(wx, wz);
        const forest = forestDensityAt(wx, wz);
        const roll = seededUnit(baseX, baseZ, 809);

        if ((slope > 0.16 || y > 72 || moisture < 0.34) && roll > 0.36) {
          rocks.push({
            x: wx,
            y,
            z: wz,
            scale: 0.38 + seededUnit(baseX, baseZ, 811) * 1.2,
            rotation: seededUnit(baseX, baseZ, 813) * Math.PI * 2,
            tint: seededUnit(baseX, baseZ, 817)
          });
        }

        if (moisture > 0.48 && y < 78 && slope < 0.16 && forest < 0.72 && roll > 0.54) {
          flowers.push({
            x: wx + (seededUnit(baseX, baseZ, 819) - 0.5) * 5,
            y,
            z: wz + (seededUnit(baseX, baseZ, 821) - 0.5) * 5,
            scale: 0.8 + seededUnit(baseX, baseZ, 823) * 0.8,
            rotation: seededUnit(baseX, baseZ, 827) * Math.PI * 2,
            tint: seededUnit(baseX, baseZ, 829)
          });
        }

        if (y > 88 && slope < 0.24 && roll > 0.92) {
          crystals.push({
            x: wx,
            y,
            z: wz,
            scale: 0.7 + seededUnit(baseX, baseZ, 831) * 0.9,
            rotation: seededUnit(baseX, baseZ, 833) * Math.PI * 2,
            tint: seededUnit(baseX, baseZ, 839)
          });
        }
      }
    }
  }

  private collectLandmarks(chunk: ChunkCoord, waystones: Placement[], ruins: Placement[]): void {
    const centerX = chunk.cx * CHUNK_SIZE + CHUNK_SIZE * 0.5;
    const centerZ = chunk.cz * CHUNK_SIZE + CHUNK_SIZE * 0.5;
    const y = heightAt(centerX, centerZ);
    if (y <= SEA_LEVEL + 3 || y > 118 || slopeAt(centerX, centerZ) > 0.24) return;

    const roll = seededUnit(chunk.cx, chunk.cz, 853);
    if (roll > 0.92) {
      const count = 4 + Math.floor(seededUnit(chunk.cx, chunk.cz, 857) * 3);
      const radius = 5.2 + seededUnit(chunk.cx, chunk.cz, 859) * 3.6;
      for (let i = 0; i < count; i += 1) {
        const angle = (i / count) * Math.PI * 2 + seededUnit(chunk.cx + i, chunk.cz, 863) * 0.35;
        const x = centerX + Math.cos(angle) * radius;
        const z = centerZ + Math.sin(angle) * radius;
        waystones.push({
          x,
          y: heightAt(x, z),
          z,
          scale: 0.82 + seededUnit(chunk.cx + i, chunk.cz, 867) * 0.45,
          rotation: angle + Math.PI * 0.5,
          tint: seededUnit(chunk.cx + i, chunk.cz, 869)
        });
      }
    } else if (roll > 0.84) {
      const count = 3 + Math.floor(seededUnit(chunk.cx, chunk.cz, 877) * 4);
      for (let i = 0; i < count; i += 1) {
        const x = centerX + (seededUnit(chunk.cx + i, chunk.cz, 881) - 0.5) * 18;
        const z = centerZ + (seededUnit(chunk.cx, chunk.cz + i, 883) - 0.5) * 18;
        ruins.push({
          x,
          y: heightAt(x, z),
          z,
          scale: 0.7 + seededUnit(chunk.cx + i, chunk.cz, 887) * 0.8,
          rotation: seededUnit(chunk.cx + i, chunk.cz, 889) * Math.PI * 2,
          tint: seededUnit(chunk.cx + i, chunk.cz, 891)
        });
      }
    }
  }

  private applyPlacements(mesh: THREE.InstancedMesh, placements: Placement[], type: string): void {
    const base = colorFor(type, 0);
    const accent = colorFor(type, 1);
    placements.forEach((placement, index) => {
      this.dummy.position.set(placement.x, placement.y + yOffset(type, placement.scale), placement.z);
      this.dummy.rotation.set(
        type === 'waystone' ? (placement.tint - 0.5) * 0.16 : 0,
        placement.rotation,
        type === 'waystone' ? (placement.tint - 0.5) * 0.12 : 0
      );
      const sy = type === 'waystone' ? placement.scale * 1.8 : placement.scale;
      this.dummy.scale.set(placement.scale, sy, placement.scale);
      if (type === 'ruin') {
        this.dummy.scale.set(placement.scale * 1.9, placement.scale, placement.scale * 0.8);
      }
      if (type === 'flower') {
        this.dummy.scale.set(placement.scale, placement.scale * 1.4, placement.scale);
      }
      this.dummy.updateMatrix();
      mesh.setMatrixAt(index, this.dummy.matrix);
      mesh.setColorAt(index, base.clone().lerp(accent, placement.tint));
    });

    mesh.count = placements.length;
    mesh.instanceMatrix.needsUpdate = true;
    const instanceColor = mesh.instanceColor;
    if (instanceColor) {
      instanceColor.needsUpdate = true;
    }
    mesh.computeBoundingSphere();
  }
}

function yOffset(type: string, scale: number): number {
  if (type === 'waystone') return scale * 1.6;
  if (type === 'ruin') return scale * 0.38;
  if (type === 'flower') return scale * 0.2;
  if (type === 'crystal') return scale * 0.7;
  return scale * 0.48;
}

function colorFor(type: string, variant: 0 | 1): THREE.Color {
  const colors: Record<string, [number, number]> = {
    rock: [0x5f625c, 0x8a846f],
    flower: [0xf0d05d, 0xcc73b6],
    waystone: [0x65685f, 0xa7a18d],
    crystal: [0x6eb1c7, 0xc8f4ff],
    ruin: [0x817763, 0xb19b76]
  };
  return new THREE.Color(colors[type][variant]);
}

function estimateInstanceMB(instances: number): number {
  const matrixBytes = instances * 16 * 4;
  const colorBytes = instances * 3 * 4;
  return (matrixBytes + colorBytes) / 1024 / 1024;
}
