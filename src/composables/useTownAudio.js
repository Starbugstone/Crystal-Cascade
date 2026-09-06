import { onMounted, onBeforeUnmount, watch } from 'vue';
import { TownSoundscape } from '../game/audio/TownSoundscape';
import { useSettingsStore } from '../stores/settingsStore';

export function useTownAudio(readVillage) {
  const settings = useSettingsStore();
  const soundscape = new TownSoundscape();
  const update = () =>
    soundscape.update({
      ...readVillage(),
      musicVolume: settings.musicVolume,
      sfxVolume: settings.sfxVolume,
    });
  const unlock = () => {
    update();
    soundscape.unlock();
  };
  watch(() => [JSON.stringify(readVillage()), settings.musicVolume, settings.sfxVolume], update, {
    immediate: true,
  });
  onMounted(() => {
    document.addEventListener('pointerdown', unlock, { passive: true });
    document.addEventListener('keydown', unlock);
    // Entering the village normally follows a user gesture; retry on later gestures if needed.
    unlock();
  });
  onBeforeUnmount(() => {
    document.removeEventListener('pointerdown', unlock);
    document.removeEventListener('keydown', unlock);
    soundscape.dispose();
  });
}
