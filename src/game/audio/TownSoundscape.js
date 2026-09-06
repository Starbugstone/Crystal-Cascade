// Original, quiet procedural village audio: no downloaded recordings or extra asset requests.
export const villageSounds = (state) =>
  state.raid
    ? ['hooves']
    : [
        'birds',
        'mining',
        ...(state.population ? ['chatter'] : []),
        ...(state.construction ? ['building'] : []),
        ...(state.stable ? ['horse', 'hooves'] : []),
      ];
const clamp = (value) => Math.min(1, Math.max(0, Number(value) || 0));

export class TownSoundscape {
  constructor({
    contextFactory = () => new (globalThis.AudioContext || globalThis.webkitAudioContext)(),
    random = Math.random,
  } = {}) {
    this.contextFactory = contextFactory;
    this.random = random;
    this.state = { paused: true, musicVolume: 0, sfxVolume: 0 };
    this.sources = new Set();
    this.beat = 0;
    this.disposed = false;
    this.running = false;
    this.lastSound = '';
  }
  async unlock() {
    if (this.disposed) return;
    try {
      if (!this.ctx) {
        this.ctx = this.contextFactory();
        this.music = this.ctx.createGain();
        this.sfx = this.ctx.createGain();
        this.music.connect(this.ctx.destination);
        this.sfx.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      if (!this.disposed) this.update(this.state);
    } catch {
      /* Audio is optional on devices that cannot create or resume a context. */
    }
  }
  update(state) {
    const newRaid = state.raid && state.raid !== this.state.raid;
    const newBuild = state.buildCue && state.buildCue !== this.state.buildCue;
    this.state = { ...state };
    if (!this.ctx || this.disposed) return;
    this.music.gain.setTargetAtTime(clamp(state.musicVolume) * 0.18, this.ctx.currentTime, 0.08);
    this.sfx.gain.setTargetAtTime(clamp(state.sfxVolume) * 0.22, this.ctx.currentTime, 0.05);
    if (state.paused || this.ctx.state !== 'running') {
      this.stop();
      return;
    }
    if (!this.running) {
      this.running = true;
      this.playMusic();
      this.scheduleLife(1800);
    }
    if (newBuild && state.sfxVolume > 0) {
      this.quietSources('sfx');
      this.playConstruction();
    }
    if (newRaid && state.sfxVolume > 0) {
      clearTimeout(this.lifeTimer);
      this.quietSources('sfx');
      this.playLife(String(state.raid).includes('Warning shots') ? 'warning' : 'hooves');
      this.scheduleLife();
    }
  }
  playConstruction() {
    // Three timber taps, then a short rising chime as the last pieces settle.
    for (const offset of [0, 0.22, 0.44]) {
      this.tone(260, 0.1, offset, 0.55, 'triangle', 'sfx', 65);
      this.tone(820, 0.06, offset, 0.12, 'sine', 'sfx', 360);
    }
    this.tone(660, 0.18, 0.68, 0.2);
    this.tone(990, 0.18, 0.8, 0.16);
  }
  tone(
    frequency,
    duration,
    offset = 0,
    volume = 0.2,
    type = 'sine',
    channel = 'sfx',
    endFrequency = frequency,
  ) {
    const ctx = this.ctx;
    if (!ctx || !this.running) return;
    const source = ctx.createOscillator(),
      gain = ctx.createGain();
    const start = ctx.currentTime + offset;
    source.type = type;
    source.frequency.setValueAtTime(frequency, start);
    source.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), start + duration);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + Math.min(0.025, duration / 5));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(gain);
    gain.connect(this[channel]);
    source.channel = channel;
    this.sources.add(source);
    source.onended = () => {
      this.sources.delete(source);
      source.disconnect();
      gain.disconnect();
    };
    source.start(start);
    source.stop(start + duration + 0.02);
  }
  playMusic() {
    if (!this.running) return;
    if (this.state.musicVolume > 0) {
      const roots = [130.81, 174.61, 146.83, 196];
      const root = roots[Math.floor(this.beat / 4) % roots.length];
      // A slow, soft pentatonic phrase over a warm bass; no busy percussion.
      this.tone(root * [2, 3, 2.5, 3][this.beat % 4], 2.5, 0, 0.15, 'triangle', 'music');
      if (this.beat % 4 === 0) this.tone(root, 3.8, 0, 0.16, 'sine', 'music');
      this.beat++;
    }
    this.musicTimer = setTimeout(() => this.playMusic(), 2800);
  }
  scheduleLife(delay = 9000 + this.random() * 8000) {
    if (!this.running) return;
    this.lifeTimer = setTimeout(() => {
      const choices = villageSounds(this.state).filter((kind) => kind !== this.lastSound);
      const kind = choices[Math.floor(this.random() * choices.length)] ?? 'hooves';
      if (this.state.sfxVolume > 0) {
        this.playLife(kind);
        this.lastSound = kind;
      }
      this.scheduleLife();
    }, delay);
  }
  playLife(kind) {
    if (kind === 'birds') {
      for (let n = 0; n < 3; n++)
        this.tone(1800 + n * 240, 0.15, n * 0.23, 0.11, 'sine', 'sfx', 2800 - n * 130);
    } else if (kind === 'building' || kind === 'mining') {
      for (let n = 0; n < 3; n++) {
        this.tone(
          kind === 'building' ? 230 : 1100,
          0.1,
          n * 0.42,
          0.32,
          'triangle',
          'sfx',
          kind === 'building' ? 75 : 780,
        );
        if (kind === 'mining') this.tone(1860, 0.24, n * 0.42, 0.06);
      }
    } else if (kind === 'chatter') {
      // Low, overlapping vowel-like murmurs, with no intelligible speech.
      for (let n = 0; n < 8; n++) {
        const pitch = 125 + (n % 3) * 35;
        this.tone(pitch, 0.16 + (n % 2) * 0.1, n * 0.19, 0.14, 'triangle', 'sfx', pitch * 1.18);
        this.tone(pitch * 3.4, 0.14, n * 0.19, 0.045, 'sine', 'sfx', pitch * 2.7);
      }
    } else if (kind === 'horse') {
      for (let n = 0; n < 5; n++)
        this.tone(540 - n * 45, 0.2, n * 0.11, 0.12, 'triangle', 'sfx', 380 - n * 30);
    } else if (kind === 'warning') {
      for (let n = 0; n < 2; n++) this.tone(170, 0.13, n * 0.9, 0.18, 'triangle', 'sfx', 45);
    } else if (kind === 'hooves') {
      for (let n = 0; n < 8; n++)
        this.tone(
          n % 2 ? 180 : 135,
          0.075,
          n * 0.15 + (n % 2) * 0.035,
          0.28,
          'triangle',
          'sfx',
          55,
        );
    }
  }
  quietSources(channel) {
    for (const source of this.sources)
      if (!channel || source.channel === channel) {
        try {
          source.stop();
        } catch {
          /* Already ended. */
        }
      }
  }
  stop() {
    clearTimeout(this.lifeTimer);
    clearTimeout(this.musicTimer);
    this.running = false;
    this.quietSources();
  }
  dispose() {
    this.disposed = true;
    this.stop();
    this.ctx?.close().catch(() => {});
  }
}
