import type { QualitySettings, SettingsKey } from "../config/QualitySettings";
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

type OverlayEvents = {
  onStart: () => void;
  onOpenSettings: () => void;
  onCloseSettings: () => void;
  onSettingChange: (key: SettingsKey, value: number) => void;
};

const settingsMeta: Array<{
  key: SettingsKey;
  label: string;
  min: number;
  max: number;
  step: number;
  suffix: string;
}> = [
  {
    key: "cpuBudget",
    label: "CPU stream budget",
    min: 1,
    max: 8,
    step: 1,
    suffix: " jobs"
  },
  {
    key: "memoryBudgetMb",
    label: "Memory cap",
    min: 120,
    max: 900,
    step: 20,
    suffix: " MB"
  },
  {
    key: "renderDistance",
    label: "Horizon radius",
    min: 4,
    max: 12,
    step: 1,
    suffix: " chunks"
  },
  {
    key: "grassDensity",
    label: "Grass density",
    min: 0,
    max: 1,
    step: 0.02,
    suffix: ""
  },
  {
    key: "treeDensity",
    label: "Tree density",
    min: 0,
    max: 1,
    step: 0.02,
    suffix: ""
  },
  {
    key: "resolutionScale",
    label: "Resolution scale",
    min: 0.5,
    max: 1,
    step: 0.05,
    suffix: ""
  }
];

export class Overlay {
  readonly canvas: HTMLCanvasElement;

  private readonly root: HTMLDivElement;
  private readonly title: HTMLElement;
  private readonly settings: HTMLElement;
  private readonly hud: HTMLElement;
  private readonly backend: HTMLElement;
  private readonly reticle: HTMLElement;
  private readonly outputs = new Map<SettingsKey, HTMLOutputElement>();

  constructor(host: HTMLElement, settings: QualitySettings, events: OverlayEvents) {
    this.root = document.createElement("div");
    this.root.className = "app-shell";
    this.root.innerHTML = this.render(settings);
    host.append(this.root);

    const canvas = this.root.querySelector<HTMLCanvasElement>("[data-world-canvas]");
    const title = this.root.querySelector<HTMLElement>("[data-title]");
    const panel = this.root.querySelector<HTMLElement>("[data-settings]");
    const hud = this.root.querySelector<HTMLElement>("[data-hud]");
    const backend = this.root.querySelector<HTMLElement>("[data-backend]");
    const reticle = this.root.querySelector<HTMLElement>("[data-reticle]");

    if (!canvas || !title || !panel || !hud || !backend || !reticle) {
      throw new Error("Overlay failed to initialize");
    }

    this.canvas = canvas;
    this.title = title;
    this.settings = panel;
    this.hud = hud;
    this.backend = backend;
    this.reticle = reticle;
    this.setPlaying(false);

    this.root.querySelector<HTMLButtonElement>("[data-start]")?.addEventListener("click", events.onStart);
    this.root.querySelectorAll<HTMLButtonElement>("[data-open-settings]").forEach((button) => {
      button.addEventListener("click", events.onOpenSettings);
    });
    this.root.querySelector<HTMLButtonElement>("[data-close-settings]")?.addEventListener("click", events.onCloseSettings);

    for (const meta of settingsMeta) {
      const input = this.root.querySelector<HTMLInputElement>(`[data-setting="${meta.key}"]`);
      const output = this.root.querySelector<HTMLOutputElement>(`[data-output="${meta.key}"]`);
      if (!input || !output) {
        continue;
      }
      this.outputs.set(meta.key, output);
      input.addEventListener("input", () => {
        const value = Number(input.value);
        this.setOutput(meta.key, value);
        events.onSettingChange(meta.key, value);
      });
    }
  }

  setPlaying(isPlaying: boolean): void {
    this.title.hidden = isPlaying;
    this.reticle.hidden = !isPlaying;
    this.hud.hidden = !isPlaying;
  }

  showSettings(show: boolean): void {
    this.settings.hidden = !show;
  }

  setBackend(text: string): void {
    this.backend.textContent = text;
  }

  updateHud(
    fps: number,
    frameMs: number,
    stats: StreamStats,
    wind: number,
    player: PlayerDebugState,
    gpu: WebGpuDebugInfo
  ): void {
    const memoryPercent = stats.memoryBudgetMb > 0 ? Math.min(100, (stats.estimatedMb / stats.memoryBudgetMb) * 100) : 0;
    const gpuMode = gpu.supported ? (gpu.adapterAvailable ? "adapter ready" : "no adapter") : "unsupported";
    const gpuCore = gpu.isCore === undefined ? "unknown" : gpu.isCore ? "core" : "compat";
    const gpuFormat = gpu.preferredCanvasFormat ?? "unknown";
    const gpuLimit = gpu.limits?.maxTextureDimension2D ? `${gpu.limits.maxTextureDimension2D}px texture` : "limit unknown";
    const gpuLabel = [gpuMode, gpuCore, gpuFormat, gpuLimit].join(" / ");
    const gpuAdapter = [gpu.vendor, gpu.architecture, gpu.device].filter(Boolean).join(" / ") || gpu.description || "adapter details private";
    this.hud.innerHTML = `
      <div class="debug-title">World Debug</div>
      <div class="metric-grid">
        <div><span>FPS</span><strong>${fps.toFixed(0)}</strong></div>
        <div><span>Frame</span><strong>${frameMs.toFixed(1)} ms</strong></div>
        <div><span>Live</span><strong>${stats.chunks}</strong></div>
        <div><span>Queue</span><strong>${stats.queued}</strong></div>
      </div>
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
      <div class="metric-row" data-debug-gpu><span>GPU</span><span>${gpuLabel}</span></div>
      <div class="metric-row"><span>Adapter</span><span>${gpuAdapter}</span></div>
      <div class="metric-row"><span>Features</span><span>${gpu.featureCount ?? 0} flags</span></div>
      <div class="metric-row"><span>Wind</span><span>${wind.toFixed(2)}</span></div>
      <div class="metric-row"><span>Assets</span><span>ambientCG CC0</span></div>
    `;
  }

  setOutput(key: SettingsKey, value: number): void {
    const meta = settingsMeta.find((item) => item.key === key);
    const output = this.outputs.get(key);
    if (!meta || !output) {
      return;
    }
    output.value = `${value}${meta.suffix}`;
  }

  private render(settings: QualitySettings): string {
    const controls = settingsMeta
      .map((meta) => {
        const value = settings[meta.key];
        return `
          <div class="setting">
            <label for="${meta.key}">${meta.label}</label>
            <output data-output="${meta.key}">${value}${meta.suffix}</output>
            <input id="${meta.key}" data-setting="${meta.key}" type="range" min="${meta.min}" max="${meta.max}" step="${meta.step}" value="${value}" />
          </div>
        `;
      })
      .join("");

    return `
      <canvas class="world-canvas" data-world-canvas tabindex="0" aria-label="Aeolian Wilds world viewport"></canvas>
      <div class="backend-pill" data-backend>Renderer loading</div>
      <section class="title" data-title>
        <div class="title-content">
          <p class="eyebrow">A streaming WebGPU wilderness</p>
          <h1>Aeolian Wilds</h1>
          <p class="subtitle">Wind rolls over grass, trees, and mountain ridges while the horizon cache builds the world in rings around you.</p>
          <div class="title-actions">
            <button class="primary-button" type="button" data-start>Start</button>
            <button class="ghost-button" type="button" data-open-settings>Settings</button>
          </div>
        </div>
      </section>
      <aside class="settings-panel" data-settings hidden>
        <div class="settings-header">
          <h2>Performance Settings</h2>
          <button class="icon-button" type="button" data-close-settings aria-label="Close settings">x</button>
        </div>
        ${controls}
      </aside>
      <div class="reticle" data-reticle></div>
      <div class="hud" data-hud></div>
    `;
  }
}
