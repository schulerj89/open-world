import * as THREE from "three";
import type { HeightSampler } from "./HeightSampler.js";
import { WorldAsset } from "./WorldAsset.js";

export type TownFenceLineConfig = {
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  heights: HeightSampler;
  material: THREE.Material;
};

export class TownFenceLineAsset extends WorldAsset {
  private readonly x1: number;
  private readonly z1: number;
  private readonly x2: number;
  private readonly z2: number;
  private readonly heights: HeightSampler;
  private readonly material: THREE.Material;
  private readonly ownerLabel: string;

  constructor(config: TownFenceLineConfig) {
    const ownerLabel = createFenceOwnerLabel(config.x1, config.z1, config.x2, config.z2);
    super("prop", ownerLabel);
    this.x1 = config.x1;
    this.z1 = config.z1;
    this.x2 = config.x2;
    this.z2 = config.z2;
    this.heights = config.heights;
    this.material = config.material;
    this.ownerLabel = ownerLabel;
    this.build();
  }

  private build(): void {
    const length = Math.hypot(this.x2 - this.x1, this.z2 - this.z1);
    const yaw = Math.atan2(this.x2 - this.x1, this.z2 - this.z1);
    const x = (this.x1 + this.x2) / 2;
    const z = (this.z1 + this.z2) / 2;

    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 1.1, length, 1, 2, Math.max(1, Math.round(length / 5))),
      this.material
    );
    rail.name = `${this.ownerLabel}-rail`;
    rail.position.set(x, this.heights.getHeight(x, z) + 1.1, z);
    rail.rotation.y = yaw;
    this.add(rail);

    const postSamples = Math.max(2, Math.ceil(length / 8));
    for (let i = 0; i <= postSamples; i += 1) {
      const t = i / postSamples;
      const px = THREE.MathUtils.lerp(this.x1, this.x2, t);
      const pz = THREE.MathUtils.lerp(this.z1, this.z2, t);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 1.55, 8), this.material);
      post.name = `${this.ownerLabel}-post-${i}`;
      post.position.set(px, this.heights.getHeight(px, pz) + 0.78, pz);
      this.add(post);
    }

    const samples = Math.max(2, Math.ceil(length / 4));
    for (let i = 0; i <= samples; i += 1) {
      const t = i / samples;
      this.addCircleCollider(
        THREE.MathUtils.lerp(this.x1, this.x2, t),
        THREE.MathUtils.lerp(this.z1, this.z2, t),
        0.55,
        "fence",
        this.ownerLabel
      );
    }
  }
}

function createFenceOwnerLabel(x1: number, z1: number, x2: number, z2: number): string {
  return `fence-${Math.round(x1)}-${Math.round(z1)}-${Math.round(x2)}-${Math.round(z2)}`;
}
