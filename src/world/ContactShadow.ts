import * as THREE from "three";

const shadowGeometry = new THREE.CircleGeometry(1, 24);
const shadowMaterial = new THREE.MeshBasicMaterial({
  color: "#050604",
  depthWrite: false,
  opacity: 0.24,
  transparent: true
});

export function createContactShadow(scaleX: number, scaleZ: number): THREE.Mesh {
  const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
  shadow.name = "contact-shadow";
  shadow.position.y = 0.035;
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.set(scaleX, scaleZ, 1);
  shadow.renderOrder = -1;
  return shadow;
}
