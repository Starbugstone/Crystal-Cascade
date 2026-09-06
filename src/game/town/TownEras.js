import { ERAS, ERA_BY_ID, FRONTIER_ERA } from '../../data/eras';
import { BUILDINGS, BUILDING_BY_ID } from '../../data/town';
import { RIVER_RAIL_VARIANTS } from '../../data/riverRail';
import { campaignMilestoneReached } from '../../data/campaignMilestones';

export const eraIndex = (era) => ERAS.findIndex(({ id }) => id === era);
export const plotInEra = (town, id) => {
  const plot = BUILDING_BY_ID[id];
  return !!plot && eraIndex(plot.introducedEra) <= eraIndex(town.era ?? FRONTIER_ERA);
};
export function modernization(town, id) {
  const building = BUILDING_BY_ID[id];
  if (
    !building ||
    town.era !== 'river-rail' ||
    building.introducedEra !== FRONTIER_ERA ||
    town.buildings[id] !== building.upgrades.length ||
    town.buildingEras[id] === town.era
  )
    return null;
  const [name, description] = RIVER_RAIL_VARIANTS[building.kind];
  return {
    type: 'modernization',
    targetEra: town.era,
    stage: town.buildings[id],
    cost: 300,
    runs: 2,
    name,
    description,
    title: 'Modernize {building} → {name}',
    benefit: 'Visual modernization. Existing services stay unchanged.',
  };
}
export function isEraComplete(town) {
  return BUILDINGS.filter((b) => b.requiredForEraCompletion && plotInEra(town, b.id)).every(
    (b) =>
      town.buildings[b.id] === b.upgrades.length &&
      !town.projects[b.id] &&
      (b.introducedEra === town.era || town.buildingEras[b.id] === town.era),
  );
}
export function eraGate(town, records) {
  const next = ERAS[eraIndex(town.era) + 1];
  const townComplete = isEraComplete(town);
  const campaignComplete =
    !!next && campaignMilestoneReached(records, next.requiredCampaignMilestone);
  return {
    next,
    townComplete,
    campaignComplete,
    available: !!next?.enabled && townComplete && campaignComplete && !town.transition?.pending,
  };
}
export function advanceEra(town, records, expectedEra) {
  const gate = eraGate(town, records);
  if (town.era !== expectedEra || !gate.available) return null;
  return {
    ...town,
    era: gate.next.id,
    transition: {
      id: `${expectedEra}:${gate.next.id}`,
      from: expectedEra,
      to: gate.next.id,
      milestone: gate.next.requiredCampaignMilestone,
      pending: true,
    },
  };
}
export function normalizeEraState(town, saved) {
  if (ERA_BY_ID[saved?.era]?.enabled) town.era = saved.era;
  for (const id of Object.keys(town.buildings)) {
    const era = saved?.buildingEras?.[id];
    if (ERA_BY_ID[era]?.enabled && eraIndex(era) <= eraIndex(town.era)) town.buildingEras[id] = era;
  }
  const receipt = saved?.transition;
  if (
    receipt?.id === 'frontier:river-rail' &&
    receipt.from === FRONTIER_ERA &&
    receipt.to === town.era &&
    receipt.to === 'river-rail'
  ) {
    town.transition = {
      id: receipt.id,
      from: receipt.from,
      to: receipt.to,
      milestone: ERA_BY_ID[receipt.to].requiredCampaignMilestone,
      pending: receipt.pending === true,
    };
  }
  if (saved?.eraTransitionSeen?.['river-rail'] === true)
    town.eraTransitionSeen['river-rail'] = true;
  return town;
}
