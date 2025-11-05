import { Howl, Howler } from 'howler';
import { onBeforeUnmount, watch } from 'vue';
import { useSettingsStore } from '../stores/settingsStore';

const AMBIENT_SRC = '/sound/knickknack.ogg';
const AMBIENT_BASE_VOLUME = 0.35;

let ambientHowl;
let ambientSoundId = null;

const ensureAmbientHowl = () => {
  if (!ambientHowl) {
    ambientHowl = new Howl({
      src: [AMBIENT_SRC],
      loop: true,
      preload: true,
      volume: AMBIENT_BASE_VOLUME,
    });
    ambientHowl.on('loaderror', (_id, error) => {
      console.error('Failed to load ambient loop audio', error);
    });
  }
  return ambientHowl;
};

export const useAudio = () => {
  const settingsStore = useSettingsStore();

  const playSfx = () => {
    // Placeholder until audio assets are added.
  };

  const playAmbientLoop = () => {
    const loop = ensureAmbientHowl();
    if (ambientSoundId != null && loop.playing(ambientSoundId)) {
      const currentVolume = loop.volume(ambientSoundId);
      if (currentVolume !== AMBIENT_BASE_VOLUME) {
        loop.fade(currentVolume, AMBIENT_BASE_VOLUME, 200, ambientSoundId);
      }
      return;
    }
    ambientSoundId = loop.play();
    loop.volume(AMBIENT_BASE_VOLUME, ambientSoundId);
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
    (value) => {
      Howler.volume(value);
    },
    { immediate: true },
  );

  onBeforeUnmount(() => {
    stopAmbientLoop({ fadeMs: 0 });
  });

  return {
    playSfx,
    playAmbientLoop,
    stopAmbientLoop,
  };
};
