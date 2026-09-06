const ORIGINAL_BUILDINGS = [
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
        runs: 0,
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
        runs: 0,
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
        runs: 0,
        title: 'Make a home for a family',
        benefit: 'Two new neighbors, once food and water are ready.',
        story:
          'The roof is mended and the kettle’s on. With food and water, this will be a lovely home for the Bell family.',
        speaker: 'Ada · the caretaker',
      },
      {
        cost: 150,
        runs: 1,
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
        runs: 1,
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
        runs: 1,
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
        runs: 1,
        title: 'Pin up the badge',
        benefit: 'A sheriff to keep an eye on town and turn bandits away.',
        story: 'No need to worry, folks. I’ll take the evening walk from here.',
        speaker: 'Sam · the sheriff',
      },
    ],
  },
  {
    id: 'museum',
    name: 'The Frontier Museum',
    shortName: 'Museum',
    purpose: 'Every gem has a story',
    x: 170,
    y: 595,
    color: '#b59b6b',
    stages: ['Empty plot', 'Your adventures on display'],
    upgrades: [
      {
        cost: 120,
        runs: 1,
        title: 'Open the museum',
        benefit: 'Replay completed levels to improve your score, stars, and best time.',
        story:
          'Your first discoveries belong here. Come back to an old adventure and see how far you’ve come.',
        speaker: 'Ellis · the curator',
      },
    ],
  },
  {
    id: 'armory',
    name: 'Frontier armory',
    shortName: 'Armory',
    purpose: 'Ready for the next adventure',
    x: 785,
    y: 600,
    color: '#718c89',
    stages: [
      'Empty plot',
      'Shelves for your supplies',
      'A bigger storeroom',
      'Room for every adventure',
    ],
    upgrades: [
      {
        cost: 120,
        runs: 1,
        title: 'Build the armory',
        benefit: 'Carry up to 5 of each puzzle bonus.',
        story:
          'A place for every tool. You can now keep five of each puzzle bonus ready for the mine.',
        speaker: 'Kit · the quartermaster',
      },
      {
        cost: 220,
        runs: 1,
        title: 'Expand the storeroom',
        benefit: 'Carry up to 8 of each puzzle bonus.',
        story: 'New shelves, more supplies. There’s room for eight of each puzzle bonus now.',
        speaker: 'Kit · the quartermaster',
      },
      {
        cost: 350,
        runs: 1,
        title: 'Complete the supply depot',
        benefit: 'Carry up to 12 of each puzzle bonus.',
        story:
          'The depot is ready. Twelve of each puzzle bonus will see you through a long adventure.',
        speaker: 'Kit · the quartermaster',
      },
    ],
  },
];

ORIGINAL_BUILDINGS.push({
  id: 'bank',
  name: 'Prospect bank',
  shortName: 'Bank',
  purpose: 'A safe place for your savings',
  x: 340,
  y: 115,
  color: '#b3a47b',
  stages: ['Empty plot', 'The vault is open', 'A reinforced vault', 'The frontier reserve'],
  upgrades: [
    {
      cost: 100,
      title: 'Open the bank',
      benefit: 'Protect half the coins at risk from two riders.',
    },
    {
      cost: 230,
      title: 'Reinforce the vault',
      benefit: 'Protect half the coins at risk from four riders.',
    },
    {
      cost: 360,
      title: 'Complete the frontier reserve',
      benefit: 'Protect half the coins at risk from six riders.',
    },
  ].map((upgrade) => ({
    ...upgrade,
    runs: 1,
    story: upgrade.benefit,
    speaker: 'Morgan · the banker',
  })),
});

ORIGINAL_BUILDINGS.push({
  id: 'shop',
  name: 'Prairie trading post',
  shortName: 'Shop',
  purpose: 'Supplies for your next descent',
  x: 650,
  y: 115,
  color: '#b08b6c',
  stages: ['Empty plot', 'Open for trade', 'A wider selection', 'The grand trading post'],
  upgrades: [
    {
      cost: 100,
      title: 'Open the shop',
      benefit: 'Buy from two random bonuses. New stock after each completed mine run.',
    },
    {
      cost: 220,
      title: 'Expand the shop',
      benefit: 'Choose from three random bonuses after each completed mine run.',
    },
    {
      cost: 350,
      title: 'Complete the trading post',
      benefit: 'Choose from four random bonuses after each completed mine run.',
    },
  ].map((upgrade) => ({
    ...upgrade,
    runs: 1,
    story: upgrade.benefit,
    speaker: 'Robin · the shopkeeper',
  })),
});

// Completed levels are permanent; improvements keep the previous service open.
const IMPROVEMENTS = {
  well: [
    [
      140,
      1,
      'A reliable town pump',
      'Install the town pump',
      'Water for twelve neighbors. Unlock a second well plot.',
    ],
    [
      260,
      1,
      'Water above the rooftops',
      'Raise the water tower',
      'Water for eighteen neighbors, with a tank above the town.',
    ],
  ],
  farm: [
    [
      170,
      1,
      'A barn full of promise',
      'Expand the barn',
      'Food for twelve neighbors. Unlock two more farm plots.',
    ],
    [
      300,
      1,
      'Fields of plenty',
      'Build the farm windmill',
      'Food for eighteen neighbors and a working windmill.',
    ],
  ],
  home: [
    [
      280,
      1,
      'A home for generations',
      'Add a second floor',
      'Room for six neighbors, with a balcony overlooking the street.',
    ],
  ],
  saloon: [
    [
      220,
      1,
      'Room for the evening crowd',
      'Open the upstairs lounge',
      'Earn 12 coins per hour for each completed house.',
    ],
    [
      350,
      1,
      'The heart of the frontier',
      'Complete the grand saloon',
      'Earn 18 coins per hour for each completed house.',
    ],
  ],
  stable: [
    [
      210,
      1,
      'More saddles on the trail',
      'Add covered stalls',
      'Two mounted travelers wander through town.',
    ],
    [
      330,
      1,
      'A busy frontier stop',
      'Open the carriage yard',
      'Three mounted travelers and a carriage yard bring the trail to life.',
    ],
  ],
  sheriff: [
    [
      230,
      1,
      'A deputy on duty',
      'Make room for a deputy',
      'Protect half the coins at risk from four riders.',
    ],
    [
      360,
      1,
      'Watch over the whole town',
      'Build the frontier watchtower',
      'Protect half the coins at risk from six riders.',
    ],
  ],
  museum: [
    [
      210,
      1,
      'The discovery gallery',
      'Add the discovery gallery',
      'A new gallery and gem exhibits celebrate your adventures.',
    ],
    [
      330,
      1,
      'A frontier landmark',
      'Complete the museum tower',
      'A landmark tower and a grand entrance for your collection.',
    ],
  ],
};
for (const building of ORIGINAL_BUILDINGS) {
  building.kind = building.id;
  for (const [cost, runs, stage, title, benefit] of IMPROVEMENTS[building.id] ?? []) {
    building.stages.push(stage);
    building.upgrades.push({
      cost,
      runs,
      title,
      benefit,
      story: benefit,
      speaker: building.upgrades[0].speaker,
    });
  }
}
ORIGINAL_BUILDINGS.find(({ id }) => id === 'home').upgrades[1].benefit =
  'Room for four neighbors. Unlock three more residential plots.';
ORIGINAL_BUILDINGS.find(({ id }) => id === 'saloon').upgrades[0].benefit =
  'Earn 6 coins per hour for each completed house. Neighbors stop by for company.';
ORIGINAL_BUILDINGS.find(({ id }) => id === 'stable').upgrades[0].benefit =
  'A mounted traveler wanders through town, with horses resting in the stalls.';
ORIGINAL_BUILDINGS.find(({ id }) => id === 'sheriff').upgrades[0].benefit =
  'Protect half the coins at risk from two riders.';
export const BUILDINGS = [
  ...ORIGINAL_BUILDINGS,
  ...[
    ['home2', 'home', 'Willow house', 'Home II', 95, 320],
    ['home3', 'home', 'Sagebrush house', 'Home III', 90, 465],
    ['home4', 'home', 'Cottonwood house', 'Home IV', 300, 665],
    ['well2', 'well', 'Prairie well', 'Well II', 640, 675],
    ['farm2', 'farm', 'Sunrise farm', 'Farm II', 900, 295],
    ['farm3', 'farm', 'Meadow farm', 'Farm III', 900, 465],
  ].map(([id, kind, name, shortName, x, y]) => ({
    ...ORIGINAL_BUILDINGS.find((building) => building.id === kind),
    id,
    kind,
    name,
    shortName,
    x,
    y,
    unlock: { id: kind, level: 2 },
    upgrades: ORIGINAL_BUILDINGS.find((building) => building.id === kind).upgrades.map(
      (upgrade) => ({
        ...upgrade,
        benefit: upgrade.benefit.split(' Unlock')[0],
        story: upgrade.story.split(' Unlock')[0],
      }),
    ),
  })),
];

export const BUILDING_BY_ID = Object.fromEntries(
  BUILDINGS.map((building) => [building.id, building]),
);
export const INTRO_ORDER = ['well', 'farm', 'home'];
export const BANDIT_EVENT = 'dusty-trail-visitors';
export const INITIAL_STORY = {
  speaker: 'Ada · the caretaker',
  title: 'A town starts with your first choice.',
  text: 'Choose any empty plot. The first building’s materials are on us. Small buildings open immediately. Larger buildings and improvements need one completed puzzle.',
};

export const createTown = () => ({
  coins: 0,
  tourSeen: false,
  buildings: Object.fromEntries(BUILDINGS.map(({ id }) => [id, 0])),
  events: {},
  projects: {},
  completedRuns: 0,
  income: { at: null, remainder: 0 },
});
