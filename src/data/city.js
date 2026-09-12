// City growth adds bounded capacity. Modernizing an existing service does not multiply it.
export const CITY_ERAS = ['post-war', 'contemporary'];
export const isCityEra = (era) => CITY_ERAS.includes(era);
export const CITY_LEVEL_PRICES = {
  'post-war': [2400, 2900, 3400],
  contemporary: [7600, 9000, 10400],
};
export const CITY_FAMILIES = {
  home: 'residence',
  farm: 'farm',
  well: 'water',
  square: 'square',
  saloon: 'retail',
  stable: 'depot',
  sheriff: 'civic',
  bank: 'civic',
  shop: 'retail',
  museum: 'culture',
  armory: 'depot',
  fisherman: 'river',
  blacksmith: 'depot',
  school: 'civic',
  doctor: 'civic',
  bridge: 'bridge',
  riverPort: 'river',
  railDepot: 'station',
  post: 'civic',
  warehouse: 'culture',
  hotel: 'residence',
  market: 'retail',
  powerHouse: 'water',
  fireStation: 'depot',
  rowHouses: 'residence',
  mill: 'depot',
  garage: 'depot',
  busDepot: 'station',
  gardenCourt: 'residence',
  diner: 'retail',
  horseField: 'field',
  park: 'park',
  cityHall: 'civic',
  apartments: 'residence',
  supermarket: 'retail',
  waterPlant: 'water',
  transitHub: 'station',
  library: 'culture',
  crystalLab: 'research',
  cityHomes: 'residence',
  riverPark: 'park',
};
export const CITY_DESCRIPTIONS = {
  civic: [
    'A brick civic hall, sheltered entrance and tall windows welcome the rebuilding neighborhood.',
    'A bright public atrium and planted roof renew the familiar civic landmark.',
  ],
  residence: [
    'Brick courtyard housing and sheltered balconies make room for neighborhood life.',
    'Timber screens, glass balconies and roof gardens frame the familiar homes.',
  ],
  retail: [
    'Wide shop windows and a striped canopy open onto the old shopping street.',
    'A timber market arcade and planted terrace welcome shoppers on foot.',
  ],
  depot: [
    'A broad vehicle bay and a sawtooth workshop roof keep the established service working.',
    'The familiar workshop gains roof panels, glazed doors and a sheltered service court.',
  ],
  farm: [
    'A low packing barn and grain silos serve the growing cooperative farm.',
    'Greenhouse roofs and planted growing beds renew the old farm.',
  ],
  water: [
    'A clean-lined utility hall and round reservoir preserve the city water and power services.',
    'A landscaped utility landmark pairs a glass control room with roof panels.',
  ],
  river: [
    'A sheltered marina landing keeps the working riverfront connected to town.',
    'Timber decking and a glazed pavilion open the historic landing to the promenade.',
  ],
  station: [
    'A rebuilt brick concourse and long platform canopy welcome the steam train.',
    'A glazed transit entrance, roof panels and cycle stands serve the electric railway.',
  ],
  culture: [
    'A low gallery wing and shaded reading terrace celebrate the city history.',
    'A glazed reading hall and sculpted roof connect culture with the old town.',
  ],
  research: [
    'A public discovery hall shares the story of the mine.',
    'A faceted crystal atrium and rooftop observatory link the city to its mining roots.',
  ],
  square: [
    'Stone seating and a formal canopy preserve the original civic fountain.',
    'A planted pedestrian plaza and solar canopy frame the historic fountain.',
  ],
  bridge: [
    'Broad approach rails and paired lamps frame the familiar river crossing.',
    'A light pedestrian canopy and cycle rails renew the historic bridge approaches.',
  ],
  field: [
    'A shaded viewing pavilion and new seating welcome visitors to the horse field.',
    'A solar shade canopy and planted borders preserve the horses in the modern city.',
  ],
  park: [
    'A shaded garden pavilion and new benches frame the playground.',
    'A planted promenade, solar shade and cycle stands welcome families by the river.',
  ],
};
const labels = { 'post-war': 'Post-war Rebuilding', contemporary: 'Contemporary Crystal City' };
export const CITY_BUILDINGS = [
  {
    id: 'cityHall',
    kind: 'cityHall',
    name: 'Prospect city hall',
    shortName: 'City hall',
    purpose: 'A meeting place for a growing city',
    introducedEra: 'post-war',
    family: 'civic',
    effects: {
      happiness: 2,
    },
    color: '#71938a',
    unlock: [
      {
        id: 'bridge',
        level: 1,
      },
    ],
    benefits: [
      'Adds 2 happiness in total.',
      'Adds 4 happiness in total.',
      'Adds 6 happiness in total.',
    ],
  },
  {
    id: 'apartments',
    kind: 'apartments',
    name: 'Cedar court apartments',
    shortName: 'Apartments',
    purpose: 'More neighbors around a shared courtyard',
    introducedEra: 'post-war',
    family: 'residence',
    effects: {
      housing: 8,
      happiness: 1,
    },
    color: '#71938a',
    unlock: [
      {
        id: 'bridge',
        level: 1,
      },
    ],
    benefits: [
      'Room for 8 residents, with food and water. Adds 1 happiness in total.',
      'Room for 16 residents, with food and water. Adds 2 happiness in total.',
      'Room for 24 residents, with food and water. Adds 3 happiness in total.',
    ],
  },
  {
    id: 'supermarket',
    kind: 'supermarket',
    name: 'Valley food hall',
    shortName: 'Food hall',
    purpose: 'Fresh produce for the whole city',
    introducedEra: 'post-war',
    family: 'retail',
    effects: {
      food: 18,
      happiness: 1,
    },
    color: '#71938a',
    unlock: [
      {
        id: 'bridge',
        level: 1,
      },
    ],
    benefits: [
      'Adds food for 18 people. Adds 1 happiness in total.',
      'Adds food for 36 people. Adds 2 happiness in total.',
      'Adds food for 54 people. Adds 3 happiness in total.',
    ],
  },
  {
    id: 'waterPlant',
    kind: 'waterPlant',
    name: 'Prospect water plant',
    shortName: 'Water plant',
    purpose: 'Clean water for the new neighborhoods',
    introducedEra: 'post-war',
    family: 'water',
    effects: {
      water: 18,
      happiness: 1,
    },
    color: '#71938a',
    unlock: [
      {
        id: 'bridge',
        level: 1,
      },
    ],
    benefits: [
      'Adds water for 18 people. Adds 1 happiness in total.',
      'Adds water for 36 people. Adds 2 happiness in total.',
      'Adds water for 54 people. Adds 3 happiness in total.',
    ],
  },
  {
    id: 'transitHub',
    kind: 'transitHub',
    name: 'Prospect transit interchange',
    shortName: 'Transit hub',
    purpose: 'A shared journey through the city',
    introducedEra: 'contemporary',
    family: 'station',
    effects: {
      visitors: 2,
      happiness: 1,
    },
    color: '#71938a',
    unlock: [
      {
        id: 'bridge',
        level: 1,
      },
    ],
    benefits: [
      'Room for 2 visitors, with food and water. Adds 1 happiness in total.',
      'Room for 4 visitors, with food and water. Adds 2 happiness in total.',
      'Room for 6 visitors, with food and water. Adds 3 happiness in total.',
    ],
  },
  {
    id: 'library',
    kind: 'library',
    name: 'Riverlight public library',
    shortName: 'Library',
    purpose: 'Stories from the frontier to tomorrow',
    introducedEra: 'contemporary',
    family: 'culture',
    effects: {
      happiness: 2,
    },
    color: '#71938a',
    unlock: [
      {
        id: 'bridge',
        level: 1,
      },
    ],
    benefits: [
      'Adds 2 happiness in total.',
      'Adds 4 happiness in total.',
      'Adds 6 happiness in total.',
    ],
  },
  {
    id: 'crystalLab',
    kind: 'crystalLab',
    name: 'Crystal discovery institute',
    shortName: 'Crystal institute',
    purpose: 'The mine inspires a new generation',
    introducedEra: 'contemporary',
    family: 'research',
    effects: {
      happiness: 1,
    },
    color: '#71938a',
    unlock: [
      {
        id: 'bridge',
        level: 1,
      },
    ],
    benefits: [
      'Adds 1 happiness in total.',
      'Adds 2 happiness in total.',
      'Adds 3 happiness in total.',
    ],
  },
  {
    id: 'cityHomes',
    kind: 'cityHomes',
    name: 'Willow mixed-use courtyard',
    shortName: 'City courtyard',
    purpose: 'Homes above familiar neighborhood shops',
    introducedEra: 'contemporary',
    family: 'residence',
    effects: {
      housing: 6,
      happiness: 1,
    },
    color: '#71938a',
    unlock: [
      {
        id: 'bridge',
        level: 1,
      },
    ],
    benefits: [
      'Room for 6 residents, with food and water. Adds 1 happiness in total.',
      'Room for 12 residents, with food and water. Adds 2 happiness in total.',
      'Room for 18 residents, with food and water. Adds 3 happiness in total.',
    ],
  },
  {
    id: 'riverPark',
    kind: 'riverPark',
    name: 'Prospect river promenade',
    shortName: 'River promenade',
    purpose: 'The river belongs to everyone',
    introducedEra: 'contemporary',
    family: 'park',
    effects: {
      happiness: 2,
    },
    color: '#71938a',
    unlock: [
      {
        id: 'bridge',
        level: 1,
      },
    ],
    benefits: [
      'Adds 2 happiness in total.',
      'Adds 4 happiness in total.',
      'Adds 6 happiness in total.',
    ],
  },
].map(({ benefits, ...building }) => ({
  ...building,
  stages: [
    'Empty plot',
    ...[1, 2, 3].map((level) => `${labels[building.introducedEra]} · Level ${level}`),
  ],
  upgrades: benefits.map((benefit, index) => ({
    cost: (building.introducedEra === 'post-war' ? [3000, 4000, 5000] : [8000, 10000, 12000])[
      index
    ],
    runs: index ? 2 : 1,
    title: index ? 'Expand {building}' : 'Build {building}',
    benefit,
    story: benefit,
    speaker: 'Ada · the caretaker',
  })),
}));
export const cityCapacity = (town, stat) =>
  CITY_BUILDINGS.reduce((sum, b) => sum + (b.effects[stat] ?? 0) * (town.buildings[b.id] ?? 0), 0);
export const cityVariant = (kind, era) =>
  CITY_DESCRIPTIONS[CITY_FAMILIES[kind]]?.[CITY_ERAS.indexOf(era)];
