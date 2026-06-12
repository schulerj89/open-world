import * as THREE from "three";
import { resolveCircleCollisionDetailed, type CircleCollider, type CollisionHit } from "./Collision.js";

export type WorldAssetKind = "town" | "building" | "npc" | "enemy" | "foliage" | "prop";

export class WorldAsset extends THREE.Group {
  readonly colliders: CircleCollider[] = [];

  constructor(readonly assetKind: WorldAssetKind, name: string) {
    super();
    this.name = name;
  }

  addCircleCollider(x: number, z: number, radius: number, kind: CircleCollider["kind"]): void {
    this.colliders.push({ x, z, radius, kind, owner: this.name });
  }

  resolveCollision(position: { x: number; z: number }, actorRadius: number): number {
    return this.resolveCollisionDetailed(position, actorRadius).hits;
  }

  resolveCollisionDetailed(position: { x: number; z: number }, actorRadius: number): { hits: number; lastHit?: CollisionHit } {
    let hits = 0;
    let lastHit: CollisionHit | undefined;
    for (const collider of this.colliders) {
      const hit = resolveCircleCollisionDetailed(position, collider, actorRadius, collider.owner ?? this.name);
      if (hit) {
        hits += 1;
        lastHit = hit;
      }
    }
    return { hits, lastHit };
  }
}
