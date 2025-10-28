import { defineStore } from 'pinia';

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    isSettingsOpen: false,
    musicVolume: 0.6,
    sfxVolume: 0.8,
    reducedMotion: false,
    highContrastMode: false,
  }),
  actions: {
    toggleSettings(explicit) {
      if (typeof explicit === 'boolean') {
        this.isSettingsOpen = explicit;
        return;
      }
      this.isSettingsOpen = !this.isSettingsOpen;
    },
    setMusicVolume(value) {
      this.musicVolume = Number(value);
    },
    setSfxVolume(value) {
      this.sfxVolume = Number(value);
    },
    setReducedMotion(value) {
      this.reducedMotion = value;
    },
    setHighContrast(value) {
      this.highContrastMode = value;
    },
  },
});
