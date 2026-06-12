import * as THREE from "three";
import { getTextureAssets } from "../render/TextureAssets";
import { resolveCircleCollisionDetailed, type CircleCollider, type CollisionHit } from "./Collision";
import type { TerrainHeight } from "./TerrainHeight";
import type { NatureBuildResult, NatureStats, NatureWindTarget } from "./NatureFactory";

const assets = getTextureAssets();
const grassTerrainMaterial = new THREE.MeshLambertMaterial({
  map: assets.grassColor,
  vertexColors: true
});
const rockTerrainMaterial = new THREE.MeshLambertMaterial({
  map: assets.rockColor,
  vertexColors: true
});

export type TerrainChunkParams = {
  chunkX: number;
  chunkZ: number;
  chunkSize: number;
  lod: number;
  terrain: TerrainHeight;
  nature: NatureBuildResult;
};

export class TerrainChunk {
  readonly key: string;
  readonly group = new THREE.Group();
  readonly windTargets: NatureWindTarget[];
  readonly colliders: CircleCollider[];
  readonly estimatedMb: number;
  readonly lod: number;
  readonly natureStats: NatureStats;
  lastTouchedFrame = 0;

  constructor(params: TerrainChunkParams) {
    this.key = TerrainChunk.key(params.chunkX, params.chunkZ);
    this.lod = params.lod;
    this.natureStats = params.nature.stats;
    const terrainMesh = this.buildTerrain(params);
    this.group.add(terrainMesh);
    this.group.add(params.nature.group);
    this.windTargets = params.nature.windTargets;
    this.colliders = params.nature.colliders;
    this.estimatedMb = this.estimateTerrainMb(terrainMesh.geometry) + params.nature.estimatedMb;
  }

  static key(chunkX: number, chunkZ: number): string {
    return `${chunkX}:${chunkZ}`;
  }

  dispose(): void {
    this.group.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.InstancedMesh) {
        if (!object.geometry.userData.shared) {
          object.geometry.dispose();
        }
      }
    });
  }

  animateWind(time: number, strength: number): void {
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const rotation = new THREE.Euler();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();

    for (const target of this.windTargets) {
      const count = target.mesh.count;
      for (let i = 0; i < count; i += 1) {
        const cursor = i * 7;
        const phase = target.phases[i];
        const sway = Math.sin(time * 1.45 + phase) * target.amplitudes[i] * strength * 1.4;
        position.set(
          target.bases[cursor] + Math.cos(phase) * sway,
          target.bases[cursor + 1],
          target.bases[cursor + 2] + Math.sin(phase) * sway
        );
        rotation.set(
          Math.sin(time * 1.15 + phase) * 0.055 * strength,
          target.bases[cursor + 6],
          Math.cos(time * 1.35 + phase) * 0.055 * strength
        );
        quaternion.setFromEuler(rotation);
        scale.set(target.bases[cursor + 3], target.bases[cursor + 4], target.bases[cursor + 5]);
        matrix.compose(position, quaternion, scale);
        target.mesh.setMatrixAt(i, matrix);
      }
      target.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  resolveCollision(position: { x: number; z: number }, actorRadius: number): number {
    return this.resolveCollisionDetailed(position, actorRadius).hits;
  }

  resolveCollisionDetailed(position: { x: number; z: number }, actorRadius: number): { hits: number; lastHit?: CollisionHit } {
    let hits = 0;
    let lastHit: CollisionHit | undefined;
    for (const collider of this.colliders) {
      const hit = resolveCircleCollisionDetailed(position, collider, actorRadius, collider.owner ?? `chunk ${this.key}`);
      if (hit) {
        hits += 1;
        lastHit = hit;
      }
    }
    return { hits, lastHit };
  }

  private buildTerrain(params: TerrainChunkParams): THREE.Mesh {
    const segments = params.lod === 0 ? 34 : params.lod === 1 ? 16 : 8;
    const vertexCount = (segments + 1) * (segments + 1);
    const positions = new Float32Array(vertexCount * 3);
    const colors = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);
    const heights = new Float32Array(vertexCount);
    const indices: number[] = [];
    const color = new THREE.Color();
    const snowColor = new THREE.Color("#f2f0e8");
    let rocky = 0;

    for (let z = 0; z <= segments; z += 1) {
      for (let x = 0; x <= segments; x += 1) {
        const cursor = z * (segments + 1) + x;
        const px = (x / segments - 0.5) * params.chunkSize + params.chunkX * params.chunkSize;
        const pz = (z / segments - 0.5) * params.chunkSize + params.chunkZ * params.chunkSize;
        const py = params.terrain.getHeight(px, pz);

        heights[cursor] = py;
        positions[cursor * 3] = px;
        positions[cursor * 3 + 1] = py;
        positions[cursor * 3 + 2] = pz;
        uvs[cursor * 2] = px / 22;
        uvs[cursor * 2 + 1] = pz / 22;
      }
    }

    for (let z = 0; z <= segments; z += 1) {
      for (let x = 0; x <= segments; x += 1) {
        const cursor = z * (segments + 1) + x;
        const py = heights[cursor];
        const east = heights[z * (segments + 1) + Math.min(segments, x + 1)];
        const south = heights[Math.min(segments, z + 1) * (segments + 1) + x];
        const slope = Math.abs(east - py) + Math.abs(south - py);

        if (py > 88) {
          color.set("#b9b7ad").lerp(snowColor, Math.min(1, (py - 58) / 90));
          rocky += 1;
        } else if (slope > 4.7) {
          color.set("#8a866f");
          rocky += 1;
        } else if (py < -2) {
          color.set("#5f7d56");
        } else {
          color.set("#456f44").lerp(new THREE.Color("#8f9d5a"), Math.min(1, py / 40));
        }
        colors[cursor * 3] = color.r;
        colors[cursor * 3 + 1] = color.g;
        colors[cursor * 3 + 2] = color.b;
      }
    }

    for (let z = 0; z < segments; z += 1) {
      for (let x = 0; x < segments; x += 1) {
        const a = z * (segments + 1) + x;
        const b = a + 1;
        const c = a + segments + 1;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const material = rocky / vertexCount > 0.42 ? rockTerrainMaterial : grassTerrainMaterial;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    return mesh;
  }

  private estimateTerrainMb(geometry: THREE.BufferGeometry): number {
    const position = geometry.getAttribute("position");
    const color = geometry.getAttribute("color");
    const uv = geometry.getAttribute("uv");
    const index = geometry.getIndex();
    const bytes =
      position.count * position.itemSize * 4 +
      color.count * color.itemSize * 4 +
      (uv ? uv.count * uv.itemSize * 4 : 0) +
      (index ? index.count * 4 : 0);
    return bytes / 1024 / 1024;
  }
}
