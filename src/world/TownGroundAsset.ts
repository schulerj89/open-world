import * as THREE from "three";
import type { HeightSampler } from "./HeightSampler.js";
import { WorldAsset } from "./WorldAsset.js";

export type TownGroundAssetConfig = {
  name: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  yOffset: number;
  segments?: number;
  material: THREE.Material;
  heights: HeightSampler;
};

export class TownGroundAsset extends WorldAsset {
  constructor(config: TownGroundAssetConfig) {
    super("ground", config.name);
    const mesh = new THREE.Mesh(
      createGroundPatchGeometry(config),
      config.material
    );
    mesh.name = `${config.name}-mesh`;
    mesh.receiveShadow = true;
    this.add(mesh);
  }
}

function createGroundPatchGeometry(config: TownGroundAssetConfig): THREE.BufferGeometry {
  const columns = Math.max(1, config.segments ?? 1);
  const rows = Math.max(1, config.segments ?? 1);
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let row = 0; row <= rows; row += 1) {
    const v = row / rows;
    const localZ = (v - 0.5) * config.depth;
    for (let col = 0; col <= columns; col += 1) {
      const u = col / columns;
      const localX = (u - 0.5) * config.width;
      const worldX = config.x + localX;
      const worldZ = config.z + localZ;
      positions.push(worldX, config.heights.getHeight(worldX, worldZ) + config.yOffset, worldZ);
      uvs.push(u, v);
    }
  }

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < columns; col += 1) {
      const a = row * (columns + 1) + col;
      const b = a + 1;
      const c = a + columns + 1;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
