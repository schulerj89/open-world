import * as THREE from "three";
import { createHumanoidModel } from "./HumanoidModel.js";
import type { HeightSampler } from "./HeightSampler.js";
import { WorldAsset } from "./WorldAsset.js";

export type TownNpcConfig = {
  index: number;
  x: number;
  z: number;
  yaw: number;
  primaryColor: string;
  accentColor: string;
  guide?: boolean;
  heights: HeightSampler;
};

export class TownNpcAsset extends WorldAsset {
  private readonly baseY: number;
  private readonly baseYaw: number;
  private readonly phase: number;

  constructor(config: TownNpcConfig) {
    super("npc", config.guide ? "tutorial-guide-npc" : `town-npc-${config.index + 1}`);

    this.baseY = config.heights.getHeight(config.x, config.z) + 0.08;
    this.baseYaw = config.yaw;
    this.phase = config.index * 1.7;
    this.position.set(config.x, this.baseY, config.z);
    this.rotation.y = config.yaw;

    const model = createHumanoidModel({
      primaryColor: config.primaryColor,
      accentColor: config.accentColor,
      outfitVariant: config.index % 2 === 0 ? "traveler" : "guard",
      scale: 1.15
    });
    model.name = `starter-town-npc-${config.index}`;
    model.position.set(0, 0, 0);
    this.add(model);
    this.addCircleCollider(config.x, config.z, 0.95, "npc", this.name);
  }

  override update(elapsed: number): void {
    super.update(elapsed);
    this.position.y = this.baseY + Math.sin(elapsed * 2.1 + this.phase) * 0.035;
    this.rotation.y = this.baseYaw + Math.sin(elapsed * 0.85 + this.phase) * 0.18;
  }
}
