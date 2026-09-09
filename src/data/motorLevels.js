// New routes through familiar obstacles: open lanes, a fifth-puzzle breather,
// then a small delivery finale. Unlimited moves and five matching colors remain.
export const MOTOR_LEVELS = [
  [
    '......./......./..c..../......./....c../......./......./......./.......',
    64,
    'Open the road one link at a time. The side lanes stay clear.',
  ],
  [
    '......./......./.#...#./......./...c.../......./..r.r../......./.......',
    68,
    'Open the crossing, then match the marked colors.',
  ],
  [
    '......./...R.../......./.#...#./......./...c.../......./......./...E...',
    72,
    'A parcel for the village. Clear below it to reach the exit.',
  ],
  [
    '......./......./..r.b../......./.X...X./......./..c.c../......./.......',
    76,
    'Use the open center to make a bonus for both side pockets.',
  ],
  [
    '......./......./......./...c.../......./..r.r../......./......./.......',
    60,
    'A sunny rest stop. Enjoy the open space and flowing cascades.',
  ],
  [
    '......./..RR.../......./.c...c./......./...#.../......./......./..EE...',
    80,
    'Bring both parcels home, then clear the remaining ice.',
  ],
  [
    '......./......./..g.g../......./......./......./...c.../......./.......',
    66,
    'Green garden seals open with emerald matches or any bonus.',
  ],
  [
    '......./......./..r.g../......./..c.c../......./......./......./.......',
    68,
    'Match along the garden borders to open the next path.',
  ],
  [
    '......./....R../......./...#.../......./..g.g../......./......./....E..',
    74,
    'A parcel for the village. Clear below it to reach the exit.',
  ],
  [
    '......./......./.X.g.X./......./..r.r../......./...c.../......./.......',
    78,
    'Use the open center to make a bonus for both side pockets.',
  ],
  [
    '......./......./......./..g.g../......./......./......./......./.......',
    62,
    'A sunny rest stop. Enjoy the open space and flowing cascades.',
  ],
  [
    '......./..R.R../......./..c.c../......./.r.g.r./......./......./..E.E..',
    82,
    'Two garden treasures are ready for the journey home.',
  ],
  [
    '......./......./..#.#../......./...b.../......./...c.../......./.......',
    68,
    'Clear the blue switches and reconnect the workshop lanes.',
  ],
  [
    '......./......./.c...c./......./..b.b../......./...#.../......./.......',
    72,
    'Open the crossing, then match the marked colors.',
  ],
  [
    '......./..R..../......./..c..../......./.#...#./......./...b.../..E....',
    76,
    'A parcel for the village. Clear below it to reach the exit.',
  ],
  [
    '......./......./..X.X../......./.r.b.r./......./..c.c../......./.......',
    80,
    'A bonus in the middle can reach several workshop shelves.',
  ],
  [
    '......./......./......./..b.b../......./...c.../......./......./.......',
    64,
    'A sunny rest stop. Enjoy the open space and flowing cascades.',
  ],
  [
    '......./...RR../......./.X...X./......./...b.../......./...c.../...EE..',
    84,
    'Bring both parcels home, then clear the remaining ice.',
  ],
  [
    '......./......./.r...b./......./...c.../......./......./......./.......',
    70,
    'Follow the bright seams toward the sunlit valley.',
  ],
  [
    '......./......./..c.c../......./.g...g./......./...#.../......./.......',
    74,
    'Match along the garden borders to open the next path.',
  ],
  [
    '......./.R...R./......./..#.#../......./.c...c./......./......./.E...E.',
    78,
    'Two garden treasures are ready for the journey home.',
  ],
  [
    '......./......./.X.r.X./......./..b.g../......./...c.../......./.......',
    82,
    'A bonus in the middle can reach several workshop shelves.',
  ],
  [
    '......./......./......./..r.b../......./......./......./......./.......',
    66,
    'A sunny rest stop. Enjoy the open space and flowing cascades.',
  ],
  [
    '......./..RRR../......./.#...#./......./..c.c../......./...g.../..EEE..',
    86,
    'One last delivery. Bring three treasures into the sunshine.',
  ],
].map(([map, ice, tip]) => ({ map, ice, tip }));
