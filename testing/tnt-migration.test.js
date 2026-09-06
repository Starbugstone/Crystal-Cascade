import { afterEach, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { createTown } from '../src/data/town';
import { SAVE_KEY } from '../src/services/localProfile';
import { useCampaignStore } from '../src/stores/campaignStore';

afterEach(() => vi.unstubAllGlobals());

it('preserves old mine hammers, purchased shop stock and unopened chests as TNT across reloads', () => {
  const town = createTown();
  town.buildings.shop = 2;
  const saves = new Map([
    [
      SAVE_KEY,
      JSON.stringify({
        schemaVersion: 2,
        town,
        issuedRun: 1,
        settledRun: 1,
        builderHammers: 2,
        powers: [{ id: 'hammer', quantity: 1 }],
        shopStock: [{ id: 'hammer', sold: true }],
        pendingChests: [{ id: '1-score', source: 'score', runId: 1, items: [{ id: 'hammer' }] }],
      }),
    ],
  ]);
  vi.stubGlobal('localStorage', {
    getItem: (key) => saves.get(key) ?? null,
    setItem: (key, value) => saves.set(key, value),
  });
  for (let i = 0; i < 3; i++) {
    setActivePinia(createPinia());
    const campaign = useCampaignStore();
    expect(campaign.powers.find((p) => p.id === 'tnt')).toMatchObject({
      label: 'TNT',
      quantity: 2,
    });
    expect(campaign.powers.some((p) => p.id === 'hammer')).toBe(false);
    expect(campaign.shopStock).toContainEqual({ id: 'tnt', sold: true });
    expect(campaign.builderHammers).toBe(2);
    expect(campaign.pendingChests).toEqual([]);
    campaign.save();
  }
});
