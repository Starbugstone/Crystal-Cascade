import { Howl } from 'howler';
import { onBeforeUnmount, watch } from 'vue';
import { useSettingsStore } from '../stores/settingsStore';

const clampVolume = (value) => Math.min(1, Math.max(0, value ?? 0));

const AMBIENT_SRC = '/sound/knickknack.ogg';
const AMBIENT_BASE_VOLUME = 0.35;

export const SFX_VOLUME = Object.freeze({
  MATCH: 0.55,
  COMBO: 0.75,
  BONUS_APPEAR: 0.7,
  CROSS_FIRE: 0.8,
  BOMB: 0.85,
  RAINBOW_LASER: 0.65,
});

export const SFX_KEYS = Object.freeze({
  MATCH: 'match-basic',
  COMBO: 'match-combo',
  BONUS_APPEAR: 'bonus-appears',
  CROSS_FIRE: 'cross-activate',
  BOMB: 'bomb-activate',
  RAINBOW_LASER: 'rainbow-laser',
});

const SFX_DEFINITIONS = {
  [SFX_KEYS.MATCH]: {
    src: ['/sound/gem1.mp3'],
    baseVolume: SFX_VOLUME.MATCH,
  },
  [SFX_KEYS.COMBO]: {
    src: ['/sound/gem-combo.mp3'],
    baseVolume: SFX_VOLUME.COMBO,
  },
  [SFX_KEYS.BONUS_APPEAR]: {
    src: ['/sound/bonus-appears.mp3'],
    baseVolume: SFX_VOLUME.BONUS_APPEAR,
  },
  [SFX_KEYS.CROSS_FIRE]: {
    src: ['/sound/boom-fire.mp3'],
    baseVolume: SFX_VOLUME.CROSS_FIRE,
  },
  [SFX_KEYS.BOMB]: {
    src: ['/sound/explosion.mp3'],
    baseVolume: SFX_VOLUME.BOMB,
  },
  [SFX_KEYS.RAINBOW_LASER]: {
    src: ['/sound/laser.ogg'],
    baseVolume: SFX_VOLUME.RAINBOW_LASER,
  },
};

let ambientHowl;
let ambientSoundId = null;
const sfxHowls = new Map();

const ensureAmbientHowl = (settingsStore) => {
  if (!ambientHowl) {
    ambientHowl = new Howl({
      src: [AMBIENT_SRC],
      loop: true,
      preload: true,
      volume: clampVolume(AMBIENT_BASE_VOLUME * settingsStore.musicVolume),
    });
    ambientHowl.on('loaderror', (_id, error) => {
      console.error('Failed to load ambient loop audio', error);
    });
  }
  return ambientHowl;
};

const ensureSfxHowl = (key, settingsStore) => {
  const cached = sfxHowls.get(key);
  if (cached) {
    return cached;
  }

  const definition = SFX_DEFINITIONS[key];
  if (!definition) {
    console.warn(`Missing SFX definition for key "${key}"`);
    return null;
  }

  const howl = new Howl({
    src: definition.src,
    preload: true,
    volume: clampVolume(definition.baseVolume * settingsStore.sfxVolume),
  });

  howl.on('loaderror', (_id, error) => {
    console.error(`Failed to load SFX "${key}"`, error);
  });

  const entry = { howl, baseVolume: definition.baseVolume };
  sfxHowls.set(key, entry);
  return entry;
};

export const useAudio = () => {
  const settingsStore = useSettingsStore();

  const applyAmbientVolume = () => {
    if (!ambientHowl) {
      return;
    }
    const effective = clampVolume(AMBIENT_BASE_VOLUME * settingsStore.musicVolume);
    if (ambientSoundId != null) {
      ambientHowl.volume(effective, ambientSoundId);
    } else {
      ambientHowl.volume(effective);
    }
  };

  const applySfxVolumes = () => {
    sfxHowls.forEach(({ howl, baseVolume }) => {
      howl.volume(clampVolume(baseVolume * settingsStore.sfxVolume));
    });
  };

  const playSfx = (key, { rate, seek } = {}) => {
    const entry = ensureSfxHowl(key, settingsStore);
    if (!entry) {
      return null;
    }

    const { howl, baseVolume } = entry;
    const effectiveVolume = clampVolume(baseVolume * settingsStore.sfxVolume);
    howl.volume(effectiveVolume);

    const soundId = howl.play();
    if (soundId != null) {
      howl.volume(effectiveVolume, soundId);
      if (typeof rate === 'number') {
        howl.rate(rate, soundId);
      }
      if (typeof seek === 'number') {
        howl.seek(seek, soundId);
      }
    }
    return soundId;
  };

  const playMatch = ({ comboCount = 1 } = {}) => {
    const key = comboCount >= 4 ? SFX_KEYS.COMBO : SFX_KEYS.MATCH;
    return playSfx(key);
  };

  const playBonusAppears = () => playSfx(SFX_KEYS.BONUS_APPEAR);
  const playCrossFire = () => playSfx(SFX_KEYS.CROSS_FIRE);
  const playBomb = () => playSfx(SFX_KEYS.BOMB);
  const playRainbowLaser = () => playSfx(SFX_KEYS.RAINBOW_LASER);

  const playAmbientLoop = () => {
    const loop = ensureAmbientHowl(settingsStore);
    const targetVolume = clampVolume(AMBIENT_BASE_VOLUME * settingsStore.musicVolume);

    if (ambientSoundId != null && loop.playing(ambientSoundId)) {
      const currentVolume = loop.volume(ambientSoundId);
      if (Math.abs(currentVolume - targetVolume) > 0.001) {
        loop.fade(currentVolume, targetVolume, 200, ambientSoundId);
      }
      return ambientSoundId;
    }

    ambientSoundId = loop.play();
    loop.volume(targetVolume, ambientSoundId);
    return ambientSoundId;
  };

  const stopAmbientLoop = ({ fadeMs = 450 } = {}) => {
    if (!ambientHowl || ambientSoundId == null) {
      return;
    }

    const loop = ambientHowl;
    const soundId = ambientSoundId;
    ambientSoundId = null;

    if (fadeMs > 0) {
      const startingVolume = loop.volume(soundId);
      loop.once(
        'fade',
        () => {
          loop.stop(soundId);
        },
        soundId,
      );
      loop.fade(startingVolume, 0, fadeMs, soundId);
    } else {
      loop.stop(soundId);
    }
  };

  watch(
    () => settingsStore.musicVolume,
    () => applyAmbientVolume(),
    { immediate: true },
  );

  watch(
    () => settingsStore.sfxVolume,
    () => applySfxVolumes(),
    { immediate: true },
  );

  onBeforeUnmount(() => {
    stopAmbientLoop({ fadeMs: 0 });
  });

  return {
    playAmbientLoop,
    stopAmbientLoop,
    playSfx,
    playMatch,
    playBonusAppears,
    playCrossFire,
    playBomb,
    playRainbowLaser,
  };
};
