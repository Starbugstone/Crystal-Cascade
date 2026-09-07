import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { chestCoinReward } from '../src/data/economy';
import { chestReward } from '../src/data/rewards';
import { SAVE_KEY, useCampaignStore } from '../src/stores/campaignStore';

let saves;
beforeEach(() => {
  saves = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (key) => saves.get(key) ?? null,
    setItem: (key, value) => saves.set(key, value),
  });
  setActivePinia(createPinia());
  vi.spyOn(Math, 'random').mockReturnValue(0.8);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it.each([
  [1, 500],
  [6, 500],
  [7, 1000],
  [31, 3000],
  [66, 5500],
  [67, 6000],
  [72, 6000],
])('awards %i-level chests %i coins', (level, coins) => {
  expect(chestCoinReward(level)).toBe(coins);
  expect(chestReward('coins', level).quantity).toBe(coins);
  expect(chestReward('tnt', level).quantity).toBe(1);
  expect(chestReward('builder-hammer', level).quantity).toBe(1);
});
function win(campaign, chooseRewards) {
  campaign.records = Object.fromEntries(
    Array.from({ length: 30 }, (_, i) => [i + 1, { score: 100, stars: 1 }]),
  );
  return campaign.recordVictory({
    id: 31,
    score: 2000,
    target: 1000,
    combo: 1,
    elapsedMs: 1000,
    speedTargetMs: 10000,
    chooseRewards,
  });
}
it.each(['automatic', 'tap', 'skip', 'reload'])(
  'preserves chapter payouts for both score and speed chests through %s',
  (route) => {
    const campaign = useCampaignStore();
    const rewards = win(campaign, route !== 'automatic');
    expect(rewards).toHaveLength(2);
    expect(rewards.every((chest) => chest.levelId === 31 && chest.items[0].quantity === 3000)).toBe(
      true,
    );
    if (route === 'tap') {
      // A later campaign state cannot change an already earned chest.
      campaign.records[31] = { score: 100, stars: 1 };
      for (const chest of rewards) {
        expect(campaign.claimChest(chest.id, 'coins').quantity).toBe(3000);
        expect(campaign.claimChest(chest.id, 'coins')).toBeNull();
      }
    }
    if (route === 'skip') campaign.settlePendingChests();
    setActivePinia(createPinia());
    expect(useCampaignStore().town.coins).toBe(6000);
    expect(useCampaignStore().pendingChests).toEqual([]);
    setActivePinia(createPinia());
    expect(useCampaignStore().town.coins).toBe(6000);
  },
);
it('scales a tapped coin even when the saved fallback was a power', () => {
  Math.random.mockReturnValue(0);
  const campaign = useCampaignStore();
  const rewards = win(campaign, true);
  expect(rewards[0].items[0].kind).toBe('power');
  expect(campaign.claimChest(rewards[0].id, 'coins').quantity).toBe(3000);
});
it.each([undefined, -1, 73, '31'])(
  'safely recovers older or invalid chest level metadata (%s)',
  (levelId) => {
    saves.set(
      SAVE_KEY,
      JSON.stringify({
        issuedRun: 1,
        settledRun: 1,
        pendingChests: [
          {
            id: '1-score',
            runId: 1,
            source: 'score',
            levelId,
            items: [{ id: 'coins', quantity: 999999 }],
          },
        ],
      }),
    );
    expect(useCampaignStore().town.coins).toBe(500);
    setActivePinia(createPinia());
    expect(useCampaignStore().town.coins).toBe(500);
  },
);
