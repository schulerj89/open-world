import * as THREE from "three";
import { createContactShadow } from "./ContactShadow.js";
import type { HeightSampler } from "./HeightSampler.js";
import { WorldAsset } from "./WorldAsset.js";

export type TownBuildingMaterials = {
  wall: THREE.Material;
  roof: THREE.Material;
  stone: THREE.Material;
  brightStone: THREE.Material;
  darkStone: THREE.Material;
  trim: THREE.Material;
  wood: THREE.Material;
  light: THREE.Material;
};

export type TownBuildingConfig = {
  x: number;
  z: number;
  yaw: number;
  scale: number;
  heights: HeightSampler;
  materials: TownBuildingMaterials;
};

export class TownBuildingAsset extends WorldAsset {
  private readonly x: number;
  private readonly z: number;
  private readonly yaw: number;
  private readonly modelScale: number;
  private readonly heights: HeightSampler;
  private readonly materials: TownBuildingMaterials;

  constructor(config: TownBuildingConfig) {
    super("building", `cottage-${Math.round(config.x)}-${Math.round(config.z)}`);
    this.x = config.x;
    this.z = config.z;
    this.yaw = config.yaw;
    this.modelScale = config.scale;
    this.heights = config.heights;
    this.materials = config.materials;
    this.build();
  }

  private build(): void {
    const width = 8.2 * this.modelScale;
    const depth = 7.2 * this.modelScale;
    const lowerHeight = 4.1 * this.modelScale;
    const upperHeight = 3.25 * this.modelScale;
    const baseY = this.heights.getHeight(this.x, this.z);
    const owner = this.name;
    this.addCircleCollider(this.x, this.z, 5.05 * this.modelScale, "building", owner);

    const foundation = new THREE.Mesh(new THREE.BoxGeometry(width * 1.12, 0.72 * this.modelScale, depth * 1.12, 3, 1, 3), this.materials.stone);
    foundation.name = `${owner}-foundation`;
    foundation.position.set(this.x, baseY + 0.36 * this.modelScale, this.z);
    foundation.rotation.y = this.yaw;
    this.add(foundation);

    const lower = new THREE.Mesh(new THREE.BoxGeometry(width, lowerHeight, depth, 4, 5, 4), this.materials.wall);
    lower.name = `${owner}-lower-walls`;
    lower.position.set(this.x, baseY + 0.72 * this.modelScale + lowerHeight * 0.5, this.z);
    lower.rotation.y = this.yaw;
    this.add(lower);

    const upper = new THREE.Mesh(new THREE.BoxGeometry(width * 0.9, upperHeight, depth * 0.88, 4, 4, 4), this.materials.wall);
    upper.name = `${owner}-upper-walls`;
    upper.position.set(this.x, baseY + 0.72 * this.modelScale + lowerHeight + upperHeight * 0.5, this.z);
    upper.rotation.y = this.yaw + 0.03;
    this.add(upper);

    const roofHeight = 4.6 * this.modelScale;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(5.8 * this.modelScale, roofHeight, 16, 2), this.materials.roof);
    roof.name = `${owner}-roof`;
    roof.position.set(this.x, baseY + lowerHeight + upperHeight + roofHeight * 0.48 + 0.7 * this.modelScale, this.z);
    roof.rotation.y = this.yaw + Math.PI * 0.25;
    this.add(roof);

    const chimneyX = this.x + Math.cos(this.yaw) * 2.4 * this.modelScale;
    const chimneyZ = this.z + Math.sin(this.yaw) * 2.4 * this.modelScale;
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.9 * this.modelScale, 2.8 * this.modelScale, 0.9 * this.modelScale, 1, 3, 1), this.materials.darkStone);
    chimney.name = `${owner}-chimney`;
    chimney.position.set(chimneyX, baseY + lowerHeight + upperHeight + 3.2 * this.modelScale, chimneyZ);
    chimney.rotation.y = this.yaw;
    this.add(chimney);

    this.addDoor(width, depth, baseY);
    this.addWindows(width, depth, lowerHeight, upperHeight, baseY);
    this.addTrim(width, depth, lowerHeight, upperHeight, baseY);
    this.addBalcony(width, depth, lowerHeight, baseY);
    this.addShadow(width, depth);
  }

  private addDoor(width: number, depth: number, baseY: number): void {
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.55 * this.modelScale, 2.65 * this.modelScale, 0.18 * this.modelScale, 1, 4, 1), this.materials.darkStone);
    door.name = `${this.name}-door`;
    const local = this.localToWorldOffset(0, depth * 0.51);
    door.position.set(this.x + local.x, baseY + 1.65 * this.modelScale, this.z + local.z);
    door.rotation.y = this.yaw;
    this.add(door);

    const lintel = new THREE.Mesh(new THREE.BoxGeometry(2.25 * this.modelScale, 0.28 * this.modelScale, 0.24 * this.modelScale), this.materials.brightStone);
    lintel.name = `${this.name}-door-lintel`;
    lintel.position.set(this.x + local.x, baseY + 3.08 * this.modelScale, this.z + local.z);
    lintel.rotation.y = this.yaw;
    this.add(lintel);
  }

  private addWindows(width: number, depth: number, lowerHeight: number, upperHeight: number, baseY: number): void {
    const windowOffsets = [
      [-2.5, -depth * 0.51, lowerHeight * 0.62],
      [2.5, -depth * 0.51, lowerHeight * 0.62],
      [-2.3, depth * 0.51, lowerHeight * 0.62],
      [2.3, depth * 0.51, lowerHeight * 0.62],
      [-2.0, -depth * 0.48, lowerHeight + upperHeight * 0.58],
      [2.0, -depth * 0.48, lowerHeight + upperHeight * 0.58],
      [-2.0, depth * 0.48, lowerHeight + upperHeight * 0.58],
      [2.0, depth * 0.48, lowerHeight + upperHeight * 0.58]
    ];

    windowOffsets.forEach(([ox, oz, oy], index) => {
      const local = this.localToWorldOffset(ox * this.modelScale, oz);
      const windowMaterial = index % 3 === 0 ? this.materials.light : this.materials.brightStone;
      const pane = new THREE.Mesh(new THREE.BoxGeometry(1.05 * this.modelScale, 0.92 * this.modelScale, 0.12 * this.modelScale, 1, 2, 1), windowMaterial);
      pane.name = `${this.name}-window-${index + 1}`;
      pane.position.set(this.x + local.x, baseY + 0.72 * this.modelScale + oy, this.z + local.z);
      pane.rotation.y = oz > 0 ? this.yaw : this.yaw + Math.PI;
      if (index % 3 === 0) {
        pane.userData.windowGlow = true;
      }
      this.add(pane);

      const sill = new THREE.Mesh(new THREE.BoxGeometry(1.32 * this.modelScale, 0.16 * this.modelScale, 0.2 * this.modelScale), this.materials.stone);
      sill.name = `${this.name}-window-sill-${index + 1}`;
      sill.position.set(pane.position.x, pane.position.y - 0.58 * this.modelScale, pane.position.z);
      sill.rotation.y = pane.rotation.y;
      this.add(sill);
    });
  }

  private addTrim(width: number, depth: number, lowerHeight: number, upperHeight: number, baseY: number): void {
    const wallTop = baseY + 0.72 * this.modelScale + lowerHeight;
    const upperTop = wallTop + upperHeight;
    this.addLocalBox("front-lower-beam", 0, wallTop, depth * 0.52, width * 1.08, 0.24 * this.modelScale, 0.22 * this.modelScale, this.materials.wood);
    this.addLocalBox("back-lower-beam", 0, wallTop, -depth * 0.52, width * 1.08, 0.24 * this.modelScale, 0.22 * this.modelScale, this.materials.wood);
    this.addLocalBox("front-upper-beam", 0, upperTop, depth * 0.47, width, 0.22 * this.modelScale, 0.2 * this.modelScale, this.materials.wood);
    this.addLocalBox("back-upper-beam", 0, upperTop, -depth * 0.47, width, 0.22 * this.modelScale, 0.2 * this.modelScale, this.materials.wood);

    [-width * 0.48, width * 0.48].forEach((ox, index) => {
      this.addLocalBox(`corner-post-front-${index}`, ox, baseY + 0.72 * this.modelScale + lowerHeight * 0.5, depth * 0.5, 0.26 * this.modelScale, lowerHeight, 0.26 * this.modelScale, this.materials.wood);
      this.addLocalBox(`corner-post-back-${index}`, ox, baseY + 0.72 * this.modelScale + lowerHeight * 0.5, -depth * 0.5, 0.26 * this.modelScale, lowerHeight, 0.26 * this.modelScale, this.materials.wood);
    });

    for (let i = -2; i <= 2; i += 1) {
      this.addLocalBox(`roof-rib-front-${i + 2}`, i * width * 0.16, upperTop + 2.25 * this.modelScale, depth * 0.2, 0.16 * this.modelScale, 0.18 * this.modelScale, 4.6 * this.modelScale, this.materials.roof, Math.PI * 0.25);
      this.addLocalBox(`roof-rib-back-${i + 2}`, i * width * 0.16, upperTop + 2.25 * this.modelScale, -depth * 0.2, 0.16 * this.modelScale, 0.18 * this.modelScale, 4.6 * this.modelScale, this.materials.roof, Math.PI * 0.25);
    }
  }

  private addBalcony(width: number, depth: number, lowerHeight: number, baseY: number): void {
    const balconyY = baseY + lowerHeight + 0.95 * this.modelScale;
    this.addLocalBox("balcony-floor", 0, balconyY, depth * 0.62, width * 0.48, 0.2 * this.modelScale, 1.05 * this.modelScale, this.materials.wood);
    [-1.7, 0, 1.7].forEach((ox, index) => {
      this.addLocalBox(`balcony-post-${index + 1}`, ox * this.modelScale, balconyY + 0.75 * this.modelScale, depth * 0.98, 0.16 * this.modelScale, 1.3 * this.modelScale, 0.16 * this.modelScale, this.materials.wood);
    });
    this.addLocalBox("balcony-rail", 0, balconyY + 1.2 * this.modelScale, depth * 0.99, width * 0.52, 0.18 * this.modelScale, 0.16 * this.modelScale, this.materials.wood);
  }

  private addShadow(width: number, depth: number): void {
    const shadow = createContactShadow(width * 0.72, depth * 0.7);
    shadow.position.set(this.x, this.heights.getHeight(this.x, this.z) + 0.045, this.z);
    shadow.rotation.y = this.yaw;
    this.add(shadow);
  }

  private addLocalBox(
    name: string,
    offsetX: number,
    y: number,
    offsetZ: number,
    scaleX: number,
    scaleY: number,
    scaleZ: number,
    material: THREE.Material,
    extraYaw = 0
  ): void {
    const local = this.localToWorldOffset(offsetX, offsetZ);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
    mesh.name = `${this.name}-${name}`;
    mesh.position.set(this.x + local.x, y, this.z + local.z);
    mesh.rotation.y = this.yaw + extraYaw;
    mesh.scale.set(scaleX, scaleY, scaleZ);
    this.add(mesh);
  }

  private localToWorldOffset(offsetX: number, offsetZ: number): { x: number; z: number } {
    return {
      x: offsetX * Math.cos(this.yaw) - offsetZ * Math.sin(this.yaw),
      z: offsetX * Math.sin(this.yaw) + offsetZ * Math.cos(this.yaw)
    };
  }
}
