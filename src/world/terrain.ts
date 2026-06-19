import * as THREE from 'three';
import {
  CHUNK_BUILD_BUDGET_MS,
  CHUNK_SEGMENTS,
  CHUNK_SIZE,
  TERRAIN_RADIUS
} from './constants';
import { biomeColorAt, heightAt, normalAt } from './world';

export interface ChunkCoord {
  cx: number;
  cz: number;
}

interface TerrainChunk extends ChunkCoord {
  key: string;
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshLambertMaterial>;
}

export interface TerrainStats {
  loadedChunks: number;
  queuedChunks: number;
  lastBuilt: number;
  lastDisposed: number;
  lastBuildMs: number;
  estimatedGeometryMB: number;
}

const terrainMaterial = new THREE.MeshLambertMaterial({
  vertexColors: true,
  fog: true
});

export class TerrainSystem {
  readonly group = new THREE.Group();

  private readonly chunks = new Map<string, TerrainChunk>();
  private buildQueue: ChunkCoord[] = [];
  private queuedKeys = new Set<string>();
  private stats: TerrainStats = {
    loadedChunks: 0,
    queuedChunks: 0,
    lastBuilt: 0,
    lastDisposed: 0,
    lastBuildMs: 0,
    estimatedGeometryMB: 0
  };

  constructor() {
    this.group.name = 'terrain-chunks';
  }

  update(player: THREE.Vector3): TerrainStats {
    this.stats.lastBuilt = 0;
    this.stats.lastDisposed = 0;
    this.stats.lastBuildMs = 0;
    this.enqueueNeeded(player);
    this.buildNearest(player);
    this.disposeDistant(player);
    this.stats.loadedChunks = this.chunks.size;
    this.stats.queuedChunks = this.buildQueue.length;
    this.stats.estimatedGeometryMB = this.chunks.size * estimateChunkMB();
    return this.stats;
  }

  getLoadedChunkCoords(): ChunkCoord[] {
    return [...this.chunks.values()].map(({ cx, cz }) => ({ cx, cz }));
  }

  getStats(): TerrainStats {
    return { ...this.stats };
  }

  private enqueueNeeded(player: THREE.Vector3): void {
    const centerX = Math.floor(player.x / CHUNK_SIZE);
    const centerZ = Math.floor(player.z / CHUNK_SIZE);
    const desired: ChunkCoord[] = [];

    for (let dz = -TERRAIN_RADIUS; dz <= TERRAIN_RADIUS; dz += 1) {
      for (let dx = -TERRAIN_RADIUS; dx <= TERRAIN_RADIUS; dx += 1) {
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist <= TERRAIN_RADIUS + 0.35) {
          desired.push({ cx: centerX + dx, cz: centerZ + dz });
        }
      }
    }

    desired.sort((a, b) => distanceToChunk(a, player) - distanceToChunk(b, player));

    for (const coord of desired) {
      const key = chunkKey(coord.cx, coord.cz);
      if (!this.chunks.has(key) && !this.queuedKeys.has(key)) {
        this.buildQueue.push(coord);
        this.queuedKeys.add(key);
      }
    }
  }

  private buildNearest(player: THREE.Vector3): void {
    if (this.buildQueue.length === 0) return;

    this.buildQueue.sort((a, b) => distanceToChunk(a, player) - distanceToChunk(b, player));
    const started = performance.now();

    while (this.buildQueue.length > 0 && performance.now() - started < CHUNK_BUILD_BUDGET_MS) {
      const chunkStarted = performance.now();
      const coord = this.buildQueue.shift();
      if (!coord) return;
      const key = chunkKey(coord.cx, coord.cz);
      this.queuedKeys.delete(key);
      if (this.chunks.has(key)) continue;

      const chunk = this.createChunk(coord.cx, coord.cz, key);
      this.chunks.set(key, chunk);
      this.group.add(chunk.mesh);
      this.stats.lastBuilt += 1;
      this.stats.lastBuildMs += performance.now() - chunkStarted;
    }
  }

  private disposeDistant(player: THREE.Vector3): void {
    const centerX = Math.floor(player.x / CHUNK_SIZE);
    const centerZ = Math.floor(player.z / CHUNK_SIZE);
    const keepDistance = TERRAIN_RADIUS + 1.45;

    for (const [key, chunk] of this.chunks) {
      const dx = chunk.cx - centerX;
      const dz = chunk.cz - centerZ;
      if (Math.sqrt(dx * dx + dz * dz) > keepDistance) {
        this.group.remove(chunk.mesh);
        chunk.mesh.geometry.dispose();
        this.chunks.delete(key);
        this.stats.lastDisposed += 1;
      }
    }
  }

  private createChunk(cx: number, cz: number, key: string): TerrainChunk {
    const vertexCount = (CHUNK_SEGMENTS + 1) * (CHUNK_SEGMENTS + 1);
    const positions = new Float32Array(vertexCount * 3);
    const normals = new Float32Array(vertexCount * 3);
    const colors = new Float32Array(vertexCount * 3);
    const indices: number[] = [];
    const color = new THREE.Color();

    let i = 0;
    for (let z = 0; z <= CHUNK_SEGMENTS; z += 1) {
      for (let x = 0; x <= CHUNK_SEGMENTS; x += 1) {
        const localX = (x / CHUNK_SEGMENTS) * CHUNK_SIZE;
        const localZ = (z / CHUNK_SEGMENTS) * CHUNK_SIZE;
        const worldX = cx * CHUNK_SIZE + localX;
        const worldZ = cz * CHUNK_SIZE + localZ;
        const height = heightAt(worldX, worldZ);
        const normal = normalAt(worldX, worldZ);

        positions[i * 3] = localX;
        positions[i * 3 + 1] = height;
        positions[i * 3 + 2] = localZ;
        normals[i * 3] = normal.x;
        normals[i * 3 + 1] = normal.y;
        normals[i * 3 + 2] = normal.z;

        biomeColorAt(worldX, worldZ, color);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
        i += 1;
      }
    }

    for (let z = 0; z < CHUNK_SEGMENTS; z += 1) {
      for (let x = 0; x < CHUNK_SEGMENTS; x += 1) {
        const a = z * (CHUNK_SEGMENTS + 1) + x;
        const b = a + 1;
        const c = a + CHUNK_SEGMENTS + 1;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    const mesh = new THREE.Mesh(geometry, terrainMaterial);
    mesh.name = `terrain-${key}`;
    mesh.position.set(cx * CHUNK_SIZE, 0, cz * CHUNK_SIZE);
    mesh.receiveShadow = false;
    return { cx, cz, key, mesh };
  }
}

export function chunkKey(cx: number, cz: number): string {
  return `${cx},${cz}`;
}

function distanceToChunk(coord: ChunkCoord, player: THREE.Vector3): number {
  const centerX = coord.cx * CHUNK_SIZE + CHUNK_SIZE * 0.5;
  const centerZ = coord.cz * CHUNK_SIZE + CHUNK_SIZE * 0.5;
  return (centerX - player.x) ** 2 + (centerZ - player.z) ** 2;
}

function estimateChunkMB(): number {
  const vertices = (CHUNK_SEGMENTS + 1) * (CHUNK_SEGMENTS + 1);
  const indices = CHUNK_SEGMENTS * CHUNK_SEGMENTS * 6;
  const bytes = vertices * 3 * 4 * 3 + indices * 4;
  return bytes / 1024 / 1024;
}
