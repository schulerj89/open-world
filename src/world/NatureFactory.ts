import * as THREE from "three";
import { getTextureAssets } from "../render/TextureAssets";
import { Noise } from "./Noise";
import type { TerrainHeight } from "./TerrainHeight";

export type NatureBuildResult = {
  group: THREE.Group;
  windTargets: THREE.Object3D[];
  estimatedMb: number;
  stats: NatureStats;
};

export type NatureStats = {
  grassInstances: number;
  trunks: number;
  coniferCrowns: number;
  broadleafCrowns: number;
};

const textureAssets = getTextureAssets();
const grassMaterials = [
  new THREE.MeshLambertMaterial({
    alphaMap: textureAssets.foliageOpacity,
    alphaTest: 0.46,
    color: "#79a861",
    map: textureAssets.foliageColor,
    side: THREE.DoubleSide
  }),
  new THREE.MeshLambertMaterial({
    alphaMap: textureAssets.foliageOpacity,
    alphaTest: 0.5,
    color: "#91b866",
    map: textureAssets.foliageColor,
    side: THREE.DoubleSide
  }),
  new THREE.MeshLambertMaterial({
    alphaMap: textureAssets.foliageOpacity,
    alphaTest: 0.44,
    color: "#5f8e52",
    map: textureAssets.foliageColor,
    side: THREE.DoubleSide
  })
];

const trunkMaterial = new THREE.MeshLambertMaterial({ color: "#5a3b24" });
const leafMaterial = new THREE.MeshLambertMaterial({ color: "#5e9656" });
const darkLeafMaterial = new THREE.MeshLambertMaterial({ color: "#3f7548" });
const grassCardGeometry = markSharedGeometry(createGrassCardGeometry());
const trunkGeometry = markSharedGeometry(new THREE.CylinderGeometry(0.2, 0.38, 1, 6));
const coneGeometry = markSharedGeometry(new THREE.ConeGeometry(1, 1, 8));
const roundGeometry = markSharedGeometry(new THREE.IcosahedronGeometry(1, 1));

export function updateGrassWindMaterials(time: number, strength: number): void {
  grassMaterials.forEach((material, index) => {
    const pulse = 0.88 + Math.sin(time * 1.8 + index * 0.9) * strength * 0.16;
    material.color.setRGB(0.38 * pulse, 0.58 * pulse, 0.32 * pulse);
  });
}

export class NatureFactory {
  private readonly noise = new Noise(415);

  buildChunk(
    chunkX: number,
    chunkZ: number,
    chunkSize: number,
    terrain: TerrainHeight,
    grassDensity: number,
    treeDensity: number,
    lod: number
  ): NatureBuildResult {
    const group = new THREE.Group();
    const windTargets: THREE.Object3D[] = [];
    let estimatedMb = 0;
    const stats: NatureStats = {
      grassInstances: 0,
      trunks: 0,
      coniferCrowns: 0,
      broadleafCrowns: 0
    };

    if (lod === 0 && grassDensity > 0.03) {
      const grass = this.buildGrass(chunkX, chunkZ, chunkSize, terrain, grassDensity, lod);
      group.add(grass.group);
      windTargets.push(...grass.windTargets);
      estimatedMb += grass.estimatedMb;
      stats.grassInstances += grass.stats.grassInstances;
    }

    if (lod <= 1 && treeDensity > 0.03) {
      const trees = this.buildTrees(chunkX, chunkZ, chunkSize, terrain, treeDensity, lod);
      group.add(trees.group);
      windTargets.push(...trees.windTargets);
      estimatedMb += trees.estimatedMb;
      stats.trunks += trees.stats.trunks;
      stats.coniferCrowns += trees.stats.coniferCrowns;
      stats.broadleafCrowns += trees.stats.broadleafCrowns;
    }

    return { group, windTargets, estimatedMb, stats };
  }

  private buildGrass(
    chunkX: number,
    chunkZ: number,
    chunkSize: number,
    terrain: TerrainHeight,
    density: number,
    lod: number
  ): NatureBuildResult {
    const group = new THREE.Group();
    const windTargets: THREE.Object3D[] = [];
    const bandCount = 2;
    const countPerBand = Math.max(8, Math.floor(24 * density));
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const rotation = new THREE.Euler();
    const scale = new THREE.Vector3();

    for (let band = 0; band < bandCount; band += 1) {
      const material = grassMaterials[band % grassMaterials.length];
      const mesh = new THREE.InstancedMesh(grassCardGeometry, material, countPerBand);
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      mesh.userData.windPhase = band * 0.9 + this.noise.value(chunkX + band, chunkZ);
      mesh.userData.windKind = "grass";

      for (let i = 0; i < countPerBand; i += 1) {
        const r1 = this.noise.value(chunkX * 101 + band * 17, chunkZ * 107 + i * 3.7);
        const r2 = this.noise.value(chunkX * 31 + i * 9.1, chunkZ * 47 - band * 13);
        const worldX = chunkX * chunkSize + (r1 - 0.5) * chunkSize;
        const worldZ = chunkZ * chunkSize + (r2 - 0.5) * chunkSize;
        const river = terrain.getRiverInfo(worldX, worldZ);
        if (river.influence > 0.7) {
          position.set(worldX, terrain.getHeight(worldX, worldZ) - 100, worldZ);
          matrix.compose(position, new THREE.Quaternion(), new THREE.Vector3(0.001, 0.001, 0.001));
          mesh.setMatrixAt(i, matrix);
          continue;
        }
        const height = terrain.getHeight(worldX, worldZ);
        const slopeCull = Math.abs(terrain.getHeight(worldX + 1, worldZ) - height);

        position.set(worldX, height + 0.03, worldZ);
        rotation.set(
          0.08 + this.noise.value(worldX, worldZ) * 0.2,
          this.noise.value(worldX + 20, worldZ - 10) * Math.PI * 2,
          0
        );
        const bladeScale = slopeCull > 1.8 ? 0.4 : 0.92 + this.noise.value(worldX - 9, worldZ + 7) * 1.35;
        scale.set(1.2 + this.noise.value(worldX + 3, worldZ - 8) * 1.1, bladeScale, 1.2);
        matrix.compose(position, new THREE.Quaternion().setFromEuler(rotation), scale);
        mesh.setMatrixAt(i, matrix);
      }

      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      group.add(mesh);
      windTargets.push(mesh);
    }

    return {
      group,
      windTargets,
      estimatedMb: (bandCount * countPerBand * 72) / 1024 / 1024,
      stats: {
        grassInstances: bandCount * countPerBand,
        trunks: 0,
        coniferCrowns: 0,
        broadleafCrowns: 0
      }
    };
  }

  private buildTrees(
    chunkX: number,
    chunkZ: number,
    chunkSize: number,
    terrain: TerrainHeight,
    density: number,
    lod: number
  ): NatureBuildResult {
    const group = new THREE.Group();
    const windTargets: THREE.Object3D[] = [];
    const treeCount = Math.floor((lod === 0 ? 10 : lod === 1 ? 3 : 0) * density);

    if (treeCount < 1) {
      return {
        group,
        windTargets,
        estimatedMb: 0,
        stats: {
          grassInstances: 0,
          trunks: 0,
          coniferCrowns: 0,
          broadleafCrowns: 0
        }
      };
    }

    const trunks = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, treeCount);
    trunks.frustumCulled = false;
    const cones = [
      new THREE.InstancedMesh(coneGeometry, leafMaterial, treeCount),
      new THREE.InstancedMesh(coneGeometry, darkLeafMaterial, treeCount),
      new THREE.InstancedMesh(coneGeometry, leafMaterial, treeCount)
    ];
    const crowns = new THREE.InstancedMesh(roundGeometry, leafMaterial, treeCount);
    cones.forEach((cone) => {
      cone.frustumCulled = false;
    });
    crowns.frustumCulled = false;
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const rotation = new THREE.Euler();
    const scale = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    let trunkIndex = 0;
    let coniferIndex = 0;
    let broadleafIndex = 0;

    for (let i = 0; i < treeCount; i += 1) {
      const r1 = this.noise.value(chunkX * 193 + i * 19, chunkZ * 53 - i * 2);
      const r2 = this.noise.value(chunkX * 71 - i * 11, chunkZ * 149 + i * 5);
      const worldX = chunkX * chunkSize + (r1 - 0.5) * chunkSize * 0.92;
      const worldZ = chunkZ * chunkSize + (r2 - 0.5) * chunkSize * 0.92;
      const height = terrain.getHeight(worldX, worldZ);
      const moisture = terrain.getMoisture(worldX, worldZ);
      const river = terrain.getRiverInfo(worldX, worldZ);

      if (height > 74 || moisture < 0.26 || river.influence > 0.58) {
        continue;
      }

      const treeHeight = 5.5 + this.noise.value(worldX, worldZ) * 7.5;
      const yaw = this.noise.value(worldZ, worldX) * Math.PI * 2;
      rotation.set(0, yaw, 0);
      quaternion.setFromEuler(rotation);

      position.set(worldX, height + treeHeight * 0.5, worldZ);
      scale.set(1, treeHeight, 1);
      matrix.compose(position, quaternion, scale);
      trunks.setMatrixAt(trunkIndex, matrix);

      const conifer = this.noise.value(worldX + 81, worldZ - 43) > 0.42;
      if (conifer) {
        for (let tier = 0; tier < cones.length; tier += 1) {
          position.set(worldX, height + treeHeight * (0.72 + tier * 0.18), worldZ);
          scale.setScalar(treeHeight * (0.38 - tier * 0.055));
          scale.y = treeHeight * 0.62;
          matrix.compose(position, quaternion, scale);
          cones[tier].setMatrixAt(coniferIndex, matrix);
        }
        coniferIndex += 1;
      } else {
        position.set(worldX, height + treeHeight * 1.05, worldZ);
        scale.set(treeHeight * 0.42, treeHeight * 0.5, treeHeight * 0.42);
        matrix.compose(position, quaternion, scale);
        crowns.setMatrixAt(broadleafIndex, matrix);
        broadleafIndex += 1;
      }

      trunkIndex += 1;
    }

    trunks.count = trunkIndex;
    trunks.instanceMatrix.needsUpdate = true;
    trunks.computeBoundingSphere();
    group.add(trunks);

    for (const cone of cones) {
      cone.count = coniferIndex;
      cone.instanceMatrix.needsUpdate = true;
      cone.computeBoundingSphere();
      group.add(cone);
    }

    crowns.count = broadleafIndex;
    crowns.instanceMatrix.needsUpdate = true;
    crowns.computeBoundingSphere();
    group.add(crowns);

    return {
      group,
      windTargets,
      estimatedMb: Math.max(0.02, treeCount * 0.004),
      stats: {
        grassInstances: 0,
        trunks: trunkIndex,
        coniferCrowns: coniferIndex,
        broadleafCrowns: broadleafIndex
      }
    };
  }
}

function createGrassCardGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const width = 0.85;
  const height = 1.65;
  const positions = new Float32Array([
    -width, 0, 0, width, 0, 0, -width, height, 0, width, height, 0,
    0, 0, -width, 0, 0, width, 0, height, -width, 0, height, width
  ]);
  const uvs = new Float32Array([
    0, 0, 1, 0, 0, 1, 1, 1,
    0, 0, 1, 0, 0, 1, 1, 1
  ]);
  const indices = [0, 1, 2, 2, 1, 3, 4, 5, 6, 6, 5, 7];
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function markSharedGeometry<T extends THREE.BufferGeometry>(geometry: T): T {
  geometry.userData.shared = true;
  return geometry;
}
