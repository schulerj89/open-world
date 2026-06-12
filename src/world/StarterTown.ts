import * as THREE from "three";
import type { HeightSampler } from "./HeightSampler.js";

export type EnemySpawn = {
  x: number;
  z: number;
};

export class StarterTown {
  readonly group = new THREE.Group();
  readonly playerSpawn = { x: -8, z: 10, yaw: -0.55 };
  readonly guidePosition = { x: -2, z: 2 };
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

  constructor(private readonly heights: HeightSampler) {
    this.group.name = "starter-town";
    this.buildTown();
  }

  getHeight(x: number, z: number): number {
    return this.heights.getHeight(x, z);
  }

  private buildTown(): void {
    this.addPatch(0, 0, 34, 26, 0.04, this.grassMaterial);
    this.addPatch(28, -10, 58, 9, 0.08, this.roadMaterial);
    this.addPatch(58, -7, 42, 32, 0.05, this.grassMaterial);
    this.addPatch(-12, 18, 22, 10, 0.07, this.roadMaterial);

    [
      [-20, -10, 0.3],
      [18, -16, -0.45],
      [-22, 18, 0.78],
      [18, 18, -0.22],
      [0, -26, 0]
    ].forEach(([x, z, yaw]) => this.addCottage(x, z, yaw));

    this.addTrainingYard(-2, 32);
    this.addGuideMarker();
    this.addFenceLine(38, -25, 66, -25);
    this.addFenceLine(66, -25, 66, 18);
  }

  private addCottage(x: number, z: number, yaw: number): void {
    const base = new THREE.Mesh(new THREE.BoxGeometry(8, 5, 7), this.cottageMaterial);
    base.position.set(x, this.getHeight(x, z) + 2.5, z);
    base.rotation.y = yaw;
    base.castShadow = false;
    base.receiveShadow = true;
    this.group.add(base);

    const roof = new THREE.Mesh(new THREE.ConeGeometry(6.4, 4.2, 4), this.roofMaterial);
    roof.position.set(x, this.getHeight(x, z) + 7.1, z);
    roof.rotation.y = yaw + Math.PI * 0.25;
    this.group.add(roof);
  }

  private addPatch(
    x: number,
    z: number,
    width: number,
    depth: number,
    yOffset: number,
    material: THREE.Material
  ): void {
    const patch = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material);
    patch.position.set(x, this.getHeight(x, z) + yOffset, z);
    patch.rotation.x = -Math.PI / 2;
    patch.receiveShadow = true;
    this.group.add(patch);
  }

  private addTrainingYard(x: number, z: number): void {
    this.addPatch(x, z, 20, 12, 0.09, this.roadMaterial);

    for (let i = 0; i < 3; i += 1) {
      const px = x - 6 + i * 6;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 3.4, 8), this.roofMaterial);
      post.position.set(px, this.getHeight(px, z) + 1.7, z);
      this.group.add(post);
    }
  }

  private addGuideMarker(): void {
    const { x, z } = this.guidePosition;
    const marker = new THREE.Mesh(new THREE.IcosahedronGeometry(1.3, 1), this.markerMaterial);
    marker.position.set(x, this.getHeight(x, z) + 4.6, z);
    marker.name = "tutorial-guide-marker";
    this.group.add(marker);
  }

  private addFenceLine(x1: number, z1: number, x2: number, z2: number): void {
    const length = Math.hypot(x2 - x1, z2 - z1);
    const yaw = Math.atan2(x2 - x1, z2 - z1);
    const x = (x1 + x2) / 2;
    const z = (z1 + z2) / 2;
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.1, length), this.roofMaterial);
    rail.position.set(x, this.getHeight(x, z) + 1.1, z);
    rail.rotation.y = yaw;
    this.group.add(rail);
  }
}
