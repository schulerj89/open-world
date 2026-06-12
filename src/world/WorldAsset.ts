import * as THREE from "three";
import { resolveCircleCollision, type CircleCollider } from "./Collision.js";

export type WorldAssetKind = "town" | "building" | "npc" | "enemy" | "foliage" | "prop";

export class WorldAsset extends THREE.Group {
  readonly colliders: CircleCollider[] = [];

  constructor(readonly assetKind: WorldAssetKind, name: string) {
    super();
    this.name = name;
  }

  addCircleCollider(x: number, z: number, radius: number, kind: CircleCollider["kind"]): void {
    this.colliders.push({ x, z, radius, kind });
  }

  resolveCollision(position: { x: number; z: number }, actorRadius: number): number {
    let hits = 0;
    for (const collider of this.colliders) {
      if (resolveCircleCollision(position, collider, actorRadius)) {
        hits += 1;
      }
    }
    return hits;
  }
}
