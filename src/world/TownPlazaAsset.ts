import * as THREE from "three";
import { createContactShadow } from "./ContactShadow.js";
import type { HeightSampler } from "./HeightSampler.js";
import { WorldAsset } from "./WorldAsset.js";

export type TownPlazaMaterials = {
  stone: THREE.Material;
  marker: THREE.Material;
  brightStone: THREE.Material;
  darkStone: THREE.Material;
};

export type TownPlazaConfig = {
  heights: HeightSampler;
  materials: TownPlazaMaterials;
};

export class TownPlazaAsset extends WorldAsset {
  private readonly heights: HeightSampler;
  private readonly materials: TownPlazaMaterials;
  private readonly crystal: THREE.Object3D;
  private readonly crystalBaseY: number;

  constructor(config: TownPlazaConfig) {
    super("prop", "town-plaza-statue");
    this.heights = config.heights;
    this.materials = config.materials;
    this.crystalBaseY = this.heights.getHeight(0, 0) + 2.55;
    this.crystal = this.build();
  }

  private build(): THREE.Object3D {
    const baseHeight = this.heights.getHeight(0, 0);
    const plaza = new THREE.Mesh(new THREE.CylinderGeometry(11, 11, 0.18, 48), this.materials.stone);
    plaza.name = "town-plaza-paved-disc";
    plaza.position.set(0, baseHeight + 0.09, 0);
    plaza.receiveShadow = true;
    this.add(plaza);

    const innerRing = new THREE.Mesh(new THREE.TorusGeometry(7.5, 0.16, 6, 48), this.materials.brightStone);
    innerRing.name = "town-plaza-inner-ring";
    innerRing.position.set(0, baseHeight + 0.21, 0);
    innerRing.rotation.x = Math.PI * 0.5;
    this.add(innerRing);

    const outerRing = new THREE.Mesh(new THREE.TorusGeometry(10.1, 0.14, 6, 64), this.materials.darkStone);
    outerRing.name = "town-plaza-outer-ring";
    outerRing.position.set(0, baseHeight + 0.22, 0);
    outerRing.rotation.x = Math.PI * 0.5;
    this.add(outerRing);

    const statueBase = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.3, 1.2, 20), this.materials.stone);
    statueBase.name = "plaza-statue-base";
    statueBase.position.set(0, baseHeight + 0.7, 0);
    this.add(statueBase);

    const statueCap = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.75, 0.34, 20), this.materials.brightStone);
    statueCap.name = "plaza-statue-cap";
    statueCap.position.set(0, baseHeight + 1.48, 0);
    this.add(statueCap);

    const crystal = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2, 2), this.materials.marker);
    crystal.name = "plaza-statue-crystal";
    crystal.position.set(0, this.crystalBaseY, 0);
    this.add(crystal);

    const shadow = createContactShadow(5.6, 5.6);
    shadow.name = "plaza-statue-contact-shadow";
    shadow.position.set(0, baseHeight + 0.045, 0);
    this.add(shadow);

    this.addCircleCollider(0, 0, 2.3, "prop", "plaza-statue-base");
    return crystal;
  }

  override update(elapsed: number): void {
    super.update(elapsed);
    this.crystal.position.y = this.crystalBaseY + Math.sin(elapsed * 2.2) * 0.12;
    this.crystal.rotation.y += 0.018;
  }
}
