import * as THREE from "three";
import type { InputController } from "./InputController";
import type { HeightSampler } from "../world/HeightSampler";

export type CollisionResolver = (position: THREE.Vector3, actorRadius: number) => void;

export class ThirdPersonController {
  readonly camera: THREE.PerspectiveCamera;
  readonly velocity = new THREE.Vector3();
  readonly position = new THREE.Vector3(0, 4, 0);

  private readonly cameraTarget = new THREE.Vector3();
  private readonly cameraOffset = new THREE.Vector3();
  private yaw = 0;
  private pitch = 0.28;
  private grounded = false;
  private jumpRequested = false;
  private walkCycle = 0;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.camera.rotation.order = "YXZ";
  }

  update(delta: number, input: InputController, heights: HeightSampler, avatar?: THREE.Object3D, resolveCollision?: CollisionResolver): void {
    const mouse = input.consumeMouse();
    if (input.state.pointerLocked) {
      this.yaw -= mouse.dx * 0.0022;
      this.pitch -= mouse.dy * 0.0018;
    } else if (input.state.dragLook) {
      this.yaw -= mouse.dx * 0.0026;
      this.pitch -= mouse.dy * 0.002;
    }

    const keyboardLookX = Number(input.state.lookRight) - Number(input.state.lookLeft);
    const keyboardLookY = Number(input.state.lookDown) - Number(input.state.lookUp);
    this.yaw -= keyboardLookX * delta * 1.85;
    this.pitch += keyboardLookY * delta * 1.15;
    this.pitch = THREE.MathUtils.clamp(this.pitch, -0.2, 0.82);

    const forward = Number(input.state.forward) - Number(input.state.backward);
    const strafe = Number(input.state.right) - Number(input.state.left);
    const speed = input.state.sprint ? 25 : 14;
    const wish = new THREE.Vector3(strafe, 0, -forward);

    if (wish.lengthSq() > 0) {
      wish.normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
      this.velocity.x = THREE.MathUtils.damp(this.velocity.x, wish.x * speed, 8, delta);
      this.velocity.z = THREE.MathUtils.damp(this.velocity.z, wish.z * speed, 8, delta);
      if (avatar) {
        avatar.rotation.y = Math.atan2(this.velocity.x, this.velocity.z);
      }
    } else {
      this.velocity.x = THREE.MathUtils.damp(this.velocity.x, 0, 7, delta);
      this.velocity.z = THREE.MathUtils.damp(this.velocity.z, 0, 7, delta);
    }

    if ((input.state.jump || this.jumpRequested) && this.grounded) {
      this.velocity.y = 9.8;
      this.grounded = false;
    }
    this.jumpRequested = false;

    this.velocity.y -= 27 * delta;
    this.position.addScaledVector(this.velocity, delta);
    resolveCollision?.(this.position, 0.72);
    const floorY = heights.getHeight(this.position.x, this.position.z);
    const actorY = floorY + 0.08;
    if (this.position.y < actorY) {
      this.position.y = actorY;
      this.velocity.y = 0;
      this.grounded = true;
    }

    if (avatar) {
      avatar.position.copy(this.position);
      const horizontalSpeed = Math.hypot(this.velocity.x, this.velocity.z);
      if (this.grounded && horizontalSpeed > 0.2) {
        this.walkCycle += horizontalSpeed * delta;
        avatar.position.y += Math.sin(this.walkCycle * 5.4) * 0.055;
      }
    }

    this.updateCamera(delta, heights);
  }

  setTitleOrbit(time: number, radius: number, heights: HeightSampler): void {
    const angle = time * 0.08;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = heights.getHeight(x, z) + 24 + Math.sin(time * 0.2) * 2;
    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, heights.getHeight(0, 0) + 10, 0);
    this.position.copy(this.camera.position);
  }

  teleportTo(x: number, z: number, heights: HeightSampler, yaw = 0, avatar?: THREE.Object3D): void {
    const y = heights.getHeight(x, z) + 0.08;
    this.position.set(x, y, z);
    this.velocity.set(0, 0, 0);
    this.yaw = yaw;
    this.pitch = 0.28;
    this.grounded = true;
    if (avatar) {
      avatar.position.copy(this.position);
      avatar.rotation.y = yaw;
    }
    this.updateCamera(1, heights, true);
  }

  warpBy(deltaX: number, deltaZ: number, heights: HeightSampler, avatar?: THREE.Object3D): void {
    this.teleportTo(this.position.x + deltaX, this.position.z + deltaZ, heights, this.yaw, avatar);
  }

  requestJump(): void {
    this.jumpRequested = true;
  }

  getDebugState(): {
    x: number;
    y: number;
    z: number;
    speed: number;
    grounded: boolean;
    yaw: number;
    pitch: number;
  } {
    return {
      x: this.position.x,
      y: this.position.y,
      z: this.position.z,
      speed: Math.hypot(this.velocity.x, this.velocity.y, this.velocity.z),
      grounded: this.grounded,
      yaw: THREE.MathUtils.radToDeg(this.yaw),
      pitch: THREE.MathUtils.radToDeg(this.pitch)
    };
  }

  private updateCamera(delta: number, heights: HeightSampler, snap = false): void {
    const distance = 9.4;
    const height = 4.5 + this.pitch * 4.2;
    this.cameraOffset.set(Math.sin(this.yaw) * distance, height, Math.cos(this.yaw) * distance);
    const desired = this.position.clone().add(this.cameraOffset);
    desired.y = Math.max(desired.y, heights.getHeight(desired.x, desired.z) + 1.2);
    this.camera.position.lerp(desired, snap ? 1 : 1 - Math.pow(0.0005, delta));
    this.cameraTarget.set(this.position.x, this.position.y + 2.1, this.position.z);
    this.camera.lookAt(this.cameraTarget);
  }
}
