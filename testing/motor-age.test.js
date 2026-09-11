import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { BUILDINGS, BANDIT_EVENT, createTown } from '../src/data/town';
import { bonusCapacity } from '../src/data/rewards';
import { hasElectricity } from '../src/data/industrial';
import { MOTOR_AGE_LEVEL_PRICES } from '../src/data/motorAge';
import {
  advanceEra,
  eraBuildingLevel,
  eraGate,
  isEraComplete,
  plotInEra,
} from '../src/game/town/TownEras';
import {
  advanceConstruction,
  buildWithHammer,
  finishConstruction,
  normalizeTown,
  purchase,
  upgradeOffer,
  waterCapacity,
  foodCapacity,
  housingCapacity,
  visitorCapacity,
  saloonIncomeRate,
  raidForecast,
  banditEncounter,
  nextGoal,
} from '../src/game/town/TownRules';
import { buildingBenefit } from '../src/game/town/TownBenefits';
import { useCampaignStore, SAVE_KEY } from '../src/stores/campaignStore';
import { visiblePlots, plotStreet, routeBetween } from '../src/game/town/TownLayout';
function electricTown() {
  const town = createTown();
  Object.assign(town, {
    era: 'industrial',
    coins: 1000000,
    completedRuns: 120,
    firstLightsSeen: true,
    tourSeen: true,
  });
  for (const b of BUILDINGS.filter((b) => plotInEra(town, b.id))) {
    town.buildings[b.id] = b.upgrades.length;
    town.buildingEras[b.id] = 'industrial';
    town.buildingEraLevels[b.id] = 3;
  }
  return normalizeTown(town);
}
function motorTown() {
  const town = advanceEra(electricTown(), 'industrial');
  town.transition.pending = false;
  return town;
}
function finishEra(town) {
  for (const b of [...BUILDINGS].sort(
    (a, b) => Number(a.introducedEra !== town.era) - Number(b.introducedEra !== town.era),
  )) {
    let offer;
    while ((offer = upgradeOffer(town, b.id))?.available)
      town = buildWithHammer(town, b.id, offer.stage);
  }
  return town;
}
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

describe('Motor Age follows the complete Electric era', () => {
  it.each(BUILDINGS.filter((b) => b.introducedEra !== 'motor-age').map((b) => [b.id]))(
    'requires the final electric improvement on %s',
    (id) => {
      const town = electricTown();
      expect(eraGate(town)).toMatchObject({ available: true, next: { id: 'motor-age' } });
      if (BUILDINGS.find((b) => b.id === id).introducedEra === 'industrial') town.buildings[id] = 2;
      else town.buildingEraLevels[id] = 2;
      expect(advanceEra(town, 'industrial')).toBeNull();
    },
  );
  it('saves the fourth era and its transition, preserving electricity and all services across reload', () => {
    let c = useCampaignStore();
    c.town = electricTown();
    const old = JSON.parse(JSON.stringify(c.town));
    expect(c.advanceEra('industrial')).toBe(true);
    expect(c.town.buildings).toEqual(old.buildings);
    expect(c.town.buildingEras).toEqual(old.buildingEras);
    for (const read of [
      waterCapacity,
      foodCapacity,
      housingCapacity,
      visitorCapacity,
      bonusCapacity,
      saloonIncomeRate,
    ])
      expect(read(c.town)).toBe(read(old));
    expect(hasElectricity(c.town)).toBe(true);
    setActivePinia(createPinia());
    c = useCampaignStore();
    expect(c.town.transition).toMatchObject({ from: 'industrial', to: 'motor-age', pending: true });
    const save = vi.spyOn(c, 'save').mockReturnValue(false);
    expect(c.acknowledgeEra()).toBe(false);
    expect(c.town.transition.pending).toBe(true);
    save.mockRestore();
    expect(c.acknowledgeEra()).toBe(true);
    expect(JSON.parse(saves.get(SAVE_KEY)).town.eraTransitionSeen['motor-age']).toBe(true);
    expect(c.advanceEra('industrial')).toBe(false);
  });
  it.each(BUILDINGS.map((b) => [b.id]))(
    'finishes all three Motor Age tiers of %s without losing functional services or paid work',
    (id) => {
      let town = motorTown();
      // New service prerequisites are completed through real building commands.
      if (id === 'busDepot' || id === 'diner') town = buildWithHammer(town, 'garage', 0);
      if (id === 'diner') town = buildWithHammer(town, 'busDepot', 0);
      const base = town.buildings[id];
      for (let level = 1; level <= 3; level++) {
        const offer = upgradeOffer(town, id);
        expect(offer.available).toBe(true);
        expect(offer.runs).toBeLessThanOrEqual(2);
        expect(offer.cost).toBe(
          base ? MOTOR_AGE_LEVEL_PRICES[level - 1] : [6480, 9000, 11880][level - 1],
        );
        const preview = buildingBenefit(
          town,
          id,
          level,
          offer.type === 'modernization' ? offer : false,
        );
        const beforeWater = waterCapacity(town),
          beforeFood = foodCapacity(town);
        town = purchase(town, id, offer.stage);
        const paid = town.coins;
        town = normalizeTown(town);
        if (offer.type === 'modernization') expect(town.projects[id].cost).toBe(offer.cost);
        expect(town.projects[id].stage).toBe(offer.type === 'modernization' ? offer.stage : level);
        expect(town.coins).toBe(paid);
        expect(waterCapacity(town)).toBe(beforeWater);
        expect(foodCapacity(town)).toBe(beforeFood);
        expect(purchase(town, id, offer.stage)).toBeNull();
        town = finishConstruction(
          advanceConstruction(advanceConstruction(town)),
          id,
          town.projects[id].stage,
        );
        town = normalizeTown(town);
        expect(eraBuildingLevel(town, id)).toBe(level);
        if (offer.type === 'modernization') expect(town.buildings[id]).toBe(base);
        expect(buildWithHammer(town, id, offer.stage)).toBeNull();
        expect(waterCapacity(town)).toBeGreaterThanOrEqual(beforeWater);
        expect(foodCapacity(town)).toBeGreaterThanOrEqual(beforeFood);
        if (id === 'well' && level === 3)
          expect(preview).toMatchObject({ before: 120, after: 140 });
        if (id === 'garage') expect(bonusCapacity(town)).toBe(20 + level * 2);
        if (id === 'busDepot')
          expect(visitorCapacity(town)).toBe(visitorCapacity(motorTown()) + level * 2);
        if (id === 'gardenCourt')
          expect(housingCapacity(town)).toBe(housingCapacity(motorTown()) + level * 6);
        if (id === 'diner')
          expect(saloonIncomeRate(town)).toBeGreaterThan(saloonIncomeRate(motorTown()));
      }
      expect(upgradeOffer(town, id)).toBeNull();
    },
  );
  it('requires all 117 improvements, keeps future eras unavailable, and supplies the expanded town', () => {
    const complete = finishEra(motorTown());
    expect(isEraComplete(complete)).toBe(true);
    expect(BUILDINGS.reduce((sum, b) => sum + eraBuildingLevel(complete, b.id), 0)).toBe(117);
    expect(eraGate(complete)).toMatchObject({
      available: false,
      next: { id: 'post-war', enabled: false },
    });
    expect(advanceEra(complete, 'motor-age')).toBeNull();
    expect(nextGoal(complete)).toBeNull();
    const demand = housingCapacity(complete) + visitorCapacity(complete);
    expect(waterCapacity(complete)).toBeGreaterThanOrEqual(demand);
    expect(foodCapacity(complete)).toBeGreaterThanOrEqual(demand);
    for (const b of BUILDINGS) {
      const unfinished = structuredClone(complete);
      if (b.introducedEra === 'motor-age') unfinished.buildings[b.id] = 2;
      else unfinished.buildingEraLevels[b.id] = 2;
      expect(isEraComplete(unfinished), b.id).toBe(false);
    }
  });
  it('reveals four connected new plots only in Motor Age', () => {
    const before = visiblePlots(electricTown()).map((p) => p.id);
    const town = finishEra(motorTown()),
      after = visiblePlots(town).map((p) => p.id);
    for (const id of ['garage', 'busDepot', 'gardenCourt', 'diner']) {
      expect(before).not.toContain(id);
      expect(after).toContain(id);
      expect(routeBetween(town, plotStreet(id), plotStreet('sheriff')).length).toBeGreaterThan(1);
    }
  });
  it('carries brigade protection into Motor Age and shows old event kinds honestly', () => {
    const town = motorTown();
    town.nextRaidRun = town.completedRuns;
    const after = banditEncounter(town, () => 0);
    expect(after.events[BANDIT_EVENT]).toMatchObject({
      kind: 'workshop-fire',
      loss: 0,
      outcome: 'protected',
    });
    expect(raidForecast(after)).toMatchObject({ kind: 'workshop-fire', protection: 1 });
    delete after.events[BANDIT_EVENT].kind;
    after.buildings.sheriff = 0;
    after.buildings.bank = 0;
    expect(raidForecast(after)).toMatchObject({ kind: 'bandits', protection: 0 });
  });
  it('continues a 120-level save at 121, pays the four new chapter gifts once, and ends at 144', () => {
    const records = Object.fromEntries(
      Array.from({ length: 120 }, (_, i) => [i + 1, { score: 100, stars: 1 }]),
    );
    saves.set(SAVE_KEY, JSON.stringify({ schemaVersion: 2, records, town: electricTown() }));
    setActivePinia(createPinia());
    let c = useCampaignStore();
    expect(c.nextLevel).toBe(121);
    for (let id = 121; id <= 144; id++) {
      expect(c.isUnlocked(id)).toBe(true);
      const runId = c.beginRun('normal', id);
      const chests = c.recordVictory({ id, score: 1, target: 10000, combo: 1, runId });
      expect(chests).toHaveLength(1);
      if (id % 6 === 0) expect(c.lastChapterReward.chapter).toBe(id / 6);
      else expect(c.lastChapterReward).toBeNull();
    }
    c.save();
    setActivePinia(createPinia());
    c = useCampaignStore();
    expect(c.completedCount).toBe(144);
    expect(c.isUnlocked(145)).toBe(false);
    expect(c.nextLevel).toBe(144);
  });
});

it('guides a growing Motor Age town toward water and new services before cosmetic defenses', () => {
  const town = motorTown();
  expect(nextGoal(town).id).toBe('garage');
  town.buildings.busDepot = 3;
  town.buildings.gardenCourt = 3;
  expect(nextGoal(town).id).toBe('well');
  const waterProject = purchase(town, 'well', upgradeOffer(town, 'well').stage);
  expect(nextGoal(waterProject).id).toBe('garage');
  expect(nextGoal(finishEra(town))).toBeNull();
});
