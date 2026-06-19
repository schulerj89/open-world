import * as THREE from 'three';
import { APP_CODENAME, APP_VERSION } from '../version';
import {
  FOG_COLOR,
  FOG_FAR,
  FOG_NEAR,
  MUSIC_URL,
  SEA_LEVEL
} from './constants';
import { CloudSystem } from './clouds';
import { EnvironmentSystem } from './environment';
import { FoliageSystem } from './foliage';
import { InputController } from './input';
import { ObjectiveSystem } from './objective';
import { PlayerController } from './player';
import { SettlementSystem } from './settlements';
import { SkySystem } from './sky';
import { TerrainSystem } from './terrain';
import { WaterSystem } from './water';
import { WeatherOverride, WeatherSystem, WeatherVisuals } from './weather';
import { heightAt, sampleWorld } from './world';

interface DebugSnapshot {
  version: string;
  fps: number;
  frameMs: number;
  started: boolean;
  chunks: number;
  queuedChunks: number;
  trees: number;
  bushes: number;
  calls: number;
  triangles: number;
  renderScale: number;
  geometries: number;
  textures: number;
  heapMB: number | null;
  terrainGeometryMB: number;
  chunkBuildMs: number;
  environment: {
    total: number;
    rocks: number;
    flowers: number;
    waystones: number;
    crystals: number;
    ruins: number;
    syncMs: number;
    instanceMB: number;
  };
  water: ReturnType<WaterSystem['getStats']>;
  weather: ReturnType<WeatherSystem['getStats']>;
  objective: ReturnType<ObjectiveSystem['getStats']>;
  settlements: ReturnType<SettlementSystem['getStats']>;
  player: ReturnType<PlayerController['getStats']>;
  seaLevel: number;
}

declare global {
  interface Window {
    __OPEN_WORLD_DEBUG__?: {
      getSnapshot: () => DebugSnapshot;
      setPlayerPosition: (x: number, z: number) => void;
      setWeatherOverride: (mode: WeatherOverride) => void;
      getObjectiveTarget: () => { x: number; y: number; z: number };
      getSettlementTarget: () => { x: number; y: number; z: number };
      getContractTarget: () => { x: number; y: number; z: number };
      sampleHeight: (x: number, z: number) => number;
      sampleWorld: (x: number, z: number) => ReturnType<typeof sampleWorld>;
      version: string;
    };
  }
}

export class Game {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(62, 1, 0.1, 900);
  private readonly input: InputController;
  private readonly terrain = new TerrainSystem();
  private readonly foliage = new FoliageSystem();
  private readonly environment = new EnvironmentSystem();
  private readonly water = new WaterSystem();
  private readonly weather = new WeatherSystem();
  private readonly sky = new SkySystem();
  private readonly clouds = new CloudSystem();
  private readonly player = new PlayerController();
  private readonly objective: ObjectiveSystem;
  private readonly settlements: SettlementSystem;
  private readonly hemisphereLight = new THREE.HemisphereLight(0xcfefff, 0x5f5138, 1.82);
  private readonly ambientLight = new THREE.AmbientLight(0xffffff, 0.18);
  private readonly audio = new Audio(MUSIC_URL);
  private readonly debugEl = document.querySelector<HTMLDivElement>('#debug');
  private readonly objectiveEl = document.querySelector<HTMLDivElement>('#objective');
  private readonly titleEl = document.querySelector<HTMLElement>('#title-screen');
  private readonly startButton = document.querySelector<HTMLButtonElement>('#start-button');

  private animationId = 0;
  private started = false;
  private fps = 60;
  private frameMs = 16.7;
  private elapsed = 0;
  private lastFrameTime = performance.now();
  private lastHudUpdate = -Infinity;
  private snapshot: DebugSnapshot;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 0.65));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(FOG_COLOR, 1);
    this.renderer.info.autoReset = true;

    this.input = new InputController(canvas);
    this.audio.loop = true;
    this.audio.volume = 0.22;
    this.objective = new ObjectiveSystem(this.player.getPosition());
    this.settlements = new SettlementSystem(this.player.getPosition());

    this.scene.background = new THREE.Color(FOG_COLOR);
    this.scene.fog = new THREE.Fog(FOG_COLOR, FOG_NEAR, FOG_FAR);
    this.scene.add(
      this.hemisphereLight,
      this.ambientLight,
      this.sky.group,
      this.terrain.group,
      this.foliage.group,
      this.environment.group,
      this.settlements.group,
      this.objective.group,
      this.water.mesh,
      this.clouds.group,
      this.weather.group,
      this.player.group
    );

    this.camera.position.set(-18, 12, -18);
    this.snapshot = this.makeSnapshot();

    window.addEventListener('resize', () => this.resize());
    this.resize();

    this.startButton?.addEventListener('click', () => this.enterWorld());
    window.__OPEN_WORLD_DEBUG__ = {
      getSnapshot: () => this.snapshot,
      setPlayerPosition: (x: number, z: number) => this.player.setPosition(x, z),
      setWeatherOverride: (mode: WeatherOverride) => {
        this.weather.setOverride(mode);
        this.input.weatherOverride = this.weather.getOverride();
      },
      getObjectiveTarget: () => this.objective.getActiveTarget(),
      getSettlementTarget: () => this.settlements.getNearestTownTarget(this.player.getPosition()),
      getContractTarget: () => this.settlements.getContractTarget(this.player.getPosition()),
      sampleHeight: (x: number, z: number) => heightAt(x, z),
      sampleWorld: (x: number, z: number) => sampleWorld(x, z),
      version: APP_VERSION
    };
  }

  start(): void {
    this.lastFrameTime = performance.now();
    this.animationId = requestAnimationFrame(() => this.tick());
  }

  stop(): void {
    cancelAnimationFrame(this.animationId);
  }

  private enterWorld(): void {
    this.started = true;
    this.titleEl?.classList.add('hidden');
    this.audio.muted = this.input.muted;
    void this.audio.play().catch(() => {
      this.audio.muted = true;
    });
  }

  private tick(): void {
    const now = performance.now();
    const rawDt = Math.max(0.0001, (now - this.lastFrameTime) / 1000);
    this.lastFrameTime = now;
    const dt = Math.min(0.05, rawDt);
    this.elapsed += dt;

    if (this.started) {
      this.player.update(dt, this.input);
    }

    const playerPosition = this.player.getPosition();
    this.terrain.update(playerPosition);
    const loadedChunks = this.terrain.getLoadedChunkCoords();
    this.foliage.sync(loadedChunks);
    this.environment.sync(loadedChunks);
    this.settlements.sync(loadedChunks);
    this.settlements.update(playerPosition, this.elapsed);
    this.weather.setOverride(this.input.weatherOverride);
    this.weather.update(playerPosition, this.elapsed);
    const weatherVisuals = this.weather.getVisuals();
    this.applyWeatherVisuals(weatherVisuals);
    this.objective.update(playerPosition, this.elapsed);
    this.water.update(playerPosition, this.elapsed);
    this.clouds.update(playerPosition, this.elapsed);
    this.sky.update(this.camera);
    this.updateCamera(dt, playerPosition);

    this.audio.muted = this.input.muted || !this.started;
    this.renderer.render(this.scene, this.camera);
    this.updateStats(dt, rawDt);
    this.animationId = requestAnimationFrame(() => this.tick());
  }

  private updateCamera(dt: number, playerPosition: THREE.Vector3): void {
    const distance = 18;
    const height = 7 + this.input.pitch * 6;
    const offset = new THREE.Vector3(
      Math.sin(this.input.yaw) * distance,
      height,
      Math.cos(this.input.yaw) * distance
    );
    const target = playerPosition.clone().add(new THREE.Vector3(0, 1.35, 0));
    const desired = target.clone().add(offset);
    const ground = heightAt(desired.x, desired.z);
    desired.y = Math.max(desired.y, ground + 2.4);
    this.camera.position.lerp(desired, 1 - Math.exp(-dt * 6.5));
    this.camera.lookAt(target);
  }

  private resize(): void {
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private applyWeatherVisuals(visuals: WeatherVisuals): void {
    const background = this.scene.background;
    if (background instanceof THREE.Color) {
      background.setHex(visuals.fogColor);
    }
    this.renderer.setClearColor(visuals.fogColor, 1);
    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.color.setHex(visuals.fogColor);
      this.scene.fog.near = visuals.fogNear;
      this.scene.fog.far = visuals.fogFar;
    }
    this.hemisphereLight.intensity = visuals.hemisphereIntensity;
    this.ambientLight.intensity = visuals.ambientIntensity;
    this.sky.setWeather(visuals);
    this.clouds.setWeather(visuals);
  }

  private updateStats(dt: number, rawDt: number): void {
    if (rawDt < 0.08) {
      const instantFps = 1 / Math.max(dt, 0.0001);
      this.fps = THREE.MathUtils.lerp(this.fps, instantFps, 0.08);
      this.frameMs = THREE.MathUtils.lerp(this.frameMs, dt * 1000, 0.1);
    }
    this.snapshot = this.makeSnapshot();
    if (this.elapsed - this.lastHudUpdate < 0.2) return;
    this.lastHudUpdate = this.elapsed;
    if (this.debugEl) {
      this.debugEl.textContent = [
        `${APP_CODENAME} v${APP_VERSION}`,
        `fps ${this.snapshot.fps.toFixed(1)} | frame ${this.snapshot.frameMs.toFixed(1)}ms`,
        `chunks ${this.snapshot.chunks} queued ${this.snapshot.queuedChunks}`,
        `trees ${this.snapshot.trees} bushes ${this.snapshot.bushes}`,
        `env ${this.snapshot.environment.total} r${this.snapshot.environment.rocks} f${this.snapshot.environment.flowers} l${this.snapshot.environment.waystones + this.snapshot.environment.crystals + this.snapshot.environment.ruins}`,
        `towns ${this.snapshot.settlements.towns} buildings ${this.snapshot.settlements.buildings} contracts ${this.snapshot.settlements.completedContracts}`,
        `calls ${this.snapshot.calls} tris ${Math.round(this.snapshot.triangles / 1000)}k`,
        `geo ${this.snapshot.geometries} tex ${this.snapshot.textures} scale ${this.snapshot.renderScale.toFixed(2)}`,
        `heap ${this.snapshot.heapMB === null ? 'n/a' : `${this.snapshot.heapMB.toFixed(1)} MB`} terrain ${this.snapshot.terrainGeometryMB.toFixed(1)} MB env ${this.snapshot.environment.instanceMB.toFixed(2)} MB`,
        `water ${this.snapshot.water.normalTextureMB.toFixed(2)} MB ${this.snapshot.water.material}`,
        `weather ${this.snapshot.weather.kind} ${this.snapshot.weather.override} particles ${this.snapshot.weather.particles}`,
        `chunk build ${this.snapshot.chunkBuildMs.toFixed(2)}ms`,
        `pos ${this.snapshot.player.position.x.toFixed(1)}, ${this.snapshot.player.position.z.toFixed(1)}`,
        `h ${this.snapshot.player.height.toFixed(1)} biome ${this.snapshot.player.biome}`,
        `contract ${this.snapshot.settlements.activeTownName} ${this.snapshot.settlements.resource} ${this.snapshot.settlements.collected}/${this.snapshot.settlements.required}`,
        `objective ${this.snapshot.objective.completed}/${this.snapshot.objective.total} ${this.snapshot.objective.activeName} ${this.snapshot.objective.bearing} ${this.snapshot.objective.distance.toFixed(0)}m`,
        `water blocks ${this.snapshot.player.waterBlocked}`
      ].join('\n');
    }
    if (this.objectiveEl) {
      const objective = this.snapshot.objective;
      const settlementText = this.settlements.getHudText();
      this.objectiveEl.textContent = settlementText ?? (objective.complete
        ? `${objective.title}`
        : `${objective.title}: ${objective.activeName} ${objective.bearing} ${objective.distance.toFixed(0)}m`);
    }
  }

  private makeSnapshot(): DebugSnapshot {
    const render = this.renderer.info.render;
    const memory = this.renderer.info.memory;
    const terrainStats = this.terrain.getStats();
    const foliageStats = this.foliage.getStats();
    const environmentStats = this.environment.getStats();
    const playerPosition = this.player.getPosition();
    const environmentTotal =
      environmentStats.rocks +
      environmentStats.flowers +
      environmentStats.waystones +
      environmentStats.crystals +
      environmentStats.ruins;
    const performanceMemory = getPerformanceMemory();
    return {
      version: APP_VERSION,
      fps: this.fps,
      frameMs: this.frameMs,
      started: this.started,
      chunks: terrainStats.loadedChunks,
      queuedChunks: terrainStats.queuedChunks,
      trees: foliageStats.trees,
      bushes: foliageStats.bushes,
      calls: render.calls,
      triangles: render.triangles,
      renderScale: this.renderer.getPixelRatio(),
      geometries: memory.geometries,
      textures: memory.textures,
      heapMB: performanceMemory,
      terrainGeometryMB: terrainStats.estimatedGeometryMB,
      chunkBuildMs: terrainStats.lastBuildMs,
      environment: {
        total: environmentTotal,
        rocks: environmentStats.rocks,
        flowers: environmentStats.flowers,
        waystones: environmentStats.waystones,
        crystals: environmentStats.crystals,
        ruins: environmentStats.ruins,
        syncMs: environmentStats.lastSyncMs,
        instanceMB: environmentStats.estimatedInstanceMB
      },
      water: this.water.getStats(),
      weather: this.weather.getStats(),
      objective: this.objective.getStats(playerPosition),
      settlements: this.settlements.getStats(),
      player: this.player.getStats(),
      seaLevel: SEA_LEVEL
    };
  }
}

function getPerformanceMemory(): number | null {
  const perf = performance as Performance & {
    memory?: { usedJSHeapSize: number };
  };
  if (!perf.memory) return null;
  return perf.memory.usedJSHeapSize / 1024 / 1024;
}
