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
import { resolveCircleCollisionDetailed, type CollisionHit } from "../world/Collision.js";
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

type FloatingLabel = {
  sprite: THREE.Sprite;
  material: THREE.SpriteMaterial;
  texture: THREE.CanvasTexture;
  startedAt: number;
  duration: number;
  origin: THREE.Vector3;
  rise: number;
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
  private readonly previewAvatar = new THREE.Group();
  private readonly previewOffset = new THREE.Vector3(6.5, -2.7, -10);
  private readonly previewWorld = new THREE.Vector3();
  private readonly selectionRing = new THREE.Mesh(
    new THREE.TorusGeometry(2.2, 0.08, 8, 32),
    new THREE.MeshBasicMaterial({ color: "#f0c45b" })
  );
  private readonly attackTrailMaterial = new THREE.MeshBasicMaterial({
    color: "#ffe2a4",
    transparent: true,
    opacity: 0,
    depthWrite: false
  });
  private readonly attackTrail = new THREE.Mesh(
    new THREE.TorusGeometry(1.05, 0.045, 8, 34, Math.PI * 1.15),
    this.attackTrailMaterial
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
  private previewModel?: THREE.Group;
  private playerRightArm?: THREE.Object3D;
  private playerWeapon?: THREE.Object3D;
  private previewDraft: CharacterDraft = {
    name: "Rowan",
    classKey: "sentinel",
    primaryColor: "#b44f42",
    accentColor: "#c8d2df",
    outfitVariant: "traveler"
  };
  private character: PlayerCharacter = createCharacter({ name: "Rowan", classKey: "sentinel" });
  private quest: TutorialQuestState = createTutorialQuest();
  private readonly enemies: EnemyActor[] = [];
  private readonly enemyHitUntil = new Map<string, number>();
  private selectedEnemyId = "";
  private playerAttackStarted = 0;
  private playerAttackUntil = 0;
  private nextAttackAt = 0;
  private readonly floatingLabels: FloatingLabel[] = [];
  private lastCollisionHits = 0;
  private lastCollisionDetail = "none";
  private collisionDisplayFrames = 0;
  private lastMessage = "Create a character and enter Briar Glen.";
  private mode: Mode = "title";
  private modeBeforeSettings: Mode = "title";
  private animationId = 0;
  private appliedPixelRatio = 0;
  private lastHudUpdate = Number.NEGATIVE_INFINITY;
  private lastTiming: Parameters<Overlay["updateHud"]>[7] = {
    rafMs: 16.7,
    updateMs: 0,
    streamMs: 0,
    renderMs: 0,
    hudMs: 0,
    visibility: "visible"
  };

  constructor(host: HTMLElement) {
    this.overlay = new Overlay(host, this.settings, {
      onStart: (draft) => void this.enterWorld(draft),
      onPreviewChange: (draft) => this.updatePreviewAvatar(draft),
      onOpenSettings: () => this.openSettings(),
      onCloseSettings: () => this.closeSettings(),
      onPerformanceChange: (preset, memoryBudgetMb) => this.updatePerformancePreset(preset, memoryBudgetMb),
      onToggleDebug: () => this.toggleDebug(),
      onBackToMenu: () => this.returnToMenu(),
      onDebugAction: (action) => this.runDebugAction(action),
      onHotbarAction: (slot) => {
        if (slot === "1") {
          this.attackSelectedEnemy();
        } else {
          this.useMend();
        }
      }
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
    this.attackTrail.visible = false;
    this.attackTrail.position.set(0.12, 2.05, -1.05);
    this.attackTrail.rotation.set(0.35, 0.2, -0.85);
    this.playerAvatar.add(this.attackTrail);
    this.scene.add(this.playerAvatar);
    this.previewAvatar.name = "title-character-preview";
    this.previewAvatar.visible = true;
    this.scene.add(this.previewAvatar);
    this.updatePreviewAvatar(this.previewDraft);
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
    this.previewAvatar.visible = false;
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
    this.previewAvatar.visible = true;
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
    const rawDelta = this.clock.getDelta();
    const delta = Math.min(0.05, rawDelta);
    const elapsed = this.clock.elapsedTime;
    const wind = 0.45 + Math.sin(elapsed * 0.21) * 0.18 + Math.sin(elapsed * 0.73) * 0.08;
    this.adaptiveBudget.update(this.performance.getFrameMs());
    const runtimeSettings = this.adaptiveBudget.derive(this.settings);

    const updateStart = performance.now();
    if (this.mode === "playing" && this.controls) {
      this.previewAvatar.visible = false;
      this.handleGameplayActions(this.controls.consumeActions());
      this.player.update(delta, this.controls, this.streamer.terrain, this.playerAvatar, (position, radius) =>
        this.resolvePlayerCollisions(position, radius)
      );
      this.animatePlayerAttack(elapsed);
      this.animateTown(elapsed);
      this.updateEnemies(elapsed);
    } else {
      this.player.setTitleOrbit(elapsed, 138, this.streamer.terrain);
      this.positionPreviewAvatar(elapsed);
      this.animateTown(elapsed);
    }
    this.updateFloatingLabels(elapsed);
    const updateMs = performance.now() - updateStart;

    const streamStart = performance.now();
    this.streamer.update(this.camera.position, runtimeSettings, this.performance.getFrameMs());
    this.streamer.animateWind(elapsed, wind);
    const streamMs = performance.now() - streamStart;
    this.sound.setIntensity(wind);
    this.performance.update(rawDelta);
    this.applyResolutionScale(runtimeSettings.resolutionScale);
    let hudMs = 0;
    if (elapsed - this.lastHudUpdate >= 0.125) {
      this.lastHudUpdate = elapsed;
      const hudStart = performance.now();
      this.overlay.updateHud(
        this.performance.getFps(),
        this.performance.getFrameMs(),
        this.streamer.getStats(),
        wind,
        {
          ...this.player.getDebugState(),
          pointerLocked: this.controls?.state.pointerLocked ?? false,
          dragLook: this.controls?.state.dragLook ?? false,
          collisionHits: this.lastCollisionHits,
          collisionDetail: this.lastCollisionDetail,
          townColliders: this.town?.colliders.length ?? 0,
          enemyColliders: this.enemies.filter((actor) => actor.enemy.alive).length
        },
        this.gpuDebug,
        this.getRenderDebugState(),
        this.lastTiming,
        this.sound.getDebugState()
      );
      if (this.mode === "playing") {
        this.overlay.updateGameHud(this.getGameHudState());
      }
      hudMs = performance.now() - hudStart;
    }

    this.renderer?.info.reset();
    const renderStart = performance.now();
    this.renderer?.render(this.scene, this.camera);
    const renderMs = performance.now() - renderStart;
    this.lastTiming = {
      rafMs: rawDelta * 1000,
      updateMs,
      streamMs,
      renderMs,
      hudMs,
      visibility: document.visibilityState
    };
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
    this.enemyHitUntil.clear();
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

    if (actions.resetEncounter) {
      this.runDebugAction("reset");
    }

    if (actions.warpSlimes) {
      this.runDebugAction("slimes");
    }

    if (actions.equipDebug) {
      this.runDebugAction("equip");
    }

    if (actions.warpCollision) {
      this.runDebugAction("collide");
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
      this.useMend();
    }
  }

  private useMend(): void {
    if (this.mode !== "playing") {
      return;
    }

    const result = healCharacter(this.character, 28);
    this.character = result.character;
    this.lastMessage = result.healed > 0 ? `Mend restored ${result.healed} HP.` : "Mend had no effect at full HP.";
    if (result.healed > 0) {
      this.createFloatingLabel(`+${result.healed}`, this.player.position.x, this.player.position.z, "#8ff0a4", this.clock.elapsedTime);
    }
  }

  private toggleDebug(): void {
    const visible = this.overlay.toggleDebug();
    this.lastMessage = visible ? "Debug panel enabled. Use 7 town, 8 slimes, 9 equip, M menu." : "Debug panel hidden.";
  }

  private runDebugAction(action: "reset" | "town" | "slimes" | "equip" | "collide"): void {
    if (action === "reset") {
      this.quest = createTutorialQuest();
      this.selectedEnemyId = "";
      this.enemyHitUntil.clear();
      this.resetEnemies();
      this.lastMessage = "Debug reset: quest and meadow slimes restored.";
    } else if (action === "town" && this.town) {
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
    } else if (action === "collide" && this.town) {
      this.player.teleportTo(-25.2, -16, this.streamer.terrain, Math.PI / 2, this.playerAvatar);
      this.lastMessage = "Debug collision: placed against a cottage blocker.";
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
    if (this.mode !== "playing") {
      return;
    }

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

    const now = this.clock.elapsedTime;
    if (now < this.nextAttackAt) {
      this.lastMessage = `Strike recovering ${(this.nextAttackAt - now).toFixed(1)}s.`;
      return;
    }

    this.playerAvatar.rotation.y = Math.atan2(actor.spawn.x - this.player.position.x, actor.spawn.z - this.player.position.z);
    const result = strikeEnemy(this.character, actor.enemy);
    this.character = result.character;
    actor.enemy = result.enemy;
    this.playerAttackStarted = now;
    this.playerAttackUntil = now + 0.36;
    this.nextAttackAt = now + 0.46;
    this.enemyHitUntil.set(actor.enemy.id, now + 0.32);
    this.sound.playStrike(this.character.classKey);
    this.sound.playHit(result.defeated);
    this.createFloatingLabel(
      result.defeated ? `${result.damage} KO` : `-${result.damage}`,
      actor.spawn.x,
      actor.spawn.z,
      result.defeated ? "#ffd06a" : "#ff8c74",
      now
    );

    if (result.defeated) {
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
      const bounce = Math.sin(elapsed * 3.2 + index * 0.9);
      const hpScale = actor.enemy.alive ? 0.75 + (actor.enemy.hp / actor.enemy.maxHp) * 0.25 : 0.75;
      const hitRemaining = Math.max(0, (this.enemyHitUntil.get(actor.enemy.id) ?? 0) - elapsed);
      const hitPulse = hitRemaining > 0 ? Math.sin((1 - hitRemaining / 0.32) * Math.PI) : 0;
      actor.mesh.position.set(
        actor.spawn.x + hitPulse * Math.sin(elapsed * 34 + index) * 0.22,
        height + 0.12 + Math.abs(bounce) * 0.22 + hitPulse * 0.34,
        actor.spawn.z + hitPulse * Math.cos(elapsed * 31 + index) * 0.22
      );
      actor.mesh.scale.set(
        hpScale * (1.04 - Math.abs(bounce) * 0.05 + hitPulse * 0.18),
        hpScale * (0.95 + Math.abs(bounce) * 0.12 - hitPulse * 0.1),
        hpScale * (1 + hitPulse * 0.12)
      );
      actor.mesh.rotation.y += 0.018 + index * 0.003;
      if (!actor.enemy.alive && hitRemaining <= 0) {
        actor.mesh.visible = false;
      }
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

  private animatePlayerAttack(elapsed: number): void {
    if (!this.playerModel) {
      return;
    }

    if (elapsed >= this.playerAttackUntil) {
      this.playerModel.rotation.x = 0;
      this.playerModel.rotation.z = 0;
      this.resetAnimatedPart(this.playerRightArm);
      this.resetAnimatedPart(this.playerWeapon);
      this.attackTrail.visible = false;
      this.attackTrailMaterial.opacity = 0;
      return;
    }

    const duration = Math.max(0.01, this.playerAttackUntil - this.playerAttackStarted);
    const t = THREE.MathUtils.clamp((elapsed - this.playerAttackStarted) / duration, 0, 1);
    const swing = Math.sin(t * Math.PI);
    const snap = Math.sin(t * Math.PI * 2);
    this.playerModel.rotation.x = -swing * 0.12;
    this.playerModel.rotation.z = snap * 0.06;
    this.applyAttackPartRotation(this.playerRightArm, -1.1 * swing, snap * 0.22, -0.55 * swing);
    this.applyAttackPartRotation(this.playerWeapon, -0.45 * swing, 0, snap * 0.2);
    this.attackTrail.visible = true;
    this.attackTrailMaterial.opacity = Math.max(0, swing * 0.78);
    this.attackTrail.scale.setScalar(0.85 + swing * 0.48);
    this.attackTrail.rotation.z = -1.05 + t * 2.1;
  }

  private resetAnimatedPart(part?: THREE.Object3D): void {
    if (!part) {
      return;
    }

    const base = part.userData.baseRotation as { x: number; y: number; z: number } | undefined;
    if (base) {
      part.rotation.set(base.x, base.y, base.z);
    }
  }

  private applyAttackPartRotation(part: THREE.Object3D | undefined, xOffset: number, yOffset: number, zOffset: number): void {
    if (!part) {
      return;
    }

    const base = part.userData.baseRotation as { x: number; y: number; z: number } | undefined;
    part.rotation.set((base?.x ?? 0) + xOffset, (base?.y ?? 0) + yOffset, (base?.z ?? 0) + zOffset);
  }

  private createFloatingLabel(text: string, x: number, z: number, color: string, startedAt: number): void {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 96;
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.font = "700 40px system-ui, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.lineWidth = 8;
    context.strokeStyle = "rgba(22, 18, 15, 0.88)";
    context.strokeText(text, canvas.width / 2, canvas.height / 2);
    context.fillStyle = color;
    context.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
    const sprite = new THREE.Sprite(material);
    const y = this.streamer.terrain.getHeight(x, z) + 3.1;
    const origin = new THREE.Vector3(x, y, z);
    sprite.position.copy(origin);
    sprite.scale.set(3.2, 1.2, 1);
    this.scene.add(sprite);
    this.floatingLabels.push({
      sprite,
      material,
      texture,
      startedAt,
      duration: 1.05,
      origin,
      rise: 2.2
    });
  }

  private updateFloatingLabels(elapsed: number): void {
    for (let index = this.floatingLabels.length - 1; index >= 0; index -= 1) {
      const label = this.floatingLabels[index];
      const t = THREE.MathUtils.clamp((elapsed - label.startedAt) / label.duration, 0, 1);
      if (t >= 1) {
        this.scene.remove(label.sprite);
        label.material.dispose();
        label.texture.dispose();
        this.floatingLabels.splice(index, 1);
        continue;
      }

      label.sprite.position.set(label.origin.x, label.origin.y + label.rise * t, label.origin.z);
      label.sprite.lookAt(this.camera.position);
      label.material.opacity = 1 - t;
      const scale = 1 + Math.sin(t * Math.PI) * 0.18;
      label.sprite.scale.set(3.2 * scale, 1.2 * scale, 1);
    }
  }

  private positionPreviewAvatar(elapsed: number): void {
    this.previewAvatar.visible = this.mode === "title" || this.mode === "settings";
    if (!this.previewAvatar.visible) {
      return;
    }

    this.previewWorld.copy(this.previewOffset);
    this.camera.localToWorld(this.previewWorld);
    this.previewAvatar.position.copy(this.previewWorld);
    this.previewAvatar.lookAt(this.camera.position.x, this.previewAvatar.position.y, this.camera.position.z);
    this.previewAvatar.rotation.z = Math.sin(elapsed * 1.7) * 0.035;
  }

  private resolvePlayerCollisions(position: THREE.Vector3, actorRadius: number): void {
    const streamResult = this.streamer.resolveCollisionDetailed(position, actorRadius);
    let hits = streamResult.hits;
    let lastHit = streamResult.lastHit;

    if (this.town) {
      const townResult = this.town.resolveCollisionDetailed(position, actorRadius);
      hits += townResult.hits;
      lastHit = townResult.lastHit ?? lastHit;
    }

    for (const actor of this.enemies) {
      if (!actor.enemy.alive) {
        continue;
      }

      const hit = resolveCircleCollisionDetailed(
        position,
        { x: actor.spawn.x, z: actor.spawn.z, radius: 1.75, kind: "enemy", owner: actor.enemy.name },
        actorRadius,
        actor.enemy.name
      );
      if (hit) {
        hits += 1;
        lastHit = hit;
      }
    }

    if (hits > 0) {
      this.lastCollisionHits = hits;
      this.lastCollisionDetail = this.formatCollisionHit(lastHit);
      this.collisionDisplayFrames = 240;
    } else if (this.collisionDisplayFrames > 0) {
      this.collisionDisplayFrames -= 1;
    } else {
      this.lastCollisionHits = 0;
      this.lastCollisionDetail = "none";
    }
  }

  private formatCollisionHit(hit?: CollisionHit): string {
    if (!hit) {
      return "unknown source";
    }

    return `${hit.kind} / ${hit.owner} / push ${hit.push.toFixed(2)} / at X ${hit.colliderX.toFixed(1)} Z ${hit.colliderZ.toFixed(1)}`;
  }

  private animateTown(elapsed: number): void {
    this.town?.group.traverse((object) => {
      if (object.userData.questMarker) {
        const baseY = Number(object.userData.baseY) || object.position.y;
        object.position.y = baseY + Math.sin(elapsed * 2.8) * 0.22;
        object.rotation.y += 0.035;
        return;
      }

      if (object.userData.windowGlow) {
        const glow = 0.88 + Math.sin(elapsed * 3.4 + object.position.x * 0.11) * 0.12;
        object.scale.setScalar(glow);
        return;
      }

      if (!object.userData.idleNpc) {
        return;
      }

      const phase = Number(object.userData.phase) || 0;
      const baseY = Number(object.userData.baseY) || object.position.y;
      const baseYaw = Number(object.userData.baseYaw) || object.rotation.y;
      object.position.y = baseY + Math.sin(elapsed * 2.1 + phase) * 0.035;
      object.rotation.y = baseYaw + Math.sin(elapsed * 0.85 + phase) * 0.18;
    });
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
    this.playerRightArm = this.playerModel.getObjectByName("right-arm");
    this.playerWeapon = this.playerModel.getObjectByName("right-hand-weapon");
    this.playerAvatar.add(this.playerModel);
  }

  private updatePreviewAvatar(draft: CharacterDraft): void {
    this.previewDraft = draft;
    this.previewAvatar.clear();
    this.previewModel = createHumanoidModel({
      classKey: draft.classKey,
      primaryColor: draft.primaryColor,
      accentColor: draft.accentColor,
      outfitVariant: draft.outfitVariant,
      scale: 1.55
    });
    this.previewModel.rotation.y = Math.PI;
    this.previewAvatar.add(this.previewModel);
  }

  dispose(): void {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener("resize", this.resize);
    this.controls?.dispose();
    this.streamer.dispose();
    this.sound.dispose();
    this.renderer?.dispose();
  }
}
