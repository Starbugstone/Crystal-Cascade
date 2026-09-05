import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { BUILDINGS, BANDIT_EVENT, createTown } from '../src/data/town';
import {
  banditEncounter,
  miningPayout,
  nextGoal,
  normalizeTown,
  population,
  purchase,
} from '../src/game/town/TownRules';
import { SAVE_KEY, LEGACY_SAVE_KEY } from '../src/services/localProfile';
import { useCampaignStore } from '../src/stores/campaignStore';
import { useInventoryStore } from '../src/stores/inventoryStore';
import { useGameStore } from '../src/stores/gameStore';
import { TileManager } from '../src/game/engine/TileManager';
import { MatchEngine } from '../src/game/engine/MatchEngine';
import { createGem } from '../src/game/engine/GemFactory';

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
  useGameStore().cancelHint();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const victory = (runId, jewels = 90) => ({
  id: 1,
  score: 9000,
  target: 6000,
  combo: 1,
  elapsedMs: 10000,
  speedTargetMs: 60000,
  runId,
  jewels,
});
const settledTown = (coins = 200) => ({
  ...createTown(),
  coins,
  buildings: { ...createTown().buildings, well: 1, farm: 1, home: 1 },
});

describe('A small, reachable town', () => {
  it.each([
    [0, 50],
    [1, 50],
    [90, 95],
    [100, 100],
    [500000, 100],
    [-2, 50],
    [NaN, 50],
    [Infinity, 50],
  ])('pays %s jewels as %s coins', (gems, coins) => {
    expect(miningPayout(gems)).toBe(coins);
  });
  it('gets a family settled in three minimum-paying wins, then reaches every improvement', () => {
    let town = createTown();
    expect(population(town)).toBe(0);
    for (const id of ['well', 'farm', 'home']) {
      expect(nextGoal(town).id).toBe(id);
      town.coins += miningPayout(0);
      town = purchase(town, id, 0);
      expect(town.coins).toBe(0);
    }
    expect(population(town)).toBe(2);
    let runs = 3;
    while (nextGoal(town)) {
      const goal = nextGoal(town);
      town.coins += miningPayout(0);
      runs++;
      const next = purchase(town, goal.id, town.buildings[goal.id]);
      if (next) town = next;
      expect(runs).toBeLessThan(20);
    }
    expect(population(town)).toBe(4);
    BUILDINGS.forEach((building) =>
      expect(town.buildings[building.id]).toBe(building.upgrades.length),
    );
  });
  it('rejects locked, unknown, unaffordable, maxed and duplicate purchases without spending', () => {
    const town = createTown();
    expect(purchase(town, 'well', 0)).toBeNull();
    town.coins = 500;
    expect(purchase(town, 'home', 0)).toBeNull();
    expect(purchase(town, '__proto__', 0)).toBeNull();
    const repaired = purchase(town, 'well', 0);
    expect(purchase(repaired, 'well', 0)).toBeNull();
    expect(purchase(repaired, 'well', 1)).toBeNull();
    expect(town.coins).toBe(500);
    const family = settledTown(500);
    const biggerHome = purchase(family, 'home', 1);
    expect(biggerHome.coins).toBe(350);
    expect(purchase(biggerHome, 'home', 1)).toBeNull();
  });
  it('only counts households when basic needs are met', () => {
    const town = settledTown();
    town.buildings.well = 0;
    expect(population(town)).toBe(0);
  });
  it('warns through an optional event only after onboarding, caps loss, and preserves savings', () => {
    expect(banditEncounter(createTown())).toBeNull();
    for (const [coins, loss] of [
      [200, 10],
      [90, 9],
      [53, 3],
      [50, 0],
      [0, 0],
    ]) {
      const next = banditEncounter(settledTown(coins));
      expect(next.events[BANDIT_EVENT].loss).toBe(loss);
      expect(next.coins).toBe(coins - loss);
      expect(banditEncounter(next)).toBeNull();
    }
  });
  it('makes sheriff protection unconditional and cannot reroll saved outcomes', () => {
    const town = settledTown();
    town.buildings.sheriff = 1;
    const next = banditEncounter(town);
    expect(next.events[BANDIT_EVENT]).toEqual({ outcome: 'protected', loss: 0 });
    expect(next.coins).toBe(200);
    expect(banditEncounter(normalizeTown(JSON.parse(JSON.stringify(next))))).toBeNull();
  });
});

describe('Profile and reward integrity', () => {
  it('migrates a legacy campaign and inventory without touching its recovery copy', () => {
    const legacy = JSON.stringify({
      records: { 1: { score: 15000, stars: 3, bestTimeMs: 4321 } },
      powers: [{ id: 'hammer', quantity: 17 }],
    });
    saved.set(LEGACY_SAVE_KEY, legacy);
    const campaign = useCampaignStore();
    expect(campaign.records[1]).toEqual({ score: 15000, stars: 3, bestTimeMs: 4321 });
    expect(campaign.powers.find((power) => power.id === 'hammer').quantity).toBe(17);
    campaign.save();
    expect(saved.get(LEGACY_SAVE_KEY)).toBe(legacy);
    expect(JSON.parse(saved.get(SAVE_KEY)).schemaVersion).toBe(2);
    setActivePinia(createPinia());
    expect(useCampaignStore().nextLevel).toBe(2);
    expect(useCampaignStore().town.coins).toBe(0);
  });
  it('saves coins, chests, progress and settlement together; duplicate calls and reloads never pay twice', () => {
    const campaign = useCampaignStore();
    const id = campaign.beginRun();
    const rewards = campaign.recordVictory(victory(id));
    const checkpoint = JSON.parse(saved.get(SAVE_KEY));
    expect(checkpoint.town.coins).toBe(95);
    expect(checkpoint.settledRun).toBe(id);
    expect(checkpoint.powers.reduce((sum, power) => sum + power.quantity, 0)).toBe(17);
    expect(rewards).toHaveLength(2);
    expect(campaign.recordVictory(victory(id))).toEqual([]);
    expect(JSON.parse(saved.get(SAVE_KEY))).toEqual(checkpoint);
    setActivePinia(createPinia());
    const reloaded = useCampaignStore();
    expect(reloaded.recordVictory(victory(id))).toEqual([]);
    reloaded.recordVictory(victory(reloaded.beginRun()));
    expect(reloaded.town.coins).toBe(190);
  });
  it('rejects a replaced run and leaves power spending consistent with town purchases', () => {
    const campaign = useCampaignStore();
    const abandonedId = campaign.beginRun();
    const currentId = campaign.beginRun();
    expect(campaign.recordVictory(victory(abandonedId))).toEqual([]);
    expect(campaign.town.coins).toBe(0);
    campaign.recordVictory(victory(currentId));
    expect(campaign.upgradeBuilding('well', 0)).toBe(true);
    expect(campaign.upgradeBuilding('well', 0)).toBe(false);
    const hammerBefore = campaign.powers.find((power) => power.id === 'hammer').quantity;
    useInventoryStore().consumeItem('hammer');
    setActivePinia(createPinia());
    expect(useCampaignStore().town).toMatchObject({ coins: 45, buildings: { well: 1 } });
    expect(useCampaignStore().powers.find((power) => power.id === 'hammer').quantity).toBe(
      hammerBefore - 1,
    );
  });
  it('keeps a bandit result and its deduction in the same snapshot', () => {
    const campaign = useCampaignStore();
    campaign.town = settledTown(95);
    expect(campaign.resolveBandits()).toBe(true);
    setActivePinia(createPinia());
    const reloaded = useCampaignStore();
    expect(reloaded.town.coins).toBe(86);
    expect(reloaded.resolveBandits()).toBe(false);
    expect(reloaded.town.coins).toBe(86);
  });
  it('repairs malformed town fields without losing valid campaign records', () => {
    saved.set(
      SAVE_KEY,
      JSON.stringify({
        schemaVersion: 2,
        records: { 1: { stars: 2, score: 500 } },
        town: {
          coins: -15,
          buildings: { well: 99, farm: '1', home: 1 },
          events: { [BANDIT_EVENT]: { outcome: 'stolen', loss: -99 } },
        },
      }),
    );
    const campaign = useCampaignStore();
    expect(campaign.records[1].score).toBe(500);
    expect(campaign.town.coins).toBe(0);
    expect(campaign.town.buildings).toMatchObject({ well: 0, farm: 0, home: 1 });
    expect(campaign.town.events).toEqual({});
  });
  it('keeps gameplay usable and reports unavailable storage instead of claiming a save', () => {
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    const campaign = useCampaignStore();
    campaign.recordVictory(victory(campaign.beginRun()));
    expect(campaign.town.coins).toBe(95);
    expect(campaign.saveWarning).toContain('not saving');
    expect(campaign.upgradeBuilding('well', 0)).toBe(true);
  });
  it('does not overwrite a corrupt or future-version save', () => {
    for (const data of ['{broken', '{"schemaVersion":99,"town":{"coins":400}}']) {
      saved.set(SAVE_KEY, data);
      setActivePinia(createPinia());
      const campaign = useCampaignStore();
      campaign.beginRun();
      expect(campaign.saveWarning).toBeTruthy();
      expect(saved.get(SAVE_KEY)).toBe(data);
    }
  });
});

describe('Jewels come from real removals', () => {
  it('counts overlapping blast targets once and excludes specials, relics, barriers, frozen and chained jewels', () => {
    vi.spyOn(MatchEngine.prototype, 'findMatches').mockReturnValue([]);
    const board = [
      'ruby',
      'emerald',
      'bomb',
      'relic',
      null,
      'topaz',
      'sapphire',
      'bomb',
      'amethyst',
    ].map((type) => (type ? createGem(type) : null));
    const tiles = board.map(() => ({ type: 'standard', health: 0 }));
    tiles[4] = { type: 'blocker', health: 1 };
    tiles[5].chainHealth = 1;
    tiles[6].state = 'FROZEN';
    const result = new TileManager().getResolution({
      board,
      tiles,
      cols: 3,
      rows: 3,
      matches: [
        { type: 'hammer', indices: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
        { type: 'clear_row', indices: [0, 1, 2] },
      ],
      bonusesCreated: ['bomb'],
      bonusIndices: [7],
    });
    expect(result.steps[0].collectedJewels).toEqual(
      [board[0], board[1], board[8]].map(({ id, type }) => ({ id, type })),
    );
  });
  it('counts newly refilled jewels on later cascade steps, even in the same cells', () => {
    const matches = [{ type: 'ruby', indices: [0, 1, 2] }];
    vi.spyOn(MatchEngine.prototype, 'findMatches').mockReturnValueOnce(matches).mockReturnValue([]);
    const result = new TileManager().getResolution({
      board: Array.from({ length: 3 }, () => createGem('ruby')),
      tiles: [{}, {}, {}],
      cols: 3,
      rows: 1,
      matches,
    });
    const jewels = result.steps.flatMap((step) => step.collectedJewels ?? []);
    expect(jewels).toHaveLength(6);
    expect(new Set(jewels.map((gem) => gem.id)).size).toBe(6);
  });
  it('banks a real run only on completion and resets collection on replay or abandonment', async () => {
    const game = useGameStore(),
      campaign = useCampaignStore();
    game.bootstrap();
    game.startLevel(1);
    const move = new MatchEngine();
    let pair;
    for (let a = 0; a < game.board.length && !pair; a++)
      for (const b of [a + 1, a + game.boardCols]) {
        if (
          move.evaluateSwap(game.board, game.boardCols, game.boardRows, a, b, game.tiles).matches
            .length
        ) {
          pair = [a, b];
          break;
        }
      }
    expect(await game.resolveSwap(...pair)).toBe(true);
    expect(game.collectedJewels).toBeGreaterThan(0);
    expect(campaign.town.coins).toBe(0);
    const payout = miningPayout(game.collectedJewels);
    game.remainingLayers = 0;
    game.completeLevel();
    expect(game.coinReward).toBe(payout);
    expect(campaign.town.coins).toBe(payout);
    game.completeLevel();
    expect(campaign.town.coins).toBe(payout);
    game.startLevel(1);
    expect(game.collectedJewels).toBe(0);
    game.exitLevel();
    expect(campaign.town.coins).toBe(payout);
  });
});
