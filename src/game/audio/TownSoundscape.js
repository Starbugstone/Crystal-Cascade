// Recorded village audio. Provenance and edits: public/sound/village/credits.html.
const asset = (name) => `${import.meta.env.BASE_URL}sound/village/${name}.mp3`;
export const VILLAGE_AUDIO = Object.freeze({
  music: { src: asset('porch-swing'), volume: 0.45 },
  birds: { src: asset('birds'), volume: 0.5, loop: true },
  chatter: { src: asset('chatter'), volume: 0.32, loop: true },
  building: { src: asset('building'), volume: 0.32 },
  mining: { src: asset('mining'), volume: 0.35 },
  horse: { src: asset('horse'), volume: 0.34 },
  hooves: { src: asset('hooves'), volume: 0.45 },
  warning: { src: asset('warning'), volume: 0.28 },
});

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

// Gentle distance attenuation across the camera's 13–110 unit zoom range.
// The fallback map uses a comfortable middle distance.
export const villageAmbienceGain = (distance = 55) => {
  const proximity = clamp((110 - (Number(distance) || 55)) / 97);
  return 0.3 + 0.7 * proximity * proximity * (3 - 2 * proximity);
};

export class TownSoundscape {
  constructor({
    contextFactory = () => new (globalThis.AudioContext || globalThis.webkitAudioContext)(),
    mediaFactory = () => new Audio(),
    fetchAudio = (...args) => fetch(...args),
    random = Math.random,
  } = {}) {
    this.contextFactory = contextFactory;
    this.mediaFactory = mediaFactory;
    this.fetchAudio = fetchAudio;
    this.random = random;
    this.state = { paused: true, musicVolume: 0, sfxVolume: 0 };
    this.sources = new Map();
    this.pending = new Map();
    this.buffers = new Map();
    this.retryAfter = new Map();
    this.abort = new AbortController();
    this.generation = 0;
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
        this.music.gain.value = 0;
        this.sfx.gain.value = 0;
        this.music.connect(this.ctx.destination);
        this.sfx.connect(this.ctx.destination);
      }
      if (this.ctx.state !== 'running') await this.ctx.resume();
      if (!this.disposed) this.update(this.state);
    } catch {
      // Unsupported audio or autoplay denial: retry on the next user gesture.
    }
  }

  update(state) {
    const raidChanged = state.raid !== this.state.raid;
    const newBuild = state.buildCue && state.buildCue !== this.state.buildCue;
    this.state = { ...state };
    if (!this.ctx || this.disposed) return;
    if (state.paused || this.ctx.state !== 'running') {
      this.stop();
      return;
    }
    this.running = true;
    this.music.gain.setTargetAtTime(
      clamp(state.musicVolume) * VILLAGE_AUDIO.music.volume * (state.raid ? 0.65 : 1),
      this.ctx.currentTime,
      0.4,
    );
    this.sfx.gain.setTargetAtTime(
      clamp(state.sfxVolume) * villageAmbienceGain(state.cameraDistance),
      this.ctx.currentTime,
      0.3,
    );
    this.syncMusic();

    if (raidChanged) {
      // Cancel pending ordinary cues as well as voices already playing.
      this.generation++;
      this.pending.clear();
      this.quietSources();
      clearTimeout(this.lifeTimer);
      this.lifeTimer = null;
    }
    for (const [kind] of this.sources) {
      if (!this.canPlay(kind)) this.quietSource(kind);
    }
    for (const kind of this.pending.keys()) {
      if (!this.canPlay(kind)) this.pending.delete(kind);
    }
    for (const kind of ['birds', 'chatter']) {
      if (this.canPlay(kind)) this.playLife(kind);
    }
    const chatter = this.sources.get('chatter');
    if (chatter) {
      chatter.gain.gain.setTargetAtTime(this.level('chatter'), this.ctx.currentTime, 1.2);
    }
    if (clamp(state.sfxVolume) === 0) {
      clearTimeout(this.lifeTimer);
      this.lifeTimer = null;
    } else {
      // Load short, eligible cues ahead of their visible events. Never load music as a buffer.
      for (const kind of villageSounds(state)) this.loadBuffer(kind);
      if (state.raid) this.loadBuffer('warning');
      if (newBuild && !state.raid) this.playConstruction();
      if (raidChanged && state.raid) {
        this.playLife(String(state.raid).includes('Warning shots') ? 'warning' : 'hooves');
      }
      if (!this.lifeTimer) this.scheduleLife();
    }
  }

  playConstruction() {
    // Instant builds have no active project; their serial triggers this recording once.
    this.pending.delete('building');
    this.quietSource('building');
    return this.playLife('building');
  }

  syncMusic() {
    if (!this.running || clamp(this.state.musicVolume) === 0) {
      this.player?.pause();
      this.musicPending = null;
      return;
    }
    if (!this.player) {
      // Stream the complete performance instead of decoding minutes of stereo PCM on phones.
      this.player = this.mediaFactory();
      this.player.preload = 'none';
      this.player.loop = true;
      this.player.src = VILLAGE_AUDIO.music.src;
      this.musicSource = this.ctx.createMediaElementSource(this.player);
      this.musicSource.connect(this.music);
    }
    if (!this.player.paused || this.musicPending) return;
    const request = {};
    this.musicPending = request;
    this.music.gain.setValueAtTime(0, this.ctx.currentTime);
    this.music.gain.setTargetAtTime(
      clamp(this.state.musicVolume) * VILLAGE_AUDIO.music.volume * (this.state.raid ? 0.65 : 1),
      this.ctx.currentTime,
      0.5,
    );
    Promise.resolve(this.player.play())
      .then(() => {
        // A slow media load must not resurrect music after leaving, pausing or muting.
        if (this.disposed || !this.running || clamp(this.state.musicVolume) === 0)
          this.player.pause();
      })
      .catch(() => {
        // Autoplay/load failure is isolated to music; a later gesture can retry.
      })
      .finally(() => {
        if (this.musicPending === request) this.musicPending = null;
      });
  }

  canPlay(kind) {
    if (!this.running || this.disposed || clamp(this.state.sfxVolume) === 0) return false;
    if (kind === 'warning') return String(this.state.raid).includes('Warning shots');
    if (kind === 'building' && this.state.buildCue && !this.state.raid) return true;
    return villageSounds(this.state).includes(kind);
  }

  level(kind) {
    const population = Math.max(0, Number(this.state.population) || 0);
    return (
      VILLAGE_AUDIO[kind].volume * (kind === 'chatter' ? 0.55 + Math.min(0.45, population / 24) : 1)
    );
  }

  loadBuffer(kind) {
    if (this.disposed || !this.ctx || kind === 'music') return Promise.resolve(null);
    if (this.buffers.has(kind)) return this.buffers.get(kind);
    if ((this.retryAfter.get(kind) || 0) > Date.now()) return Promise.resolve(null);
    const pending = (async () => {
      try {
        const response = await this.fetchAudio(VILLAGE_AUDIO[kind].src, {
          signal: this.abort.signal,
        });
        if (!response.ok) throw new Error(`Audio HTTP ${response.status}`);
        const bytes = await response.arrayBuffer();
        if (this.disposed) return null;
        return await this.ctx.decodeAudioData(bytes);
      } catch {
        this.buffers.delete(kind);
        this.retryAfter.set(kind, Date.now() + 30000);
        return null;
      }
    })();
    this.buffers.set(kind, pending);
    return pending;
  }

  async playLife(kind) {
    if (!this.canPlay(kind) || this.sources.has(kind) || this.pending.has(kind)) return;
    const request = { generation: this.generation };
    this.pending.set(kind, request);
    const buffer = await this.loadBuffer(kind);
    if (this.pending.get(kind) !== request) return;
    this.pending.delete(kind);
    if (!buffer || request.generation !== this.generation || !this.canPlay(kind)) return;
    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    source.buffer = buffer;
    source.loop = !!VILLAGE_AUDIO[kind].loop;
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(
      this.level(kind),
      this.ctx.currentTime + (source.loop ? 1.8 : 0.015),
    );
    source.connect(gain);
    gain.connect(this.sfx);
    const voice = { source, gain };
    this.sources.set(kind, voice);
    source.onended = () => {
      if (this.sources.get(kind) === voice) this.sources.delete(kind);
      source.disconnect();
      gain.disconnect();
    };
    // Different start positions keep the two recorded ambience loops from moving in lockstep.
    source.start(0, source.loop ? this.random() * buffer.duration : 0);
  }

  scheduleLife(delay = 11000 + this.random() * 9000) {
    if (!this.running || clamp(this.state.sfxVolume) === 0) return;
    this.lifeTimer = setTimeout(() => {
      this.lifeTimer = null;
      const eligible = villageSounds(this.state).filter((kind) => !VILLAGE_AUDIO[kind].loop);
      const alternatives = eligible.filter((kind) => kind !== this.lastSound);
      const choices = alternatives.length ? alternatives : eligible;
      const kind = choices[Math.floor(this.random() * choices.length)];
      if (kind) {
        this.playLife(kind);
        this.lastSound = kind;
      }
      this.scheduleLife();
    }, delay);
  }

  quietSource(kind) {
    const voice = this.sources.get(kind);
    if (!voice) return;
    this.sources.delete(kind);
    // Short release avoids a click when a dialog or raid interrupts a recording.
    voice.gain.gain.cancelScheduledValues(this.ctx.currentTime);
    voice.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.015);
    voice.source.stop(this.ctx.currentTime + 0.08);
  }

  quietSources() {
    for (const kind of this.sources.keys()) this.quietSource(kind);
  }

  stop() {
    clearTimeout(this.lifeTimer);
    this.lifeTimer = null;
    this.running = false;
    this.generation++;
    this.pending.clear();
    this.player?.pause();
    this.musicPending = null;
    this.quietSources();
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.stop();
    this.abort.abort();
    this.buffers.clear();
    this.retryAfter.clear();
    if (this.player) {
      this.player.removeAttribute('src');
      this.player.load();
    }
    this.musicSource?.disconnect();
    this.music?.disconnect();
    this.sfx?.disconnect();
    this.ctx?.close().catch(() => {});
  }
}
