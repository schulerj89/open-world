import * as THREE from "three";
import { AmbientSound } from "../audio/AmbientSound";
import { defaultSettings, type QualitySettings } from "../config/QualitySettings";
import { createCharacter, healCharacter, type CharacterDraft, type PlayerCharacter } from "../game/Character.js";
import { createBeginnerEnemy, strikeEnemy, type EnemyState } from "../game/CombatSystem.js";
import { resolvePerformanceSettings, type PerformancePresetKey } from "../game/PerformancePresets.js";
import { createTutorialQuest, getTutorialInstruction, recordTutorialKill, type TutorialQuestState } from "../game/QuestSystem.js";
import { createRenderer, configureRenderer, type WebGpuDebugInfo } from "../render/RendererFactory";
import { Overlay } from "../ui/Overlay";
import { createMeadowSlimeModel } from "../world/CreatureModels.js";
import { createHumanoidModel } from "../world/HumanoidModel.js";
import { createSky } from "../world/Sky";
import { StarterTown } from "../world/StarterTown.js";
import { WorldStreamer } from "../world/WorldStreamer";
import { AdaptiveBudget } from "./AdaptiveBudget";
import { InputController, type InputActions } from "./InputController";
import { PerformanceMonitor } from "./PerformanceMonitor";
import { ThirdPersonController } from "./ThirdPersonController";

type Mode = "title" | "playing" | "settings";

type EnemyActor = {
  enemy: EnemyState;
  mesh: THREE.Group;
  spawn: {
    x: number;
    z: number;
  };
};

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
  private readonly playerAvatar = new THREE.Group();
  private readonly selectionRing = new THREE.Mesh(
    new THREE.TorusGeometry(2.2, 0.08, 8, 32),
    new THREE.MeshBasicMaterial({ color: "#f0c45b" })
  );
  private playerModel?: THREE.Group;
  private renderer?: THREE.WebGLRenderer;
  private gpuDebug: WebGpuDebugInfo = {
    supported: false,
    secureContext: window.isSecureContext,
    adapterAvailable: false
  };
  private controls?: InputController;
  private player: ThirdPersonController;
  private town?: StarterTown;
  private character: PlayerCharacter = createCharacter({ name: "Rowan", classKey: "sentinel" });
  private quest: TutorialQuestState = createTutorialQuest();
  private readonly enemies: EnemyActor[] = [];
  private selectedEnemyId = "";
  private lastMessage = "Create a character and enter Briar Glen.";
  private mode: Mode = "title";
  private modeBeforeSettings: Mode = "title";
  private animationId = 0;
  private appliedPixelRatio = 0;
  private lastHudUpdate = Number.NEGATIVE_INFINITY;

  constructor(host: HTMLElement) {
    this.overlay = new Overlay(host, this.settings, {
      onStart: (draft) => void this.enterWorld(draft),
      onOpenSettings: () => this.openSettings(),
      onCloseSettings: () => this.closeSettings(),
      onPerformanceChange: (preset, memoryBudgetMb) => this.updatePerformancePreset(preset, memoryBudgetMb),
      onToggleDebug: () => this.toggleDebug(),
      onBackToMenu: () => this.returnToMenu(),
      onDebugAction: (action) => this.runDebugAction(action)
    });
    this.player = new ThirdPersonController(this.camera);
  }

  async start(): Promise<void> {
    this.scene.background = new THREE.Color("#98bdc6");
    this.scene.fog = new THREE.FogExp2("#b7cfd0", 0.00095);
    this.scene.add(createSky());
    this.scene.add(this.streamer.group);
    this.addLights();
    this.playerAvatar.name = "player-avatar";
    this.playerAvatar.visible = false;
    this.scene.add(this.playerAvatar);
    this.selectionRing.rotation.x = Math.PI / 2;
    this.selectionRing.visible = false;
    this.scene.add(this.selectionRing);
    this.town = new StarterTown(this.streamer.terrain);
    this.scene.add(this.town.group);
    this.spawnEnemies();

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

  private async enterWorld(draft: CharacterDraft): Promise<void> {
    this.character = createCharacter(draft);
    this.quest = createTutorialQuest();
    this.selectedEnemyId = "";
    this.lastMessage = "Welcome to Briar Glen. Follow the road east to find meadow slimes.";
    this.resetEnemies();
    this.rebuildPlayerAvatar();
    if (this.town) {
      this.player.teleportTo(
        this.town.playerSpawn.x,
        this.town.playerSpawn.z,
        this.streamer.terrain,
        this.town.playerSpawn.yaw,
        this.playerAvatar
      );
    }
    this.playerAvatar.visible = true;
    this.mode = "playing";
    this.overlay.setPlaying(true);
    this.overlay.showSettings(false);
    await this.sound.start();
    this.controls?.requestPointerLock();
  }

  private returnToMenu(): void {
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
    this.mode = "title";
    this.modeBeforeSettings = "title";
    this.playerAvatar.visible = false;
    this.selectionRing.visible = false;
    this.overlay.showSettings(false);
    this.overlay.setPlaying(false);
    this.lastMessage = "Returned to the character menu.";
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

  private updatePerformancePreset(preset: PerformancePresetKey, memoryBudgetMb: number): void {
    Object.assign(this.settings, resolvePerformanceSettings(preset, memoryBudgetMb));

    if (this.renderer) {
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
      this.handleGameplayActions(this.controls.consumeActions());
      this.player.update(delta, this.controls, this.streamer.terrain, this.playerAvatar);
      this.updateEnemies(elapsed);
    } else {
      this.player.setTitleOrbit(elapsed, 138, this.streamer.terrain);
    }

    this.streamer.update(this.camera.position, runtimeSettings, this.performance.getFrameMs());
    this.streamer.animateWind(elapsed, wind);
    this.sound.setIntensity(wind);
    this.performance.update(delta);
    this.applyResolutionScale(runtimeSettings.resolutionScale);
    if (elapsed - this.lastHudUpdate >= 0.125) {
      this.lastHudUpdate = elapsed;
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
        this.gpuDebug,
        this.getRenderDebugState()
      );
      if (this.mode === "playing") {
        this.overlay.updateGameHud(this.getGameHudState());
      }
    }

    this.renderer?.info.reset();
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

  private spawnEnemies(): void {
    if (!this.town) {
      return;
    }

    this.town.enemySpawns.forEach((spawn, index) => {
      const mesh = createMeadowSlimeModel();
      mesh.name = `enemy-meadow-slime-${index}`;
      mesh.position.set(spawn.x, this.streamer.terrain.getHeight(spawn.x, spawn.z), spawn.z);
      this.scene.add(mesh);
      this.enemies.push({
        enemy: createBeginnerEnemy(index),
        mesh,
        spawn
      });
    });
  }

  private resetEnemies(): void {
    this.enemies.forEach((actor, index) => {
      actor.enemy = createBeginnerEnemy(index);
      actor.mesh.visible = true;
      actor.mesh.scale.setScalar(1);
    });
  }

  private handleGameplayActions(actions: InputActions): void {
    if (actions.toggleDebug) {
      this.toggleDebug();
    }

    if (actions.backToMenu) {
      this.returnToMenu();
      return;
    }

    if (actions.warpTown) {
      this.runDebugAction("town");
    }

    if (actions.warpSlimes) {
      this.runDebugAction("slimes");
    }

    if (actions.equipDebug) {
      this.runDebugAction("equip");
    }

    if (actions.jump) {
      this.player.requestJump();
    }

    if (actions.targetNext) {
      this.selectNearestEnemy();
    }

    if (actions.slot1) {
      this.attackSelectedEnemy();
    }

    if (actions.slot2) {
      const result = healCharacter(this.character, 28);
      this.character = result.character;
      this.lastMessage = result.healed > 0 ? `Mend restored ${result.healed} HP.` : "Mend had no effect at full HP.";
    }
  }

  private toggleDebug(): void {
    const visible = this.overlay.toggleDebug();
    this.lastMessage = visible ? "Debug panel enabled. Use 7 town, 8 slimes, 9 equip, M menu." : "Debug panel hidden.";
  }

  private runDebugAction(action: "town" | "slimes" | "equip"): void {
    if (action === "town" && this.town) {
      this.player.teleportTo(this.town.playerSpawn.x, this.town.playerSpawn.z, this.streamer.terrain, this.town.playerSpawn.yaw, this.playerAvatar);
      this.lastMessage = "Debug warp: returned to Briar Glen.";
    } else if (action === "slimes" && this.town) {
      const spawn = this.town.enemySpawns.find((candidate) => this.enemies.some((actor) => actor.enemy.alive && actor.spawn === candidate)) ?? this.town.enemySpawns[0];
      this.player.teleportTo(spawn.x - 8, spawn.z + 5, this.streamer.terrain, -1.4, this.playerAvatar);
      this.lastMessage = "Debug warp: moved near meadow slimes.";
    } else if (action === "equip") {
      this.character = {
        ...this.character,
        primaryColor: "#2f86d1",
        accentColor: "#f0c45b",
        outfitVariant: this.character.outfitVariant === "mage" ? "guard" : "mage"
      };
      this.rebuildPlayerAvatar();
      this.lastMessage = "Debug equip: swapped outfit colors and gear.";
    }
  }

  private selectNearestEnemy(): void {
    const player = this.player.position;
    const nearest = this.enemies
      .filter((actor) => actor.enemy.alive)
      .map((actor) => ({
        actor,
        distance: Math.hypot(actor.spawn.x - player.x, actor.spawn.z - player.z)
      }))
      .filter((item) => item.distance <= 120)
      .sort((a, b) => a.distance - b.distance)[0];

    if (!nearest) {
      this.selectedEnemyId = "";
      this.lastMessage = "No meadow slime in targeting range.";
      return;
    }

    this.selectedEnemyId = nearest.actor.enemy.id;
    this.lastMessage = `Targeted ${nearest.actor.enemy.name} (${nearest.distance.toFixed(0)} units).`;
  }

  private attackSelectedEnemy(): void {
    let actor = this.getSelectedEnemy();
    if (!actor) {
      this.selectNearestEnemy();
      actor = this.getSelectedEnemy();
    }

    if (!actor) {
      return;
    }

    const distance = Math.hypot(actor.spawn.x - this.player.position.x, actor.spawn.z - this.player.position.z);
    if (distance > 18) {
      this.lastMessage = `${actor.enemy.name} is ${distance.toFixed(0)} units away. Move closer to strike.`;
      return;
    }

    const result = strikeEnemy(this.character, actor.enemy);
    this.character = result.character;
    actor.enemy = result.enemy;

    if (result.defeated) {
      actor.mesh.visible = false;
      this.quest = recordTutorialKill(this.quest);
      this.lastMessage = `Defeated ${actor.enemy.name}. +${result.goldAwarded} gold.`;
      this.selectedEnemyId = "";
    } else {
      const hpPercent = actor.enemy.hp / actor.enemy.maxHp;
      actor.mesh.scale.setScalar(0.75 + hpPercent * 0.25);
      this.lastMessage = `Strike hit ${actor.enemy.name} for ${result.damage}.`;
    }
  }

  private updateEnemies(elapsed: number): void {
    this.enemies.forEach((actor, index) => {
      const height = this.streamer.terrain.getHeight(actor.spawn.x, actor.spawn.z);
      const selected = actor.enemy.id === this.selectedEnemyId;
      actor.mesh.position.set(actor.spawn.x, height + Math.sin(elapsed * 2 + index) * 0.12, actor.spawn.z);
      actor.mesh.rotation.y += 0.012 + index * 0.002;
      if (selected) {
        this.selectionRing.visible = true;
        this.selectionRing.position.set(actor.spawn.x, height + 0.12, actor.spawn.z);
      }
    });
    if (!this.getSelectedEnemy()) {
      this.selectionRing.visible = false;
    }
  }

  private getSelectedEnemy(): EnemyActor | undefined {
    return this.enemies.find((actor) => actor.enemy.id === this.selectedEnemyId && actor.enemy.alive);
  }

  private getGameHudState(): Parameters<Overlay["updateGameHud"]>[0] {
    const target = this.getSelectedEnemy();
    return {
      name: this.character.name,
      classLabel: this.character.classLabel,
      level: this.character.level,
      hp: this.character.hp,
      maxHp: this.character.maxHp,
      gold: this.character.gold,
      targetName: target?.enemy.name ?? "No target",
      targetHp: target?.enemy.hp ?? 0,
      targetMaxHp: target?.enemy.maxHp ?? 1,
      questTitle: this.quest.title,
      questProgress: `${this.quest.kills} / ${this.quest.killsRequired} slimes defeated`,
      questInstruction: getTutorialInstruction(this.quest),
      lastMessage: `${this.lastMessage} Track: ${this.sound.getTrackName()}.`
    };
  }

  private getRenderDebugState(): Parameters<Overlay["updateHud"]>[6] {
    const info = this.renderer?.info;
    const rendererTriangles = info?.render.triangles ?? 0;
    const estimatedTriangles = rendererTriangles <= 0;
    const estimatedCalls = this.estimateVisibleDrawCalls();
    const rendererCalls = info?.render.calls ?? 0;
    return {
      calls: rendererCalls <= 0 || rendererCalls > estimatedCalls * 1.8 ? estimatedCalls : rendererCalls,
      triangles: estimatedTriangles ? this.estimateVisibleTriangles() : rendererTriangles,
      estimatedTriangles,
      geometries: info?.memory.geometries ?? 0,
      textures: info?.memory.textures ?? 0
    };
  }

  private estimateVisibleDrawCalls(): number {
    let calls = 0;

    this.scene.traverseVisible((object) => {
      const mesh = object as THREE.Mesh | THREE.InstancedMesh;
      if (!("isMesh" in mesh) && !("isInstancedMesh" in mesh)) {
        return;
      }

      calls += Array.isArray(mesh.material) ? mesh.material.length : 1;
    });

    return calls;
  }

  private estimateVisibleTriangles(): number {
    let triangles = 0;

    this.scene.traverseVisible((object) => {
      const mesh = object as THREE.Mesh | THREE.InstancedMesh;
      if (!("isMesh" in mesh) && !("isInstancedMesh" in mesh)) {
        return;
      }

      const geometry = mesh.geometry as THREE.BufferGeometry | undefined;
      if (!geometry) {
        return;
      }

      const primitiveCount = geometry.index
        ? geometry.index.count / 3
        : (geometry.getAttribute("position")?.count ?? 0) / 3;
      const instanceCount = "isInstancedMesh" in mesh && mesh.isInstancedMesh ? mesh.count : 1;
      triangles += primitiveCount * instanceCount;
    });

    return Math.round(triangles);
  }

  private rebuildPlayerAvatar(): void {
    if (this.playerModel) {
      this.playerAvatar.remove(this.playerModel);
    }
    this.playerModel = createHumanoidModel({
      classKey: this.character.classKey,
      primaryColor: this.character.primaryColor,
      accentColor: this.character.accentColor,
      outfitVariant: this.character.outfitVariant,
      scale: 1.25
    });
    this.playerAvatar.add(this.playerModel);
  }

  dispose(): void {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener("resize", this.resize);
    this.controls?.dispose();
    this.streamer.dispose();
    this.renderer?.dispose();
  }
}
