import { t } from '../../i18n';
import { BUILDINGS, BUILDING_BY_ID, INTRO_ORDER, BANDIT_EVENT, createTown } from '../../data/town';
import {
  COMBO_COIN_STEP,
  MULTI_MATCH_COIN_STEP,
  matchRewardBreakdown,
} from '../engine/MatchRewards';

export const BONUS_GEM_COINS = 10;
const collectedCount = (value) => (Number.isSafeInteger(value) && value > 0 ? value : 0);
export const miningPayout = (jewels, bonusGems = 0, comboCounts = {}, multiMatchCounts = {}) =>
  Math.min(
    Number.MAX_SAFE_INTEGER,
    collectedCount(jewels) +
      collectedCount(bonusGems) * BONUS_GEM_COINS +
      [
        ...matchRewardBreakdown(comboCounts, COMBO_COIN_STEP),
        ...matchRewardBreakdown(multiMatchCounts, MULTI_MATCH_COIN_STEP),
      ].reduce((total, reward) => total + reward.coins, 0),
  );

export function normalizeTown(saved) {
  const town = createTown();
  if (Number.isSafeInteger(saved?.coins) && saved.coins >= 0) town.coins = saved.coins;
  for (const building of BUILDINGS) {
    const stage = saved?.buildings?.[building.id];
    if (Number.isInteger(stage) && stage >= 0 && stage <= building.upgrades.length)
      town.buildings[building.id] = stage;
  }
  if (Number.isSafeInteger(saved?.completedRuns) && saved.completedRuns >= 0)
    town.completedRuns = saved.completedRuns;
  const income = saved?.income;
  if (Number.isSafeInteger(income?.at) && income.at >= 0)
    town.income = {
      at: income.at,
      remainder:
        Number.isInteger(income.remainder) && income.remainder >= 0 && income.remainder < HOUR_MS
          ? income.remainder
          : 0,
    };
  const event = saved?.events?.[BANDIT_EVENT];
  if (
    event &&
    ['protected', 'stolen', 'harmless'].includes(event.outcome) &&
    Number.isInteger(event.loss) &&
    event.loss >= 0 &&
    event.loss <= 30
  ) {
    const legacy = event.id === undefined;
    if (
      legacy ||
      (Number.isSafeInteger(event.id) &&
        event.id > 0 &&
        Number.isSafeInteger(event.atRun) &&
        event.atRun >= 0 &&
        event.atRun <= town.completedRuns &&
        [2, 4, 6, 8, 10].includes(event.gangSize) &&
        Number.isInteger(event.sheriffLevel) &&
        event.sheriffLevel >= 0 &&
        event.sheriffLevel <= BUILDING_BY_ID.sheriff.upgrades.length)
    ) {
      town.events[BANDIT_EVENT] = {
        id: legacy ? 1 : event.id,
        atRun: legacy ? town.completedRuns : event.atRun,
        gangSize: legacy ? 2 : event.gangSize,
        sheriffLevel: legacy ? (event.outcome === 'protected' ? 1 : 0) : event.sheriffLevel,
        bankLevel:
          Number.isInteger(event.bankLevel) &&
          event.bankLevel >= 0 &&
          event.bankLevel <= BUILDING_BY_ID.bank.upgrades.length
            ? event.bankLevel
            : 0,
        outcome: event.outcome,
        loss: event.loss,
        seen: legacy || event.seen === true,
        targets: [
          'mine',
          ...(Array.isArray(event.targets)
            ? event.targets
                .filter((id) => Object.hasOwn(BUILDING_BY_ID, id) && town.buildings[id] > 0)
                .slice(0, 1)
            : []),
        ],
      };
    }
  }
  for (const { id, upgrades } of BUILDINGS) {
    // Keep work from the earlier single-project demo when loading its save.
    const project =
      saved?.projects === undefined
        ? saved?.project?.id === id
          ? saved.project
          : null
        : saved.projects?.[id];
    // Validate the old receipt, then apply the shorter construction schedule.
    const required = project?.required ?? (project?.stage === 1 ? 3 : 4);
    if (
      Number.isInteger(required) &&
      required >= 1 &&
      required <= 12 &&
      project?.id === id &&
      project.stage === town.buildings[id] + 1 &&
      project.stage <= upgrades.length &&
      Number.isInteger(project.wins) &&
      project.wins >= 0 &&
      project.wins < required
    ) {
      if (projectRuns(id, project.stage) === 0) town.buildings[id] = project.stage;
      else town.projects[id] = { id, stage: project.stage, wins: 0, required: 1 };
    }
  }
  town.tourSeen =
    saved?.tourSeen === true ||
    (saved?.tourSeen === undefined &&
      (development(town) > 0 || Object.keys(town.projects).length > 0));
  return town;
}

export const projectRuns = (id, stage) => BUILDING_BY_ID[id]?.upgrades[stage - 1]?.runs ?? 1;
export const constructionRuns = (project) =>
  project.required ?? projectRuns(project.id, project.stage);
export const constructionVisual = (project) =>
  project ? Math.min(2, Math.ceil((project.wins / constructionRuns(project)) * 3)) : null;

export function advanceConstruction(town) {
  if (!Object.keys(town.projects).length) return town;
  const buildings = { ...town.buildings },
    projects = {};
  for (const current of Object.values(town.projects)) {
    const project = { ...current, wins: current.wins + 1 };
    if (project.wins < constructionRuns(project)) projects[project.id] = project;
    else buildings[project.id] = project.stage;
  }
  return { ...town, buildings, projects };
}

export const totalLevels = (town, kind) =>
  BUILDINGS.filter((b) => b.kind === kind).reduce((sum, b) => sum + town.buildings[b.id], 0);
export const completedHouses = (town) =>
  BUILDINGS.filter((b) => b.kind === 'home' && town.buildings[b.id] > 0).length;
export const residentPopulation = (town) =>
  Math.min(
    totalLevels(town, 'home') * 2,
    totalLevels(town, 'well') * 6,
    totalLevels(town, 'farm') * 6,
  );
export const visitorCapacity = (town) =>
  town.buildings.stable * 2 + Math.max(0, town.buildings.museum - 1) * 2;
export const visitorPopulation = (town) =>
  Math.min(
    visitorCapacity(town),
    Math.max(0, totalLevels(town, 'well') * 6 - residentPopulation(town)),
    Math.max(0, totalLevels(town, 'farm') * 6 - residentPopulation(town)),
  );
export const population = (town) => residentPopulation(town) + visitorPopulation(town);
export const happiness = (town) => {
  const demand = totalLevels(town, 'home') * 2 + visitorCapacity(town);
  const needs = demand
    ? Math.min(
        1,
        (totalLevels(town, 'well') * 6) / demand,
        (totalLevels(town, 'farm') * 6) / demand,
      )
    : 0;
  return Math.min(
    100,
    Math.round(
      needs * 40 +
        (town.buildings.square ?? 0) * 8 +
        town.buildings.museum * 2 +
        town.buildings.saloon * 2,
    ),
  );
};
export const development = (town) =>
  Object.values(town.buildings).reduce((sum, level) => sum + level, 0);
export const roadLevel = (town) =>
  development(town) >= 24 ? 3 : development(town) >= 12 ? 2 : development(town) >= 3 ? 1 : 0;
export function plotUnlocked(town, id) {
  const building = BUILDING_BY_ID[id];
  if (!Object.hasOwn(BUILDING_BY_ID, id)) return false;
  return (
    !building.unlock ||
    town.buildings[id] > 0 ||
    !!town.projects[id] ||
    town.buildings[building.unlock.id] >= building.unlock.level
  );
}
export const HOUR_MS = 3_600_000;
export const INCOME_HOURS_CAP = 8;
export const saloonIncomeRate = (town) =>
  Math.floor((3 * town.buildings.saloon * population(town) * (100 + happiness(town))) / 100);
// Remainder is stored as coin-milliseconds, avoiding rounding loss between visits.
// Settle BEFORE changing buildings, so their new rates never apply to old time.
export function settleSaloonIncome(town, now) {
  const checkpoint = town.income ?? { at: null, remainder: 0 };
  if (!Number.isSafeInteger(now) || now < 0 || (checkpoint.at !== null && now <= checkpoint.at))
    return { town, earned: 0 };
  const elapsed =
    checkpoint.at === null ? 0 : Math.min(now - checkpoint.at, INCOME_HOURS_CAP * HOUR_MS);
  const credit = elapsed * saloonIncomeRate(town) + checkpoint.remainder;
  const earned = Math.min(Math.floor(credit / HOUR_MS), Number.MAX_SAFE_INTEGER - town.coins);
  return {
    town: { ...town, coins: town.coins + earned, income: { at: now, remainder: credit % HOUR_MS } },
    earned,
  };
}

export function upgradeOffer(town, id) {
  if (!Object.hasOwn(BUILDING_BY_ID, id)) return null;
  const building = BUILDING_BY_ID[id];
  const stage = town.buildings[id];
  const upgrade = building.upgrades[stage];
  if (!upgrade) return null;
  const firstProject =
    !Object.keys(town.projects).length && BUILDINGS.every(({ id }) => !town.buildings[id]);
  const cost = firstProject && plotUnlocked(town, id) ? 0 : upgrade.cost;
  return {
    ...upgrade,
    cost,
    stage,
    runs: projectRuns(id, stage + 1),
    available:
      plotUnlocked(town, id) &&
      !town.projects[id] &&
      town.completedRuns >= (upgrade.unlockRuns ?? 0),
    reason: !plotUnlocked(town, id)
      ? t('Unlock by upgrading {building} to level {level}.', {
          building: t(BUILDING_BY_ID[building.unlock.id].shortName),
          level: building.unlock.level,
        })
      : town.projects[id]
        ? 'This building is already under construction.'
        : town.completedRuns < (upgrade.unlockRuns ?? 0)
          ? t('Complete {count} more puzzles to unlock this improvement.', {
              count: upgrade.unlockRuns - town.completedRuns,
            })
          : town.coins < cost
            ? t('Earn {value0} more coins in the mine.', { value0: t(cost - town.coins) })
            : '',
  };
}

export function nextGoal(town) {
  const available = BUILDINGS.filter(
    (b) =>
      plotUnlocked(town, b.id) && !town.projects[b.id] && town.buildings[b.id] < b.upgrades.length,
  );
  const id =
    INTRO_ORDER.find((key) => !town.buildings[key] && !town.projects[key]) ??
    available.find((b) => !town.buildings[b.id])?.id ??
    available.sort((a, b) => town.buildings[a.id] - town.buildings[b.id])[0]?.id;
  return id ? { id, ...upgradeOffer(town, id) } : null;
}

// Commands carry the stage visible when clicked, so a double tap cannot buy the next tier.
export function purchase(town, id, expectedStage) {
  const offer = upgradeOffer(town, id);
  if (!offer || offer.reason || offer.stage !== expectedStage) return null;
  return {
    ...town,
    coins: town.coins - offer.cost,
    buildings: offer.runs === 0 ? { ...town.buildings, [id]: expectedStage + 1 } : town.buildings,
    projects:
      offer.runs === 0
        ? town.projects
        : {
            ...town.projects,
            [id]: { id, stage: expectedStage + 1, wins: 0, required: offer.runs },
          },
  };
}

export const RAID_INTERVAL = 5;
export const gangSize = (town) => {
  const size = development(town);
  return size >= 70 ? 10 : size >= 50 ? 8 : size >= 30 ? 6 : size >= 16 ? 4 : 2;
};
export function raidReady(town) {
  const previous = town.events[BANDIT_EVENT];
  return (
    population(town) > 0 &&
    (!previous || (previous.seen && town.completedRuns - previous.atRun >= RAID_INTERVAL))
  );
}
export const raidProtection = (town, riders = gangSize(town)) =>
  (Math.min(riders, town.buildings.sheriff * 2) +
    Math.min(riders, (town.buildings.bank ?? 0) * 2)) /
  (riders * 2);

export function banditEncounter(town) {
  if (!raidReady(town)) return null;
  const riders = gangSize(town),
    sheriffLevel = town.buildings.sheriff;
  const bankLevel = town.buildings.bank ?? 0;
  const protection = raidProtection(town, riders);
  const protectedTown = protection === 1;
  const loss = protectedTown
    ? 0
    : Math.min(
        30,
        Math.ceil(5 * riders * (1 - protection)),
        Math.floor(town.coins / 10),
        Math.max(0, town.coins - 50),
      );
  const target = ['saloon', 'armory', 'farm', 'home'].find((id) => town.buildings[id]);
  const event = {
    id: (town.events[BANDIT_EVENT]?.id ?? 0) + 1,
    atRun: town.completedRuns,
    gangSize: riders,
    sheriffLevel,
    bankLevel,
    targets: ['mine', ...(target ? [target] : [])],
    outcome: protectedTown ? 'protected' : loss ? 'stolen' : 'harmless',
    loss,
    seen: false,
  };
  return { ...town, coins: town.coins - loss, events: { ...town.events, [BANDIT_EVENT]: event } };
}

// Carry the displayed level so stale/double taps cannot spend on the next tier.
export function buildWithHammer(town, id, expectedStage) {
  if (!upgradeOffer(town, id)?.available) return null;
  if (
    town.projects[id] ||
    town.buildings[id] !== expectedStage ||
    !BUILDING_BY_ID[id].upgrades[expectedStage]
  )
    return null;
  return {
    ...town,
    buildings: { ...town.buildings, [id]: expectedStage + 1 },
  };
}
