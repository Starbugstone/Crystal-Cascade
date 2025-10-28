import { Howler } from 'howler';
import { watch } from 'vue';
import { useSettingsStore } from '../stores/settingsStore';

export const useAudio = () => {
  const settingsStore = useSettingsStore();

  const playSfx = () => {
    // Placeholder until audio assets are added.
  };

  watch(
    () => settingsStore.musicVolume,
    (value) => {
      Howler.volume(value);
    },
    { immediate: true },
  );

  return {
    playSfx,
  };
};
