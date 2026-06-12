import * as THREE from "three";
import { AmbientSound } from "../audio/AmbientSound";
import { defaultSettings, type QualitySettings, type SettingsKey } from "../config/QualitySettings";
import { createRenderer, configureRenderer, type WebGpuDebugInfo } from "../render/RendererFactory";
import { Overlay } from "../ui/Overlay";
import { createSky } from "../world/Sky";
import { WorldStreamer } from "../world/WorldStreamer";
import { AdaptiveBudget } from "./AdaptiveBudget";
import { FirstPersonController } from "./FirstPersonController";
import { InputController } from "./InputController";
import { PerformanceMonitor } from "./PerformanceMonitor";

type Mode = "title" | "playing" | "settings";

export class AeolianWilds {
  private readonly settings: QualitySettings = { ...defaultSettings };
  private readonly overlay: Overlay;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 1800);
  private readonly clock = new THREE.Clock();
  private readonly streamer = new WorldStreamer();
  private readonly performance = new PerformanceMonitor();
  private readonly adaptiveBudget = new AdaptiveBudget();
  private readonly sound = new AmbientSound();
  private renderer?: THREE.WebGLRenderer;
  private gpuDebug: WebGpuDebugInfo = {
    supported: false,
    secureContext: window.isSecureContext,
    adapterAvailable: false
  };
  private controls?: InputController;
  private player: FirstPersonController;
  private mode: Mode = "title";
  private modeBeforeSettings: Mode = "title";
  private animationId = 0;
  private appliedPixelRatio = 0;

  constructor(host: HTMLElement) {
    this.overlay = new Overlay(host, this.settings, {
      onStart: () => void this.enterWorld(),
      onOpenSettings: () => this.openSettings(),
      onCloseSettings: () => this.closeSettings(),
      onSettingChange: (key, value) => this.updateSetting(key, value)
    });
    this.player = new FirstPersonController(this.camera);
  }

  async start(): Promise<void> {
    this.scene.background = new THREE.Color("#98bdc6");
    this.scene.fog = new THREE.FogExp2("#b7cfd0", 0.00095);
    this.scene.add(createSky());
    this.scene.add(this.streamer.group);
    this.addLights();

    const info = await createRenderer(this.overlay.canvas, this.settings);
    this.renderer = info.renderer;
    this.gpuDebug = info.gpuDebug;
    this.overlay.setBackend(info.backend === "webgpu" ? "WebGPU renderer" : "WebGL fallback");
    if (info.note) {
      console.info(info.note);
    }

    this.controls = new InputController(this.overlay.canvas, () => this.openSettings());
    window.addEventListener("resize", this.resize);
    this.resize();
    this.loop();
  }

  private async enterWorld(): Promise<void> {
    this.mode = "playing";
    this.overlay.setPlaying(true);
    this.overlay.showSettings(false);
    await this.sound.start();
    this.controls?.requestPointerLock();
  }

  private openSettings(): void {
    void this.sound.start();
    if (this.mode === "playing" && document.pointerLockElement) {
      document.exitPointerLock();
    }
    if (this.mode !== "settings") {
      this.modeBeforeSettings = this.mode;
    }
    this.mode = "settings";
    this.overlay.showSettings(true);
    this.overlay.setPlaying(false);
  }

  private closeSettings(): void {
    this.overlay.showSettings(false);
    if (this.mode === "settings") {
      this.mode = this.modeBeforeSettings;
      this.overlay.setPlaying(this.mode === "playing");
      if (this.mode === "playing") {
        this.controls?.requestPointerLock();
      }
    }
  }

  private updateSetting(key: SettingsKey, value: number): void {
    this.settings[key] = value;
    this.overlay.setOutput(key, value);

    if (key === "resolutionScale" && this.renderer) {
      this.applyResolutionScale(this.settings.resolutionScale, true);
    }
  }

  private loop = (): void => {
    this.animationId = requestAnimationFrame(this.loop);
    const delta = Math.min(0.05, this.clock.getDelta());
    const elapsed = this.clock.elapsedTime;
    const wind = 0.45 + Math.sin(elapsed * 0.21) * 0.18 + Math.sin(elapsed * 0.73) * 0.08;
    this.adaptiveBudget.update(this.performance.getFrameMs());
    const runtimeSettings = this.adaptiveBudget.derive(this.settings);

    if (this.mode === "playing" && this.controls) {
      this.player.update(delta, this.controls, this.streamer.terrain);
    } else {
      this.player.setTitleOrbit(elapsed, 138, this.streamer.terrain);
    }

    this.streamer.update(this.camera.position, runtimeSettings);
    this.streamer.animateWind(elapsed, wind);
    this.sound.setIntensity(wind);
    this.performance.update(delta);
    this.applyResolutionScale(runtimeSettings.resolutionScale);
    this.overlay.updateHud(
      this.performance.getFps(),
      this.performance.getFrameMs(),
      this.streamer.getStats(),
      wind,
      {
        ...this.player.getDebugState(),
        pointerLocked: this.controls?.state.pointerLocked ?? false,
        dragLook: this.controls?.state.dragLook ?? false
      },
      this.gpuDebug
    );

    this.renderer?.render(this.scene, this.camera);
  };

  private readonly resize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer?.setSize(window.innerWidth, window.innerHeight, false);
  };

  private applyResolutionScale(scale: number, force = false): void {
    if (!this.renderer) {
      return;
    }

    const pixelRatio = Math.min(window.devicePixelRatio, 2) * scale;
    if (!force && Math.abs(pixelRatio - this.appliedPixelRatio) < 0.025) {
      return;
    }

    this.appliedPixelRatio = pixelRatio;
    configureRenderer(this.renderer, pixelRatio);
  }

  private addLights(): void {
    const hemi = new THREE.HemisphereLight("#f2fbff", "#8ca86a", 3.1);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight("#fff1c2", 4.8);
    sun.position.set(-180, 260, -150);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 20;
    sun.shadow.camera.far = 620;
    sun.shadow.camera.left = -180;
    sun.shadow.camera.right = 180;
    sun.shadow.camera.top = 180;
    sun.shadow.camera.bottom = -180;
    this.scene.add(sun);
  }

  dispose(): void {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener("resize", this.resize);
    this.controls?.dispose();
    this.streamer.dispose();
    this.renderer?.dispose();
  }
}
