import * as THREE from "three";
import type { CharacterClassKey, OutfitVariant } from "../game/Character.js";

export type HumanoidModelOptions = {
  classKey?: CharacterClassKey;
  primaryColor: string;
  accentColor: string;
  skinColor?: string;
  outfitVariant?: OutfitVariant;
  scale?: number;
};

export function createHumanoidModel(options: HumanoidModelOptions): THREE.Group {
  const group = new THREE.Group();
  const scale = options.scale ?? 1;
  const skin = new THREE.MeshLambertMaterial({ color: options.skinColor ?? "#c9956a" });
  const cloth = new THREE.MeshLambertMaterial({ color: options.primaryColor });
  const accent = new THREE.MeshLambertMaterial({ color: options.accentColor });
  const boot = new THREE.MeshLambertMaterial({ color: "#3d2b22" });
  const hair = new THREE.MeshLambertMaterial({ color: "#2a201a" });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.48, 1.0, 5, 10), cloth);
  body.position.y = 1.85;
  body.scale.set(0.9, 1.08, 0.72);
  group.add(body);

  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.43, 2), skin);
  head.position.y = 2.78;
  group.add(head);

  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.52), hair);
  hairCap.position.y = 2.96;
  group.add(hairCap);

  addLimb(group, -0.48, 1.92, 0.1, -0.25, cloth);
  addLimb(group, 0.48, 1.92, 0.1, 0.25, cloth);
  addLimb(group, -0.22, 0.88, 0, 0.08, boot);
  addLimb(group, 0.22, 0.88, 0, -0.08, boot);

  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.035, 6, 18), accent);
  belt.position.y = 1.62;
  belt.rotation.x = Math.PI / 2;
  group.add(belt);

  const classKey = options.classKey ?? "sentinel";
  if (classKey === "sentinel") {
    addShield(group, accent);
    addShoulders(group, accent);
  } else if (classKey === "wayfarer") {
    addCape(group, accent);
    addQuiver(group, accent);
  } else {
    addRobeHem(group, accent);
    addStaff(group, accent);
  }

  if (options.outfitVariant === "guard") {
    addShoulders(group, accent);
  } else if (options.outfitVariant === "mage") {
    addRobeHem(group, accent);
  } else {
    addCape(group, accent);
  }

  group.scale.setScalar(scale);
  group.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = false;
      object.receiveShadow = true;
    }
  });
  return group;
}

function addLimb(group: THREE.Group, x: number, y: number, z: number, tilt: number, material: THREE.Material): void {
  const limb = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.74, 4, 8), material);
  limb.position.set(x, y, z);
  limb.rotation.z = tilt;
  group.add(limb);
}

function addShield(group: THREE.Group, material: THREE.Material): void {
  const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.12, 14), material);
  shield.position.set(-0.68, 1.82, 0.08);
  shield.rotation.z = Math.PI / 2;
  group.add(shield);
}

function addShoulders(group: THREE.Group, material: THREE.Material): void {
  [-0.42, 0.42].forEach((x) => {
    const shoulder = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 1), material);
    shoulder.position.set(x, 2.35, 0);
    group.add(shoulder);
  });
}

function addCape(group: THREE.Group, material: THREE.Material): void {
  const cape = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.35, 6, 1, true), material);
  cape.position.set(0, 1.55, 0.34);
  cape.rotation.x = -0.22;
  cape.scale.z = 0.24;
  group.add(cape);
}

function addQuiver(group: THREE.Group, material: THREE.Material): void {
  const quiver = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.9, 8), material);
  quiver.position.set(0.38, 2.0, 0.32);
  quiver.rotation.z = 0.38;
  group.add(quiver);
}

function addRobeHem(group: THREE.Group, material: THREE.Material): void {
  const hem = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.72, 0.42, 16), material);
  hem.position.y = 1.08;
  group.add(hem);
}

function addStaff(group: THREE.Group, material: THREE.Material): void {
  const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 2.2, 8), material);
  staff.position.set(0.72, 1.85, 0.04);
  staff.rotation.z = 0.16;
  group.add(staff);
  const gem = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 1), material);
  gem.position.set(0.9, 2.95, 0.04);
  group.add(gem);
}
