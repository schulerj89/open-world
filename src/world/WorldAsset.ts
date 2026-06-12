import * as THREE from "three";
import { resolveCircleCollisionDetailed, type CircleCollider, type CollisionHit } from "./Collision.js";

export type WorldAssetKind = "town" | "building" | "npc" | "enemy" | "foliage" | "prop";

export class WorldAsset extends THREE.Group {
  readonly colliders: CircleCollider[] = [];
  readonly childAssets: WorldAsset[] = [];

  constructor(readonly assetKind: WorldAssetKind, name: string) {
    super();
    this.name = name;
  }

  addCircleCollider(x: number, z: number, radius: number, kind: CircleCollider["kind"], owner = this.name): void {
    this.colliders.push({ x, z, radius, kind, owner });
  }

  addChildAsset<T extends WorldAsset>(asset: T): T {
    this.childAssets.push(asset);
    this.add(asset);
    return asset;
  }

  getColliderCount(): number {
    return this.colliders.length + this.childAssets.reduce((total, asset) => total + asset.getColliderCount(), 0);
  }

  update(elapsed: number): void {
    for (const asset of this.childAssets) {
      asset.update(elapsed);
    }
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
    for (const asset of this.childAssets) {
      const result = asset.resolveCollisionDetailed(position, actorRadius);
      hits += result.hits;
      lastHit = result.lastHit ?? lastHit;
    }
    return { hits, lastHit };
  }
}
