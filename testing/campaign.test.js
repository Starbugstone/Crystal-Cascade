import * as chestRewards from '../src/data/rewards';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { generateLevelConfigs } from '../src/game/engine/LevelGenerator';
import { useGameStore } from '../src/stores/gameStore';
import { useCampaignStore, SAVE_KEY } from '../src/stores/campaignStore';
import { useInventoryStore } from '../src/stores/inventoryStore';
import { getChestTier, rollChestPower } from '../src/data/campaign';

let saved;
beforeEach(() => {
  saved = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (key) => saved.get(key) ?? null,
    setItem: (key, value) => saved.set(key, value),
  });
  setActivePinia(createPinia());
  vi.spyOn(chestRewards, 'rollChestReward').mockReturnValue({
    id: 'coins',
    kind: 'coins',
    label: 'Coins',
    quantity: 25,
  });
});
afterEach(() => {
  useGameStore().cancelHint();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it('provides 36 levels with steadily increasing objectives and staged obstacles', () => {
  const levels = generateLevelConfigs(36);
  expect(levels).toHaveLength(36);
  levels.forEach((level, index) => {
    if (index > 0) {
      expect(level.objectives[0].target).toBeGreaterThan(levels[index - 1].objectives[0].target);
      expect(level.chestTarget).toBeGreaterThan(levels[index - 1].chestTarget);
    }
    expect(level.tiles.filter((tile) => tile.type === 'blocker').length > 0).toBe(level.id >= 7);
    expect(level.tiles.some((tile) => tile.type === 'blocker' && tile.health === 2)).toBe(
      level.id >= 19,
    );
    expect(level.tiles.some((tile) => tile.type === 'standard' && tile.health === 2)).toBe(
      level.id >= 13,
    );
    level.tiles.forEach((tile, i) => expect(level.board[i] === null).toBe(tile.type === 'blocker'));
  });
});
it('enforces sequential unlocks in the game action, saves completion and awards only once', () => {
  const game = useGameStore();
  const campaign = useCampaignStore();
  game.bootstrap();
  expect(game.startLevel(3)).toBe(false);
  expect(game.sessionActive).toBe(false);
  game.startLevel(1);
  game.score = 6000;
  game.completeLevel();
  expect(campaign.completedCount).toBe(0);
  game.remainingLayers = 0;
  game.completeLevel();
  expect(campaign.nextLevel).toBe(2);
  expect(game.levelRewards[0].items).toHaveLength(1);
  const powers = campaign.powers.reduce((sum, power) => sum + power.quantity, 0);
  game.completeLevel();
  expect(campaign.powers.reduce((sum, power) => sum + power.quantity, 0)).toBe(powers);
  setActivePinia(createPinia());
  expect(useCampaignStore().nextLevel).toBe(2);
  expect(useCampaignStore().powers.reduce((sum, power) => sum + power.quantity, 0)).toBe(powers);
});
it.each([
  [5999, 0],
  [6000, 1],
  [8999, 1],
  [9000, 1],
  [12000, 1],
])('awards the correct chest at score %i', (score, count) => {
  const campaign = useCampaignStore();
  const reward = campaign.recordVictory({ id: 1, score, target: 6000, combo: 1 });
  expect(reward[0]?.items.length ?? 0).toBe(count);
  expect(campaign.powers.reduce((sum, power) => sum + power.quantity, 0)).toBe(15);
  expect(campaign.town.coins).toBe(50 + count * 25);
  expect(getChestTier(score, 0)).toBeNull();
});
it('keeps the best score and stars on replay, and saves used powers', () => {
  const campaign = useCampaignStore();
  campaign.recordVictory({ id: 1, score: 12000, target: 6000, combo: 4 });
  campaign.recordVictory({ id: 1, score: 100, target: 6000, combo: 1 });
  expect(campaign.records[1]).toEqual({ score: 12000, stars: 3 });
  const inventory = useInventoryStore();
  const before = inventory.quickAccessSlots.find((power) => power.id === 'hammer').quantity;
  inventory.consumeItem('hammer');
  setActivePinia(createPinia());
  expect(useInventoryStore().quickAccessSlots.find((power) => power.id === 'hammer').quantity).toBe(
    before - 1,
  );
});
it('recovers from malformed saves and unavailable storage', () => {
  saved.set(SAVE_KEY, '{broken');
  expect(useCampaignStore().nextLevel).toBe(1);
  vi.stubGlobal('localStorage', {
    getItem: () => {
      throw new Error('blocked');
    },
    setItem: () => {
      throw new Error('blocked');
    },
  });
  setActivePinia(createPinia());
  expect(() =>
    useCampaignStore().recordVictory({ id: 1, score: 6000, target: 6000, combo: 1 }),
  ).not.toThrow();
});

it('gives Clear Row and Shuffle 35% each, and each other power 10%', () => {
  const counts = {};
  for (let i = 0; i < 100; i++) {
    const power = rollChestPower(() => (i + 0.5) / 100);
    counts[power.id] = (counts[power.id] ?? 0) + 1;
  }
  expect(counts).toEqual({
    'clear-row': 35,
    shuffle: 35,
    hammer: 10,
    'color-wand': 10,
    'tile-breaker': 10,
  });
  expect(rollChestPower(() => 0).id).toBe('clear-row');
  expect(rollChestPower(() => 0.999999).id).toBe('tile-breaker');
});
it('makes one weighted roll per earned chest and saves exactly those awards', () => {
  chestRewards.rollChestReward.mockRestore();
  const random = vi.spyOn(Math, 'random').mockReturnValueOnce(0.1).mockReturnValueOnce(0.7);
  const campaign = useCampaignStore();
  const rewards = campaign.recordVictory({
    id: 1,
    score: 999999,
    target: 6000,
    combo: 4,
    elapsedMs: 1,
    speedTargetMs: 60000,
  });
  expect(random).toHaveBeenCalledTimes(2);
  expect(rewards.map((reward) => reward.items)).toEqual([
    [{ id: 'coins', kind: 'coins', label: 'Coins', quantity: 10, convertedFrom: 'Clear Row' }],
    [{ id: 'coins', kind: 'coins', label: 'Coins', quantity: 25, overflowCoins: 0 }],
  ]);
  expect(rewards.every((reward) => reward.count === 1)).toBe(true);
  setActivePinia(createPinia());
  expect(useCampaignStore().powers.map((power) => power.quantity)).toEqual([3, 3, 3, 3, 3]);
});
