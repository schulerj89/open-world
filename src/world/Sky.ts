import * as THREE from 'three';
import { FOG_COLOR } from './constants';
import { WeatherVisuals } from './weather';

export class SkySystem {
  readonly group = new THREE.Group();
  readonly sunLight = new THREE.DirectionalLight(0xffd59a, 2.15);

  private readonly dome: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  private readonly skyMaterial: THREE.ShaderMaterial;
  private readonly sunSprite: THREE.Sprite;
  private readonly sunDirection = new THREE.Vector3(-0.42, 0.74, -0.52).normalize();

  constructor() {
    this.group.name = 'sky-light-cloud-anchor';

    const fogColor = new THREE.Color(FOG_COLOR);
    this.skyMaterial = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: true,
      uniforms: {
        zenith: { value: new THREE.Color(0x1e67b4) },
        horizon: { value: fogColor.clone() },
        fog: { value: fogColor.clone() }
      },
      vertexShader: `
        varying vec3 vDirection;
        void main() {
          vDirection = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vDirection;
        uniform vec3 zenith;
        uniform vec3 horizon;
        uniform vec3 fog;

        float random(vec2 p) {
          return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
        }

        void main() {
          float y = normalize(vDirection).y;
          float skyT = smoothstep(-0.05, 0.78, y);
          float haze = 1.0 - smoothstep(0.0, 0.23, y);
          vec3 color = mix(horizon, zenith, skyT);
          color = mix(color, fog, haze * 0.52);
          color += (random(gl_FragCoord.xy) - 0.5) / 255.0;
          gl_FragColor = vec4(color, 1.0);
        }
      `
    });

    this.dome = new THREE.Mesh(new THREE.SphereGeometry(700, 32, 16), this.skyMaterial);
    this.dome.name = 'dithered-gradient-sky-dome';
    this.dome.renderOrder = -1000;
    this.group.add(this.dome);

    this.sunLight.position.copy(this.sunDirection).multiplyScalar(120);
    this.sunLight.name = 'warm-directional-sun';
    this.group.add(this.sunLight);

    const sunTexture = createSunTexture();
    this.sunSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: sunTexture,
        color: 0xffd88a,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        fog: false
      })
    );
    this.sunSprite.name = 'sun-glint-sprite';
    this.sunSprite.scale.setScalar(18);
    this.group.add(this.sunSprite);
  }

  update(camera: THREE.Camera): void {
    this.dome.position.copy(camera.position);
    this.sunSprite.position.copy(camera.position).add(this.sunDirection.clone().multiplyScalar(360));
  }

  setWeather(visuals: WeatherVisuals): void {
    this.skyMaterial.uniforms.zenith.value.setHex(visuals.zenithColor);
    this.skyMaterial.uniforms.horizon.value.setHex(visuals.horizonColor);
    this.skyMaterial.uniforms.fog.value.setHex(visuals.fogColor);
    this.sunLight.intensity = visuals.sunIntensity;
    const material = this.sunSprite.material as THREE.SpriteMaterial;
    material.opacity = visuals.sunOpacity;
  }
}

function createSunTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create sun canvas');
  const gradient = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  gradient.addColorStop(0, 'rgba(255,255,240,1)');
  gradient.addColorStop(0.28, 'rgba(255,215,135,0.88)');
  gradient.addColorStop(1, 'rgba(255,180,70,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
