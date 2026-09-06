import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { BUILDINGS, BANDIT_EVENT, createTown } from '../src/data/town';
import {
  normalizeTown,
  purchase,
  advanceConstruction,
  plotUnlocked,
  population,
  gangSize,
  raidReady,
  banditEncounter,
  saloonIncomeRate,
  settleSaloonIncome,
  HOUR_MS,
  roadLevel,
  residentPopulation,
  visitorPopulation,
  visitorCapacity,
  happiness,
  upgradeOffer,
  buildWithHammer,
} from '../src/game/town/TownRules';
import { bonusCapacity } from '../src/data/rewards';
import { rollShopStock } from '../src/data/shop';
import { useCampaignStore } from '../src/stores/campaignStore';
import { SAVE_KEY } from '../src/services/localProfile';

const village = (levels = {}) => ({
  ...createTown(),
  coins: 600,
  buildings: { ...createTown().buildings, well: 1, farm: 1, home: 1, ...levels },
});
let saves;
beforeEach(() => {
  saves = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (k) => saves.get(k) ?? null,
    setItem: (k, v) => saves.set(k, v),
  });
  setActivePinia(createPinia());
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Five levels and a growing frontier', () => {
  it('opens extra plots only after the matching original improvement is complete', () => {
    for (const { id, unlock } of BUILDINGS.filter((b) => b.unlock)) {
      let town = village();
      expect(plotUnlocked(town, id)).toBe(false);
      expect(purchase(town, id, 0)).toBeNull();
      town = purchase(town, unlock.id, 1);
      while (town.projects[unlock.id]) {
        expect(plotUnlocked(town, id)).toBe(false);
        town = advanceConstruction(town);
      }
      expect(plotUnlocked(town, id)).toBe(true);
      expect(purchase(town, id, 0)?.buildings[id]).toBe(1);
    }
  });
  it('caps every building at level five and preserves existing benefits during improvements', () => {
    for (const building of BUILDINGS) {
      expect(building.upgrades).toHaveLength(5);
      const town = village(Object.fromEntries(BUILDINGS.map((b) => [b.id, 5])));
      expect(purchase(town, building.id, 5)).toBeNull();
    }
    let town = village({ saloon: 1, home: 2 });
    expect(saloonIncomeRate(town)).toBe(17);
    town = purchase(town, 'saloon', 1);
    while (town.projects.saloon) {
      expect(saloonIncomeRate(town)).toBe(17);
      town = advanceConstruction(town);
    }
    expect(saloonIncomeRate(town)).toBe(34);
  });
  it('uses shared food and water capacity for the expanding residential neighborhood', () => {
    const town = village({ home: 3, home2: 3, home3: 3, home4: 3 });
    expect(population(town)).toBe(6);
    town.buildings.well = town.buildings.farm = 3;
    expect(population(town)).toBe(18);
    town.buildings.well2 = town.buildings.farm2 = 1;
    expect(population(town)).toBe(24);
    expect(roadLevel(createTown())).toBe(0);
    expect(roadLevel(village())).toBe(1);
    expect(roadLevel(town)).toBeGreaterThan(1);
  });
});

describe('Modest saloon income without a collection chore', () => {
  it('starts the clock without retroactive income, then preserves fractional earnings across saves', () => {
    const start = settleSaloonIncome(village({ saloon: 1 }), HOUR_MS);
    expect(start.earned).toBe(0);
    let town = start.town,
      earned = 0;
    for (let minute = 1; minute <= 60; minute++) {
      const result = settleSaloonIncome(normalizeTown(town), HOUR_MS + minute * 60000);
      town = result.town;
      earned += result.earned;
    }
    expect(earned).toBe(8);
    expect(town.income.remainder).toBe(0);
    expect(settleSaloonIncome(town, HOUR_MS * 2).earned).toBe(0);
  });
  it('scales with completed saloon levels and houses; needs customers and stops at eight away hours', () => {
    const town = village({ saloon: 3, home: 2, home2: 1, home3: 1, home4: 1 });
    town.projects.home4 = { id: 'home4', stage: 2, wins: 0, required: 4 };
    expect(saloonIncomeRate(town)).toBe(70);
    const start = settleSaloonIncome(town, HOUR_MS).town;
    const collected = settleSaloonIncome(start, HOUR_MS * 101);
    expect(collected.earned).toBe(560);
    expect(settleSaloonIncome(collected.town, HOUR_MS * 101).earned).toBe(0);
    expect(settleSaloonIncome(collected.town, HOUR_MS * 102).earned).toBe(70);
    expect(saloonIncomeRate(village({ farm: 0, saloon: 3 }))).toBe(0);
    expect(saloonIncomeRate(village({ home: 0, saloon: 1 }))).toBe(0);
  });
  it('does not double-credit clock rollback and rejects invalid clock/checkpoint values', () => {
    const town = settleSaloonIncome(village({ saloon: 1 }), HOUR_MS * 2).town;
    for (const time of [HOUR_MS, NaN, Infinity, -1, 1.2])
      expect(settleSaloonIncome(town, time).town).toBe(town);
    expect(settleSaloonIncome(town, HOUR_MS * 3).earned).toBe(8);
    expect(normalizeTown({ income: { at: -1, remainder: 999999999 } }).income).toEqual({
      at: null,
      remainder: 0,
    });
  });
  it('settles the old rate before a free hammer upgrade and reloads without paying twice', () => {
    const campaign = useCampaignStore();
    campaign.town = village({ saloon: 1 });
    vi.spyOn(Date, 'now').mockReturnValue(HOUR_MS);
    campaign.collectSaloonIncome();
    campaign.builderHammers = 1;
    Date.now.mockReturnValue(HOUR_MS * 2);
    expect(campaign.useBuilderHammer('saloon', 1)).toBe(true);
    expect(campaign.town.coins).toBe(608); // Free upgrade plus 8 coins at the old rate
    expect(campaign.town.buildings.saloon).toBe(2);
    setActivePinia(createPinia());
    const reloaded = useCampaignStore();
    expect(reloaded.collectSaloonIncome()).toBe(0);
    expect(reloaded.collectSaloonIncome(HOUR_MS * 3)).toBe(17);
  });
});

describe('A useful square and a longer village economy', () => {
  it('connects visitors, basic needs, happiness, and saloon spending', () => {
    const town = village({ saloon: 1 });
    expect(residentPopulation(town)).toBe(2);
    expect(saloonIncomeRate(town)).toBe(8);
    town.buildings.stable = 1;
    expect(visitorPopulation(town)).toBe(2);
    expect(population(town)).toBe(4);
    expect(saloonIncomeRate(town)).toBe(17);
    town.buildings.square = 1;
    expect(happiness(town)).toBe(50);
    expect(saloonIncomeRate(town)).toBe(18);
    town.buildings.museum = 2;
    expect(visitorCapacity(town)).toBe(4);
    expect(visitorPopulation(town)).toBe(4);
    expect(saloonIncomeRate(town)).toBe(27);
    town.buildings.home = 3;
    expect(residentPopulation(town)).toBe(6);
    expect(visitorPopulation(town)).toBe(0);
    expect(happiness(town)).toBe(38);
    town.buildings.well = town.buildings.farm = 2;
    expect(visitorPopulation(town)).toBe(4);
    expect(happiness(town)).toBe(54);
    expect(saloonIncomeRate(town)).toBe(46);
  });
  it('settles existing visitors and happiness before a square changes the income rate', () => {
    const campaign = useCampaignStore();
    campaign.town = village({ saloon: 1, stable: 1 });
    campaign.builderHammers = 1;
    vi.spyOn(Date, 'now').mockReturnValue(HOUR_MS);
    campaign.collectSaloonIncome();
    Date.now.mockReturnValue(HOUR_MS * 2);
    expect(campaign.useBuilderHammer('square', 0)).toBe(true);
    expect(campaign.town.coins).toBe(617);
    setActivePinia(createPinia());
    const reloaded = useCampaignStore();
    expect(reloaded.collectSaloonIncome()).toBe(0);
    expect(reloaded.collectSaloonIncome(HOUR_MS * 3)).toBe(18);
    expect(happiness(reloaded.town)).toBe(50);
  });
  it('unlocks the fourth and fifth levels after 18 and 36 completed puzzles for either payment', () => {
    for (const { id } of BUILDINGS) {
      let town = {
        ...village(Object.fromEntries(BUILDINGS.map((b) => [b.id, 3]))),
        coins: 10000,
        completedRuns: 17,
      };
      expect(upgradeOffer(town, id).available).toBe(false);
      expect(purchase(town, id, 3)).toBeNull();
      expect(buildWithHammer(town, id, 3)).toBeNull();
      town.completedRuns = 18;
      expect(purchase(town, id, 3).projects[id]).toMatchObject({ stage: 4, required: 1 });
      town = buildWithHammer(town, id, 3);
      expect(town.buildings[id]).toBe(4);
      expect(town.coins).toBe(10000);
      expect(buildWithHammer(town, id, 4)).toBeNull();
      town.completedRuns = 36;
      town = buildWithHammer(town, id, 4);
      expect(town.buildings[id]).toBe(5);
      expect(normalizeTown(town).buildings[id]).toBe(5);
      expect(upgradeOffer(town, id)).toBeNull();
    }
  });
  it('supports a mature village with meaningful services at every final tier', () => {
    const town = village(Object.fromEntries(BUILDINGS.map((b) => [b.id, 5])));
    expect(residentPopulation(town)).toBe(40);
    expect(visitorPopulation(town)).toBe(18);
    expect(happiness(town)).toBe(100);
    expect(saloonIncomeRate(town)).toBe(1740);
    expect(bonusCapacity(town)).toBe(20);
    expect(rollShopStock(5)).toHaveLength(6);
    expect(gangSize(town)).toBe(10);
    const raid = banditEncounter(town);
    expect(normalizeTown(raid).events[BANDIT_EVENT]).toMatchObject({
      outcome: 'protected',
      gangSize: 10,
      sheriffLevel: 5,
      bankLevel: 5,
    });
    town.buildings.sheriff = town.buildings.bank = 0;
    town.coins = 10000;
    expect(banditEncounter(town).events[BANDIT_EVENT].loss).toBe(30);
    expect(normalizeTown({ buildings: { home: 3, well: 3, farm: 3 } }).buildings.square).toBe(0);
  });
  it('quotes the next price while keeping locked plots out of the first-build discount', () => {
    const town = createTown();
    expect(upgradeOffer(town, 'well').cost).toBe(0);
    expect(upgradeOffer(town, 'well2')).toMatchObject({ cost: 50, available: false });
    town.buildings.well = 1;
    expect(upgradeOffer(town, 'well')).toMatchObject({ cost: 140, stage: 1, available: true });
  });
});

describe('Visible raids with a single saved outcome', () => {
  it.each([
    [1, 2],
    [2, 4],
    [3, 6],
  ])('scales gangs for developed towns and protects them at sheriff level %s', (level, riders) => {
    const town = village(Object.fromEntries(BUILDINGS.map((b) => [b.id, level])));
    // Keep the development bands independent of the two new plots.
    town.buildings.shop = 0;
    town.buildings.home4 = 0;
    town.buildings.square = 0;
    expect(gangSize(town)).toBe(riders);
    const result = banditEncounter(town);
    expect(result.events[BANDIT_EVENT]).toMatchObject({
      gangSize: riders,
      sheriffLevel: level,
      loss: 0,
      outcome: 'protected',
    });
    town.buildings.sheriff = Math.max(0, level - 1);
    const underprotected = banditEncounter(town);
    expect(underprotected.events[BANDIT_EVENT].loss).toBeGreaterThan(0);
  });
  it('retains current protection during sheriff work and never takes the final fifty coins', () => {
    let town = village(Object.fromEntries(BUILDINGS.map((b) => [b.id, 2])));
    town.buildings.shop = 0;
    town.buildings.home4 = 0;
    town.buildings.square = 0;
    town.buildings.sheriff = 1;
    town = purchase(town, 'sheriff', 1);
    expect(banditEncounter(town).events[BANDIT_EVENT]).toMatchObject({ sheriffLevel: 1, loss: 5 });
    town.coins = 53;
    expect(banditEncounter(town).coins).toBe(50);
    while (town.projects.sheriff) town = advanceConstruction(town);
    expect(banditEncounter(town).events[BANDIT_EVENT].outcome).toBe('protected');
  });
  it('saves before presenting, resumes an unseen raid after reload, and spaces raids by normal puzzle wins', () => {
    let campaign = useCampaignStore();
    campaign.town = village();
    expect(campaign.resolveBandits()).toBe(true);
    const snapshot = JSON.parse(saves.get(SAVE_KEY));
    expect(snapshot.town.events[BANDIT_EVENT].seen).toBe(false);
    expect(snapshot.town.coins).toBe(590);
    setActivePinia(createPinia());
    campaign = useCampaignStore();
    expect(campaign.resolveBandits()).toBe(false);
    expect(campaign.town.coins).toBe(590);
    expect(campaign.markRaidSeen(99)).toBe(false);
    expect(campaign.markRaidSeen(1)).toBe(true);
    expect(campaign.markRaidSeen(1)).toBe(false);
    campaign.town.completedRuns = 4;
    expect(raidReady(campaign.town)).toBe(false);
    campaign.town.completedRuns = 5;
    expect(raidReady(campaign.town)).toBe(true);
    expect(campaign.resolveBandits()).toBe(true);
    expect(campaign.town.events[BANDIT_EVENT].id).toBe(2);
    expect(campaign.town.coins).toBe(580);
  });
  it('migrates the original one-off event as already seen and resets all new progress', () => {
    const town = normalizeTown({
      ...village(),
      events: { [BANDIT_EVENT]: { outcome: 'protected', loss: 0 } },
    });
    expect(town.events[BANDIT_EVENT]).toMatchObject({ id: 1, seen: true, outcome: 'protected' });
    expect(raidReady(town)).toBe(false);
    const campaign = useCampaignStore();
    campaign.town = town;
    campaign.lastSaloonIncome = 12;
    campaign.resetProgress();
    setActivePinia(createPinia());
    expect(useCampaignStore().town).toEqual(createTown());
    expect(useCampaignStore().lastSaloonIncome).toBe(0);
  });
});
