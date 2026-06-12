import * as THREE from "three";
import { createContactShadow } from "./ContactShadow.js";
import type { HeightSampler } from "./HeightSampler.js";
import { WorldAsset } from "./WorldAsset.js";

export type TownMarketMaterials = {
  stall: THREE.Material;
  awningPrimary: THREE.Material;
  awningAccent: THREE.Material;
  wood: THREE.Material;
  light: THREE.Material;
  produce: THREE.Material;
};

export type TownMarketConfig = {
  x: number;
  z: number;
  heights: HeightSampler;
  materials: TownMarketMaterials;
};

export class TownMarketAsset extends WorldAsset {
  private readonly x: number;
  private readonly z: number;
  private readonly heights: HeightSampler;
  private readonly materials: TownMarketMaterials;
  private readonly hangingLights: THREE.Object3D[] = [];

  constructor(config: TownMarketConfig) {
    super("prop", `town-market-${Math.round(config.x)}-${Math.round(config.z)}`);
    this.x = config.x;
    this.z = config.z;
    this.heights = config.heights;
    this.materials = config.materials;
    this.build();
  }

  private build(): void {
    [-5, 0, 5].forEach((offset, index) => this.addStall(offset, index));
  }

  private addStall(offset: number, index: number): void {
    const x = this.x + offset;
    const z = this.z;
    const baseY = this.heights.getHeight(x, z);
    const owner = `market-stall-${index + 1}`;
    const awningMaterial = index % 2 === 0 ? this.materials.awningPrimary : this.materials.awningAccent;

    const stall = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.3, 2.2, 2, 1, 1), this.materials.stall);
    stall.name = owner;
    stall.position.set(x, baseY + 0.65, z);
    this.add(stall);

    const counter = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.24, 2.55, 2, 1, 1), this.materials.wood);
    counter.name = `${owner}-counter`;
    counter.position.set(x, baseY + 1.36, z);
    this.add(counter);

    const awning = new THREE.Mesh(new THREE.ConeGeometry(2.4, 1.1, 4), awningMaterial);
    awning.name = `${owner}-awning`;
    awning.position.set(x, baseY + 2.1, z);
    awning.rotation.y = Math.PI * 0.25;
    this.add(awning);

    [-1.28, 1.28].forEach((postOffset, postIndex) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.25, 8), this.materials.wood);
      post.name = `${owner}-awning-post-${postIndex + 1}`;
      post.position.set(x + postOffset, baseY + 1.46, z + 0.94);
      this.add(post);
    });

    for (let i = 0; i < 4; i += 1) {
      const produce = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22 + (i % 2) * 0.04, 1), this.materials.produce);
      produce.name = `${owner}-produce-${i + 1}`;
      produce.position.set(x - 1.05 + i * 0.7, baseY + 1.62, z - 0.42 + (i % 2) * 0.58);
      produce.scale.y = 0.72;
      this.add(produce);
    }

    const lantern = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 1), this.materials.light);
    lantern.name = `${owner}-lantern`;
    lantern.position.set(x, baseY + 2.5, z + 0.78);
    this.hangingLights.push(lantern);
    this.add(lantern);

    const shadow = createContactShadow(2.25, 1.5);
    shadow.name = `${owner}-contact-shadow`;
    shadow.position.set(x, baseY + 0.045, z);
    this.add(shadow);

    this.addCircleCollider(x, z, 2, "prop", owner);
  }

  override update(elapsed: number): void {
    super.update(elapsed);
    this.hangingLights.forEach((light, index) => {
      const glow = 0.9 + Math.sin(elapsed * 3.1 + index * 0.8) * 0.1;
      light.scale.setScalar(glow);
    });
  }
}
