import * as THREE from "three";
import type { InputController } from "./InputController";
import type { HeightSampler } from "../world/HeightSampler";

export class FirstPersonController {
  readonly camera: THREE.PerspectiveCamera;
  readonly velocity = new THREE.Vector3();
  readonly position = new THREE.Vector3(0, 18, 0);

  private yaw = 0;
  private pitch = -0.12;
  private grounded = false;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.camera.rotation.order = "YXZ";
  }

  update(delta: number, input: InputController, heights: HeightSampler): void {
    const mouse = input.consumeMouse();

    if (input.state.pointerLocked) {
      this.yaw -= mouse.dx * 0.0022;
      this.pitch -= mouse.dy * 0.0022;
    } else if (input.state.dragLook) {
      this.yaw -= mouse.dx * 0.0028;
      this.pitch -= mouse.dy * 0.0028;
    }

    const keyboardLookX = Number(input.state.lookRight) - Number(input.state.lookLeft);
    const keyboardLookY = Number(input.state.lookDown) - Number(input.state.lookUp);
    this.yaw -= keyboardLookX * delta * 1.85;
    this.pitch += keyboardLookY * delta * 1.35;
    this.pitch = THREE.MathUtils.clamp(this.pitch, -1.35, 1.2);

    const forward = Number(input.state.forward) - Number(input.state.backward);
    const strafe = Number(input.state.right) - Number(input.state.left);
    const speed = input.state.sprint ? 32 : 18;

    const wish = new THREE.Vector3(strafe, 0, -forward);
    if (wish.lengthSq() > 0) {
      wish.normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
      this.velocity.x = THREE.MathUtils.damp(this.velocity.x, wish.x * speed, 9, delta);
      this.velocity.z = THREE.MathUtils.damp(this.velocity.z, wish.z * speed, 9, delta);
    } else {
      this.velocity.x = THREE.MathUtils.damp(this.velocity.x, 0, 7, delta);
      this.velocity.z = THREE.MathUtils.damp(this.velocity.z, 0, 7, delta);
    }

    if (input.state.jump && this.grounded) {
      this.velocity.y = 10.5;
      this.grounded = false;
    }

    this.velocity.y -= 27 * delta;
    this.position.addScaledVector(this.velocity, delta);

    const terrainHeight = heights.getHeight(this.position.x, this.position.z);
    const eyeHeight = terrainHeight + 3.1;

    if (this.position.y < eyeHeight) {
      this.position.y = eyeHeight;
      this.velocity.y = 0;
      this.grounded = true;
    }

    this.camera.position.copy(this.position);
    this.camera.rotation.set(this.pitch, this.yaw, 0);
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

  teleportTo(x: number, z: number, heights: HeightSampler, yaw = 0): void {
    const y = heights.getHeight(x, z) + 3.1;
    this.position.set(x, y, z);
    this.velocity.set(0, 0, 0);
    this.yaw = yaw;
    this.pitch = -0.08;
    this.grounded = true;
    this.camera.position.copy(this.position);
    this.camera.rotation.set(this.pitch, this.yaw, 0);
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
}
