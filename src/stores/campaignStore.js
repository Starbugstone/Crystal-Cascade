import { defineStore } from 'pinia';
import {
  LEVEL_COUNT,
  POWERS,
  getChestTier,
  getSpeedChestTier,
  getStars,
  rollChestPower,
} from '../data/campaign';

import { localProfile, SAVE_KEY } from '../services/localProfile';
import { createTown } from '../data/town';
import {
  normalizeTown,
  miningPayout,
  purchase,
  banditEncounter,
  advanceConstruction,
  projectRuns,
} from '../game/town/TownRules';
export { SAVE_KEY };

const defaults = () => ({
  records: {},
  town: createTown(),
  issuedRun: 0,
  settledRun: 0,
  saveWarning: '',
  readOnly: false,
  lastConstruction: [],
  powers: POWERS.map((power) => ({ ...power, quantity: 3 })),
});
const load = () => {
  const state = defaults();
  try {
    const loaded = localProfile.load();
    const saved = loaded.data;
    state.saveWarning = loaded.warning ?? '';
    state.readOnly = !!loaded.readOnly;
    state.town = normalizeTown(saved?.town);
    if (Number.isSafeInteger(saved?.issuedRun) && saved.issuedRun >= 0)
      state.issuedRun = saved.issuedRun;
    if (
      Number.isSafeInteger(saved?.settledRun) &&
      saved.settledRun >= 0 &&
      saved.settledRun <= state.issuedRun
    )
      state.settledRun = saved.settledRun;
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
      if (this.readOnly) return false;
      const saved = localProfile.save({
        schemaVersion: 2,
        records: this.records,
        powers: this.powers,
        town: this.town,
        issuedRun: this.issuedRun,
        settledRun: this.settledRun,
      });
      this.saveWarning = saved
        ? ''
        : 'Your progress is not saving. Keep this page open to continue.';
      return saved;
    },
    beginRun() {
      this.issuedRun += 1;
      this.save();
      return this.issuedRun;
    },
    resetProgress() {
      this.$patch((state) => Object.assign(state, defaults()));
      return this.save();
    },
    upgradeBuilding(id, expectedStage) {
      const next = purchase(this.town, id, expectedStage);
      if (!next) return false;
      this.town = next;
      this.save();
      return true;
    },
    resolveBandits() {
      const next = banditEncounter(this.town);
      if (!next) return false;
      this.town = next;
      this.save();
      return true;
    },
    recordVictory({ id, score, target, combo, elapsedMs, speedTargetMs, runId, jewels = 0 }) {
      if (!this.isUnlocked(id)) return [];
      // Older callers can settle a fresh run; the game always supplies its issued identity.
      if (runId == null) runId = ++this.issuedRun;
      if (runId !== this.issuedRun || runId <= this.settledRun) return [];
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
      this.town.coins = Math.min(Number.MAX_SAFE_INTEGER, this.town.coins + miningPayout(jewels));
      const projects = Object.values(this.town.projects);
      this.town = advanceConstruction(this.town);
      this.lastConstruction = projects.map((project) => ({
        id: project.id,
        stage: project.stage,
        wins: project.wins + 1,
        required: projectRuns(project.stage),
        complete: !this.town.projects[project.id],
      }));
      this.settledRun = runId;
      // Campaign, chest rewards, and town income move together before any reveal.
      this.save();
      return rewards;
    },
  },
});
