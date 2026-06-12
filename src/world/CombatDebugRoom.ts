import * as THREE from "three";
import type { TerrainHeight } from "./TerrainHeight.js";
import { WorldAsset } from "./WorldAsset.js";

export class CombatDebugRoom extends WorldAsset {
  readonly playerSpawn = {
    x: 176,
    z: -174,
    yaw: -0.8
  };

  readonly enemySpawn = {
    x: 188,
    z: -184
  };

  constructor(private readonly terrain: TerrainHeight) {
    super("prop", "combat-debug-room");
    this.buildRoom();
  }

  getHeight(x: number, z: number): number {
    return this.terrain.getHeight(x, z);
  }

  private buildRoom(): void {
    const centerX = 182;
    const centerZ = -180;
    const baseY = this.getHeight(centerX, centerZ) + 0.08;
    const floorMaterial = new THREE.MeshLambertMaterial({ color: "#6f6f67" });
    const wallMaterial = new THREE.MeshLambertMaterial({ color: "#393b3f" });
    const markerMaterial = new THREE.MeshLambertMaterial({ color: "#d9b35b" });
    const dummyMaterial = new THREE.MeshLambertMaterial({ color: "#8a5545" });

    const floor = new THREE.Mesh(new THREE.BoxGeometry(38, 0.12, 30, 8, 1, 8), floorMaterial);
    floor.name = "debug-room-floor";
    floor.position.set(centerX, baseY, centerZ);
    this.add(floor);

    this.addWall(centerX, centerZ - 15, 38, 0.7, baseY, wallMaterial, "north-wall");
    this.addWall(centerX, centerZ + 15, 38, 0.7, baseY, wallMaterial, "south-wall");
    this.addWall(centerX - 19, centerZ, 0.7, 30, baseY, wallMaterial, "west-wall");
    this.addWall(centerX + 19, centerZ, 0.7, 30, baseY, wallMaterial, "east-wall");

    [
      [centerX - 11, centerZ - 8],
      [centerX + 11, centerZ - 8],
      [centerX - 11, centerZ + 8],
      [centerX + 11, centerZ + 8]
    ].forEach(([x, z], index) => {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.9, 2.8, 12), wallMaterial);
      pillar.name = `debug-room-pillar-${index}`;
      pillar.position.set(x, this.getHeight(x, z) + 1.4, z);
      this.add(pillar);
      this.addCircleCollider(x, z, 1.05, "prop", `debug-pillar-${index}`);
    });

    const spawnRing = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.06, 8, 36), markerMaterial);
    spawnRing.name = "debug-room-player-spawn-ring";
    spawnRing.position.set(this.playerSpawn.x, this.getHeight(this.playerSpawn.x, this.playerSpawn.z) + 0.14, this.playerSpawn.z);
    spawnRing.rotation.x = Math.PI / 2;
    this.add(spawnRing);

    const enemyRing = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.08, 8, 36), markerMaterial);
    enemyRing.name = "debug-room-enemy-spawn-ring";
    enemyRing.position.set(this.enemySpawn.x, this.getHeight(this.enemySpawn.x, this.enemySpawn.z) + 0.16, this.enemySpawn.z);
    enemyRing.rotation.x = Math.PI / 2;
    this.add(enemyRing);

    const dummy = new THREE.Mesh(new THREE.CapsuleGeometry(0.45, 1.5, 6, 12), dummyMaterial);
    dummy.name = "debug-room-collision-dummy";
    dummy.position.set(centerX, this.getHeight(centerX, centerZ + 6) + 1.0, centerZ + 6);
    this.add(dummy);
    this.addCircleCollider(centerX, centerZ + 6, 1.2, "prop", "debug-combat-dummy");
  }

  private addWall(
    x: number,
    z: number,
    width: number,
    depth: number,
    baseY: number,
    material: THREE.Material,
    name: string
  ): void {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(width, 2.4, depth), material);
    wall.name = `debug-room-${name}`;
    wall.position.set(x, baseY + 1.2, z);
    this.add(wall);
    const samples = Math.max(1, Math.ceil(Math.max(width, depth) / 3));
    for (let i = 0; i <= samples; i += 1) {
      const t = samples === 0 ? 0.5 : i / samples;
      const colliderX = x + (width > depth ? (t - 0.5) * width : 0);
      const colliderZ = z + (depth > width ? (t - 0.5) * depth : 0);
      this.addCircleCollider(colliderX, colliderZ, 1.05, "fence", `debug-${name}`);
    }
  }
}
