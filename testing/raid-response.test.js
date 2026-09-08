import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { createTown, BANDIT_EVENT } from '../src/data/town';
import {
  banditEncounter,
  normalizeTown,
  raidReady,
  scheduleRaid,
} from '../src/game/town/TownRules';
import { useCampaignStore, SAVE_KEY } from '../src/stores/campaignStore';

let saves;
beforeEach(() => {
  saves = new Map();
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
const village = () => ({
  ...createTown(),
  coins: 600,
  buildings: { ...createTown().buildings, home: 1, well: 1, farm: 1 },
});
const receipt = (c) => c.town.events[BANDIT_EVENT];
function raid() {
  const c = useCampaignStore();
  c.town = village();
  c.town.nextRaidRun = 0;
  for (const id of ['sheriff', 'bank'])
    c.town.projects[id] = { id, stage: 1, wins: 1, required: 1 };
  expect(c.resolveBandits()).toBe(true);
  expect(receipt(c).loss).toBe(10);
  return c;
}
it.each([
  ['sheriff', 'bank'],
  ['bank', 'sheriff'],
])(
  'applies %s and %s completed during a raid, refunding only the saved loss reduction',
  (first, second) => {
    let c = raid();
    const nextRaidRun = c.town.nextRaidRun;
    expect(c.finishConstruction(first, 1)).toBe(true);
    expect(c.town.coins).toBe(595);
    expect(receipt(c)).toMatchObject({ loss: 5, outcome: 'stolen', seen: false });
    expect(c.finishConstruction(first, 1)).toBe(false);
    setActivePinia(createPinia());
    c = useCampaignStore();
    expect(c.town.coins).toBe(595);
    expect(c.resolveBandits()).toBe(false);
    expect(c.finishConstruction(second, 1)).toBe(true);
    expect(c.town.coins).toBe(600);
    expect(c.town.nextRaidRun).toBe(nextRaidRun);
    expect(receipt(c)).toMatchObject({
      loss: 0,
      outcome: 'protected',
      sheriffLevel: 1,
      bankLevel: 1,
    });
    expect(c.markRaidSeen(1)).toBe(true);
    expect(c.markRaidSeen(1)).toBe(false);
    setActivePinia(createPinia());
    expect(useCampaignStore().town.coins).toBe(620);
  },
);
it('does not change a finished raid when defenses are completed later or the raid is replayed', () => {
  const c = raid();
  c.markRaidSeen(1);
  const before = { ...receipt(c) };
  c.finishConstruction('sheriff', 1);
  c.finishConstruction('bank', 1);
  expect(receipt(c)).toEqual(before);
  expect(c.town.coins).toBe(590);
});
it('does not refund more than the original loss when savings change during a raid', () => {
  const c = useCampaignStore();
  c.town = village();
  c.town.coins = 53;
  c.town.nextRaidRun = 0;
  c.resolveBandits();
  c.town.coins += 1000;
  c.builderHammers = 2;
  c.useBuilderHammer('sheriff', 0);
  expect(c.town.coins).toBe(1050); // Half protection still exposes more than the original three coins.
  c.useBuilderHammer('bank', 0);
  expect(c.town.coins).toBe(1053);
  expect(receipt(c).loss).toBe(0);
});
it('rolls back completion and refund together if saving fails', () => {
  const c = raid();
  vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
    throw Error('full');
  });
  expect(c.finishConstruction('sheriff', 1)).toBe(false);
  expect(c.town.buildings.sheriff).toBe(0);
  expect(c.town.projects.sheriff.wins).toBe(1);
  expect(c.town.coins).toBe(590);
  expect(receipt(c).loss).toBe(10);
});
it.each([
  ['frontier', 3, 7],
  ['river-rail', 6, 14],
])('varies the saved gap in %s from %i to %i normal completions', (era, min, max) => {
  const town = { ...village(), era, completedRuns: 20 };
  expect(scheduleRaid(town, () => 0).nextRaidRun).toBe(20 + min);
  expect(scheduleRaid(town, () => 0.99999).nextRaidRun).toBe(20 + max);
  const gaps = Array.from(
    { length: max - min + 1 },
    (_, i) => scheduleRaid(town, () => (i + 0.5) / (max - min + 1)).nextRaidRun - 20,
  );
  expect(new Set(gaps).size).toBe(max - min + 1);
});
it('persists the first random arrival and the next gap without rerolling on village visits or reload', () => {
  const random = vi.spyOn(Math, 'random').mockReturnValue(0.99999);
  let c = useCampaignStore();
  c.town = village();
  expect(c.resolveBandits()).toBe(false);
  expect(c.town.nextRaidRun).toBe(7);
  for (let i = 0; i < 3; i++) {
    expect(c.resolveBandits()).toBe(false);
    setActivePinia(createPinia());
    c = useCampaignStore();
  }
  expect(random).toHaveBeenCalledTimes(1);
  c.town.completedRuns = 6;
  expect(c.resolveBandits()).toBe(false);
  c.town.completedRuns = 7;
  random.mockReturnValue(0);
  expect(c.resolveBandits()).toBe(true);
  expect(c.town.nextRaidRun).toBe(10);
  expect(random).toHaveBeenCalledTimes(2);
  expect(JSON.parse(saves.get(SAVE_KEY)).town.nextRaidRun).toBe(10);
  c.town.completedRuns = 10;
  expect(raidReady(c.town)).toBe(false); // Finish the pending raid first.
  c.markRaidSeen(1);
  expect(raidReady(c.town)).toBe(true);
});
it('leaves an empty village unscheduled and migrates legacy receipts without a second deduction', () => {
  expect(scheduleRaid(createTown())).toEqual(createTown());
  const old = banditEncounter({ ...village(), nextRaidRun: 0 }, () => 0);
  delete old.nextRaidRun;
  const migrated = normalizeTown(old);
  expect(migrated.nextRaidRun).toBeNull();
  const scheduled = scheduleRaid(migrated, () => 0);
  expect(scheduled.coins).toBe(590);
  expect(scheduled.events[BANDIT_EVENT]).toEqual(migrated.events[BANDIT_EVENT]);
  expect(banditEncounter(scheduled)).toBeNull();
});
