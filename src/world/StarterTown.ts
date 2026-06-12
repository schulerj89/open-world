import * as THREE from "three";
import { getTextureAssets } from "../render/TextureAssets.js";
import type { CircleCollider } from "./Collision.js";
import { createContactShadow } from "./ContactShadow.js";
import type { HeightSampler } from "./HeightSampler.js";
import { createHumanoidModel } from "./HumanoidModel.js";
import { TownBuildingAsset } from "./TownBuildingAsset.js";
import { WorldAsset } from "./WorldAsset.js";

export type EnemySpawn = {
  x: number;
  z: number;
};

export class StarterTown extends WorldAsset {
  readonly group: this = this;
  readonly playerSpawn = { x: -8, z: 10, yaw: -0.55 };
  readonly guidePosition = { x: -2, z: 2 };
  readonly npcPositions = [
    { x: -2, z: 2, yaw: 0.8, primaryColor: "#526e9d", accentColor: "#f0c45b", guide: true },
    { x: 12, z: -10, yaw: -0.4, primaryColor: "#8f5d48", accentColor: "#b7d188" },
    { x: -18, z: 13, yaw: 2.2, primaryColor: "#6c7f52", accentColor: "#d8c080" },
    { x: 22, z: 12, yaw: -1.2, primaryColor: "#725397", accentColor: "#e0c36c" },
    { x: -38, z: -6, yaw: 1.5, primaryColor: "#4b7782", accentColor: "#e0c36c" },
    { x: 42, z: 7, yaw: -1.7, primaryColor: "#85684e", accentColor: "#d7b15f" }
  ];
  readonly enemySpawns: EnemySpawn[] = [
    { x: 74, z: -34 },
    { x: 92, z: -11 },
    { x: 110, z: 20 }
  ];

  private readonly textureAssets = getTextureAssets();
  private readonly instancedBoxes = new Map<"wood" | "stone" | "darkStone" | "brightStone" | "roof", THREE.Matrix4[]>();
  private readonly transformPosition = new THREE.Vector3();
  private readonly transformRotation = new THREE.Quaternion();
  private readonly transformScale = new THREE.Vector3();
  private readonly cottageMaterial = new THREE.MeshLambertMaterial({ color: "#cf9164", map: this.textureAssets.townWall });
  private readonly roofMaterial = new THREE.MeshLambertMaterial({ color: "#9f573f", map: this.textureAssets.townRoof });
  private readonly roadMaterial = new THREE.MeshLambertMaterial({ color: "#c7b17d", map: this.textureAssets.townRoad });
  private readonly grassMaterial = new THREE.MeshLambertMaterial({ color: "#6faa5e", map: this.textureAssets.grassColor });
  private readonly markerMaterial = new THREE.MeshLambertMaterial({ color: "#f1c75b" });
  private readonly stoneMaterial = new THREE.MeshLambertMaterial({ color: "#a9a18f", map: this.textureAssets.townStone });
  private readonly darkStoneMaterial = new THREE.MeshLambertMaterial({ color: "#7a766c", map: this.textureAssets.townStone });
  private readonly brightStoneMaterial = new THREE.MeshLambertMaterial({ color: "#c4baa4", map: this.textureAssets.townStone });
  private readonly trimMaterial = new THREE.MeshLambertMaterial({ color: "#2f493b" });
  private readonly woodMaterial = new THREE.MeshLambertMaterial({ color: "#8c6040", map: this.textureAssets.townWood });
  private readonly flowerMaterial = new THREE.MeshLambertMaterial({ color: "#d87584" });
  private readonly hayMaterial = new THREE.MeshLambertMaterial({ color: "#d9b65f" });
  private readonly lightMaterial = new THREE.MeshBasicMaterial({ color: "#f5c966" });

  constructor(private readonly heights: HeightSampler) {
    super("town", "starter-town");
    this.buildTown();
  }

  getHeight(x: number, z: number): number {
    return this.heights.getHeight(x, z);
  }

  private buildTown(): void {
    this.addPatch(0, 0, 78, 56, 0.035, this.stoneMaterial, 10);
    this.addPatch(44, -12, 92, 12, 0.08, this.roadMaterial, 10);
    this.addPatch(-36, 8, 56, 14, 0.08, this.roadMaterial, 6);
    this.addPatch(28, 24, 70, 12, 0.08, this.roadMaterial, 7);
    this.addPatch(74, -8, 52, 42, 0.05, this.grassMaterial, 5);
    this.addCobblestones(0, 0, 70, 48);
    this.addPlaza();

    [
      [-30, -16, 0.2, 1.28],
      [22, -18, -0.45, 1.42],
      [-34, 20, 0.78, 1.16],
      [26, 22, -0.22, 1.34],
      [0, -34, 0, 1.5],
      [48, -2, -0.7, 1.22],
      [-52, 2, 1.45, 1.18],
      [8, 38, 0.05, 1.28]
    ].forEach(([x, z, yaw, scale]) => this.addCottageAsset(x, z, yaw, scale));

    this.addTrainingYard(-18, 42);
    this.addMarket(12, 10);
    this.addTownDetails();
    this.addGuideMarker();
    this.addNpcs();
    this.addLampLine();
    this.addFenceLine(48, -34, 86, -34);
    this.addFenceLine(86, -34, 86, 26);
    this.addFenceLine(-62, -24, -62, 30);
    this.addRoadEdgeStones();
    this.addGroundDetailInstances();
    this.flushInstancedBoxes();
  }

  private addCottageAsset(x: number, z: number, yaw: number, scale = 1): void {
    this.addChildAsset(
      new TownBuildingAsset({
        x,
        z,
        yaw,
        scale,
        heights: this.heights,
        materials: {
          wall: this.cottageMaterial,
          roof: this.roofMaterial,
          stone: this.stoneMaterial,
          brightStone: this.brightStoneMaterial,
          darkStone: this.darkStoneMaterial,
          trim: this.trimMaterial,
          wood: this.woodMaterial,
          light: this.lightMaterial
        }
      })
    );
  }

  private addPatch(
    x: number,
    z: number,
    width: number,
    depth: number,
    yOffset: number,
    material: THREE.Material,
    segments = 1
  ): void {
    const patch = new THREE.Mesh(this.createGroundPatchGeometry(x, z, width, depth, yOffset, segments), material);
    patch.receiveShadow = true;
    this.group.add(patch);
  }

  private createGroundPatchGeometry(
    centerX: number,
    centerZ: number,
    width: number,
    depth: number,
    yOffset: number,
    segments: number
  ): THREE.BufferGeometry {
    const columns = Math.max(1, segments);
    const rows = Math.max(1, segments);
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let row = 0; row <= rows; row += 1) {
      const v = row / rows;
      const localZ = (v - 0.5) * depth;
      for (let col = 0; col <= columns; col += 1) {
        const u = col / columns;
        const localX = (u - 0.5) * width;
        const worldX = centerX + localX;
        const worldZ = centerZ + localZ;
        positions.push(worldX, this.getHeight(worldX, worldZ) + yOffset, worldZ);
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

  private addCobblestones(x: number, z: number, width: number, depth: number): void {
    for (let row = 0; row < 13; row += 1) {
      for (let col = 0; col < 20; col += 1) {
        if ((row + col) % 7 === 0) {
          continue;
        }
        const px = x - width * 0.46 + col * (width / 19.2);
        const pz = z - depth * 0.42 + row * (depth / 12.2);
        const stoneScale = 0.75 + ((row * 3 + col) % 5) * 0.055;
        this.queueBox(
          (row + col) % 2 === 0 ? "brightStone" : "darkStone",
          px,
          this.getHeight(px, pz) + 0.11,
          pz,
          1.2 * stoneScale,
          0.11,
          0.82 * stoneScale,
          ((row * 17 + col * 9) % 13) * 0.06
        );
      }
    }
  }

  private addRoadEdgeStones(): void {
    [
      { x1: -2, z1: -18, x2: 88, z2: -18, count: 25 },
      { x1: -2, z1: -6, x2: 88, z2: -6, count: 25 },
      { x1: -64, z1: 0, x2: -10, z2: 0, count: 16 },
      { x1: -64, z1: 16, x2: -10, z2: 16, count: 16 },
      { x1: -8, z1: 18, x2: 64, z2: 18, count: 20 },
      { x1: -8, z1: 30, x2: 64, z2: 30, count: 20 }
    ].forEach((edge) => {
      for (let i = 0; i <= edge.count; i += 1) {
        const t = i / edge.count;
        const px = THREE.MathUtils.lerp(edge.x1, edge.x2, t);
        const pz = THREE.MathUtils.lerp(edge.z1, edge.z2, t);
        this.queueBox("stone", px, this.getHeight(px, pz) + 0.18, pz, 1.15, 0.18, 0.5, (i % 5) * 0.11);
      }
    });
  }

  private addGroundDetailInstances(): void {
    const rockGeometry = new THREE.IcosahedronGeometry(0.32, 1);
    const shrubGeometry = new THREE.IcosahedronGeometry(0.46, 2);
    const flowerGeometry = new THREE.IcosahedronGeometry(0.16, 1);
    const shrubMaterial = new THREE.MeshLambertMaterial({ color: "#4f8b4e" });
    const flowerMaterial = new THREE.MeshLambertMaterial({ color: "#e48a9a" });
    const rockMatrices: THREE.Matrix4[] = [];
    const shrubMatrices: THREE.Matrix4[] = [];
    const flowerMatrices: THREE.Matrix4[] = [];

    const addMatrix = (
      target: THREE.Matrix4[],
      x: number,
      z: number,
      scaleX: number,
      scaleY: number,
      scaleZ: number,
      yaw: number
    ): void => {
      this.transformPosition.set(x, this.getHeight(x, z) + 0.18, z);
      this.transformRotation.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      this.transformScale.set(scaleX, scaleY, scaleZ);
      target.push(new THREE.Matrix4().compose(this.transformPosition, this.transformRotation, this.transformScale));
    };

    for (let i = 0; i < 72; i += 1) {
      const side = i % 4;
      const t = (i % 18) / 17;
      const jitter = Math.sin(i * 2.37) * 1.8;
      const x = side < 2 ? THREE.MathUtils.lerp(-58, 72, t) : (side === 2 ? -58 : 72) + jitter;
      const z = side < 2 ? (side === 0 ? -30 : 36) + jitter : THREE.MathUtils.lerp(-30, 36, t);
      const scale = 0.55 + (i % 5) * 0.09;
      addMatrix(rockMatrices, x, z, scale, 0.35 + (i % 3) * 0.08, scale * 0.8, i * 0.31);
    }

    [
      [-46, -24],
      [-42, 28],
      [-30, 32],
      [36, 30],
      [52, 16],
      [60, -22],
      [76, 2],
      [70, -18],
      [-56, 18],
      [-52, -12],
      [30, -30],
      [44, -26]
    ].forEach(([x, z], index) => {
      const scale = 0.9 + (index % 4) * 0.12;
      addMatrix(shrubMatrices, x, z, scale, scale * 0.75, scale, index * 0.44);
    });

    for (let i = 0; i < 90; i += 1) {
      const band = i % 3;
      const t = (i % 30) / 29;
      const x = THREE.MathUtils.lerp(-56, 78, t) + Math.sin(i * 1.9) * 1.2;
      const z = band === 0 ? 31 + Math.cos(i) * 1.1 : band === 1 ? -27 + Math.sin(i) * 1.1 : THREE.MathUtils.lerp(-20, 24, t);
      const finalX = band === 2 ? (i % 2 === 0 ? -59 : 78) + Math.cos(i * 1.7) * 1.4 : x;
      addMatrix(flowerMatrices, finalX, z, 0.7, 0.55, 0.7, i * 0.17);
    }

    this.addInstancedDetail("town-ground-rocks", rockGeometry, this.darkStoneMaterial, rockMatrices);
    this.addInstancedDetail("town-ground-shrubs", shrubGeometry, shrubMaterial, shrubMatrices);
    this.addInstancedDetail("town-ground-flowers", flowerGeometry, flowerMaterial, flowerMatrices);
  }

  private addInstancedDetail(
    name: string,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    matrices: THREE.Matrix4[]
  ): void {
    const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
    mesh.name = name;
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    this.group.add(mesh);
  }

  private queueBox(
    key: "wood" | "stone" | "darkStone" | "brightStone" | "roof",
    x: number,
    y: number,
    z: number,
    scaleX: number,
    scaleY: number,
    scaleZ: number,
    yaw: number
  ): void {
    const matrices = this.instancedBoxes.get(key) ?? [];
    this.transformPosition.set(x, y, z);
    this.transformRotation.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    this.transformScale.set(scaleX, scaleY, scaleZ);
    matrices.push(new THREE.Matrix4().compose(this.transformPosition, this.transformRotation, this.transformScale));
    this.instancedBoxes.set(key, matrices);
  }

  private flushInstancedBoxes(): void {
    const boxGeometry = new THREE.BoxGeometry(1, 1, 1, 1, 1, 1);
    const materials: Record<"wood" | "stone" | "darkStone" | "brightStone" | "roof", THREE.Material> = {
      wood: this.woodMaterial,
      stone: this.stoneMaterial,
      darkStone: this.darkStoneMaterial,
      brightStone: this.brightStoneMaterial,
      roof: this.roofMaterial
    };

    for (const [key, matrices] of this.instancedBoxes) {
      const mesh = new THREE.InstancedMesh(boxGeometry, materials[key], matrices.length);
      mesh.name = `town-instanced-${key}`;
      mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
      matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      this.group.add(mesh);
    }
  }

  private addTrainingYard(x: number, z: number): void {
    this.addPatch(x, z, 20, 12, 0.09, this.roadMaterial, 4);

    for (let i = 0; i < 3; i += 1) {
      const px = x - 6 + i * 6;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 3.4, 12), this.roofMaterial);
      post.position.set(px, this.getHeight(px, z) + 1.7, z);
      this.group.add(post);
      this.addCollider(px, z, 0.8, "prop", `training-post-${i + 1}`);
    }
  }

  private addPlaza(): void {
    const plaza = new THREE.Mesh(new THREE.CylinderGeometry(11, 11, 0.18, 32), this.stoneMaterial);
    plaza.position.set(0, this.getHeight(0, 0) + 0.09, 0);
    this.group.add(plaza);
    const statueBase = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.3, 1.2, 16), this.stoneMaterial);
    statueBase.position.set(0, this.getHeight(0, 0) + 0.7, 0);
    this.group.add(statueBase);
    this.addCollider(0, 0, 2.3, "prop", "plaza-statue-base");
    const crystal = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2, 2), this.markerMaterial);
    crystal.position.set(0, this.getHeight(0, 0) + 2.35, 0);
    this.group.add(crystal);
  }

  private addMarket(x: number, z: number): void {
    [-5, 0, 5].forEach((offset, index) => {
      const stall = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.3, 2.2, 2, 1, 1), this.cottageMaterial);
      stall.position.set(x + offset, this.getHeight(x + offset, z) + 0.65, z);
      this.group.add(stall);
      this.addWorldShadow(x + offset, z, 2.25, 1.5, 0);
      this.addCollider(x + offset, z, 2.0, "prop", `market-stall-${index + 1}`);
      const awning = new THREE.Mesh(new THREE.ConeGeometry(2.4, 1.1, 4), index % 2 === 0 ? this.trimMaterial : this.markerMaterial);
      awning.position.set(x + offset, this.getHeight(x + offset, z) + 2.1, z);
      awning.rotation.y = Math.PI * 0.25;
      this.group.add(awning);
    });
  }

  private addTownDetails(): void {
    const crateGeometry = new THREE.BoxGeometry(1.25, 1.1, 1.25, 2, 1, 2);
    const barrelGeometry = new THREE.CylinderGeometry(0.55, 0.62, 1.2, 12);
    const flowerGeometry = new THREE.IcosahedronGeometry(0.22, 1);
    const hayGeometry = new THREE.BoxGeometry(2.2, 0.8, 1.4, 2, 1, 1);

    [
      [-8, 12, 0.2],
      [18, 6, -0.4],
      [35, -8, 0.7],
      [-44, 8, 1.1],
      [6, -20, -0.8]
    ].forEach(([x, z, yaw], index) => {
      const crate = new THREE.Mesh(crateGeometry, this.woodMaterial);
      crate.position.set(x, this.getHeight(x, z) + 0.55, z);
      crate.rotation.y = yaw;
      this.group.add(crate);
      this.addWorldShadow(x, z, 0.9, 0.72, yaw);
      this.addCollider(x, z, 0.85, "prop", `crate-${index + 1}`);
    });

    [
      [10, 14],
      [16, 14],
      [-24, 28],
      [38, 12]
    ].forEach(([x, z], index) => {
      const barrel = new THREE.Mesh(barrelGeometry, this.woodMaterial);
      barrel.position.set(x, this.getHeight(x, z) + 0.6, z);
      barrel.rotation.z = 0.04;
      this.group.add(barrel);
      this.addWorldShadow(x, z, 0.68, 0.56, 0);
      this.addCollider(x, z, 0.7, "prop", `barrel-${index + 1}`);
    });

    [
      [-12, 4],
      [-9, 6],
      [30, 16],
      [33, 18],
      [-48, -5],
      [52, 6],
      [58, 0],
      [68, 10]
    ].forEach(([x, z], index) => {
      const flower = new THREE.Mesh(flowerGeometry, index % 2 === 0 ? this.flowerMaterial : this.markerMaterial);
      flower.position.set(x, this.getHeight(x, z) + 0.24, z);
      flower.scale.set(1.2, 0.8, 1.2);
      this.group.add(flower);
    });

    [
      [-23, 43, 0.2],
      [-14, 46, -0.3],
      [74, -22, 0.6]
    ].forEach(([x, z, yaw], index) => {
      const hay = new THREE.Mesh(hayGeometry, this.hayMaterial);
      hay.position.set(x, this.getHeight(x, z) + 0.4, z);
      hay.rotation.y = yaw;
      this.group.add(hay);
      this.addWorldShadow(x, z, 1.45, 0.9, yaw);
      this.addCollider(x, z, 1.25, "prop", `hay-bale-${index + 1}`);
    });
  }

  private addNpcs(): void {
    this.npcPositions.forEach((npc, index) => {
      const model = createHumanoidModel({
        primaryColor: npc.primaryColor,
        accentColor: npc.accentColor,
        outfitVariant: index % 2 === 0 ? "traveler" : "guard",
        scale: 1.15
      });
      model.position.set(npc.x, this.getHeight(npc.x, npc.z) + 0.08, npc.z);
      model.rotation.y = npc.yaw;
      model.name = `starter-town-npc-${index}`;
      model.userData.idleNpc = true;
      model.userData.baseY = model.position.y;
      model.userData.baseYaw = npc.yaw;
      model.userData.phase = index * 1.7;
      this.group.add(model);
      this.addCollider(npc.x, npc.z, 0.95, "npc", npc.guide ? "tutorial-guide-npc" : `town-npc-${index + 1}`);
    });
  }

  private addLampLine(): void {
    [
      [-13, -8],
      [13, -7],
      [30, -13],
      [48, -15],
      [15, 18],
      [-15, 18]
    ].forEach(([x, z], index) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 4.2, 10), this.roofMaterial);
      post.position.set(x, this.getHeight(x, z) + 2.1, z);
      this.group.add(post);
      this.addCollider(x, z, 0.45, "prop", `lamp-post-${index + 1}`);
      const lamp = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 1), this.lightMaterial);
      lamp.position.set(x, this.getHeight(x, z) + 4.35, z);
      this.group.add(lamp);
    });
  }

  private addGuideMarker(): void {
    const { x, z } = this.guidePosition;
    const marker = new THREE.Mesh(new THREE.OctahedronGeometry(1.1, 2), this.markerMaterial);
    marker.position.set(x, this.getHeight(x, z) + 5.2, z);
    marker.name = "tutorial-guide-marker";
    marker.userData.questMarker = true;
    marker.userData.baseY = marker.position.y;
    this.group.add(marker);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.05, 8, 32), this.markerMaterial);
    ring.position.set(x, this.getHeight(x, z) + 4.2, z);
    ring.rotation.x = Math.PI / 2;
    ring.name = "tutorial-guide-ring";
    ring.userData.questMarker = true;
    ring.userData.baseY = ring.position.y;
    this.group.add(ring);
  }

  private addFenceLine(x1: number, z1: number, x2: number, z2: number): void {
    const length = Math.hypot(x2 - x1, z2 - z1);
    const yaw = Math.atan2(x2 - x1, z2 - z1);
    const x = (x1 + x2) / 2;
    const z = (z1 + z2) / 2;
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.1, length, 1, 2, Math.max(1, Math.round(length / 5))), this.roofMaterial);
    rail.position.set(x, this.getHeight(x, z) + 1.1, z);
    rail.rotation.y = yaw;
    this.group.add(rail);

    const samples = Math.max(2, Math.ceil(length / 4));
    for (let i = 0; i <= samples; i += 1) {
      const t = i / samples;
      this.addCollider(
        THREE.MathUtils.lerp(x1, x2, t),
        THREE.MathUtils.lerp(z1, z2, t),
        0.55,
        "fence",
        `fence-${Math.round(x1)}-${Math.round(z1)}-${Math.round(x2)}-${Math.round(z2)}`
      );
    }
  }

  private addCollider(x: number, z: number, radius: number, kind: CircleCollider["kind"], owner = this.name): void {
    this.addCircleCollider(x, z, radius, kind, owner);
  }

  private addWorldShadow(x: number, z: number, scaleX: number, scaleZ: number, yaw: number): void {
    const shadow = createContactShadow(scaleX, scaleZ);
    shadow.position.set(x, this.getHeight(x, z) + 0.045, z);
    shadow.rotation.y = yaw;
    this.group.add(shadow);
  }
}
