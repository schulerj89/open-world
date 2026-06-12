import type { QualitySettings } from "../config/QualitySettings";
import type { CharacterClassKey, CharacterDraft } from "../game/Character.js";
import { characterClasses, sanitizeName } from "../game/Character.js";
import {
  memoryCapOptions,
  performancePresets,
  type PerformancePresetKey
} from "../game/PerformancePresets.js";
import type { WebGpuDebugInfo } from "../render/RendererFactory";
import type { StreamStats } from "../world/WorldStreamer";

export type PlayerDebugState = {
  x: number;
  y: number;
  z: number;
  speed: number;
  grounded: boolean;
  yaw: number;
  pitch: number;
  pointerLocked: boolean;
  dragLook: boolean;
};

export type GameHudState = {
  name: string;
  classLabel: string;
  level: number;
  hp: number;
  maxHp: number;
  gold: number;
  targetName: string;
  targetHp: number;
  targetMaxHp: number;
  questTitle: string;
  questProgress: string;
  questInstruction: string;
  lastMessage: string;
};

export type RenderDebugState = {
  calls: number;
  triangles: number;
  estimatedTriangles: boolean;
  geometries: number;
  textures: number;
};

type OverlayEvents = {
  onStart: (draft: CharacterDraft) => void;
  onOpenSettings: () => void;
  onCloseSettings: () => void;
  onPerformanceChange: (preset: PerformancePresetKey, memoryBudgetMb: number) => void;
  onToggleDebug: () => void;
  onBackToMenu: () => void;
  onDebugAction: (action: "town" | "slimes" | "equip") => void;
};

export class Overlay {
  readonly canvas: HTMLCanvasElement;

  private readonly root: HTMLDivElement;
  private readonly title: HTMLElement;
  private readonly settings: HTMLElement;
  private readonly debugHud: HTMLElement;
  private readonly gameHud: HTMLElement;
  private readonly quickTools: HTMLElement;
  private readonly backend: HTMLElement;
  private readonly reticle: HTMLElement;
  private debugVisible = false;
  private playing = false;

  constructor(host: HTMLElement, settings: QualitySettings, events: OverlayEvents) {
    this.root = document.createElement("div");
    this.root.className = "app-shell";
    this.root.innerHTML = this.render(settings);
    host.append(this.root);

    const canvas = this.root.querySelector<HTMLCanvasElement>("[data-world-canvas]");
    const title = this.root.querySelector<HTMLElement>("[data-title]");
    const panel = this.root.querySelector<HTMLElement>("[data-settings]");
    const debugHud = this.root.querySelector<HTMLElement>("[data-hud]");
    const gameHud = this.root.querySelector<HTMLElement>("[data-game-hud]");
    const quickTools = this.root.querySelector<HTMLElement>("[data-quick-tools]");
    const backend = this.root.querySelector<HTMLElement>("[data-backend]");
    const reticle = this.root.querySelector<HTMLElement>("[data-reticle]");

    if (!canvas || !title || !panel || !debugHud || !gameHud || !quickTools || !backend || !reticle) {
      throw new Error("Overlay failed to initialize");
    }

    this.canvas = canvas;
    this.title = title;
    this.settings = panel;
    this.debugHud = debugHud;
    this.gameHud = gameHud;
    this.quickTools = quickTools;
    this.backend = backend;
    this.reticle = reticle;
    this.setPlaying(false);

    this.root.querySelector<HTMLButtonElement>("[data-start]")?.addEventListener("click", () => {
      events.onStart(this.readCharacterDraft());
    });
    this.root.querySelectorAll<HTMLButtonElement>("[data-open-settings]").forEach((button) => {
      button.addEventListener("click", events.onOpenSettings);
    });
    this.root.querySelector<HTMLButtonElement>("[data-close-settings]")?.addEventListener("click", events.onCloseSettings);
    this.root.querySelector<HTMLButtonElement>("[data-toggle-debug]")?.addEventListener("click", events.onToggleDebug);
    this.root.querySelector<HTMLButtonElement>("[data-back-menu]")?.addEventListener("click", events.onBackToMenu);
    this.root.querySelector<HTMLButtonElement>("[data-warp-town]")?.addEventListener("click", () => events.onDebugAction("town"));
    this.root.querySelector<HTMLButtonElement>("[data-warp-slimes]")?.addEventListener("click", () => events.onDebugAction("slimes"));
    this.root.querySelector<HTMLButtonElement>("[data-equip-debug]")?.addEventListener("click", () => events.onDebugAction("equip"));
    this.root.querySelectorAll<HTMLSelectElement>("[data-performance-control]").forEach((select) => {
      select.addEventListener("change", () => {
        const preset = this.readPresetKey();
        const cap = this.readMemoryCap();
        events.onPerformanceChange(preset, cap);
        this.updatePresetDescription(preset, cap);
      });
    });

    this.updatePresetDescription("balanced", settings.memoryBudgetMb);
  }

  setPlaying(isPlaying: boolean): void {
    this.playing = isPlaying;
    this.title.hidden = isPlaying;
    this.reticle.hidden = !isPlaying;
    this.gameHud.hidden = !isPlaying;
    this.quickTools.hidden = !isPlaying;
    this.debugHud.hidden = !isPlaying || !this.debugVisible;
  }

  toggleDebug(): boolean {
    this.debugVisible = !this.debugVisible;
    this.debugHud.hidden = !this.playing || !this.debugVisible;
    return this.debugVisible;
  }

  showSettings(show: boolean): void {
    this.settings.hidden = !show;
  }

  setBackend(text: string): void {
    this.backend.textContent = text;
  }

  updateGameHud(state: GameHudState): void {
    const hpPercent = state.maxHp > 0 ? Math.max(0, Math.min(100, (state.hp / state.maxHp) * 100)) : 0;
    const targetPercent =
      state.targetMaxHp > 0 ? Math.max(0, Math.min(100, (state.targetHp / state.targetMaxHp) * 100)) : 0;

    this.gameHud.innerHTML = `
      <section class="player-frame">
        <div>
          <div class="hud-name">${state.name}</div>
          <div class="hud-subtitle">Lv ${state.level} ${state.classLabel}</div>
        </div>
        <div class="gold-pill">${state.gold}g</div>
        <div class="bar"><i style="width:${hpPercent}%"></i></div>
        <div class="hud-subtitle">${state.hp} / ${state.maxHp} HP</div>
      </section>
      <section class="target-frame">
        <div class="hud-name">${state.targetName}</div>
        <div class="bar enemy"><i style="width:${targetPercent}%"></i></div>
        <div class="hud-subtitle">${state.targetHp} / ${state.targetMaxHp} HP</div>
      </section>
      <section class="quest-frame">
        <div class="hud-name">${state.questTitle}</div>
        <div class="hud-subtitle">${state.questProgress}</div>
        <p>${state.questInstruction}</p>
        <p class="combat-log">${state.lastMessage}</p>
      </section>
      <nav class="hotbar" aria-label="Combat actions">
        <button type="button" data-hotbar-slot="1"><span>1</span><strong>Strike</strong></button>
        <button type="button" data-hotbar-slot="2"><span>2</span><strong>Mend</strong></button>
      </nav>
    `;
  }

  updateHud(
    fps: number,
    frameMs: number,
    stats: StreamStats,
    wind: number,
    player: PlayerDebugState,
    gpu: WebGpuDebugInfo,
    render: RenderDebugState
  ): void {
    const memoryPercent = stats.memoryBudgetMb > 0 ? Math.min(100, (stats.estimatedMb / stats.memoryBudgetMb) * 100) : 0;
    const gpuMode = gpu.supported ? (gpu.adapterAvailable ? "adapter ready" : "no adapter") : "unsupported";
    const gpuCore = gpu.isCore === undefined ? "unknown" : gpu.isCore ? "core" : "compat";
    const gpuFormat = gpu.preferredCanvasFormat ?? "unknown";
    const gpuLimit = gpu.limits?.maxTextureDimension2D ? `${gpu.limits.maxTextureDimension2D}px texture` : "limit unknown";
    const gpuLabel = [gpuMode, gpuCore, gpuFormat, gpuLimit].join(" / ");
    const gpuAdapter = [gpu.vendor, gpu.architecture, gpu.device].filter(Boolean).join(" / ") || gpu.description || "adapter details private";
    this.debugHud.innerHTML = `
      <div class="debug-title">World Debug</div>
      <div class="metric-grid">
        <div><span>FPS</span><strong>${fps.toFixed(0)}</strong></div>
        <div><span>Frame</span><strong>${frameMs.toFixed(1)} ms</strong></div>
        <div><span>Live</span><strong>${stats.chunks}</strong></div>
        <div><span>Queue</span><strong>${stats.queued}</strong></div>
      </div>
      <div class="metric-row"><span>Cached chunks</span><span>${stats.cachedChunks}</span></div>
      <div class="metric-row"><span>Cache</span><span>${stats.estimatedMb.toFixed(1)} / ${stats.memoryBudgetMb.toFixed(0)} MB</span></div>
      <div class="meter"><i style="width:${memoryPercent}%"></i></div>
      <div class="metric-row"><span>LOD rings</span><span>${stats.lod0} near / ${stats.lod1} mid / ${stats.lod2} far</span></div>
      <div class="metric-row"><span>Horizon</span><span>${stats.renderDistance} chunks</span></div>
      <div class="metric-row" data-debug-position><span>Position</span><span>X ${player.x.toFixed(1)} / Y ${player.y.toFixed(1)} / Z ${player.z.toFixed(1)}</span></div>
      <div class="metric-row" data-debug-look><span>Look</span><span>Yaw ${player.yaw.toFixed(1)} / Pitch ${player.pitch.toFixed(1)}</span></div>
      <div class="metric-row"><span>Speed</span><span>${player.speed.toFixed(1)} u/s</span></div>
      <div class="metric-row"><span>Grounded</span><span>${player.grounded ? "yes" : "no"}</span></div>
      <div class="metric-row"><span>Pointer</span><span>${player.pointerLocked ? "locked" : player.dragLook ? "drag" : "free"}</span></div>
      <div class="metric-row" data-debug-trees><span>Trees</span><span>${stats.trunks} trunks / ${stats.coniferCrowns * 3 + stats.broadleafCrowns} crown parts</span></div>
      <div class="metric-row"><span>Grass cards</span><span>${stats.grassInstances}</span></div>
      <div class="metric-row" data-debug-render><span>Render</span><span>${render.calls} calls / ${render.triangles.toLocaleString()}${render.estimatedTriangles ? " est." : ""} tris</span></div>
      <div class="metric-row"><span>GPU memory</span><span>${render.geometries} geos / ${render.textures} tex</span></div>
      <div class="metric-row" data-debug-gpu><span>GPU</span><span>${gpuLabel}</span></div>
      <div class="metric-row"><span>Adapter</span><span>${gpuAdapter}</span></div>
      <div class="metric-row"><span>WebGPU limits</span><span>${gpu.limits?.maxBindGroups ?? 0} bind groups / ${gpu.limits?.maxSampledTexturesPerShaderStage ?? 0} sampled tex</span></div>
      <div class="metric-row"><span>GPU buffers</span><span>${gpu.limits?.maxBufferSize ?? 0} max / ${gpu.limits?.maxStorageBufferBindingSize ?? 0} storage</span></div>
      <div class="metric-row"><span>Vertex attrs</span><span>${gpu.limits?.maxVertexAttributes ?? 0}</span></div>
      <div class="metric-row"><span>Features</span><span>${gpu.featureCount ?? 0} flags</span></div>
      <div class="metric-row"><span>Wind</span><span>${wind.toFixed(2)}</span></div>
      <div class="metric-row"><span>Assets</span><span>ambientCG CC0 + procedural audio</span></div>
    `;
  }

  private readCharacterDraft(): CharacterDraft {
    const nameInput = this.root.querySelector<HTMLInputElement>("[data-character-name]");
    const classSelect = this.root.querySelector<HTMLSelectElement>("[data-character-class]");
    const classKey = this.isCharacterClassKey(classSelect?.value) ? classSelect.value : "sentinel";

    return {
      name: sanitizeName(nameInput?.value),
      classKey,
      primaryColor: this.root.querySelector<HTMLInputElement>("[data-primary-color]")?.value ?? "#b44f42",
      accentColor: this.root.querySelector<HTMLInputElement>("[data-accent-color]")?.value ?? "#c8d2df",
      outfitVariant: this.readOutfitVariant()
    };
  }

  private readOutfitVariant(): CharacterDraft["outfitVariant"] {
    const value = this.root.querySelector<HTMLSelectElement>("[data-outfit-variant]")?.value;
    return value === "traveler" || value === "guard" || value === "mage" ? value : "traveler";
  }

  private readPresetKey(): PerformancePresetKey {
    const select = this.root.querySelector<HTMLSelectElement>("[data-performance-preset]");
    return this.isPresetKey(select?.value) ? select.value : "balanced";
  }

  private readMemoryCap(): number {
    const select = this.root.querySelector<HTMLSelectElement>("[data-memory-cap]");
    return Number(select?.value ?? "680");
  }

  private updatePresetDescription(preset: PerformancePresetKey, cap: number): void {
    const description = this.root.querySelector<HTMLElement>("[data-preset-description]");
    if (!description) {
      return;
    }

    description.textContent = `${performancePresets[preset].description} Memory cap: ${cap} MB.`;
  }

  private isPresetKey(value: unknown): value is PerformancePresetKey {
    return typeof value === "string" && value in performancePresets;
  }

  private isCharacterClassKey(value: unknown): value is CharacterClassKey {
    return typeof value === "string" && value in characterClasses;
  }

  private render(settings: QualitySettings): string {
    const classOptions = Object.values(characterClasses)
      .map((characterClass) => `<option value="${characterClass.key}">${characterClass.label}</option>`)
      .join("");
    const presetOptions = Object.values(performancePresets)
      .map((preset) => `<option value="${preset.key}" ${preset.key === "balanced" ? "selected" : ""}>${preset.label}</option>`)
      .join("");
    const memoryOptions = memoryCapOptions
      .map((cap) => `<option value="${cap}" ${cap === settings.memoryBudgetMb ? "selected" : ""}>${cap} MB</option>`)
      .join("");

    return `
      <canvas class="world-canvas" data-world-canvas tabindex="0" aria-label="Aeolian Wilds world viewport"></canvas>
      <div class="backend-pill" data-backend>Renderer loading</div>
      <section class="title" data-title>
        <div class="title-content">
          <p class="eyebrow">Offline starter MMORPG prototype</p>
          <h1>Aeolian Wilds</h1>
          <p class="subtitle">Create a hero, start in Briar Glen, complete the first hunt, and test movement, looking, jumping, targeting, slots, grass, trees, and debug data.</p>
          <div class="character-builder" aria-label="Character builder">
            <label>
              <span>Name</span>
              <input data-character-name maxlength="18" value="Rowan" />
            </label>
            <label>
              <span>Class</span>
              <select data-character-class>${classOptions}</select>
            </label>
            <label>
              <span>Outfit</span>
              <select data-outfit-variant>
                <option value="traveler">Traveler</option>
                <option value="guard">Guard</option>
                <option value="mage">Mage</option>
              </select>
            </label>
            <label>
              <span>Main color</span>
              <input data-primary-color type="color" value="#b44f42" />
            </label>
            <label>
              <span>Accent</span>
              <input data-accent-color type="color" value="#c8d2df" />
            </label>
          </div>
          <div class="title-actions">
            <button class="primary-button" type="button" data-start>Enter Town</button>
            <button class="ghost-button" type="button" data-open-settings>Settings</button>
          </div>
        </div>
      </section>
      <aside class="settings-panel" data-settings hidden>
        <div class="settings-header">
          <h2>Performance Settings</h2>
          <button class="icon-button" type="button" data-close-settings aria-label="Close settings">x</button>
        </div>
        <div class="setting compact">
          <label for="quality-preset">Quality preset</label>
          <select id="quality-preset" data-performance-preset data-performance-control>${presetOptions}</select>
        </div>
        <div class="setting compact">
          <label for="memory-cap">Memory cap</label>
          <select id="memory-cap" data-memory-cap data-performance-control>${memoryOptions}</select>
        </div>
        <p class="preset-description" data-preset-description></p>
      </aside>
      <div class="reticle" data-reticle></div>
      <div class="game-hud" data-game-hud></div>
      <div class="quick-tools" data-quick-tools hidden>
        <button type="button" data-toggle-debug>Debug</button>
        <button type="button" data-warp-town>7 Town</button>
        <button type="button" data-warp-slimes>8 Slimes</button>
        <button type="button" data-equip-debug>9 Equip</button>
        <button type="button" data-back-menu>Menu</button>
      </div>
      <div class="hud" data-hud></div>
    `;
  }
}
