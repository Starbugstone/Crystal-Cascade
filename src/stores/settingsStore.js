import { defineStore } from 'pinia';

// Keep this visual preference independent of progress resets.
const VILLAGE_LABELS_KEY = 'crystal-cascade-village-labels';
const savedVillageLabels = () => {
  try {
    return globalThis.localStorage?.getItem(VILLAGE_LABELS_KEY) !== 'false';
  } catch {
    return true;
  }
};

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    isSettingsOpen: false,
    musicVolume: 0.6,
    sfxVolume: 0.8,
    reducedMotion:
      typeof window !== 'undefined' &&
      (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false),
    highContrastMode: false,
    showVillageLabels: savedVillageLabels(),
  }),
  actions: {
    setVillageLabels(visible) {
      this.showVillageLabels = visible !== false;
      try {
        globalThis.localStorage?.setItem(VILLAGE_LABELS_KEY, String(this.showVillageLabels));
      } catch {
        // Storage restrictions still allow the choice for this session.
      }
    },
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
