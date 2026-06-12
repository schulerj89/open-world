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

  playStrike(classKey = "sentinel"): void {
    if (!this.context) {
      return;
    }

    const now = this.context.currentTime;
    const base = classKey === "arcanist" ? 520 : classKey === "wayfarer" ? 360 : 240;
    this.playTone(base, now, 0.09, "square", 0.05, 0.018);
    this.playTone(base * 1.5, now + 0.035, 0.08, "triangle", 0.035, 0.012);
  }

  playHit(defeated = false): void {
    if (!this.context) {
      return;
    }

    const now = this.context.currentTime;
    this.playTone(defeated ? 150 : 190, now, defeated ? 0.2 : 0.13, "sawtooth", defeated ? 0.055 : 0.04, 0.025);
    this.playNoiseBurst(now, defeated ? 0.18 : 0.1, defeated ? 0.035 : 0.024);
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

  private playTone(
    frequency: number,
    start: number,
    duration: number,
    type: OscillatorType,
    peakGain: number,
    endGain: number
  ): void {
    if (!this.context) {
      return;
    }

    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, frequency * 0.72), start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peakGain, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(endGain, start + duration * 0.55);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(this.context.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  private playNoiseBurst(start: number, duration: number, peakGain: number): void {
    if (!this.context) {
      return;
    }

    const buffer = this.context.createBuffer(1, Math.max(1, Math.floor(this.context.sampleRate * duration)), this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }

    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    const filter = this.context.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 420;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peakGain, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.buffer = buffer;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.context.destination);
    source.start(start);
  }
}
