import { afterEach, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useSettingsStore } from '../src/stores/settingsStore';

afterEach(() => vi.unstubAllGlobals());
const freshSettings = () => {
  setActivePinia(createPinia());
  return useSettingsStore();
};
it('defaults village labels on and remembers either choice in a new session', () => {
  const saved = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (key) => saved.get(key) ?? null,
    setItem: (key, value) => saved.set(key, value),
  });
  const settings = freshSettings();
  expect(settings.showVillageLabels).toBe(true);
  settings.setVillageLabels(false);
  expect(freshSettings().showVillageLabels).toBe(false);
  freshSettings().setVillageLabels(true);
  expect(freshSettings().showVillageLabels).toBe(true);
});
it('keeps the toggle usable when preference storage is unavailable', () => {
  vi.stubGlobal('localStorage', {
    getItem: () => {
      throw new Error('Storage unavailable');
    },
    setItem: () => {
      throw new Error('Storage unavailable');
    },
  });
  const settings = freshSettings();
  expect(settings.showVillageLabels).toBe(true);
  expect(() => settings.setVillageLabels(false)).not.toThrow();
  expect(settings.showVillageLabels).toBe(false);
});
