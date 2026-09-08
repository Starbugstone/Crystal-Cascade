// Content gates are independent of functional building levels and the alpha level count.
// Reserved eras never create buttons or empty lots.
export const ERAS = [
  { id: 'frontier', label: 'Frontier Settlement', yearLabel: 'c. 1865–1880', enabled: true },
  {
    id: 'river-rail',
    label: 'River & Rail Boom',
    yearLabel: '1884',
    enabled: true,
    story:
      'The river trade is growing, rails are approaching, and Prospect Hollow is becoming a proper town.',
  },
  {
    id: 'industrial',
    label: 'Industrial / Electric Town',
    yearLabel: '1908',
    enabled: true,
    story:
      'Brick workshops, a growing neighborhood, and the promise of electric light. Build the power house to illuminate Prospect Hollow.',
    horizon: 'A new light is coming to Prospect Hollow.',
    finale: 'The river still flows. The rails still carry us. Now we build a brighter town.',
  },
  { id: 'motor-age', label: 'Motor Age', yearLabel: 'c. 1920–1945', enabled: false },
  { id: 'post-war', label: 'Post-war City', yearLabel: 'c. 1945–1980', enabled: false },
  {
    id: 'contemporary',
    label: 'Contemporary Crystal City',
    yearLabel: 'c. 1980–today',
    enabled: false,
  },
];
export const ERA_BY_ID = Object.fromEntries(ERAS.map((era) => [era.id, era]));
export const FRONTIER_ERA = ERAS[0].id;
export const FORGE_PRODUCTION_RUNS = [20, 16, 12, 8, 5];
export const forgeProductionRuns = (level) => FORGE_PRODUCTION_RUNS[level - 1] ?? 20;
export const createEraState = (plotIds) => ({
  era: FRONTIER_ERA,
  buildingEras: Object.fromEntries(plotIds.map((id) => [id, FRONTIER_ERA])),
  buildingEraLevels: Object.fromEntries(plotIds.map((id) => [id, 0])),
  eraTransitionSeen: {},
  firstLightsSeen: false,
  infrastructure: { bridge: 0, rail: 0, riverPort: 0 },
  forge: { progress: 0, charge: 0 },
});
