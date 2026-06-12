import * as THREE from "three";
import { createContactShadow } from "./ContactShadow.js";

export function createMeadowSlimeModel(): THREE.Group {
  const group = new THREE.Group();
  const bodyMaterial = new THREE.MeshLambertMaterial({ color: "#6baa60" });
  const bellyMaterial = new THREE.MeshLambertMaterial({ color: "#a6d176" });
  const eyeMaterial = new THREE.MeshLambertMaterial({ color: "#1b2118" });
  const hornMaterial = new THREE.MeshLambertMaterial({ color: "#d6c38a" });

  group.add(createContactShadow(1.55, 1.18));

  const body = new THREE.Mesh(new THREE.SphereGeometry(1.45, 18, 12), bodyMaterial);
  body.scale.set(1.15, 0.82, 1);
  body.position.y = 1.1;
  group.add(body);

  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.72, 14, 10), bellyMaterial);
  belly.scale.set(1.05, 0.55, 0.34);
  belly.position.set(0, 0.95, -0.9);
  group.add(belly);

  [-0.43, 0.43].forEach((x) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), eyeMaterial);
    eye.position.set(x, 1.58, -1.18);
    group.add(eye);
  });

  [-0.5, 0.5].forEach((x) => {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.55, 8), hornMaterial);
    horn.position.set(x, 2.15, -0.2);
    horn.rotation.z = x < 0 ? 0.25 : -0.25;
    group.add(horn);
  });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.38, 0.28, 18), bodyMaterial);
  base.position.y = 0.25;
  group.add(base);

  group.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = false;
      object.receiveShadow = true;
    }
  });
  return group;
}
