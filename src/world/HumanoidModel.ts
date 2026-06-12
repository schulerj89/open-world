import * as THREE from "three";
import type { CharacterClassKey, OutfitVariant } from "../game/Character.js";
import { createContactShadow } from "./ContactShadow.js";

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
  const leather = new THREE.MeshLambertMaterial({ color: "#3d2b22" });
  const hair = new THREE.MeshLambertMaterial({ color: "#2a201a" });
  const eye = new THREE.MeshLambertMaterial({ color: "#182029" });
  const metal = new THREE.MeshLambertMaterial({ color: "#d8c07a" });

  group.add(createContactShadow(0.62, 0.44));

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 1.05, 9, 18), cloth);
  body.name = "torso";
  body.position.y = 1.84;
  body.scale.set(0.92, 1.08, 0.72);
  group.add(body);

  addTunicPanels(group, accent, leather);
  const leftArm = addArm(group, "left-arm", -0.58, -0.26, cloth, skin, leather);
  const rightArm = addArm(group, "right-arm", 0.58, 0.26, cloth, skin, leather);
  addLeg(group, "left-leg", -0.24, 0.1, leather, accent);
  addLeg(group, "right-leg", 0.24, -0.1, leather, accent);

  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.43, 3), skin);
  head.name = "head";
  head.position.y = 2.78;
  head.scale.set(0.92, 1.06, 0.86);
  group.add(head);

  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.46, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.58), hair);
  hairCap.name = "hair-cap";
  hairCap.position.y = 2.97;
  hairCap.scale.set(1, 0.88, 0.95);
  group.add(hairCap);
  addFace(group, eye, hair, skin);
  addHairTufts(group, hair);

  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.035, 8, 28), leather);
  belt.name = "belt";
  belt.position.y = 1.62;
  belt.rotation.x = Math.PI / 2;
  group.add(belt);

  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.045, 2, 1, 1), metal);
  buckle.name = "belt-buckle";
  buckle.position.set(0, 1.62, -0.42);
  group.add(buckle);

  const classKey = options.classKey ?? "sentinel";
  addHeldWeapon(rightArm, classKey, accent, metal, leather);
  if (classKey === "sentinel") {
    addShield(leftArm, accent, metal);
    addShoulders(group, accent);
  } else if (classKey === "wayfarer") {
    addCape(group, accent);
    addQuiver(group, accent, leather);
  } else {
    addRobeHem(group, accent);
    addStaff(group, accent, metal);
  }

  if (options.outfitVariant === "guard") {
    addShoulders(group, accent);
    addBracers(leftArm, rightArm, metal);
  } else if (options.outfitVariant === "mage") {
    addRobeHem(group, accent);
    addCollar(group, accent);
  } else {
    addCape(group, accent);
    addSatchel(group, leather, metal);
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

function setBaseRotation(object: THREE.Object3D): void {
  object.userData.baseRotation = {
    x: object.rotation.x,
    y: object.rotation.y,
    z: object.rotation.z
  };
}

function addArm(
  group: THREE.Group,
  name: string,
  x: number,
  tilt: number,
  cloth: THREE.Material,
  skin: THREE.Material,
  leather: THREE.Material
): THREE.Group {
  const arm = new THREE.Group();
  arm.name = name;
  arm.position.set(x, 2.25, -0.02);
  arm.rotation.z = tilt;
  setBaseRotation(arm);

  const sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.135, 0.5, 7, 14), cloth);
  sleeve.name = `${name}-sleeve`;
  sleeve.position.y = -0.33;
  arm.add(sleeve);

  const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.115, 0.44, 7, 14), skin);
  forearm.name = `${name}-forearm`;
  forearm.position.y = -0.76;
  arm.add(forearm);

  const glove = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 8), leather);
  glove.name = `${name}-glove`;
  glove.position.y = -1.08;
  glove.scale.set(0.9, 0.72, 0.82);
  arm.add(glove);

  group.add(arm);
  return arm;
}

function addLeg(group: THREE.Group, name: string, x: number, tilt: number, leather: THREE.Material, accent: THREE.Material): void {
  const leg = new THREE.Group();
  leg.name = name;
  leg.position.set(x, 1.1, 0);
  leg.rotation.z = tilt;
  setBaseRotation(leg);

  const boot = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.64, 7, 14), leather);
  boot.name = `${name}-boot`;
  boot.position.y = -0.18;
  leg.add(boot);

  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.15, 0.12, 14), accent);
  cuff.name = `${name}-cuff`;
  cuff.position.y = 0.18;
  leg.add(cuff);

  const toe = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.11, 0.34, 2, 1, 2), leather);
  toe.name = `${name}-toe`;
  toe.position.set(0, -0.55, -0.1);
  leg.add(toe);
  group.add(leg);
}

function addFace(group: THREE.Group, eye: THREE.Material, hair: THREE.Material, skin: THREE.Material): void {
  [-0.14, 0.14].forEach((x) => {
    const eyeball = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 8), eye);
    eyeball.name = x < 0 ? "left-eye" : "right-eye";
    eyeball.position.set(x, 2.82, -0.35);
    eyeball.scale.set(1, 0.72, 0.42);
    group.add(eyeball);

    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.026, 0.025, 1, 1, 1), hair);
    brow.name = x < 0 ? "left-brow" : "right-brow";
    brow.position.set(x, 2.92, -0.38);
    brow.rotation.z = x < 0 ? -0.12 : 0.12;
    group.add(brow);
  });

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.12, 8), skin);
  nose.name = "nose";
  nose.position.set(0, 2.74, -0.41);
  nose.rotation.x = Math.PI / 2;
  group.add(nose);

  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.024, 0.018, 1, 1, 1), eye);
  mouth.name = "mouth";
  mouth.position.set(0, 2.6, -0.37);
  group.add(mouth);
}

function addHairTufts(group: THREE.Group, material: THREE.Material): void {
  [-0.18, 0, 0.18].forEach((x, index) => {
    const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 7), material);
    tuft.name = `hair-tuft-${index}`;
    tuft.position.set(x, 3.08 - Math.abs(x) * 0.18, -0.26);
    tuft.rotation.x = 1.25;
    tuft.rotation.z = x * 0.9;
    group.add(tuft);
  });
}

function addTunicPanels(group: THREE.Group, accent: THREE.Material, leather: THREE.Material): void {
  const chestPanel = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.58, 0.045, 3, 3, 1), accent);
  chestPanel.name = "front-tunic-panel";
  chestPanel.position.set(0, 1.9, -0.38);
  group.add(chestPanel);

  const strap = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.16, 0.052, 1, 4, 1), leather);
  strap.name = "diagonal-strap";
  strap.position.set(-0.16, 1.95, -0.43);
  strap.rotation.z = -0.42;
  group.add(strap);
}

function addHeldWeapon(
  rightArm: THREE.Group,
  classKey: CharacterClassKey,
  accent: THREE.Material,
  metal: THREE.Material,
  leather: THREE.Material
): void {
  const weapon = new THREE.Group();
  weapon.name = "right-hand-weapon";
  weapon.position.set(0.02, -1.12, -0.06);
  weapon.rotation.x = classKey === "arcanist" ? -0.12 : -0.55;
  weapon.rotation.z = classKey === "wayfarer" ? -0.3 : 0.08;
  setBaseRotation(weapon);

  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.48, 8), leather);
  grip.rotation.x = Math.PI / 2;
  weapon.add(grip);

  if (classKey === "arcanist") {
    const wand = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.95, 8), accent);
    wand.position.z = -0.42;
    wand.rotation.x = Math.PI / 2;
    weapon.add(wand);
    const gem = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 2), metal);
    gem.position.z = -0.93;
    weapon.add(gem);
  } else {
    const blade = new THREE.Mesh(new THREE.ConeGeometry(classKey === "wayfarer" ? 0.08 : 0.11, classKey === "wayfarer" ? 0.72 : 1.0, 4), metal);
    blade.name = "weapon-blade";
    blade.position.z = -0.66;
    blade.rotation.x = Math.PI / 2;
    weapon.add(blade);
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, 0.045, 1, 1, 1), accent);
    guard.position.z = -0.24;
    weapon.add(guard);
  }

  rightArm.add(weapon);
}

function addShield(leftArm: THREE.Group, accent: THREE.Material, metal: THREE.Material): void {
  const shield = new THREE.Group();
  shield.name = "left-arm-shield";
  shield.position.set(-0.07, -0.75, -0.07);
  shield.rotation.set(0.25, 0.18, 0.08);

  const disk = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.12, 22), accent);
  disk.rotation.z = Math.PI / 2;
  shield.add(disk);

  const boss = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 2), metal);
  boss.position.x = -0.08;
  shield.add(boss);
  leftArm.add(shield);
}

function addShoulders(group: THREE.Group, material: THREE.Material): void {
  [-0.43, 0.43].forEach((x) => {
    const shoulder = new THREE.Mesh(new THREE.IcosahedronGeometry(0.23, 2), material);
    shoulder.name = x < 0 ? "left-shoulder" : "right-shoulder";
    shoulder.position.set(x, 2.36, -0.02);
    shoulder.scale.set(1.12, 0.78, 0.9);
    group.add(shoulder);
  });
}

function addCape(group: THREE.Group, material: THREE.Material): void {
  const cape = new THREE.Mesh(new THREE.ConeGeometry(0.64, 1.38, 12, 2, true), material);
  cape.name = "cape";
  cape.position.set(0, 1.55, 0.34);
  cape.rotation.x = -0.22;
  cape.scale.z = 0.24;
  group.add(cape);
}

function addQuiver(group: THREE.Group, accent: THREE.Material, leather: THREE.Material): void {
  const quiver = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.92, 12), leather);
  quiver.name = "quiver";
  quiver.position.set(0.38, 2.0, 0.32);
  quiver.rotation.z = 0.38;
  group.add(quiver);

  for (let i = 0; i < 3; i += 1) {
    const arrow = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.014, 0.55, 5), accent);
    arrow.name = `quiver-arrow-${i}`;
    arrow.position.set(0.34 + i * 0.035, 2.34, 0.26);
    arrow.rotation.z = 0.3;
    group.add(arrow);
  }
}

function addRobeHem(group: THREE.Group, material: THREE.Material): void {
  const hem = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.74, 0.42, 22), material);
  hem.name = "robe-hem";
  hem.position.y = 1.08;
  group.add(hem);
}

function addStaff(group: THREE.Group, material: THREE.Material, metal: THREE.Material): void {
  const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 2.2, 10), material);
  staff.name = "back-staff";
  staff.position.set(0.72, 1.85, 0.04);
  staff.rotation.z = 0.16;
  group.add(staff);

  const gem = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 2), metal);
  gem.name = "back-staff-gem";
  gem.position.set(0.9, 2.95, 0.04);
  group.add(gem);
}

function addBracers(leftArm: THREE.Group, rightArm: THREE.Group, metal: THREE.Material): void {
  [leftArm, rightArm].forEach((arm, index) => {
    const bracer = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.13, 0.16, 12), metal);
    bracer.name = index === 0 ? "left-bracer" : "right-bracer";
    bracer.position.y = -0.8;
    arm.add(bracer);
  });
}

function addCollar(group: THREE.Group, material: THREE.Material): void {
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.045, 8, 18), material);
  collar.name = "robe-collar";
  collar.position.y = 2.28;
  collar.rotation.x = Math.PI / 2;
  group.add(collar);
}

function addSatchel(group: THREE.Group, leather: THREE.Material, metal: THREE.Material): void {
  const satchel = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.26, 0.12, 2, 2, 1), leather);
  satchel.name = "satchel";
  satchel.position.set(-0.5, 1.38, 0.18);
  satchel.rotation.z = -0.18;
  group.add(satchel);

  const clasp = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.05, 0.025, 1, 1, 1), metal);
  clasp.name = "satchel-clasp";
  clasp.position.set(-0.5, 1.4, 0.11);
  group.add(clasp);
}
