export type CircleCollider = {
  x: number;
  z: number;
  radius: number;
  kind: "building" | "fence" | "npc" | "tree" | "enemy" | "prop";
};

export function resolveCircleCollision(
  position: { x: number; z: number },
  collider: CircleCollider,
  actorRadius: number
): boolean {
  const dx = position.x - collider.x;
  const dz = position.z - collider.z;
  const minDistance = actorRadius + collider.radius;
  const distanceSq = dx * dx + dz * dz;

  if (distanceSq <= 0.0001 || distanceSq >= minDistance * minDistance) {
    return false;
  }

  const distance = Math.sqrt(distanceSq);
  const push = minDistance - distance;
  position.x += (dx / distance) * push;
  position.z += (dz / distance) * push;
  return true;
}
