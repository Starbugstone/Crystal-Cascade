import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useCampaignStore, SAVE_KEY } from '../src/stores/campaignStore';
import { MAX_SAVE_FILE_BYTES, parseSaveFile } from '../src/services/saveTransfer';

let saved;
beforeEach(() => {
  saved = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (key) => saved.get(key) ?? null,
    setItem: (key, value) => saved.set(key, value),
  });
  setActivePinia(createPinia());
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it('exports live progress and restores it on a fresh device and after reload', () => {
  const campaign = useCampaignStore();
  campaign.records[1] = { score: 12345, stars: 3, bestTimeMs: 54000 };
  campaign.continuousRecords[1] = { coins: 20, score: 5000 };
  campaign.town.coins = 1234;
  campaign.town.buildings.saloon = 1;
  campaign.town.buildings.shop = 1;
  campaign.town.tourSeen = true;
  campaign.town.projects.bank = { id: 'bank', stage: 1, wins: 0, required: 1 };
  campaign.powers[0].quantity = 2;
  campaign.builderHammers = 1;
  campaign.shopStock = [{ id: 'tnt', sold: true }];
  campaign.shopVisit = 3;
  campaign.seenObstacles = ['stone'];
  campaign.chestsWithoutBuilderHammer = 4;
  campaign.issuedRun = 5;
  campaign.settledRun = 5;
  const text = campaign.exportSave();
  expect(saved.has(SAVE_KEY)).toBe(false);
  const expected = parseSaveFile(text);
  setActivePinia(createPinia());
  const fresh = useCampaignStore();
  fresh.records[2] = { score: 20, stars: 1 };
  fresh.importSave(text);
  expect(fresh.nextLevel).toBe(2);
  expect(fresh.records[2]).toBeUndefined();
  expect(parseSaveFile(fresh.exportSave())).toEqual(expected);
  setActivePinia(createPinia());
  expect(parseSaveFile(useCampaignStore().exportSave())).toEqual(expected);
});

it.each(['{broken', 'null', '[]', '{}', '{"town":{"coins":5}}'])(
  'rejects invalid JSON or unrelated data without changing progress: %s',
  (text) => {
    const campaign = useCampaignStore();
    campaign.town.coins = 99;
    campaign.save();
    const before = saved.get(SAVE_KEY);
    expect(() => campaign.importSave(text)).toThrow();
    expect(campaign.town.coins).toBe(99);
    expect(saved.get(SAVE_KEY)).toBe(before);
  },
);

it.each([
  (file) => {
    file.version = 2;
  },
  (file) => {
    file.format = 'crystal-cascade-profile-v2';
  },
  (file) => {
    file.profile.schemaVersion = 3;
  },
  (file) => {
    file.profile.town = {};
  },
  (file) => {
    file.profile.powers = {};
  },
  (file) => {
    file.profile.records = { 1: null };
  },
])('rejects incompatible or malformed save contents', (change) => {
  const campaign = useCampaignStore();
  campaign.town.coins = 55;
  campaign.save();
  const before = saved.get(SAVE_KEY);
  const file = JSON.parse(campaign.exportSave());
  change(file);
  expect(() => campaign.importSave(JSON.stringify(file))).toThrow();
  expect(campaign.town.coins).toBe(55);
  expect(saved.get(SAVE_KEY)).toBe(before);
});

it('keeps the current live and stored progress when importing cannot write to storage', () => {
  const campaign = useCampaignStore();
  const backup = campaign.exportSave();
  campaign.town.coins = 99;
  campaign.save();
  const before = saved.get(SAVE_KEY);
  vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
    throw new Error('Quota exceeded');
  });
  expect(() => campaign.importSave(backup)).toThrow('Your current progress has not changed');
  expect(campaign.town.coins).toBe(99);
  expect(saved.get(SAVE_KEY)).toBe(before);
  expect(parseSaveFile(campaign.exportSave()).town.coins).toBe(99);
});

it('recovers pending chest rewards exactly once during import', () => {
  const campaign = useCampaignStore();
  campaign.issuedRun = 1;
  campaign.settledRun = 1;
  campaign.pendingChests = [{ runId: 1, source: 'completion', levelId: 1, items: [{ id: 'tnt' }] }];
  const backup = campaign.exportSave();
  campaign.importSave(backup);
  expect(campaign.pendingChests).toEqual([]);
  expect(campaign.powers.find((power) => power.id === 'tnt').quantity).toBe(1);
  setActivePinia(createPinia());
  expect(useCampaignStore().powers.find((power) => power.id === 'tnt').quantity).toBe(1);
});

it('accepts a UTF-8 BOM and rejects oversized files', () => {
  expect(parseSaveFile('\uFEFF' + useCampaignStore().exportSave()).schemaVersion).toBe(2);
  expect(() => parseSaveFile(' '.repeat(MAX_SAVE_FILE_BYTES + 1))).toThrow();
});
