import * as THREE from 'three';
import { CHUNK_SIZE, MAX_BUSH_INSTANCES, MAX_TREE_INSTANCES, SEA_LEVEL } from './constants';
import { ChunkCoord } from './terrain';
import { forestDensityAt, heightAt, moistureAt, seededUnit, slopeAt } from './world';

interface TreePlacement {
  x: number;
  z: number;
  y: number;
  species: number;
  scale: number;
  rotation: number;
  tint: number;
}

interface BushPlacement {
  x: number;
  z: number;
  y: number;
  scale: number;
  tint: number;
}

export interface FoliageStats {
  trees: number;
  bushes: number;
  sourceChunks: number;
}

const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x704925, fog: true });
const leafMaterials = [
  new THREE.MeshLambertMaterial({ color: 0x2f7a41, fog: true }),
  new THREE.MeshLambertMaterial({ color: 0x4f8a38, fog: true }),
  new THREE.MeshLambertMaterial({ color: 0x276b47, fog: true })
];
const bushMaterial = new THREE.MeshLambertMaterial({ color: 0x507b3a, fog: true });

export class FoliageSystem {
  readonly group = new THREE.Group();

  private readonly trunkMeshes: THREE.InstancedMesh[] = [];
  private readonly leafMeshes: THREE.InstancedMesh[] = [];
  private readonly bushMesh: THREE.InstancedMesh;
  private readonly dummy = new THREE.Object3D();
  private signature = '';
  private stats: FoliageStats = { trees: 0, bushes: 0, sourceChunks: 0 };

  constructor() {
    this.group.name = 'instanced-foliage';

    const trunkGeometry = new THREE.CylinderGeometry(0.13, 0.2, 1, 5);
    const leafGeometries = [
      new THREE.DodecahedronGeometry(1, 0),
      new THREE.ConeGeometry(0.86, 1.8, 6),
      new THREE.IcosahedronGeometry(1, 0)
    ];

    for (let i = 0; i < 3; i += 1) {
      const trunk = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, MAX_TREE_INSTANCES);
      const leaves = new THREE.InstancedMesh(leafGeometries[i], leafMaterials[i], MAX_TREE_INSTANCES);
      trunk.name = `tree-trunks-${i}`;
      leaves.name = `tree-canopies-${i}`;
      trunk.count = 0;
      leaves.count = 0;
      this.trunkMeshes.push(trunk);
      this.leafMeshes.push(leaves);
      this.group.add(trunk, leaves);
    }

    this.bushMesh = new THREE.InstancedMesh(
      new THREE.DodecahedronGeometry(0.55, 0),
      bushMaterial,
      MAX_BUSH_INSTANCES
    );
    this.bushMesh.name = 'bushes';
    this.bushMesh.count = 0;
    this.group.add(this.bushMesh);
  }

  sync(chunks: ChunkCoord[]): FoliageStats {
    const signature = chunks
      .map((coord) => `${coord.cx},${coord.cz}`)
      .sort()
      .join('|');
    if (signature === this.signature) return this.stats;

    this.signature = signature;
    const trees: TreePlacement[] = [];
    const bushes: BushPlacement[] = [];

    for (const chunk of chunks) {
      this.collectChunkPlacements(chunk, trees, bushes);
    }

    this.applyTreePlacements(trees.slice(0, MAX_TREE_INSTANCES));
    this.applyBushPlacements(bushes.slice(0, MAX_BUSH_INSTANCES));
    this.stats = {
      trees: Math.min(trees.length, MAX_TREE_INSTANCES),
      bushes: Math.min(bushes.length, MAX_BUSH_INSTANCES),
      sourceChunks: chunks.length
    };
    return this.stats;
  }

  getStats(): FoliageStats {
    return { ...this.stats };
  }

  private collectChunkPlacements(
    chunk: ChunkCoord,
    trees: TreePlacement[],
    bushes: BushPlacement[]
  ): void {
    const cell = 13.2;
    for (let z = 4; z < CHUNK_SIZE; z += cell) {
      for (let x = 4; x < CHUNK_SIZE; x += cell) {
        const baseX = chunk.cx * CHUNK_SIZE + x;
        const baseZ = chunk.cz * CHUNK_SIZE + z;
        const jitterX = (seededUnit(baseX, baseZ, 301) - 0.5) * cell * 0.74;
        const jitterZ = (seededUnit(baseX, baseZ, 307) - 0.5) * cell * 0.74;
        const wx = baseX + jitterX;
        const wz = baseZ + jitterZ;
        const h = heightAt(wx, wz);
        if (h <= SEA_LEVEL + 2 || h > 122) continue;

        const moisture = moistureAt(wx, wz);
        const slope = slopeAt(wx, wz);
        if (slope > 0.26) continue;

        const density = forestDensityAt(wx, wz);
        const highTreeLine = 1 - THREE.MathUtils.smoothstep(h, 84, 128);
        const wetSuitability = THREE.MathUtils.smoothstep(moisture, 0.42, 0.72);
        const forestScore = density * wetSuitability * highTreeLine * (1 - slope * 2.6);
        const roll = seededUnit(baseX, baseZ, 313);

        if (forestScore + roll * 0.32 > 0.52) {
          trees.push({
            x: wx,
            z: wz,
            y: h,
            species: Math.floor(seededUnit(baseX, baseZ, 317) * 3) % 3,
            scale: 0.78 + seededUnit(baseX, baseZ, 331) * 0.62,
            rotation: seededUnit(baseX, baseZ, 337) * Math.PI * 2,
            tint: seededUnit(baseX, baseZ, 349)
          });
        } else if (moisture > 0.24 && seededUnit(baseX, baseZ, 353) > 0.84) {
          bushes.push({
            x: wx,
            z: wz,
            y: h,
            scale: 0.6 + seededUnit(baseX, baseZ, 359) * 0.8,
            tint: seededUnit(baseX, baseZ, 367)
          });
        }
      }
    }
  }

  private applyTreePlacements(trees: TreePlacement[]): void {
    const counts = [0, 0, 0];
    const colors = [
      new THREE.Color(0x2f7a41),
      new THREE.Color(0x4f8a38),
      new THREE.Color(0x276b47)
    ];

    for (const tree of trees) {
      const species = tree.species;
      const index = counts[species];
      if (index >= MAX_TREE_INSTANCES) continue;
      counts[species] += 1;

      const trunkHeight = (2.2 + species * 0.35) * tree.scale;
      this.dummy.position.set(tree.x, tree.y + trunkHeight * 0.5, tree.z);
      this.dummy.rotation.set(0, tree.rotation, 0);
      this.dummy.scale.set(tree.scale, trunkHeight, tree.scale);
      this.dummy.updateMatrix();
      this.trunkMeshes[species].setMatrixAt(index, this.dummy.matrix);

      const canopyHeight = species === 1 ? 1.8 * tree.scale : 1.3 * tree.scale;
      const canopyWidth = species === 1 ? 1.55 * tree.scale : 1.85 * tree.scale;
      this.dummy.position.set(tree.x, tree.y + trunkHeight + canopyHeight * 0.55, tree.z);
      this.dummy.rotation.set(0, tree.rotation * 0.6, 0);
      this.dummy.scale.set(canopyWidth, canopyHeight, canopyWidth);
      this.dummy.updateMatrix();
      this.leafMeshes[species].setMatrixAt(index, this.dummy.matrix);

      const leafColor = colors[species].clone().lerp(new THREE.Color(0x96b85a), tree.tint * 0.28);
      this.leafMeshes[species].setColorAt(index, leafColor);
    }

    for (let i = 0; i < 3; i += 1) {
      this.trunkMeshes[i].count = counts[i];
      this.leafMeshes[i].count = counts[i];
      this.trunkMeshes[i].instanceMatrix.needsUpdate = true;
      this.leafMeshes[i].instanceMatrix.needsUpdate = true;
      this.trunkMeshes[i].computeBoundingSphere();
      this.leafMeshes[i].computeBoundingSphere();
      const instanceColor = this.leafMeshes[i].instanceColor;
      if (instanceColor) {
        instanceColor.needsUpdate = true;
      }
    }
  }

  private applyBushPlacements(bushes: BushPlacement[]): void {
    const base = new THREE.Color(0x4f7d37);
    const light = new THREE.Color(0x8aa85a);

    bushes.forEach((bush, index) => {
      this.dummy.position.set(bush.x, bush.y + 0.38 * bush.scale, bush.z);
      this.dummy.rotation.set(0, bush.tint * Math.PI * 2, 0);
      this.dummy.scale.set(bush.scale, bush.scale * 0.58, bush.scale);
      this.dummy.updateMatrix();
      this.bushMesh.setMatrixAt(index, this.dummy.matrix);
      this.bushMesh.setColorAt(index, base.clone().lerp(light, bush.tint * 0.35));
    });

    this.bushMesh.count = bushes.length;
    this.bushMesh.instanceMatrix.needsUpdate = true;
    this.bushMesh.computeBoundingSphere();
    const instanceColor = this.bushMesh.instanceColor;
    if (instanceColor) {
      instanceColor.needsUpdate = true;
    }
  }
}
