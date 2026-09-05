import { defineStore } from 'pinia';
import {
  LEVEL_COUNT,
  POWERS,
  getChestTier,
  getSpeedChestTier,
  getStars,
  rollChestPower,
} from '../data/campaign';

export const SAVE_KEY = 'crystal-cascade-campaign-v1';
const defaults = () => ({
  records: {},
  powers: POWERS.map((power) => ({ ...power, quantity: 3 })),
});
const load = () => {
  const state = defaults();
  try {
    const saved = JSON.parse(globalThis.localStorage?.getItem(SAVE_KEY) ?? 'null');
    for (let id = 1; id <= LEVEL_COUNT; id++) {
      const record = saved?.records?.[id];
      if (
        record &&
        Number.isFinite(record.score) &&
        Number.isInteger(record.stars) &&
        record.stars >= 1 &&
        record.stars <= 3
      ) {
        state.records[id] = { score: Math.max(0, record.score), stars: record.stars };
        if (Number.isFinite(record.bestTimeMs) && record.bestTimeMs > 0) {
          state.records[id].bestTimeMs = record.bestTimeMs;
        }
      }
    }
    state.powers.forEach((power) => {
      const savedPower = saved?.powers?.find?.((entry) => entry.id === power.id);
      if (Number.isSafeInteger(savedPower?.quantity) && savedPower.quantity >= 0)
        power.quantity = savedPower.quantity;
    });
  } catch {
    /* Unavailable or invalid storage starts a fresh in-memory journey. */
  }
  return state;
};

export const useCampaignStore = defineStore('campaign', {
  state: load,
  getters: {
    nextLevel(state) {
      for (let id = 1; id <= LEVEL_COUNT; id++) if (!state.records[id]) return id;
      return LEVEL_COUNT;
    },
    completedCount: (state) => Object.keys(state.records).length,
    totalStars: (state) =>
      Object.values(state.records).reduce((sum, record) => sum + record.stars, 0),
  },
  actions: {
    isUnlocked(id) {
      return Number.isInteger(id) && id >= 1 && id <= this.nextLevel;
    },
    save() {
      try {
        globalThis.localStorage?.setItem(SAVE_KEY, JSON.stringify(this.$state));
      } catch {
        /* Gameplay remains available when storage is full or disabled. */
      }
    },
    recordVictory({ id, score, target, combo, elapsedMs, speedTargetMs }) {
      if (!this.isUnlocked(id)) return [];
      const previous = this.records[id];
      this.records[id] = {
        score: Math.max(previous?.score ?? 0, score),
        stars: Math.max(previous?.stars ?? 0, getStars(score, target, combo)),
      };
      const validTime = Number.isFinite(elapsedMs) && elapsedMs > 0;
      const bestTimeMs = Math.min(
        previous?.bestTimeMs ?? Infinity,
        validTime ? elapsedMs : Infinity,
      );
      if (Number.isFinite(bestTimeMs)) this.records[id].bestTimeMs = bestTimeMs;
      const rewards = [];
      for (const [source, tier] of [
        ['score', getChestTier(score, target)],
        ['speed', getSpeedChestTier(elapsedMs, speedTargetMs)],
      ]) {
        if (!tier) continue;
        const drop = rollChestPower();
        this.powers.find((power) => power.id === drop.id).quantity++;
        rewards.push({ ...tier, count: 1, source, items: [{ id: drop.id, label: drop.label }] });
      }
      // Progress and earned powers are saved together before the chest reveal.
      this.save();
      return rewards;
    },
  },
});
