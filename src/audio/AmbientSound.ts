export class AmbientSound {
  private context?: AudioContext;
  private wind?: GainNode;
  private music?: GainNode;
  private noiseSource?: AudioBufferSourceNode;
  private readonly tracks = [
    { name: "Town Green Procedural", duration: 24, notes: [146.83, 196, 246.94, 293.66] },
    { name: "Meadow Hunt Procedural", duration: 22, notes: [130.81, 174.61, 220, 261.63] }
  ];
  private currentTrackIndex = -1;
  private trackEndsAt = 0;
  private trackNodes: AudioNode[] = [];

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
    if (now >= this.trackEndsAt) {
      this.startNextTrack(this.context, now);
    }
    this.wind.gain.linearRampToValueAtTime(0.04 + value * 0.12, now + 0.3);
    this.music.gain.linearRampToValueAtTime(0.035 + value * 0.035, now + 0.3);
  }

  getTrackName(): string {
    return this.tracks[Math.max(0, this.currentTrackIndex)]?.name ?? "Procedural silence";
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

    musicGain.gain.value = 0.04;
    musicGain.connect(context.destination);
    this.wind = windGain;
    this.music = musicGain;
    this.noiseSource = noise;
    this.startNextTrack(context, context.currentTime);
  }

  private startNextTrack(context: AudioContext, now: number): void {
    if (!this.music) {
      return;
    }
    const music = this.music;

    for (const node of this.trackNodes) {
      node.disconnect();
    }
    this.trackNodes = [];
    this.currentTrackIndex = (this.currentTrackIndex + 1) % this.tracks.length;
    const track = this.tracks[this.currentTrackIndex];

    track.notes.forEach((frequency, index) => {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = index % 2 === 0 ? "sine" : "triangle";
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.05 / (index + 1), now + 1.2);
      gain.gain.linearRampToValueAtTime(0, now + track.duration - 0.8);
      osc.connect(gain);
      gain.connect(music);
      osc.start(now);
      osc.stop(now + track.duration);
      this.trackNodes.push(osc, gain);
    });

    this.trackEndsAt = now + track.duration;
  }
}
