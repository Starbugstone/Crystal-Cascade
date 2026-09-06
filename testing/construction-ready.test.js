import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { createTown } from '../src/data/town';
import { purchasePrice } from '../src/data/economy';
import { SHOP_ITEMS } from '../src/data/shop';
import {
  advanceConstruction,
  availablePurchases,
  constructionReady,
  finishConstruction,
  normalizeTown,
  purchase,
  HOUR_MS,
  saloonIncomeRate,
} from '../src/game/town/TownRules';
import { useCampaignStore } from '../src/stores/campaignStore';

beforeEach(() => {
  const saves = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (key) => saves.get(key) ?? null,
    setItem: (key, value) => saves.set(key, value),
  });
  setActivePinia(createPinia());
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('keeps funded scaffolding through wins and reloads, until each building is opened once', () => {
  let town = purchase(createTown(), 'museum', 0);
  expect(finishConstruction(town, 'museum', 1)).toBeNull();
  town = advanceConstruction(town);
  expect(constructionReady(town.projects.museum)).toBe(true);
  expect(town.buildings.museum).toBe(0);
  expect(town.constructionTipSeen).toBe(false);
  town = normalizeTown(JSON.parse(JSON.stringify(advanceConstruction(town))));
  expect(town.projects.museum.wins).toBe(1);
  expect(finishConstruction(town, 'museum', 2)).toBeNull();
  town = finishConstruction(town, 'museum', 1);
  expect(town.buildings.museum).toBe(1);
  expect(town.projects).toEqual({});
  expect(town.constructionTipSeen).toBe(true);
  expect(finishConstruction(town, 'museum', 1)).toBeNull();
  expect(normalizeTown(town).constructionTipSeen).toBe(true);
});

it('settles old saloon income before opening an upgrade and persists the new benefit', () => {
  let campaign = useCampaignStore();
  campaign.town = {
    ...createTown(),
    coins: 1000,
    buildings: { ...createTown().buildings, well: 1, farm: 1, home: 1, saloon: 1 },
  };
  vi.spyOn(Date, 'now').mockReturnValue(HOUR_MS);
  campaign.upgradeBuilding('saloon', 1);
  const fundedCoins = campaign.town.coins;
  const oldRate = saloonIncomeRate(campaign.town);
  campaign.town = advanceConstruction(campaign.town);
  Date.now.mockReturnValue(HOUR_MS * 2);
  expect(campaign.finishConstruction('saloon', 2)).toBe(true);
  expect(campaign.town.coins).toBe(fundedCoins);
  expect(campaign.town.income.stored).toBe(oldRate);
  const newRate = saloonIncomeRate(campaign.town);
  expect(newRate).toBeGreaterThan(oldRate);
  expect(campaign.finishConstruction('saloon', 2)).toBe(false);
  setActivePinia(createPinia());
  campaign = useCampaignStore();
  expect(campaign.town.buildings.saloon).toBe(2);
  expect(campaign.town.constructionTipSeen).toBe(true);
  expect(campaign.collectSaloonIncome(HOUR_MS * 3)).toBe(oldRate + newRate);
});

it('raises coin prices by half while preserving the free first project and old funded work', () => {
  expect([0, 1, 40, 50, 60, 140].map(purchasePrice)).toEqual([0, 2, 60, 75, 90, 210]);
  expect(SHOP_ITEMS.map((item) => item.price)).toEqual([60, 90, 90, 60, 90]);
  const free = purchase(createTown(), 'home', 0);
  expect(free.coins).toBe(0);
  const funded = purchase({ ...free, coins: 75 }, 'farm', 0);
  expect(funded.coins).toBe(0);
  expect(funded.buildings.farm).toBe(1);
  const oldWork = normalizeTown({
    ...free,
    coins: 3,
    projects: { museum: { id: 'museum', stage: 1, wins: 1, required: 1 } },
  });
  expect(finishConstruction(oldWork, 'museum', 1).coins).toBe(3);
});

it('lists only affordable eligible purchases, or all eligible work when a builder hammer is owned', () => {
  const fresh = createTown();
  expect(availablePurchases(fresh).every(({ offer }) => offer.cost === 0)).toBe(true);
  let town = purchase(fresh, 'home', 0);
  expect(availablePurchases(town)).toEqual([]);
  town.coins = 75;
  expect(
    availablePurchases(town)
      .map(({ id }) => id)
      .sort(),
  ).toEqual(['farm', 'well']);
  const hammerChoices = availablePurchases(town, 1).map(({ id }) => id);
  expect(hammerChoices).toContain('home');
  expect(hammerChoices).toContain('museum');
  expect(hammerChoices).not.toContain('home2');
  town.buildings.home = 3; // Next tier is locked until 18 completed runs.
  town.projects.museum = { id: 'museum', stage: 1, required: 1, wins: 1 };
  town.buildings.farm = 5;
  const choices = availablePurchases(town, 1).map(({ id }) => id);
  expect(choices).not.toContain('home');
  expect(choices).not.toContain('museum');
  expect(choices).not.toContain('farm');
  expect(choices).toContain('well');
});
