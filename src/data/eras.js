// Content gates are independent of functional building levels and the alpha level count.
// Reserved eras never create buttons or empty lots.
export const ERAS = [
  { id: 'frontier', label: 'Frontier Settlement', yearLabel: 'c. 1865–1880', enabled: true },
  {
    id: 'river-rail',
    label: 'River & Rail Boom',
    yearLabel: '1884',
    enabled: true,
    requiredCampaignMilestone: 'river-discovery',
    story:
      'The river trade is growing, rails are approaching, and Prospect Hollow is becoming a proper town.',
  },
  {
    id: 'industrial',
    label: 'Industrial / Electric Town',
    yearLabel: 'c. 1900–1920',
    enabled: false,
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
export const FORGE_COMPLETIONS = 5;
export const createEraState = (plotIds) => ({
  era: FRONTIER_ERA,
  buildingEras: Object.fromEntries(plotIds.map((id) => [id, FRONTIER_ERA])),
  eraTransitionSeen: {},
  infrastructure: { bridge: 0, rail: 0, riverPort: 0 },
  forge: { progress: 0, charge: 0 },
});
