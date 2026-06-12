import * as THREE from "three";

export function createSky(): THREE.Group {
  const group = new THREE.Group();

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(1600, 32, 18),
    new THREE.MeshBasicMaterial({
      color: "#7fb0c7",
      side: THREE.BackSide
    })
  );
  group.add(sky);

  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(18, 20, 12),
    new THREE.MeshBasicMaterial({ color: "#fff0b0" })
  );
  sun.position.set(-280, 220, -420);
  group.add(sun);

  return group;
}

