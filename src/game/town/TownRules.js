import { t } from '../../i18n';
import { BUILDINGS, BUILDING_BY_ID, INTRO_ORDER, BANDIT_EVENT, createTown } from '../../data/town';

export const miningPayout = (jewels) =>
  50 + Math.min(50, Math.floor((Number.isSafeInteger(jewels) && jewels > 0 ? jewels : 0) / 2));

export function normalizeTown(saved) {
  const town = createTown();
  if (Number.isSafeInteger(saved?.coins) && saved.coins >= 0) town.coins = saved.coins;
  for (const building of BUILDINGS) {
    const stage = saved?.buildings?.[building.id];
    if (Number.isInteger(stage) && stage >= 0 && stage <= building.upgrades.length)
      town.buildings[building.id] = stage;
  }
  const event = saved?.events?.[BANDIT_EVENT];
  if (
    event &&
    ['protected', 'stolen', 'harmless'].includes(event.outcome) &&
    Number.isInteger(event.loss) &&
    event.loss >= 0 &&
    event.loss <= 10
  ) {
    town.events[BANDIT_EVENT] = { outcome: event.outcome, loss: event.loss };
  }
  const project = saved?.project;
  if (
    project &&
    Object.hasOwn(BUILDING_BY_ID, project.id) &&
    project.stage === town.buildings[project.id] + 1 &&
    project.stage <= BUILDING_BY_ID[project.id].upgrades.length &&
    Number.isInteger(project.wins) &&
    project.wins >= 0 &&
    project.wins < projectRuns(project.stage)
  ) {
    town.project = { id: project.id, stage: project.stage, wins: project.wins };
  }
  return town;
}

export const projectRuns = (stage) => (stage === 1 ? 3 : 4);

export function advanceConstruction(town) {
  if (!town.project) return town;
  const project = { ...town.project, wins: town.project.wins + 1 };
  if (project.wins < projectRuns(project.stage)) return { ...town, project };
  return { ...town, buildings: { ...town.buildings, [project.id]: project.stage }, project: null };
}

export const population = (town) =>
  INTRO_ORDER.every((id) => town.buildings[id] > 0) ? town.buildings.home * 2 : 0;

export function upgradeOffer(town, id) {
  if (!Object.hasOwn(BUILDING_BY_ID, id)) return null;
  const building = BUILDING_BY_ID[id];
  const stage = town.buildings[id];
  const upgrade = building.upgrades[stage];
  if (!upgrade) return null;
  const firstProject = BUILDINGS.every(({ id }) => !town.buildings[id]);
  const cost = firstProject ? 0 : upgrade.cost;
  return {
    ...upgrade,
    cost,
    stage,
    runs: projectRuns(stage + 1),
    reason: town.project
      ? 'Finish your current building first.'
      : town.coins < cost
        ? t('Earn {value0} more coins in the mine.', { value0: t(cost - town.coins) })
        : '',
  };
}

export function nextGoal(town) {
  const id =
    INTRO_ORDER.find((key) => !town.buildings[key]) ??
    ['saloon', 'stable', 'sheriff'].find((key) => !town.buildings[key]) ??
    (town.buildings.home < 2 ? 'home' : null);
  return id ? { id, ...upgradeOffer(town, id) } : null;
}

// Commands carry the stage visible when clicked, so a double tap cannot buy the next tier.
export function purchase(town, id, expectedStage) {
  const offer = upgradeOffer(town, id);
  if (!offer || offer.reason || offer.stage !== expectedStage) return null;
  return {
    ...town,
    coins: town.coins - offer.cost,
    project: { id, stage: expectedStage + 1, wins: 0 },
  };
}

export function banditEncounter(town) {
  if (!population(town) || town.events[BANDIT_EVENT]) return null;
  const remainingRepairs = INTRO_ORDER.filter((id) => !town.buildings[id]);
  const reserve = remainingRepairs.length
    ? Math.min(...remainingRepairs.map((id) => BUILDING_BY_ID[id].upgrades[0].cost))
    : 50;
  const loss = town.buildings.sheriff
    ? 0
    : Math.min(10, Math.floor(town.coins / 10), Math.max(0, town.coins - reserve));
  const event = {
    outcome: town.buildings.sheriff ? 'protected' : loss ? 'stolen' : 'harmless',
    loss,
  };
  return { ...town, coins: town.coins - loss, events: { ...town.events, [BANDIT_EVENT]: event } };
}
