import * as THREE from "three";
import type { CircleCollider } from "./Collision.js";
import type { HeightSampler } from "./HeightSampler.js";
import { createHumanoidModel } from "./HumanoidModel.js";
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

  private readonly cottageMaterial = new THREE.MeshLambertMaterial({ color: "#b9794d" });
  private readonly roofMaterial = new THREE.MeshLambertMaterial({ color: "#5d3328" });
  private readonly roadMaterial = new THREE.MeshLambertMaterial({ color: "#a58d62" });
  private readonly grassMaterial = new THREE.MeshLambertMaterial({ color: "#6faa5e" });
  private readonly markerMaterial = new THREE.MeshLambertMaterial({ color: "#f1c75b" });
  private readonly stoneMaterial = new THREE.MeshLambertMaterial({ color: "#8d887b" });
  private readonly darkStoneMaterial = new THREE.MeshLambertMaterial({ color: "#5e615a" });
  private readonly brightStoneMaterial = new THREE.MeshLambertMaterial({ color: "#a8a092" });
  private readonly trimMaterial = new THREE.MeshLambertMaterial({ color: "#2f493b" });
  private readonly woodMaterial = new THREE.MeshLambertMaterial({ color: "#7a5234" });
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
    ].forEach(([x, z, yaw, scale]) => this.addCottage(x, z, yaw, scale));

    this.addTrainingYard(-18, 42);
    this.addMarket(12, 10);
    this.addTownDetails();
    this.addGuideMarker();
    this.addNpcs();
    this.addLampLine();
    this.addFenceLine(48, -34, 86, -34);
    this.addFenceLine(86, -34, 86, 26);
    this.addFenceLine(-62, -24, -62, 30);
  }

  private addCottage(x: number, z: number, yaw: number, scale = 1): void {
    const width = 8 * scale;
    const depth = 7 * scale;
    const wallHeight = 5.8 * scale;
    this.addCollider(x, z, 4.8 * scale, "building");
    const base = new THREE.Mesh(new THREE.BoxGeometry(width, wallHeight, depth, 3, 4, 3), this.cottageMaterial);
    base.position.set(x, this.getHeight(x, z) + wallHeight * 0.5, z);
    base.rotation.y = yaw;
    base.castShadow = false;
    base.receiveShadow = true;
    this.group.add(base);

    const roof = new THREE.Mesh(new THREE.ConeGeometry(5.3 * scale, 4.8 * scale, 12), this.roofMaterial);
    roof.position.set(x, this.getHeight(x, z) + wallHeight + 2.25 * scale, z);
    roof.rotation.y = yaw + Math.PI * 0.25;
    this.group.add(roof);

    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.9 * scale, 2.4 * scale, 0.9 * scale, 1, 2, 1), this.darkStoneMaterial);
    chimney.position.set(x + Math.cos(yaw) * 2.2 * scale, this.getHeight(x, z) + wallHeight + 3.2 * scale, z + Math.sin(yaw) * 2.2 * scale);
    chimney.rotation.y = yaw;
    this.group.add(chimney);

    [[-2.8, -3.56], [2.8, -3.56], [-2.8, 3.56], [2.8, 3.56]].forEach(([ox, oz], index) => {
      const shutter = new THREE.Mesh(new THREE.BoxGeometry(1.2 * scale, 1.35 * scale, 0.14 * scale, 1, 2, 1), index % 2 === 0 ? this.trimMaterial : this.brightStoneMaterial);
      const rotatedX = ox * Math.cos(yaw) - oz * Math.sin(yaw);
      const rotatedZ = ox * Math.sin(yaw) + oz * Math.cos(yaw);
      shutter.position.set(x + rotatedX * scale, this.getHeight(x, z) + wallHeight * 0.72, z + rotatedZ * scale);
      shutter.rotation.y = yaw;
      this.group.add(shutter);
    });

    const door = new THREE.Mesh(new THREE.BoxGeometry(1.55 * scale, 2.45 * scale, 0.16 * scale, 1, 3, 1), this.darkStoneMaterial);
    door.position.set(x + Math.sin(yaw) * depth * 0.5, this.getHeight(x, z) + 1.25 * scale, z + Math.cos(yaw) * depth * 0.5);
    door.rotation.y = yaw;
    this.group.add(door);

    const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.2 * scale, 0.9 * scale, 1, 1), this.lightMaterial);
    glow.position.set(x - Math.sin(yaw) * depth * 0.51, this.getHeight(x, z) + wallHeight * 0.72, z - Math.cos(yaw) * depth * 0.51);
    glow.rotation.y = yaw + Math.PI;
    glow.userData.windowGlow = true;
    this.group.add(glow);
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
    const patch = new THREE.Mesh(new THREE.PlaneGeometry(width, depth, segments, segments), material);
    patch.position.set(x, this.getHeight(x, z) + yOffset, z);
    patch.rotation.x = -Math.PI / 2;
    patch.receiveShadow = true;
    this.group.add(patch);
  }

  private addCobblestones(x: number, z: number, width: number, depth: number): void {
    const stoneGeometry = new THREE.BoxGeometry(1.6, 0.12, 1.2, 1, 1, 1);
    for (let row = 0; row < 7; row += 1) {
      for (let col = 0; col < 10; col += 1) {
        if ((row + col) % 3 === 0) {
          continue;
        }
        const px = x - width * 0.42 + col * (width / 9.4);
        const pz = z - depth * 0.38 + row * (depth / 6.4);
        const stone = new THREE.Mesh(stoneGeometry, (row + col) % 2 === 0 ? this.brightStoneMaterial : this.darkStoneMaterial);
        stone.position.set(px, this.getHeight(px, pz) + 0.12, pz);
        stone.rotation.y = ((row * 17 + col * 9) % 11) * 0.08;
        stone.scale.setScalar(0.75 + ((row + col) % 4) * 0.08);
        this.group.add(stone);
      }
    }
  }

  private addTrainingYard(x: number, z: number): void {
    this.addPatch(x, z, 20, 12, 0.09, this.roadMaterial, 4);

    for (let i = 0; i < 3; i += 1) {
      const px = x - 6 + i * 6;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 3.4, 12), this.roofMaterial);
      post.position.set(px, this.getHeight(px, z) + 1.7, z);
      this.group.add(post);
      this.addCollider(px, z, 0.8, "prop");
    }
  }

  private addPlaza(): void {
    const plaza = new THREE.Mesh(new THREE.CylinderGeometry(11, 11, 0.18, 32), this.stoneMaterial);
    plaza.position.set(0, this.getHeight(0, 0) + 0.09, 0);
    this.group.add(plaza);
    const statueBase = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.3, 1.2, 16), this.stoneMaterial);
    statueBase.position.set(0, this.getHeight(0, 0) + 0.7, 0);
    this.group.add(statueBase);
    this.addCollider(0, 0, 2.3, "prop");
    const crystal = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2, 2), this.markerMaterial);
    crystal.position.set(0, this.getHeight(0, 0) + 2.35, 0);
    this.group.add(crystal);
  }

  private addMarket(x: number, z: number): void {
    [-5, 0, 5].forEach((offset, index) => {
      const stall = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.3, 2.2, 2, 1, 1), this.cottageMaterial);
      stall.position.set(x + offset, this.getHeight(x + offset, z) + 0.65, z);
      this.group.add(stall);
      this.addCollider(x + offset, z, 2.0, "prop");
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
    ].forEach(([x, z, yaw]) => {
      const crate = new THREE.Mesh(crateGeometry, this.woodMaterial);
      crate.position.set(x, this.getHeight(x, z) + 0.55, z);
      crate.rotation.y = yaw;
      this.group.add(crate);
      this.addCollider(x, z, 0.85, "prop");
    });

    [
      [10, 14],
      [16, 14],
      [-24, 28],
      [38, 12]
    ].forEach(([x, z]) => {
      const barrel = new THREE.Mesh(barrelGeometry, this.woodMaterial);
      barrel.position.set(x, this.getHeight(x, z) + 0.6, z);
      barrel.rotation.z = 0.04;
      this.group.add(barrel);
      this.addCollider(x, z, 0.7, "prop");
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
    ].forEach(([x, z, yaw]) => {
      const hay = new THREE.Mesh(hayGeometry, this.hayMaterial);
      hay.position.set(x, this.getHeight(x, z) + 0.4, z);
      hay.rotation.y = yaw;
      this.group.add(hay);
      this.addCollider(x, z, 1.25, "prop");
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
      this.addCollider(npc.x, npc.z, 0.95, "npc");
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
    ].forEach(([x, z]) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 4.2, 10), this.roofMaterial);
      post.position.set(x, this.getHeight(x, z) + 2.1, z);
      this.group.add(post);
      this.addCollider(x, z, 0.45, "prop");
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
      this.addCollider(THREE.MathUtils.lerp(x1, x2, t), THREE.MathUtils.lerp(z1, z2, t), 0.55, "fence");
    }
  }

  private addCollider(x: number, z: number, radius: number, kind: CircleCollider["kind"]): void {
    this.addCircleCollider(x, z, radius, kind);
  }
}
