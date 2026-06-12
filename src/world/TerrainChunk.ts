import * as THREE from "three";
import { getTextureAssets } from "../render/TextureAssets";
import type { TerrainHeight } from "./TerrainHeight";
import type { NatureBuildResult, NatureStats } from "./NatureFactory";

const assets = getTextureAssets();
const grassTerrainMaterial = new THREE.MeshLambertMaterial({
  map: assets.grassColor,
  vertexColors: true
});
const rockTerrainMaterial = new THREE.MeshLambertMaterial({
  map: assets.rockColor,
  vertexColors: true
});
const waterMaterial = new THREE.MeshLambertMaterial({
  color: "#4a8fa7",
  transparent: true,
  opacity: 0.72
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
  readonly windTargets: THREE.Object3D[];
  readonly estimatedMb: number;
  readonly lod: number;
  readonly natureStats: NatureStats;
  lastTouchedFrame = 0;

  constructor(params: TerrainChunkParams) {
    this.key = TerrainChunk.key(params.chunkX, params.chunkZ);
    this.lod = params.lod;
    this.natureStats = params.nature.stats;
    const terrainMesh = this.buildTerrain(params);
    const riverMesh = this.buildRiver(params);
    this.group.add(terrainMesh);
    if (riverMesh) {
      this.group.add(riverMesh);
    }
    this.group.add(params.nature.group);
    this.windTargets = params.nature.windTargets;
    this.estimatedMb =
      this.estimateTerrainMb(terrainMesh.geometry) +
      (riverMesh ? this.estimateTerrainMb(riverMesh.geometry) : 0) +
      params.nature.estimatedMb;
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

  private buildTerrain(params: TerrainChunkParams): THREE.Mesh {
    const segments = params.lod === 0 ? 22 : params.lod === 1 ? 10 : 5;
    const vertexCount = (segments + 1) * (segments + 1);
    const positions = new Float32Array(vertexCount * 3);
    const colors = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);
    const heights = new Float32Array(vertexCount);
    const riverInfluences = new Float32Array(vertexCount);
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
        const river = params.terrain.getRiverInfo(px, pz);

        heights[cursor] = py;
        riverInfluences[cursor] = river.influence;
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

        if (riverInfluences[cursor] > 0.35) {
          color.set("#6b8e5a");
        } else if (py > 88) {
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

  private buildRiver(params: TerrainChunkParams): THREE.Mesh | undefined {
    if (params.lod > 1) {
      return undefined;
    }

    const samples = 12;
    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    const color = new THREE.Color("#5aa7bd");
    let hasWater = false;

    for (let x = 0; x <= samples; x += 1) {
      const px = (x / samples - 0.5) * params.chunkSize + params.chunkX * params.chunkSize;
      const centerProbe = params.terrain.getRiverInfo(px, params.chunkZ * params.chunkSize);

      for (let side = -1; side <= 1; side += 2) {
        const centerZ = this.findRiverCenter(px, params);
        const pz = centerZ + side * centerProbe.width * 0.48;
        const insideChunk =
          pz >= params.chunkZ * params.chunkSize - params.chunkSize * 0.55 &&
          pz <= params.chunkZ * params.chunkSize + params.chunkSize * 0.55;

        if (insideChunk) {
          hasWater = true;
        }

        const river = params.terrain.getRiverInfo(px, pz);
        positions.push(px, river.surfaceY + 0.12, pz);
        color.offsetHSL(0, 0, side < 0 ? -0.02 : 0.02);
        colors.push(color.r, color.g, color.b);
      }
    }

    if (!hasWater) {
      return undefined;
    }

    for (let x = 0; x < samples; x += 1) {
      const a = x * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      indices.push(a, c, b, b, c, d);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(positions), 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(colors), 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return new THREE.Mesh(geometry, waterMaterial);
  }

  private findRiverCenter(x: number, params: TerrainChunkParams): number {
    const chunkCenterZ = params.chunkZ * params.chunkSize;
    let bestZ = chunkCenterZ;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let i = -3; i <= 3; i += 1) {
      const z = chunkCenterZ + (i / 3) * params.chunkSize;
      const river = params.terrain.getRiverInfo(x, z);
      if (river.distance < bestDistance) {
        bestDistance = river.distance;
        bestZ = z + (z < chunkCenterZ ? river.distance : -river.distance);
      }
    }

    return bestZ;
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
