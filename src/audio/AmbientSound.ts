export class AmbientSound {
  private context?: AudioContext;
  private wind?: GainNode;
  private music?: GainNode;
  private noiseSource?: AudioBufferSourceNode;

  async start(): Promise<void> {
    if (!this.context) {
      this.context = new AudioContext();
      this.createGraph(this.context);
    }

    if (this.context.state !== "running") {
      await this.context.resume();
    }
  }

  setIntensity(value: number): void {
    if (!this.context || !this.wind || !this.music) {
      return;
    }

    const now = this.context.currentTime;
    this.wind.gain.linearRampToValueAtTime(0.04 + value * 0.12, now + 0.3);
    this.music.gain.linearRampToValueAtTime(0.035 + value * 0.035, now + 0.3);
  }

  private createGraph(context: AudioContext): void {
    const windGain = context.createGain();
    const musicGain = context.createGain();
    const lowpass = context.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 760;

    const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = context.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    noise.connect(lowpass);
    lowpass.connect(windGain);
    windGain.connect(context.destination);
    windGain.gain.value = 0.05;
    noise.start();

    const notes = [146.83, 196, 246.94, 293.66];
    notes.forEach((frequency, index) => {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = index % 2 === 0 ? "sine" : "triangle";
      osc.frequency.value = frequency;
      gain.gain.value = 0.05 / (index + 1);
      osc.connect(gain);
      gain.connect(musicGain);
      osc.start();
    });

    musicGain.gain.value = 0.04;
    musicGain.connect(context.destination);
    this.wind = windGain;
    this.music = musicGain;
    this.noiseSource = noise;
  }
}

