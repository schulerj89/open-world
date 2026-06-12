export class PerformanceMonitor {
  private frames = 0;
  private elapsed = 0;
  private frameMs = 16.7;
  private fps = 60;

  update(deltaSeconds: number): void {
    const deltaMs = deltaSeconds * 1000;
    this.frameMs = this.frameMs * 0.92 + deltaMs * 0.08;
    this.elapsed += deltaSeconds;
    this.frames += 1;

    if (this.elapsed >= 0.5) {
      this.fps = this.frames / this.elapsed;
      this.elapsed = 0;
      this.frames = 0;
    }
  }

  getFps(): number {
    return this.fps;
  }

  getFrameMs(): number {
    return this.frameMs;
  }
}

