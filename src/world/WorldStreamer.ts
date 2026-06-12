import * as THREE from "three";
import type { QualitySettings } from "../config/QualitySettings";
import { NatureFactory, updateGrassWindMaterials } from "./NatureFactory";
import { TerrainChunk } from "./TerrainChunk";
import { TerrainHeight } from "./TerrainHeight";
import type { CollisionHit } from "./Collision";

type BuildJob = {
  chunkX: number;
  chunkZ: number;
  distance: number;
  lod: number;
};

export type StreamStats = {
  chunks: number;
  cachedChunks: number;
  queued: number;
  estimatedMb: number;
  memoryBudgetMb: number;
  renderDistance: number;
  lod0: number;
  lod1: number;
  lod2: number;
  grassInstances: number;
  trunks: number;
  coniferCrowns: number;
  broadleafCrowns: number;
  colliders: number;
};

export class WorldStreamer {
  readonly group = new THREE.Group();
  readonly terrain = new TerrainHeight();

  private readonly nature = new NatureFactory();
  private readonly chunkSize = 64;
  private lastRenderDistance = 0;
  private lastMemoryBudgetMb = 0;
  private readonly chunks = new Map<string, TerrainChunk>();
  private readonly queue = new Map<string, BuildJob>();
  private frame = 0;
  private estimatedMb = 0;
  private readonly keepWarmFrames = 72;

  update(cameraPosition: THREE.Vector3, settings: QualitySettings, frameMs: number): void {
    this.frame += 1;
    const centerX = Math.round(cameraPosition.x / this.chunkSize);
    const centerZ = Math.round(cameraPosition.z / this.chunkSize);
    const renderDistance = Math.max(2, Math.round(settings.renderDistance));
    this.lastRenderDistance = renderDistance;
    this.lastMemoryBudgetMb = settings.memoryBudgetMb;

    for (const chunk of this.chunks.values()) {
      chunk.group.visible = false;
    }

    for (let z = -renderDistance; z <= renderDistance; z += 1) {
      for (let x = -renderDistance; x <= renderDistance; x += 1) {
        const distance = Math.hypot(x, z);
        if (distance > renderDistance + 0.35) {
          continue;
        }

        const chunkX = centerX + x;
        const chunkZ = centerZ + z;
        const key = TerrainChunk.key(chunkX, chunkZ);
        const lod = distance < 1.35 ? 0 : distance < Math.max(2.15, renderDistance * 0.55) ? 1 : 2;
        const existing = this.chunks.get(key);

        if (existing) {
          existing.lastTouchedFrame = this.frame;
          existing.group.visible = true;
        } else if (!this.queue.has(key)) {
          this.queue.set(key, { chunkX, chunkZ, distance, lod });
        }
      }
    }

    this.processQueue(settings, frameMs);

    if (this.frame % 8 === 0 || this.estimatedMb > settings.memoryBudgetMb) {
      this.evict(cameraPosition, settings, renderDistance);
    }
  }

  animateWind(time: number, strength: number): void {
    updateGrassWindMaterials(time, strength);
    for (const chunk of this.chunks.values()) {
      if (chunk.group.visible) {
        chunk.animateWind(time, strength);
      }
    }
  }

  getStats(): StreamStats {
    let lod0 = 0;
    let lod1 = 0;
    let lod2 = 0;
    let grassInstances = 0;
    let trunks = 0;
    let coniferCrowns = 0;
    let broadleafCrowns = 0;
    let colliders = 0;

    for (const chunk of this.chunks.values()) {
      if (!chunk.group.visible) {
        continue;
      }

      if (chunk.lod === 0) {
        lod0 += 1;
      } else if (chunk.lod === 1) {
        lod1 += 1;
      } else {
        lod2 += 1;
      }
      grassInstances += chunk.natureStats.grassInstances;
      trunks += chunk.natureStats.trunks;
      coniferCrowns += chunk.natureStats.coniferCrowns;
      broadleafCrowns += chunk.natureStats.broadleafCrowns;
      colliders += chunk.colliders.length;
    }

    return {
      chunks: lod0 + lod1 + lod2,
      cachedChunks: this.chunks.size,
      queued: this.queue.size,
      estimatedMb: this.estimatedMb,
      memoryBudgetMb: this.lastMemoryBudgetMb,
      renderDistance: this.lastRenderDistance,
      lod0,
      lod1,
      lod2,
      grassInstances,
      trunks,
      coniferCrowns,
      broadleafCrowns,
      colliders
    };
  }

  resolveCollision(position: { x: number; z: number }, actorRadius: number): number {
    return this.resolveCollisionDetailed(position, actorRadius).hits;
  }

  resolveCollisionDetailed(position: { x: number; z: number }, actorRadius: number): { hits: number; lastHit?: CollisionHit } {
    let hits = 0;
    let lastHit: CollisionHit | undefined;
    for (const chunk of this.chunks.values()) {
      if (chunk.group.visible) {
        const result = chunk.resolveCollisionDetailed(position, actorRadius);
        hits += result.hits;
        lastHit = result.lastHit ?? lastHit;
      }
    }
    return { hits, lastHit };
  }

  dispose(): void {
    for (const chunk of this.chunks.values()) {
      chunk.dispose();
    }
    this.chunks.clear();
    this.queue.clear();
  }

  private processQueue(settings: QualitySettings, frameMs: number): void {
    const pressureLimited = frameMs > 28 && this.chunks.size > 8;
    const maxJobs = pressureLimited ? 1 : Math.max(1, Math.min(2, Math.round(settings.cpuBudget)));
    const deadline = performance.now() + (pressureLimited ? 1.8 : Math.max(2.5, Math.min(5, settings.cpuBudget * 1.2)));

    for (let i = 0; i < maxJobs && this.queue.size > 0; i += 1) {
      if (i > 0 && performance.now() >= deadline) {
        break;
      }

      const job = this.takeNearestJob();
      if (!job) {
        break;
      }
      const key = TerrainChunk.key(job.chunkX, job.chunkZ);

      const nature = this.nature.buildChunk(
        job.chunkX,
        job.chunkZ,
        this.chunkSize,
        this.terrain,
        settings.grassDensity,
        settings.treeDensity,
        job.lod
      );
      const chunk = new TerrainChunk({
        chunkX: job.chunkX,
        chunkZ: job.chunkZ,
        chunkSize: this.chunkSize,
        lod: job.lod,
        terrain: this.terrain,
        nature
      });
      chunk.lastTouchedFrame = this.frame;
      chunk.group.visible = true;
      this.estimatedMb += chunk.estimatedMb;
      this.chunks.set(chunk.key, chunk);
      this.group.add(chunk.group);
    }
  }

  private takeNearestJob(): BuildJob | undefined {
    let bestKey = "";
    let bestJob: BuildJob | undefined;

    for (const [key, job] of this.queue) {
      if (!bestJob || job.distance < bestJob.distance) {
        bestKey = key;
        bestJob = job;
      }
    }

    if (bestJob) {
      this.queue.delete(bestKey);
    }

    return bestJob;
  }

  private evict(cameraPosition: THREE.Vector3, settings: QualitySettings, renderDistance: number): void {
    const maxAge = this.keepWarmFrames;
    const maxDistance = (renderDistance + 2.0) * this.chunkSize;
    const hardMemory = settings.memoryBudgetMb;
    const chunks = [...this.chunks.values()];
    const evictionCandidates = chunks
      .map((chunk) => {
        const [x, z] = chunk.key.split(":").map(Number);
        const worldX = x * this.chunkSize;
        const worldZ = z * this.chunkSize;
        const distance = Math.hypot(worldX - cameraPosition.x, worldZ - cameraPosition.z);
        return {
          chunk,
          distance,
          score: distance + Math.max(0, this.frame - chunk.lastTouchedFrame - maxAge) * 200
        };
      })
      .sort((a, b) => b.score - a.score);

    for (const candidate of evictionCandidates) {
      const stale = this.frame - candidate.chunk.lastTouchedFrame > maxAge || candidate.distance > maxDistance;
      const overBudget = this.estimatedMb > hardMemory;
      if (!stale && !overBudget) {
        break;
      }

      this.group.remove(candidate.chunk.group);
      candidate.chunk.dispose();
      this.chunks.delete(candidate.chunk.key);
      this.estimatedMb -= candidate.chunk.estimatedMb;
    }

    const maxQueued = Math.max(40, Math.round(settings.cpuBudget * 45));
    if (this.queue.size > maxQueued) {
      const extras = [...this.queue.values()]
        .sort((a, b) => b.distance - a.distance)
        .slice(0, this.queue.size - maxQueued);
      for (const extra of extras) {
        this.queue.delete(TerrainChunk.key(extra.chunkX, extra.chunkZ));
      }
    }
  }
}
