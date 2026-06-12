export type CircleCollider = {
  x: number;
  z: number;
  radius: number;
  kind: "building" | "fence" | "npc" | "tree" | "enemy" | "prop";
  owner?: string;
};

export type CollisionHit = {
  kind: CircleCollider["kind"];
  owner: string;
  push: number;
  colliderX: number;
  colliderZ: number;
  colliderRadius: number;
  distanceBefore: number;
};

export function resolveCircleCollision(
  position: { x: number; z: number },
  collider: CircleCollider,
  actorRadius: number
): boolean {
  return resolveCircleCollisionDetailed(position, collider, actorRadius) !== undefined;
}

export function resolveCircleCollisionDetailed(
  position: { x: number; z: number },
  collider: CircleCollider,
  actorRadius: number,
  owner = collider.owner ?? "world"
): CollisionHit | undefined {
  const dx = position.x - collider.x;
  const dz = position.z - collider.z;
  const minDistance = actorRadius + collider.radius;
  const distanceSq = dx * dx + dz * dz;

  if (distanceSq >= minDistance * minDistance) {
    return undefined;
  }

  const distance = Math.sqrt(distanceSq);
  const centered = distance <= 0.0001;
  const normalX = centered ? 1 : dx / distance;
  const normalZ = centered ? 0 : dz / distance;
  const push = minDistance - distance;
  position.x += normalX * push;
  position.z += normalZ * push;
  return {
    kind: collider.kind,
    owner,
    push,
    colliderX: collider.x,
    colliderZ: collider.z,
    colliderRadius: collider.radius,
    distanceBefore: distance
  };
}
