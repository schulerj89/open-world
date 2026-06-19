import { WEATHER_KINDS, WeatherOverride } from './weather';

export class InputController {
  readonly keys = new Set<string>();
  yaw = Math.PI * 0.25;
  pitch = 0.34;
  muted = false;
  weatherOverride: WeatherOverride = 'auto';

  private dragging = false;

  constructor(private readonly target: HTMLElement) {
    window.addEventListener('keydown', (event) => {
      this.keys.add(event.code);
      if (event.code === 'KeyM') {
        this.muted = !this.muted;
      }
      if (event.code === 'KeyC' && !event.repeat) {
        this.cycleWeatherOverride();
      }
    });
    window.addEventListener('keyup', (event) => this.keys.delete(event.code));
    target.addEventListener('pointerdown', (event) => {
      this.dragging = true;
      target.setPointerCapture(event.pointerId);
    });
    target.addEventListener('pointerup', (event) => {
      this.dragging = false;
      if (target.hasPointerCapture(event.pointerId)) {
        target.releasePointerCapture(event.pointerId);
      }
    });
    target.addEventListener('pointermove', (event) => {
      if (!this.dragging) return;
      this.yaw -= event.movementX * 0.0045;
      this.pitch = Math.min(0.82, Math.max(0.14, this.pitch + event.movementY * 0.0028));
    });
  }

  axis(): { x: number; z: number; running: boolean } {
    let x = 0;
    let z = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) z -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) z += 1;
    const length = Math.hypot(x, z);
    if (length > 0) {
      x /= length;
      z /= length;
    }
    return {
      x,
      z,
      running: this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')
    };
  }

  cycleWeatherOverride(): WeatherOverride {
    const index = WEATHER_KINDS.indexOf(this.weatherOverride);
    this.weatherOverride = WEATHER_KINDS[(index + 1) % WEATHER_KINDS.length];
    return this.weatherOverride;
  }
}
