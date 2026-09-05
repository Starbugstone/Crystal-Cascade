export const BUILDINGS = [
  {
    id: 'well',
    name: 'Old town well',
    shortName: 'Well',
    purpose: 'A fresh start',
    x: 490,
    y: 385,
    color: '#679f9d',
    stages: ['Empty plot', 'Fresh water flowing'],
    upgrades: [
      {
        cost: 50,
        title: 'Let the water flow',
        benefit: 'Fresh drinking water for the town.',
        story: 'Hear that? Fresh water. This old place has a little life in it yet.',
        speaker: 'Ada · the caretaker',
      },
    ],
  },
  {
    id: 'farm',
    name: 'Clover farm',
    shortName: 'Farm',
    purpose: 'Something good growing',
    x: 725,
    y: 230,
    color: '#859753',
    stages: ['Empty plot', 'The first harvest'],
    upgrades: [
      {
        cost: 50,
        title: 'Plant the first seeds',
        benefit: 'A little harvest to feed our future neighbors.',
        story:
          'A little water, a little patience. We’ll have supper growing here before you know it.',
        speaker: 'Ruth · the farmer',
      },
    ],
  },
  {
    id: 'home',
    name: 'Juniper house',
    shortName: 'Home',
    purpose: 'Room for new beginnings',
    x: 250,
    y: 235,
    color: '#bc8067',
    stages: ['Empty plot', 'A place to call home', 'A growing household'],
    upgrades: [
      {
        cost: 50,
        title: 'Make a home for a family',
        benefit: 'Two new neighbors, once food and water are ready.',
        story:
          'The roof is mended and the kettle’s on. With food and water, this will be a lovely home for the Bell family.',
        speaker: 'Ada · the caretaker',
      },
      {
        cost: 150,
        title: 'Make a little more room',
        benefit:
          'A new wing and a garden make room for two more neighbors, once food and water are ready.',
        story:
          'A proper garden and room for cousins. It’s beginning to feel like we’ve always lived here.',
        speaker: 'June · your neighbor',
      },
    ],
  },
  {
    id: 'saloon',
    name: 'The Golden Hour',
    shortName: 'Saloon',
    purpose: 'Good company awaits',
    x: 225,
    y: 455,
    color: '#c69849',
    stages: ['Empty plot', 'The doors are open'],
    upgrades: [
      {
        cost: 100,
        title: 'Bring back the good times',
        benefit: 'Music, warm lamps, and a place for neighbors to meet.',
        story: 'First round of lemonade is on the house. Someone dust off that piano!',
        speaker: 'Nell · the saloon keeper',
      },
    ],
  },
  {
    id: 'stable',
    name: 'Dusty Spur stables',
    shortName: 'Stables',
    purpose: 'A welcome at the end of the trail',
    x: 735,
    y: 455,
    color: '#a8764a',
    stages: ['Empty plot', 'Back in the saddle'],
    upgrades: [
      {
        cost: 100,
        title: 'Welcome weary travelers',
        benefit: 'Horses and a wagon bring life to the edge of town.',
        story: 'A dry stall and some good hay. Word of this place will travel faster than we do.',
        speaker: 'Kit · the stable keeper',
      },
    ],
  },
  {
    id: 'sheriff',
    name: 'Sheriff’s office',
    shortName: 'Sheriff',
    purpose: 'Someone looking out for us',
    x: 485,
    y: 590,
    color: '#6f8996',
    stages: ['Empty plot', 'The town is in good hands'],
    upgrades: [
      {
        cost: 100,
        title: 'Pin up the badge',
        benefit: 'A sheriff to keep an eye on town and turn bandits away.',
        story: 'No need to worry, folks. I’ll take the evening walk from here.',
        speaker: 'Sam · the sheriff',
      },
    ],
  },
];

export const BUILDING_BY_ID = Object.fromEntries(
  BUILDINGS.map((building) => [building.id, building]),
);
export const INTRO_ORDER = ['well', 'farm', 'home'];
export const BANDIT_EVENT = 'dusty-trail-visitors';
export const INITIAL_STORY = {
  speaker: 'Ada · the caretaker',
  title: 'A town starts with your first choice.',
  text: 'Choose any empty plot. The first building’s materials are on us. Complete three puzzles to bring it to life, one part at a time.',
};

export const createTown = () => ({
  coins: 0,
  buildings: Object.fromEntries(BUILDINGS.map(({ id }) => [id, 0])),
  events: {},
  projects: {},
});
