import * as THREE from 'three';
import { CHUNK_SIZE, SEA_LEVEL, TERRAIN_RADIUS } from './constants';

export class WaterSystem {
  readonly mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshPhongMaterial>;

  private readonly material: THREE.MeshPhongMaterial;
  private readonly normalMap: THREE.CanvasTexture;
  private readonly size: number;

  constructor() {
    this.normalMap = createWaterNormalTexture();
    this.normalMap.wrapS = THREE.RepeatWrapping;
    this.normalMap.wrapT = THREE.RepeatWrapping;
    this.normalMap.repeat.set(18, 18);
    this.material = new THREE.MeshPhongMaterial({
      color: 0x5da9bd,
      emissive: 0x0a2433,
      specular: 0xffffff,
      shininess: 92,
      normalMap: this.normalMap,
      normalScale: new THREE.Vector2(0.055, 0.055),
      transparent: false,
      depthWrite: true,
      side: THREE.FrontSide,
      fog: true
    });
    this.size = CHUNK_SIZE * (TERRAIN_RADIUS * 2 - 0.9);
    const geometry = new THREE.PlaneGeometry(this.size, this.size, 4, 4);
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.name = 'recentered-water-plane';
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.y = SEA_LEVEL + 0.06;
    this.mesh.renderOrder = 2;
  }

  update(player: THREE.Vector3, time: number): void {
    this.mesh.position.x = player.x;
    this.mesh.position.z = player.z;
    const shimmer = (Math.sin(time * 0.52) + Math.sin(time * 0.91 + 2.1)) * 0.5;
    this.material.color.setHSL(0.535 + shimmer * 0.008, 0.42, 0.52 + shimmer * 0.025);
    this.normalMap.offset.set((time * 0.018) % 1, (time * 0.012) % 1);
    this.material.shininess = 84 + shimmer * 12;
  }

  getStats(): { size: number; normalTextureMB: number; material: string } {
    return {
      size: this.size,
      normalTextureMB: (256 * 256 * 4) / 1024 / 1024,
      material: 'MeshPhongMaterial'
    };
  }
}

function createWaterNormalTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create water normal canvas');

  const image = ctx.createImageData(canvas.width, canvas.height);
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const nx =
        Math.sin((x + y * 0.35) * 0.13) * 0.22 +
        Math.sin((x * 0.31 - y * 0.17) * 0.09) * 0.16;
      const nz =
        Math.cos((y - x * 0.25) * 0.12) * 0.22 +
        Math.sin((x * 0.18 + y * 0.27) * 0.11) * 0.14;
      const index = (y * canvas.width + x) * 4;
      image.data[index] = 128 + nx * 127;
      image.data[index + 1] = 128 + nz * 127;
      image.data[index + 2] = 226;
      image.data[index + 3] = 255;
    }
  }

  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  return texture;
}
