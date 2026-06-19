import * as THREE from 'three';
import { SEA_LEVEL, WATER_BLOCK_MARGIN } from './constants';
import { InputController } from './input';
import { forestDensityAt, heightAt, moistureAt, sampleWorld, slopeAt } from './world';

export interface PlayerStats {
  position: { x: number; y: number; z: number };
  biome: string;
  height: number;
  waterBlocked: number;
}

export class PlayerController {
  readonly group = new THREE.Group();

  private readonly body = new THREE.Group();
  private readonly leftLeg: THREE.Mesh;
  private readonly rightLeg: THREE.Mesh;
  private readonly leftArm: THREE.Mesh;
  private readonly rightArm: THREE.Mesh;
  private waterBlocked = 0;
  private walkPhase = 0;

  constructor() {
    this.group.name = 'low-poly-player';
    const spawn = findPlayableSpawn();
    this.group.position.set(spawn.x, spawn.y + 0.05, spawn.z);

    const skin = new THREE.MeshPhongMaterial({ color: 0xdca66f, shininess: 18 });
    const tunic = new THREE.MeshPhongMaterial({ color: 0x3e78a8, shininess: 20 });
    const boots = new THREE.MeshPhongMaterial({ color: 0x3b2c1f, shininess: 8 });

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.54, 1.1, 6), tunic);
    torso.position.y = 1.22;
    const head = new THREE.Mesh(new THREE.DodecahedronGeometry(0.34, 0), skin);
    head.position.y = 1.96;
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.4, 6), new THREE.MeshPhongMaterial({ color: 0xbd4737 }));
    cap.position.y = 2.28;

    this.leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.72, 0.2), boots);
    this.rightLeg = this.leftLeg.clone();
    this.leftLeg.position.set(-0.18, 0.46, 0);
    this.rightLeg.position.set(0.18, 0.46, 0);

    this.leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.78, 0.18), skin);
    this.rightArm = this.leftArm.clone();
    this.leftArm.position.set(-0.55, 1.22, 0);
    this.rightArm.position.set(0.55, 1.22, 0);

    this.body.add(torso, head, cap, this.leftLeg, this.rightLeg, this.leftArm, this.rightArm);
    this.group.add(this.body);
  }

  update(dt: number, input: InputController): void {
    const axis = input.axis();
    const moving = Math.abs(axis.x) + Math.abs(axis.z) > 0;
    const speed = axis.running ? 18 : 10.5;
    const forward = new THREE.Vector3(Math.sin(input.yaw), 0, Math.cos(input.yaw));
    const right = new THREE.Vector3(forward.z, 0, -forward.x);
    const direction = new THREE.Vector3()
      .addScaledVector(forward, -axis.z)
      .addScaledVector(right, axis.x);

    if (direction.lengthSq() > 0) {
      direction.normalize();
      const next = this.group.position.clone().addScaledVector(direction, speed * dt);
      const nextHeight = heightAt(next.x, next.z);
      const nextSlope = slopeAt(next.x, next.z);
      if (nextHeight > SEA_LEVEL + WATER_BLOCK_MARGIN && nextSlope < 0.42) {
        this.group.position.x = next.x;
        this.group.position.z = next.z;
        this.body.rotation.y = Math.atan2(direction.x, direction.z);
      } else {
        this.waterBlocked += 1;
      }
    }

    const groundHeight = heightAt(this.group.position.x, this.group.position.z);
    this.group.position.y = THREE.MathUtils.lerp(this.group.position.y, groundHeight + 0.02, 1 - Math.exp(-dt * 18));

    if (moving) {
      this.walkPhase += dt * (axis.running ? 11 : 7.4);
    } else {
      this.walkPhase = THREE.MathUtils.lerp(this.walkPhase, 0, 1 - Math.exp(-dt * 7));
    }

    const swing = Math.sin(this.walkPhase) * (moving ? 0.55 : 0.08);
    this.leftLeg.rotation.x = swing;
    this.rightLeg.rotation.x = -swing;
    this.leftArm.rotation.x = -swing * 0.72;
    this.rightArm.rotation.x = swing * 0.72;
  }

  setPosition(x: number, z: number): void {
    this.group.position.set(x, heightAt(x, z) + 0.02, z);
  }

  getPosition(): THREE.Vector3 {
    return this.group.position.clone();
  }

  getStats(): PlayerStats {
    const sample = sampleWorld(this.group.position.x, this.group.position.z);
    return {
      position: {
        x: this.group.position.x,
        y: this.group.position.y,
        z: this.group.position.z
      },
      biome: sample.biome,
      height: sample.height,
      waterBlocked: this.waterBlocked
    };
  }
}

function findPlayableSpawn(): { x: number; y: number; z: number } {
  let best = { x: 12, y: heightAt(12, 12), z: 12, score: -Infinity };
  for (let z = -3072; z <= 3072; z += 64) {
    for (let x = -3072; x <= 3072; x += 64) {
      const y = heightAt(x, z);
      if (y <= SEA_LEVEL + WATER_BLOCK_MARGIN || y > 110) continue;
      const slope = slopeAt(x, z);
      if (slope > 0.32) continue;
      const moisture = moistureAt(x, z);
      if (moisture < 0.54) continue;
      const forest = forestDensityAt(x, z);
      if (forest < 0.44) continue;
      const elevationScore = 1 - Math.min(1, Math.abs(y - 28) / 70);
      const distancePenalty = Math.hypot(x, z) * 0.00045;
      const score = forest * 2.3 + moisture * 1.55 + elevationScore - slope * 2.2 - distancePenalty;
      if (score > best.score) {
        best = { x, y, z, score };
      }
    }
  }
  if (best.score > -Infinity) return best;

  for (let z = -1536; z <= 1536; z += 48) {
    for (let x = -1536; x <= 1536; x += 48) {
      const y = heightAt(x, z);
      if (y <= SEA_LEVEL + WATER_BLOCK_MARGIN || y > 120) continue;
      const slope = slopeAt(x, z);
      if (slope > 0.36) continue;
      const moisture = moistureAt(x, z);
      const forest = forestDensityAt(x, z);
      const score = forest * 1.7 + moisture - Math.hypot(x, z) * 0.00035 - slope * 1.8;
      if (score > best.score) {
        best = { x, y, z, score };
      }
    }
  }
  return best;
}
