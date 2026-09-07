import { t } from '../../i18n';
import { miningDepthBonus } from '../../data/economy';
import { forgeProductionRuns } from '../../data/eras';
import { plotInEra, modernization, normalizeEraState } from './TownEras';
import { BUILDINGS, BUILDING_BY_ID, INTRO_ORDER, BANDIT_EVENT, createTown } from '../../data/town';
import {
  COMBO_COIN_STEP,
  MULTI_MATCH_COIN_STEP,
  matchRewardBreakdown,
} from '../engine/MatchRewards';

export const BONUS_GEM_COINS = 10;
const collectedCount = (value) => (Number.isSafeInteger(value) && value > 0 ? value : 0);
export function miningPayout(
  jewels,
  bonusGems = 0,
  comboCounts = {},
  multiMatchCounts = {},
  levelId = 1,
) {
  const baseCoins = Math.min(
    Number.MAX_SAFE_INTEGER,
    collectedCount(jewels) +
      collectedCount(bonusGems) * BONUS_GEM_COINS +
      [
        ...matchRewardBreakdown(comboCounts, COMBO_COIN_STEP),
        ...matchRewardBreakdown(multiMatchCounts, MULTI_MATCH_COIN_STEP),
      ].reduce((total, reward) => total + reward.coins, 0),
  );

  return baseCoins + miningDepthBonus(baseCoins, levelId);
}

export function normalizeTown(saved) {
  const town = createTown();
  // Missing or malformed additions leave existing v3 receipts intact.
  const forge = saved?.forge;
  town.forge.charge = forge?.charge === 1 ? 1 : 0;
  town.forge.progress =
    !town.forge.charge &&
    Number.isInteger(forge?.progress) &&
    forge.progress >= 0 &&
    forge.progress < forgeProductionRuns(1)
      ? forge.progress
      : 0;
  if (Number.isSafeInteger(saved?.coins) && saved.coins >= 0) town.coins = saved.coins;
  for (const building of BUILDINGS) {
    const stage = saved?.buildings?.[building.id];
    if (Number.isInteger(stage) && stage >= 0 && stage <= building.upgrades.length)
      town.buildings[building.id] = stage;
  }
  normalizeEraState(town, saved);
  if (Number.isSafeInteger(saved?.completedRuns) && saved.completedRuns >= 0)
    town.completedRuns = saved.completedRuns;
  if (Number.isSafeInteger(saved?.nextRaidRun) && saved.nextRaidRun >= 0)
    town.nextRaidRun = saved.nextRaidRun;
  const income = saved?.income;
  if (Number.isSafeInteger(income?.at) && income.at >= 0)
    town.income = {
      at: income.at,
      stored: Number.isSafeInteger(income.stored) && income.stored >= 0 ? income.stored : 0,
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
    if (
      Number.isSafeInteger(event.id) &&
      event.id > 0 &&
      Number.isSafeInteger(event.atRun) &&
      event.atRun >= 0 &&
      event.atRun <= town.completedRuns &&
      [2, 4, 6, 8, 10].includes(event.gangSize) &&
      Number.isInteger(event.sheriffLevel) &&
      event.sheriffLevel >= 0 &&
      event.sheriffLevel <= BUILDING_BY_ID.sheriff.upgrades.length
    ) {
      town.events[BANDIT_EVENT] = {
        id: event.id,
        atRun: event.atRun,
        gangSize: event.gangSize,
        sheriffLevel: event.sheriffLevel,
        bankLevel:
          Number.isInteger(event.bankLevel) &&
          event.bankLevel >= 0 &&
          event.bankLevel <= BUILDING_BY_ID.bank.upgrades.length
            ? event.bankLevel
            : 0,
        outcome: event.outcome,
        loss: event.loss,
        seen: event.seen === true,
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
    const project = saved?.projects?.[id];
    if (project?.type === 'modernization') {
      const offer = modernization(town, id);
      if (
        offer &&
        project.id === id &&
        project.stage === town.buildings[id] &&
        project.targetEra === offer.targetEra &&
        project.fromEra === town.buildingEras[id] &&
        Number.isInteger(project.required) &&
        project.required >= 1 &&
        project.required <= 5 &&
        Number.isInteger(project.wins) &&
        project.wins >= 0 &&
        project.wins <= project.required &&
        Number.isSafeInteger(project.cost) &&
        project.cost >= 0
      ) {
        town.projects[id] = {
          id,
          type: 'modernization',
          stage: project.stage,
          fromEra: project.fromEra,
          targetEra: project.targetEra,
          wins: project.wins,
          required: project.required,
          cost: project.cost,
        };
      }
      continue;
    }
    if (
      project?.id === id &&
      project.stage === town.buildings[id] + 1 &&
      project.stage <= upgrades.length &&
      projectRuns(id, project.stage) > 0 &&
      project.required === projectRuns(id, project.stage) &&
      Number.isInteger(project.wins) &&
      project.wins >= 0 &&
      project.wins <= project.required
    ) {
      town.projects[id] = {
        id,
        stage: project.stage,
        wins: project.wins,
        required: project.required,
      };
    }
  }
  town.constructionTipSeen = saved?.constructionTipSeen === true;
  town.tourSeen = saved?.tourSeen === true;
  town.infrastructure = {
    bridge: town.buildings.bridge,
    rail: town.buildings.railDepot,
    riverPort: town.buildings.riverPort,
  };
  return settleForgeProduction(town);
}

export const projectRuns = (id, stage) => BUILDING_BY_ID[id]?.upgrades[stage - 1]?.runs ?? 1;
export const constructionRuns = (project) =>
  project.required ?? projectRuns(project.id, project.stage);
export const constructionVisual = (project) =>
  project ? Math.min(2, Math.ceil((project.wins / constructionRuns(project)) * 3)) : null;

export const constructionReady = (project) =>
  !!project && project.wins >= constructionRuns(project);

export function advanceConstruction(town) {
  if (!Object.keys(town.projects).length) return town;
  return {
    ...town,
    projects: Object.fromEntries(
      Object.entries(town.projects).map(([id, project]) => [
        id,
        { ...project, wins: Math.min(constructionRuns(project), project.wins + 1) },
      ]),
    ),
  };
}

// Readiness survives reloads. Benefits start only when the player removes the scaffolding.
export function finishConstruction(town, id, expectedStage) {
  const project = town.projects[id];
  if (
    !constructionReady(project) ||
    project.stage !== expectedStage ||
    (project.type === 'modernization'
      ? project.stage !== town.buildings[id] ||
        project.fromEra !== town.buildingEras[id] ||
        project.targetEra !== town.era
      : project.stage !== town.buildings[id] + 1)
  )
    return null;
  const projects = { ...town.projects };
  delete projects[id];
  return {
    ...town,
    buildings: { ...town.buildings, [id]: project.stage },
    buildingEras: { ...town.buildingEras, [id]: project.targetEra ?? town.era },
    infrastructure: {
      ...town.infrastructure,
      ...(id === 'bridge' || id === 'riverPort' ? { [id]: project.stage } : {}),
      ...(id === 'railDepot' ? { rail: project.stage } : {}),
    },
    projects,
    constructionTipSeen: true,
  };
}

export const totalLevels = (town, kind) =>
  BUILDINGS.filter((b) => b.kind === kind).reduce((sum, b) => sum + (town.buildings[b.id] ?? 0), 0);
export const foodCapacity = (town) =>
  totalLevels(town, 'farm') * 6 +
  Math.min(5, Math.max(0, town.buildings.fisherman ?? 0)) +
  (town.buildings.market ?? 0) * 10;
export const housingCapacity = (town) =>
  totalLevels(town, 'home') * 2 + (town.buildings.home5 ?? 0) * 8;
export function settleForgeProduction(town) {
  if (
    !town.buildings.blacksmith ||
    town.forge.charge ||
    town.forge.progress < forgeProductionRuns(town.buildings.blacksmith)
  )
    return town;
  return { ...town, forge: { progress: 0, charge: 1 } };
}
export function advanceForge(town) {
  if (!town.buildings.blacksmith || town.forge.charge) return town;
  return settleForgeProduction({
    ...town,
    forge: { progress: town.forge.progress + 1, charge: 0 },
  });
}
export const residentPopulation = (town) =>
  Math.min(housingCapacity(town), totalLevels(town, 'well') * 6, foodCapacity(town));
export const visitorCapacity = (town) =>
  town.buildings.stable * 2 +
  Math.max(0, town.buildings.museum - 1) * 2 +
  (town.buildings.railDepot ?? 0) * 2 +
  (town.buildings.hotel ?? 0) * 2;
export const visitorPopulation = (town) =>
  Math.min(
    visitorCapacity(town),
    Math.max(0, totalLevels(town, 'well') * 6 - residentPopulation(town)),
    Math.max(0, foodCapacity(town) - residentPopulation(town)),
  );
export const population = (town) => residentPopulation(town) + visitorPopulation(town);
export const happiness = (town) => {
  const demand = housingCapacity(town) + visitorCapacity(town);
  const needs = demand
    ? Math.min(1, (totalLevels(town, 'well') * 6) / demand, foodCapacity(town) / demand)
    : 0;
  return Math.min(
    100,
    Math.round(
      needs * 40 +
        (town.buildings.square ?? 0) * 8 +
        town.buildings.museum * 2 +
        town.buildings.saloon * 2 +
        Math.min(5, Math.max(0, town.buildings.school ?? 0)),
    ),
  );
};
export const development = (town) =>
  Object.values(town.buildings).reduce((sum, level) => sum + level, 0);
export const roadLevel = (town) =>
  development(town) >= 24 ? 3 : development(town) >= 12 ? 2 : development(town) >= 3 ? 1 : 0;
// Completed buildings and paid projects stay accessible when unlock rules change.
export function plotRequirement(town, id) {
  if (town.buildings[id] > 0 || town.projects[id]) return null;
  return BUILDING_BY_ID[id]?.unlock?.find(({ id, level }) => town.buildings[id] < level) ?? null;
}
export function plotUnlocked(town, id) {
  return plotInEra(town, id) && !plotRequirement(town, id);
}
export const HOUR_MS = 3_600_000;
export const INCOME_HOURS_CAP = 8;
export const saloonIncomeRate = (town) =>
  Math.floor((2 * town.buildings.saloon * population(town) * (100 + happiness(town))) / 100);
// Remainder is stored as coin-milliseconds, avoiding rounding loss between visits.
// Settle BEFORE changing buildings, so their new rates never apply to old time.
export function settleSaloonIncome(town, now) {
  const checkpoint = town.income ?? { at: null, remainder: 0, stored: 0 };
  if (!Number.isSafeInteger(now) || now < 0 || (checkpoint.at !== null && now <= checkpoint.at))
    return { town, earned: 0 };
  const rate = saloonIncomeRate(town);
  const elapsed =
    checkpoint.at === null ? 0 : Math.min(now - checkpoint.at, INCOME_HOURS_CAP * HOUR_MS);
  const credit = elapsed * rate + checkpoint.remainder;
  const stored = checkpoint.stored ?? 0;
  const capacity = rate * INCOME_HOURS_CAP;
  const earned = Math.max(0, Math.min(Math.floor(credit / HOUR_MS), capacity - stored));
  return {
    town: {
      ...town,
      income: {
        at: now,
        stored: stored + earned,
        remainder: stored + earned >= capacity ? 0 : credit % HOUR_MS,
      },
    },
    earned,
  };
}

export function upgradeOffer(town, id) {
  if (!Object.hasOwn(BUILDING_BY_ID, id)) return null;
  const building = BUILDING_BY_ID[id];
  const stage = town.buildings[id];
  const requirement = plotRequirement(town, id);
  const upgrade = building.upgrades[stage] ?? modernization(town, id);
  if (!upgrade) return null;
  const firstProject =
    !Object.keys(town.projects).length && BUILDINGS.every(({ id }) => !town.buildings[id]);
  const cost = firstProject && plotUnlocked(town, id) ? 0 : upgrade.cost;
  return {
    ...upgrade,
    cost,
    stage,
    runs: upgrade.runs ?? projectRuns(id, stage + 1),
    available:
      plotUnlocked(town, id) &&
      !town.projects[id] &&
      town.completedRuns >= (upgrade.unlockRuns ?? 0),
    reason: !plotInEra(town, id)
      ? 'Available in the next era.'
      : requirement
        ? t('Unlock by upgrading {building} to level {level}.', {
            building: t(BUILDING_BY_ID[requirement.id].shortName),
            level: requirement.level,
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

// Immediate collection/completion takes priority over an affordable coin purchase.
// Hammers do not affect these ambient hints.
export function buildingIndicators(town, forgeCollectible = true) {
  const indicators = Object.fromEntries(availablePurchases(town).map(({ id }) => [id, 'upgrade']));
  for (const { id } of BUILDINGS) {
    if (constructionReady(town.projects[id])) indicators[id] = 'ready';
    else if (id === 'saloon' && town.buildings.saloon > 0 && town.income.stored > 0)
      indicators[id] = 'coins';
    else if (
      id === 'blacksmith' &&
      town.buildings.blacksmith > 0 &&
      town.forge.charge === 1 &&
      forgeCollectible
    )
      indicators[id] = 'tnt';
  }
  return indicators;
}

export const availablePurchases = (town, builderHammers = 0) =>
  BUILDINGS.map((place) => ({ ...place, offer: upgradeOffer(town, place.id) }))
    .filter(({ offer }) => offer?.available && (town.coins >= offer.cost || builderHammers > 0))
    .sort((a, b) => Number(town.coins < a.offer.cost) - Number(town.coins < b.offer.cost));

export const availableParcels = (town, builderHammers = 0) => [
  ...BUILDINGS.filter(({ id }) => plotInEra(town, id) && constructionReady(town.projects[id])).map(
    (place) => ({ ...place, ready: true }),
  ),
  ...availablePurchases(town, builderHammers),
];

export function nextGoal(town) {
  const available = BUILDINGS.filter(
    (b) => plotUnlocked(town, b.id) && !town.projects[b.id] && upgradeOffer(town, b.id),
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
  if (offer.type === 'modernization')
    return {
      ...town,
      coins: town.coins - offer.cost,
      projects: {
        ...town.projects,
        [id]: {
          id,
          type: 'modernization',
          stage: expectedStage,
          fromEra: town.buildingEras[id],
          targetEra: offer.targetEra,
          wins: 0,
          required: offer.runs,
          cost: offer.cost,
        },
      },
    };
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

export const raidIntervalRange = (town) => (town.era === 'river-rail' ? [6, 14] : [3, 7]);
export function scheduleRaid(town, random = Math.random) {
  if (town.nextRaidRun !== null || population(town) <= 0) return town;
  const [min, max] = raidIntervalRange(town);
  const gap = min + Math.floor(random() * (max - min + 1));
  return { ...town, nextRaidRun: Math.min(Number.MAX_SAFE_INTEGER, town.completedRuns + gap) };
}
export const gangSize = (town) => {
  const size = development(town);
  return size >= 70 ? 10 : size >= 50 ? 8 : size >= 30 ? 6 : size >= 16 ? 4 : 2;
};
export function raidReady(town) {
  const previous = town.events[BANDIT_EVENT];
  return (
    population(town) > 0 &&
    Number.isSafeInteger(town.nextRaidRun) &&
    town.completedRuns >= town.nextRaidRun &&
    (!previous || previous.seen)
  );
}
export const raidProtection = (town, riders = gangSize(town)) =>
  (Math.min(riders, town.buildings.sheriff * 2) +
    Math.min(riders, (town.buildings.bank ?? 0) * 2)) /
  (riders * 2);

export function banditEncounter(town, random = Math.random) {
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
  return scheduleRaid(
    {
      ...town,
      coins: town.coins - loss,
      events: { ...town.events, [BANDIT_EVENT]: event },
      nextRaidRun: null,
    },
    random,
  );
}

// An unfinished raid can benefit from defenses opened before the riders leave.
// Refund only the reduction to its saved loss; later income and gang growth do not change it.
export function reinforceRaid(town) {
  const event = town.events[BANDIT_EVENT];
  if (!event || event.seen) return town;
  const sheriffLevel = Math.max(event.sheriffLevel, town.buildings.sheriff);
  const bankLevel = Math.max(event.bankLevel ?? 0, town.buildings.bank);
  if (sheriffLevel === event.sheriffLevel && bankLevel === (event.bankLevel ?? 0)) return town;
  const protection = raidProtection(
    { buildings: { sheriff: sheriffLevel, bank: bankLevel } },
    event.gangSize,
  );
  const loss = Math.min(event.loss, Math.ceil(5 * event.gangSize * (1 - protection)));
  return {
    ...town,
    coins: Math.min(Number.MAX_SAFE_INTEGER, town.coins + event.loss - loss),
    events: {
      ...town.events,
      [BANDIT_EVENT]: {
        ...event,
        sheriffLevel,
        bankLevel,
        loss,
        outcome: protection === 1 ? 'protected' : loss ? 'stolen' : 'harmless',
      },
    },
  };
}

// Carry the displayed level so stale/double taps cannot spend on the next tier.
export function buildWithHammer(town, id, expectedStage) {
  const offer = upgradeOffer(town, id);
  if (!offer?.available) return null;
  if (
    town.projects[id] ||
    town.buildings[id] !== expectedStage ||
    (!BUILDING_BY_ID[id].upgrades[expectedStage] && offer.type !== 'modernization')
  )
    return null;
  return {
    ...town,
    buildings: {
      ...town.buildings,
      [id]: expectedStage + (offer.type === 'modernization' ? 0 : 1),
    },
    buildingEras: { ...town.buildingEras, [id]: town.era },
    infrastructure: {
      ...town.infrastructure,
      ...(id === 'bridge' || id === 'riverPort' ? { [id]: 1 } : {}),
      ...(id === 'railDepot' ? { rail: 1 } : {}),
    },
  };
}
