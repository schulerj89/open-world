import * as THREE from 'three';
import { CHUNK_SIZE, SEA_LEVEL, TERRAIN_RADIUS } from './constants';

export class WaterSystem {
  readonly mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshPhongMaterial>;

  private readonly material: THREE.MeshPhongMaterial;

  constructor() {
    this.material = new THREE.MeshPhongMaterial({
      color: 0x5da9bd,
      emissive: 0x0a2433,
      specular: 0xffffff,
      shininess: 92,
      transparent: false,
      depthWrite: true,
      side: THREE.FrontSide,
      fog: true
    });
    const size = CHUNK_SIZE * (TERRAIN_RADIUS * 2 - 0.9);
    const geometry = new THREE.PlaneGeometry(size, size, 1, 1);
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.name = 'recentered-water-plane';
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.y = SEA_LEVEL + 0.06;
    this.mesh.renderOrder = 2;
  }

  update(player: THREE.Vector3, time: number): void {
    this.mesh.position.x = player.x;
    this.mesh.position.z = player.z;
    const shimmer = (Math.sin(time * 0.52) + Math.sin(time * 0.91 + 2.1)) * 0.5;
    this.material.color.setHSL(0.535 + shimmer * 0.008, 0.42, 0.52 + shimmer * 0.025);
  }
}
