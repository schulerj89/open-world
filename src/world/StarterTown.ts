import * as THREE from "three";
import type { CircleCollider } from "./Collision.js";
import type { HeightSampler } from "./HeightSampler.js";
import { createHumanoidModel } from "./HumanoidModel.js";

export type EnemySpawn = {
  x: number;
  z: number;
};

export class StarterTown {
  readonly group = new THREE.Group();
  readonly colliders: CircleCollider[] = [];
  readonly playerSpawn = { x: -8, z: 10, yaw: -0.55 };
  readonly guidePosition = { x: -2, z: 2 };
  readonly npcPositions = [
    { x: -6, z: -2, yaw: 0.8, primaryColor: "#526e9d", accentColor: "#d7b15f" },
    { x: 10, z: -8, yaw: -0.4, primaryColor: "#8f5d48", accentColor: "#b7d188" },
    { x: -18, z: 13, yaw: 2.2, primaryColor: "#6c7f52", accentColor: "#d8c080" },
    { x: 22, z: 12, yaw: -1.2, primaryColor: "#725397", accentColor: "#e0c36c" }
  ];
  readonly enemySpawns: EnemySpawn[] = [
    { x: 52, z: -24 },
    { x: 68, z: -8 },
    { x: 84, z: 18 }
  ];

  private readonly cottageMaterial = new THREE.MeshLambertMaterial({ color: "#b9794d" });
  private readonly roofMaterial = new THREE.MeshLambertMaterial({ color: "#5d3328" });
  private readonly roadMaterial = new THREE.MeshLambertMaterial({ color: "#a58d62" });
  private readonly grassMaterial = new THREE.MeshLambertMaterial({ color: "#6faa5e" });
  private readonly markerMaterial = new THREE.MeshLambertMaterial({ color: "#f1c75b" });
  private readonly stoneMaterial = new THREE.MeshLambertMaterial({ color: "#8d887b" });
  private readonly trimMaterial = new THREE.MeshLambertMaterial({ color: "#2f493b" });
  private readonly lightMaterial = new THREE.MeshBasicMaterial({ color: "#f5c966" });

  constructor(private readonly heights: HeightSampler) {
    this.group.name = "starter-town";
    this.buildTown();
  }

  getHeight(x: number, z: number): number {
    return this.heights.getHeight(x, z);
  }

  private buildTown(): void {
    this.addPatch(0, 0, 42, 32, 0.04, this.grassMaterial, 4);
    this.addPatch(28, -10, 68, 10, 0.08, this.roadMaterial, 6);
    this.addPatch(58, -7, 46, 36, 0.05, this.grassMaterial, 5);
    this.addPatch(-12, 18, 26, 12, 0.07, this.roadMaterial, 4);
    this.addPlaza();

    [
      [-20, -10, 0.3],
      [18, -16, -0.45],
      [-22, 18, 0.78],
      [18, 18, -0.22],
      [0, -26, 0]
    ].forEach(([x, z, yaw]) => this.addCottage(x, z, yaw));

    this.addTrainingYard(-2, 32);
    this.addMarket(8, 8);
    this.addGuideMarker();
    this.addNpcs();
    this.addLampLine();
    this.addFenceLine(38, -25, 66, -25);
    this.addFenceLine(66, -25, 66, 18);
  }

  private addCottage(x: number, z: number, yaw: number): void {
    this.addCollider(x, z, 5.6, "building");
    const base = new THREE.Mesh(new THREE.BoxGeometry(8, 5, 7, 2, 2, 2), this.cottageMaterial);
    base.position.set(x, this.getHeight(x, z) + 2.5, z);
    base.rotation.y = yaw;
    base.castShadow = false;
    base.receiveShadow = true;
    this.group.add(base);

    const roof = new THREE.Mesh(new THREE.ConeGeometry(6.4, 4.2, 8), this.roofMaterial);
    roof.position.set(x, this.getHeight(x, z) + 7.1, z);
    roof.rotation.y = yaw + Math.PI * 0.25;
    this.group.add(roof);

    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.2, 0.9), this.stoneMaterial);
    chimney.position.set(x + Math.cos(yaw) * 2.2, this.getHeight(x, z) + 8.2, z + Math.sin(yaw) * 2.2);
    chimney.rotation.y = yaw;
    this.group.add(chimney);

    [[-2.8, -3.56], [2.8, -3.56], [-2.8, 3.56], [2.8, 3.56]].forEach(([ox, oz]) => {
      const shutter = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.2, 0.12), this.trimMaterial);
      const rotatedX = ox * Math.cos(yaw) - oz * Math.sin(yaw);
      const rotatedZ = ox * Math.sin(yaw) + oz * Math.cos(yaw);
      shutter.position.set(x + rotatedX, this.getHeight(x, z) + 3.5, z + rotatedZ);
      shutter.rotation.y = yaw;
      this.group.add(shutter);
    });
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
    const marker = new THREE.Mesh(new THREE.IcosahedronGeometry(1.3, 2), this.markerMaterial);
    marker.position.set(x, this.getHeight(x, z) + 4.6, z);
    marker.name = "tutorial-guide-marker";
    this.group.add(marker);
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
    this.colliders.push({ x, z, radius, kind });
  }
}
