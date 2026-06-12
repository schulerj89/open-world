import * as THREE from "three";
import { createBeginnerEnemy, type EnemyState } from "../game/CombatSystem.js";
import { createMeadowSlimeModel } from "./CreatureModels.js";
import type { TerrainHeight } from "./TerrainHeight.js";
import { WorldAsset } from "./WorldAsset.js";

export type EnemySpawn = {
  x: number;
  z: number;
};

export class EnemyAsset extends WorldAsset {
  enemy: EnemyState;
  readonly spawn: EnemySpawn;
  readonly mesh: THREE.Group;

  constructor(index: number, spawn: EnemySpawn, terrain: TerrainHeight) {
    const enemy = createBeginnerEnemy(index);
    super("enemy", enemy.name);
    this.enemy = enemy;
    this.spawn = spawn;
    this.mesh = createMeadowSlimeModel();
    this.mesh.name = `enemy-${enemy.id}`;
    this.mesh.position.set(spawn.x, terrain.getHeight(spawn.x, spawn.z), spawn.z);
    this.add(this.mesh);
    this.addCircleCollider(spawn.x, spawn.z, 1.75, "enemy", enemy.name);
  }

  reset(index: number): void {
    this.enemy = createBeginnerEnemy(index);
    this.name = this.enemy.name;
    this.mesh.name = `enemy-${this.enemy.id}`;
    this.mesh.visible = true;
    this.mesh.scale.setScalar(1);
    for (const collider of this.colliders) {
      collider.owner = this.enemy.name;
    }
  }

  syncToTerrain(terrain: TerrainHeight): void {
    this.mesh.position.set(this.spawn.x, terrain.getHeight(this.spawn.x, this.spawn.z), this.spawn.z);
  }

  applyHealthScale(): void {
    const hpPercent = this.enemy.maxHp > 0 ? this.enemy.hp / this.enemy.maxHp : 0;
    this.mesh.scale.setScalar(0.75 + hpPercent * 0.25);
  }

  updateVisual(
    elapsed: number,
    index: number,
    terrain: TerrainHeight,
    hitRemaining: number
  ): { height: number } {
    const height = terrain.getHeight(this.spawn.x, this.spawn.z);
    const bounce = Math.sin(elapsed * 3.2 + index * 0.9);
    const hpScale = this.enemy.alive ? 0.75 + (this.enemy.hp / this.enemy.maxHp) * 0.25 : 0.75;
    const hitPulse = hitRemaining > 0 ? Math.sin((1 - hitRemaining / 0.32) * Math.PI) : 0;

    // The collider stays at the logical spawn point; hit recoil is visual-only.
    this.mesh.position.set(
      this.spawn.x + hitPulse * Math.sin(elapsed * 34 + index) * 0.22,
      height + 0.12 + Math.abs(bounce) * 0.22 + hitPulse * 0.34,
      this.spawn.z + hitPulse * Math.cos(elapsed * 31 + index) * 0.22
    );
    this.mesh.scale.set(
      hpScale * (1.04 - Math.abs(bounce) * 0.05 + hitPulse * 0.18),
      hpScale * (0.95 + Math.abs(bounce) * 0.12 - hitPulse * 0.1),
      hpScale * (1 + hitPulse * 0.12)
    );
    this.mesh.rotation.y += 0.018 + index * 0.003;
    if (!this.enemy.alive && hitRemaining <= 0) {
      this.mesh.visible = false;
    }

    return { height };
  }
}
