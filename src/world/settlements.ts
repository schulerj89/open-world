import * as THREE from 'three';
import {
  CHUNK_SIZE,
  MAX_SETTLEMENT_BUILDINGS,
  MAX_SETTLEMENT_PROPS,
  SEA_LEVEL,
  WATER_BLOCK_MARGIN
} from './constants';
import { ChunkCoord } from './terrain';
import { heightAt, sampleWorld, seededUnit, slopeAt } from './world';

type ResourceKind = 'timber' | 'stone' | 'crystal';

interface Settlement {
  key: string;
  name: string;
  x: number;
  y: number;
  z: number;
  rotation: number;
  size: number;
  resource: ResourceKind;
}

interface BuildingPlacement {
  x: number;
  y: number;
  z: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  tint: number;
}

interface PropPlacement {
  x: number;
  y: number;
  z: number;
  rotation: number;
  scale: number;
  tint: number;
}

interface ResourceNode {
  x: number;
  y: number;
  z: number;
  kind: ResourceKind;
}

interface ActiveContract {
  town: Settlement;
  nodes: ResourceNode[];
  collected: boolean[];
}

export interface SettlementStats {
  towns: number;
  buildings: number;
  props: number;
  resourceNodes: number;
  completedContracts: number;
  instanceMB: number;
  syncMs: number;
  nearestTownName: string;
  nearestTownDistance: number;
  active: boolean;
  activeTownName: string;
  resource: ResourceKind | 'none';
  collected: number;
  required: number;
  targetDistance: number;
  returnDistance: number;
  prompt: string;
}

const CONTRACT_RADIUS = 32;
const PICKUP_RADIUS = 7.5;
const REQUIRED_RESOURCES = 3;

const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0xa88758, fog: true });
const roofMaterial = new THREE.MeshLambertMaterial({ color: 0x9b4c37, fog: true });
const doorMaterial = new THREE.MeshLambertMaterial({ color: 0x3e2d21, fog: true });
const wellMaterial = new THREE.MeshLambertMaterial({ color: 0x6f7067, fog: true });
const signMaterial = new THREE.MeshLambertMaterial({ color: 0x9b7849, fog: true });
const repairedMaterial = new THREE.MeshPhongMaterial({
  color: 0xf2c96b,
  emissive: 0x5b4518,
  specular: 0xfff4c2,
  shininess: 44,
  fog: true
});
const timberMaterial = new THREE.MeshLambertMaterial({ color: 0x8c5d34, fog: true });
const stoneMaterial = new THREE.MeshLambertMaterial({ color: 0x787a73, fog: true });
const crystalMaterial = new THREE.MeshPhongMaterial({
  color: 0x8de2e6,
  emissive: 0x24606a,
  specular: 0xffffff,
  shininess: 52,
  fog: true
});
const resourceMarkerMaterial = new THREE.MeshBasicMaterial({
  color: 0xffe48a,
  transparent: true,
  opacity: 0.62,
  depthWrite: false,
  fog: true
});

export class SettlementSystem {
  readonly group = new THREE.Group();

  private readonly buildingMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    bodyMaterial,
    MAX_SETTLEMENT_BUILDINGS
  );
  private readonly roofMesh = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.86, 0.82, 4),
    roofMaterial,
    MAX_SETTLEMENT_BUILDINGS
  );
  private readonly doorMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.34, 0.62, 0.08),
    doorMaterial,
    MAX_SETTLEMENT_BUILDINGS
  );
  private readonly wellMesh = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.9, 1, 0.8, 8),
    wellMaterial,
    MAX_SETTLEMENT_PROPS
  );
  private readonly signMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.2, 1.6, 0.2),
    signMaterial,
    MAX_SETTLEMENT_PROPS
  );
  private readonly repairedMesh = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.55, 2.4, 4),
    repairedMaterial,
    MAX_SETTLEMENT_PROPS
  );
  private readonly timberMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1.1, 0.52, 0.55),
    timberMaterial,
    REQUIRED_RESOURCES
  );
  private readonly stoneMesh = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(0.75, 0),
    stoneMaterial,
    REQUIRED_RESOURCES
  );
  private readonly crystalMesh = new THREE.InstancedMesh(
    new THREE.OctahedronGeometry(0.78, 0),
    crystalMaterial,
    REQUIRED_RESOURCES
  );
  private readonly resourceMarkerMesh = new THREE.InstancedMesh(
    new THREE.TorusGeometry(1.15, 0.06, 5, 16),
    resourceMarkerMaterial,
    REQUIRED_RESOURCES
  );

  private readonly dummy = new THREE.Object3D();
  private readonly completed = new Set<string>();
  private readonly home: Settlement;
  private settlements: Settlement[] = [];
  private active: ActiveContract | null = null;
  private signature = '';
  private resourceSignature = '';
  private stats: SettlementStats;

  constructor(origin: THREE.Vector3) {
    this.group.name = 'procedural-settlements';
    this.home = createHomeSettlement(origin);
    for (const mesh of [
      this.buildingMesh,
      this.roofMesh,
      this.doorMesh,
      this.wellMesh,
      this.signMesh,
      this.repairedMesh,
      this.timberMesh,
      this.stoneMesh,
      this.crystalMesh,
      this.resourceMarkerMesh
    ]) {
      mesh.count = 0;
      this.group.add(mesh);
    }
    this.stats = this.makeStats(origin);
  }

  sync(chunks: ChunkCoord[]): SettlementStats {
    const signature = chunks
      .map((coord) => `${coord.cx},${coord.cz}`)
      .sort()
      .join('|');
    if (signature === this.signature) return this.stats;

    this.signature = signature;
    const started = performance.now();
    const settlements = [this.home];
    for (const chunk of chunks) {
      const settlement = settlementForChunk(chunk);
      if (settlement && settlement.key !== this.home.key) settlements.push(settlement);
    }
    this.settlements = settlements.sort((a, b) => a.key.localeCompare(b.key));
    this.applySettlementMeshes();
    this.stats = { ...this.stats, syncMs: performance.now() - started };
    return this.stats;
  }

  update(player: THREE.Vector3, time: number): SettlementStats {
    const nearest = this.findNearestTown(player);

    if (!this.active && nearest && nearest.distance < CONTRACT_RADIUS && !this.completed.has(nearest.town.key)) {
      this.active = {
        town: nearest.town,
        nodes: resourceNodesFor(nearest.town),
        collected: new Array(REQUIRED_RESOURCES).fill(false)
      };
      this.resourceSignature = '';
    }

    if (this.active) {
      this.active.nodes.forEach((node, index) => {
        if (this.active && !this.active.collected[index]) {
          const distance = Math.hypot(node.x - player.x, node.z - player.z);
          if (distance < PICKUP_RADIUS) {
            this.active.collected[index] = true;
            this.resourceSignature = '';
          }
        }
      });

      const collected = countCollected(this.active);
      const returnDistance = Math.hypot(this.active.town.x - player.x, this.active.town.z - player.z);
      if (collected >= REQUIRED_RESOURCES && returnDistance < CONTRACT_RADIUS) {
        this.completed.add(this.active.town.key);
        this.active = null;
        this.resourceSignature = '';
      }
    }

    this.applyResourceMeshes(time);
    this.applyRepairedMeshes(time);
    this.stats = this.makeStats(player);
    return this.stats;
  }

  getStats(): SettlementStats {
    return { ...this.stats };
  }

  getNearestTownTarget(player: THREE.Vector3): { x: number; y: number; z: number } {
    const nearest = this.findNearestTown(player);
    const town = nearest?.town ?? this.home;
    return { x: town.x, y: town.y, z: town.z };
  }

  getContractTarget(player: THREE.Vector3): { x: number; y: number; z: number } {
    if (!this.active) return this.getNearestTownTarget(player);
    const node = this.active.nodes.find((_, index) => !this.active?.collected[index]);
    if (node) return { x: node.x, y: node.y, z: node.z };
    return { x: this.active.town.x, y: this.active.town.y, z: this.active.town.z };
  }

  getHudText(): string | null {
    const stats = this.stats;
    if (stats.completedContracts > 0 && !stats.active) {
      return `Settlement repaired: ${stats.completedContracts} complete / next town ${stats.nearestTownName} ${stats.nearestTownDistance.toFixed(0)}m`;
    }
    if (stats.active) {
      if (stats.collected >= stats.required) {
        return `Return to ${stats.activeTownName}: repair supplies ready ${stats.returnDistance.toFixed(0)}m`;
      }
      return `${stats.activeTownName} repair: collect ${stats.resource} ${stats.collected}/${stats.required} (${stats.targetDistance.toFixed(0)}m)`;
    }
    return `Find a hamlet: ${stats.nearestTownName} ${stats.nearestTownDistance.toFixed(0)}m`;
  }

  private findNearestTown(player: THREE.Vector3): { town: Settlement; distance: number } | null {
    let best: { town: Settlement; distance: number } | null = null;
    for (const town of this.settlements.length > 0 ? this.settlements : [this.home]) {
      const distance = Math.hypot(town.x - player.x, town.z - player.z);
      if (!best || distance < best.distance) best = { town, distance };
    }
    return best;
  }

  private applySettlementMeshes(): void {
    const buildings: BuildingPlacement[] = [];
    const wells: PropPlacement[] = [];
    const signs: PropPlacement[] = [];

    for (const town of this.settlements) {
      collectTownPlacements(town, buildings, wells, signs);
    }

    this.applyBuildings(buildings.slice(0, MAX_SETTLEMENT_BUILDINGS));
    this.applyProps(this.wellMesh, wells.slice(0, MAX_SETTLEMENT_PROPS), 'well');
    this.applyProps(this.signMesh, signs.slice(0, MAX_SETTLEMENT_PROPS), 'sign');
  }

  private applyBuildings(buildings: BuildingPlacement[]): void {
    const bodyBase = new THREE.Color(0x9f8053);
    const bodyLight = new THREE.Color(0xd0b076);
    const roofBase = new THREE.Color(0x8f4938);
    const roofLight = new THREE.Color(0xc86b4b);
    buildings.forEach((building, index) => {
      this.dummy.position.set(building.x, building.y + building.scaleY * 0.5, building.z);
      this.dummy.rotation.set(0, building.rotation, 0);
      this.dummy.scale.set(building.scaleX, building.scaleY, building.scaleZ);
      this.dummy.updateMatrix();
      this.buildingMesh.setMatrixAt(index, this.dummy.matrix);
      this.buildingMesh.setColorAt(index, bodyBase.clone().lerp(bodyLight, building.tint));

      this.dummy.position.y = building.y + building.scaleY + 0.34;
      this.dummy.rotation.set(0, building.rotation + Math.PI * 0.25, 0);
      this.dummy.scale.set(building.scaleX * 1.1, 0.88, building.scaleZ * 1.1);
      this.dummy.updateMatrix();
      this.roofMesh.setMatrixAt(index, this.dummy.matrix);
      this.roofMesh.setColorAt(index, roofBase.clone().lerp(roofLight, building.tint));

      const doorOffset = new THREE.Vector3(0, 0, building.scaleZ * 0.5 + 0.045).applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        building.rotation
      );
      this.dummy.position.set(building.x + doorOffset.x, building.y + 0.38, building.z + doorOffset.z);
      this.dummy.rotation.set(0, building.rotation, 0);
      this.dummy.scale.set(1, 1, 1);
      this.dummy.updateMatrix();
      this.doorMesh.setMatrixAt(index, this.dummy.matrix);
    });

    for (const mesh of [this.buildingMesh, this.roofMesh, this.doorMesh]) {
      mesh.count = buildings.length;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }

  private applyProps(mesh: THREE.InstancedMesh, props: PropPlacement[], type: 'well' | 'sign'): void {
    const base = new THREE.Color(type === 'well' ? 0x676a63 : 0x9b7849);
    const light = new THREE.Color(type === 'well' ? 0xa2a193 : 0xd2aa68);
    props.forEach((prop, index) => {
      this.dummy.position.set(prop.x, prop.y + (type === 'well' ? 0.4 : 0.8) * prop.scale, prop.z);
      this.dummy.rotation.set(0, prop.rotation, 0);
      this.dummy.scale.set(prop.scale, prop.scale, prop.scale);
      this.dummy.updateMatrix();
      mesh.setMatrixAt(index, this.dummy.matrix);
      mesh.setColorAt(index, base.clone().lerp(light, prop.tint));
    });
    mesh.count = props.length;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  private applyResourceMeshes(time: number): void {
    const signature = this.active
      ? `${this.active.town.key}:${this.active.collected.map((value) => (value ? 1 : 0)).join('')}:${Math.floor(time * 4)}`
      : 'none';
    if (signature === this.resourceSignature) return;
    this.resourceSignature = signature;

    const meshes = {
      timber: this.timberMesh,
      stone: this.stoneMesh,
      crystal: this.crystalMesh
    } satisfies Record<ResourceKind, THREE.InstancedMesh>;
    for (const mesh of Object.values(meshes)) {
      mesh.count = 0;
    }
    this.resourceMarkerMesh.count = 0;
    if (!this.active) return;

    let index = 0;
    for (let i = 0; i < this.active.nodes.length; i += 1) {
      if (this.active.collected[i]) continue;
      const node = this.active.nodes[i];
      const mesh = meshes[node.kind];
      this.dummy.position.set(node.x, node.y + 0.64 + Math.sin(time * 3 + i) * 0.12, node.z);
      this.dummy.rotation.set(0, time * 0.8 + i, 0);
      this.dummy.scale.setScalar(node.kind === 'crystal' ? 1.08 : 1);
      this.dummy.updateMatrix();
      mesh.setMatrixAt(index, this.dummy.matrix);
      this.dummy.position.set(node.x, node.y + 1.9 + Math.sin(time * 3 + i) * 0.1, node.z);
      this.dummy.rotation.set(Math.PI * 0.5, time + i, 0);
      this.dummy.scale.setScalar(1);
      this.dummy.updateMatrix();
      this.resourceMarkerMesh.setMatrixAt(index, this.dummy.matrix);
      index += 1;
      mesh.count = index;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
    this.resourceMarkerMesh.count = index;
    this.resourceMarkerMesh.instanceMatrix.needsUpdate = true;
    this.resourceMarkerMesh.computeBoundingSphere();
  }

  private makeStats(player: THREE.Vector3): SettlementStats {
    const nearest = this.findNearestTown(player);
    const active = this.active;
    const collected = active ? countCollected(active) : 0;
    const target = this.getContractTarget(player);
    const targetDistance = Math.hypot(target.x - player.x, target.z - player.z);
    const returnDistance = active ? Math.hypot(active.town.x - player.x, active.town.z - player.z) : 0;
    const buildingCount = this.buildingMesh.count;
    const propCount = this.wellMesh.count + this.signMesh.count;
    const repairedCount = this.repairedMesh.count;
    const resourceNodes = active ? REQUIRED_RESOURCES - collected : 0;
    return {
      towns: this.settlements.length || 1,
      buildings: buildingCount,
      props: propCount + repairedCount,
      resourceNodes,
      completedContracts: this.completed.size,
      instanceMB: estimateInstanceMB(buildingCount * 3 + propCount + repairedCount + resourceNodes * 2),
      syncMs: this.stats?.syncMs ?? 0,
      nearestTownName: nearest?.town.name ?? this.home.name,
      nearestTownDistance: nearest?.distance ?? 0,
      active: Boolean(active),
      activeTownName: active?.town.name ?? 'none',
      resource: active?.town.resource ?? 'none',
      collected,
      required: REQUIRED_RESOURCES,
      targetDistance,
      returnDistance,
      prompt: promptFor(active, collected)
    };
  }

  private applyRepairedMeshes(time: number): void {
    let index = 0;
    for (const town of this.settlements) {
      if (!this.completed.has(town.key)) continue;
      this.dummy.position.set(town.x, town.y + 3.25 + Math.sin(time * 2.4 + index) * 0.08, town.z);
      this.dummy.rotation.set(0, town.rotation + time * 1.4, Math.PI * 0.08);
      this.dummy.scale.set(1, 1, 1);
      this.dummy.updateMatrix();
      this.repairedMesh.setMatrixAt(index, this.dummy.matrix);
      index += 1;
    }
    this.repairedMesh.count = index;
    this.repairedMesh.instanceMatrix.needsUpdate = true;
    this.repairedMesh.computeBoundingSphere();
  }
}

function createHomeSettlement(origin: THREE.Vector3): Settlement {
  const anchor = findPlayableAnchor(origin.x, origin.z, 48, 138, 17);
  return {
    key: 'home-dawnmere',
    name: 'Dawnmere',
    x: anchor.x,
    y: anchor.y,
    z: anchor.z,
    rotation: seededUnit(anchor.x, anchor.z, 1301) * Math.PI * 2,
    size: 7,
    resource: 'timber'
  };
}

function settlementForChunk(chunk: ChunkCoord): Settlement | null {
  const roll = seededUnit(chunk.cx, chunk.cz, 1201);
  if (roll < 0.935) return null;
  const baseX = chunk.cx * CHUNK_SIZE + CHUNK_SIZE * (0.32 + seededUnit(chunk.cx, chunk.cz, 1203) * 0.36);
  const baseZ = chunk.cz * CHUNK_SIZE + CHUNK_SIZE * (0.32 + seededUnit(chunk.cx, chunk.cz, 1205) * 0.36);
  const y = heightAt(baseX, baseZ);
  if (y <= SEA_LEVEL + WATER_BLOCK_MARGIN + 3 || y > 108 || slopeAt(baseX, baseZ) > 0.18) return null;
  const sample = sampleWorld(baseX, baseZ);
  const key = `town-${chunk.cx},${chunk.cz}`;
  return {
    key,
    name: townName(chunk.cx, chunk.cz),
    x: baseX,
    y,
    z: baseZ,
    rotation: seededUnit(chunk.cx, chunk.cz, 1207) * Math.PI * 2,
    size: 4 + Math.floor(seededUnit(chunk.cx, chunk.cz, 1209) * 4),
    resource: resourceFor(sample.biome, sample.moisture, y)
  };
}

function collectTownPlacements(
  town: Settlement,
  buildings: BuildingPlacement[],
  wells: PropPlacement[],
  signs: PropPlacement[]
): void {
  wells.push({ x: town.x, y: town.y, z: town.z, rotation: town.rotation, scale: 1, tint: seededUnit(town.x, town.z, 1221) });
  signs.push({
    x: town.x + Math.cos(town.rotation) * 4.4,
    y: heightAt(town.x + Math.cos(town.rotation) * 4.4, town.z + Math.sin(town.rotation) * 4.4),
    z: town.z + Math.sin(town.rotation) * 4.4,
    rotation: town.rotation + Math.PI * 0.5,
    scale: 1,
    tint: seededUnit(town.x, town.z, 1223)
  });

  for (let i = 0; i < town.size; i += 1) {
    const angle = town.rotation + (i / town.size) * Math.PI * 2 + (seededUnit(town.x + i, town.z, 1227) - 0.5) * 0.38;
    const radius = 8.5 + seededUnit(town.x + i, town.z, 1229) * 8.8;
    const x = town.x + Math.cos(angle) * radius;
    const z = town.z + Math.sin(angle) * radius;
    const y = heightAt(x, z);
    if (y <= SEA_LEVEL + WATER_BLOCK_MARGIN || slopeAt(x, z) > 0.28) continue;
    buildings.push({
      x,
      y,
      z,
      rotation: angle + Math.PI,
      scaleX: 2.2 + seededUnit(town.x + i, town.z, 1231) * 1.45,
      scaleY: 1.6 + seededUnit(town.x + i, town.z, 1233) * 1.15,
      scaleZ: 1.9 + seededUnit(town.x + i, town.z, 1237) * 1.25,
      tint: seededUnit(town.x + i, town.z, 1239)
    });
  }

  if (!buildings.some((building) => Math.hypot(building.x - town.x, building.z - town.z) < 28)) {
    const x = town.x - Math.sin(town.rotation) * 7.5;
    const z = town.z + Math.cos(town.rotation) * 7.5;
    buildings.push({
      x,
      y: Math.max(heightAt(x, z), town.y),
      z,
      rotation: town.rotation,
      scaleX: 2.8,
      scaleY: 2.1,
      scaleZ: 2.3,
      tint: seededUnit(town.x, town.z, 1240)
    });
  }
}

function resourceNodesFor(town: Settlement): ResourceNode[] {
  const nodes: ResourceNode[] = [];
  for (let i = 0; i < REQUIRED_RESOURCES; i += 1) {
    const angle = town.rotation + i * 2.15 + seededUnit(town.x + i, town.z, 1241) * 0.8;
    const radius = 54 + seededUnit(town.x + i, town.z, 1243) * 62;
    const candidate = findPlayableAnchor(
      town.x + Math.cos(angle) * radius,
      town.z + Math.sin(angle) * radius,
      0,
      64,
      13 + i
    );
    nodes.push({ ...candidate, kind: town.resource });
  }
  return nodes;
}

function findPlayableAnchor(
  originX: number,
  originZ: number,
  minRadius: number,
  maxRadius: number,
  salt: number
): { x: number; y: number; z: number } {
  let best = { x: originX, y: heightAt(originX, originZ), z: originZ, score: -Infinity };
  for (let radius = minRadius; radius <= maxRadius; radius += 12) {
    const steps = Math.max(8, Math.ceil((radius + 20) / 7));
    for (let i = 0; i < steps; i += 1) {
      const angle = (i / steps) * Math.PI * 2 + seededUnit(originX + i, originZ, salt) * 0.32;
      const x = originX + Math.cos(angle) * radius;
      const z = originZ + Math.sin(angle) * radius;
      const y = heightAt(x, z);
      if (y <= SEA_LEVEL + WATER_BLOCK_MARGIN + 2 || y > 120) continue;
      const slope = slopeAt(x, z);
      if (slope > 0.22) continue;
      const score = (1 - slope * 3) - Math.abs(y - 28) * 0.01 - radius * 0.001;
      if (score > best.score) best = { x, y, z, score };
    }
  }
  if (best.score === -Infinity) {
    best.y = Math.max(heightAt(best.x, best.z), SEA_LEVEL + WATER_BLOCK_MARGIN + 2);
  }
  return best;
}

function resourceFor(biome: string, moisture: number, height: number): ResourceKind {
  if (height > 78 || biome === 'rock' || biome === 'snow') return 'stone';
  if (moisture > 0.62 || biome === 'forest') return 'timber';
  return 'crystal';
}

function townName(cx: number, cz: number): string {
  const prefixes = ['Amber', 'Brindle', 'Cairn', 'Dew', 'Elder', 'Fallow', 'Green', 'Hearth'];
  const suffixes = ['field', 'mere', 'wick', 'rest', 'barrow', 'hollow', 'gate', 'stead'];
  const a = Math.floor(seededUnit(cx, cz, 1251) * prefixes.length) % prefixes.length;
  const b = Math.floor(seededUnit(cx, cz, 1253) * suffixes.length) % suffixes.length;
  return `${prefixes[a]}${suffixes[b]}`;
}

function promptFor(active: ActiveContract | null, collected: number): string {
  if (!active) return 'Find a hamlet and start a repair contract';
  if (collected >= REQUIRED_RESOURCES) return `Return to ${active.town.name} to finish the repair`;
  return `Collect ${active.town.resource} for ${active.town.name}`;
}

function countCollected(contract: ActiveContract): number {
  return contract.collected.filter(Boolean).length;
}

function estimateInstanceMB(instances: number): number {
  const matrixBytes = instances * 16 * 4;
  const colorBytes = instances * 3 * 4;
  return (matrixBytes + colorBytes) / 1024 / 1024;
}
