export type AudioDebugState = {
  state: string;
  track: string;
  trackRemaining: number;
  lastEffect: string;
};

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
  private lastEffect = "none";
  private lastEffectAt = 0;

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

  getDebugState(): AudioDebugState {
    const now = this.context?.currentTime ?? 0;
    const effectAge = this.lastEffectAt > 0 ? Math.max(0, now - this.lastEffectAt) : Number.POSITIVE_INFINITY;
    return {
      state: this.context?.state ?? "not-started",
      track: this.getTrackName(),
      trackRemaining: Math.max(0, this.trackEndsAt - now),
      lastEffect: effectAge < 2.5 ? this.lastEffect : "none"
    };
  }

  dispose(): void {
    for (const node of this.trackNodes) {
      if ("stop" in node && typeof node.stop === "function") {
        try {
          node.stop();
        } catch {
          // Scheduled sources may already be stopped.
        }
      }
      node.disconnect();
    }
    this.trackNodes = [];
    try {
      this.noiseSource?.stop();
    } catch {
      // The looping ambience source may already be stopped during teardown.
    }
    this.noiseSource?.disconnect();
    this.wind?.disconnect();
    this.music?.disconnect();
    void this.context?.close().catch(() => undefined);
    this.context = undefined;
    this.wind = undefined;
    this.music = undefined;
    this.noiseSource = undefined;
  }

  playStrike(classKey = "sentinel"): void {
    if (!this.context) {
      return;
    }

    const now = this.context.currentTime;
    const base = classKey === "arcanist" ? 520 : classKey === "wayfarer" ? 360 : 240;
    this.lastEffect = `${classKey} strike`;
    this.lastEffectAt = now;
    this.playTone(base, now, 0.09, "square", 0.05, 0.018);
    this.playTone(base * 1.5, now + 0.035, 0.08, "triangle", 0.035, 0.012);
    this.playNoiseBurst(now, 0.08, 0.026, "highpass", 950);
  }

  playHit(defeated = false): void {
    if (!this.context) {
      return;
    }

    const now = this.context.currentTime;
    this.lastEffect = defeated ? "defeat impact" : "hit impact";
    this.lastEffectAt = now;
    this.playTone(defeated ? 150 : 190, now, defeated ? 0.2 : 0.13, "sawtooth", defeated ? 0.055 : 0.04, 0.025);
    this.playNoiseBurst(now, defeated ? 0.18 : 0.1, defeated ? 0.038 : 0.026, "bandpass", defeated ? 300 : 420);
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
      const nodes = this.scheduleTone(
        frequency,
        now,
        track.duration - 0.25,
        index % 2 === 0 ? "sine" : "triangle",
        0.045 / (index + 1),
        0.0001,
        music,
        1.2
      );
      this.trackNodes.push(...nodes);
    });

    const stepDuration = track.duration / 16;
    for (let step = 0; step < 16; step += 1) {
      const note = track.notes[(step * 3 + this.currentTrackIndex) % track.notes.length];
      const octave = step % 5 === 0 ? 2 : step % 3 === 0 ? 1.5 : 1;
      const start = now + step * stepDuration;
      this.trackNodes.push(...this.scheduleTone(note * octave, start, 0.36, "triangle", 0.018, 0.0001, music, 0.018));
      if (step % 4 === 0) {
        this.trackNodes.push(...this.scheduleTone(note * 0.5, start, 0.72, "sine", 0.026, 0.0001, music, 0.05));
      }
    }

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

  private scheduleTone(
    frequency: number,
    start: number,
    duration: number,
    type: OscillatorType,
    peakGain: number,
    endGain: number,
    destination: AudioNode,
    attack = 0.012
  ): AudioNode[] {
    if (!this.context) {
      return [];
    }

    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, frequency * 0.96), start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peakGain), start + attack);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, endGain), start + duration);
    osc.connect(gain);
    gain.connect(destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
    return [osc, gain];
  }

  private playNoiseBurst(
    start: number,
    duration: number,
    peakGain: number,
    filterType: BiquadFilterType = "bandpass",
    frequency = 420
  ): void {
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
    filter.type = filterType;
    filter.frequency.value = frequency;
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
