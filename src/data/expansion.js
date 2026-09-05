// Seven columns, nine rows. Side columns stay open so barriers can always
// be approached. # = stone, X = reinforced stone, c = chain,
// r/b/g = ruby/sapphire/emerald seal, R = relic, E = bottom exit.
// Ice is seeded around these authored structures. Each chapter has a breather
// in its fifth puzzle and a finale in its sixth. Six gem colors and roughly
// 15% more ice balance the stronger bonus fusions.
export const EXPANSION_LEVELS = [
  {
    map: '......./......./......./...#.../......./......./......./......./.......',
    ice: 98,
    tip: 'One more row to explore. Open the stone barrier to keep the cascades flowing.',
  },
  {
    map: '......./......./.##..../......./....##./......./.##..../......./.......',
    ice: 104,
    tip: 'Open the staggered stone shelves. Each gap reconnects a column.',
  },
  {
    map: '......./......./..#.#../......./.X...X./......./..#.#../......./.......',
    ice: 112,
    tip: 'Work into the ice pockets from the open columns. Banded stone takes two hits.',
  },
  {
    map: '......./......./.XX..../......./...XX../......./..XX.../......./.......',
    ice: 116,
    tip: 'Choose which passage to open first. Cross fire can reach several shelves.',
  },
  {
    map: '......./......./......./.#...#./......./......./......./......./.......',
    ice: 90,
    tip: 'A clearing in the depths. Use the open space to build bonuses and chase cascades.',
  },
  {
    map: '......./......./.XX.XX./......./...X.../......./.XX.XX./......./.......',
    ice: 128,
    tip: 'Open the heart of the mountain. Use the middle and side columns to reach every vault.',
  },
  {
    map: '......./......./......./..c.c../......./......./......./......./.......',
    ice: 84,
    tip: 'Chained gems cannot move or match. Match beside a chain or hit it with a bonus to free it.',
  },
  {
    map: '......./......./..c.c../......./...c.../......./..c.c../......./.......',
    ice: 92,
    tip: 'Chains hold up falling gems. Free the upper links to refill the columns below.',
  },
  {
    map: '......./......./.#...#./......./..c.c../......./.c...c./......./.......',
    ice: 110,
    tip: 'Break each chain, then match on the ice beneath it. One hit removes one layer.',
  },
  {
    map: '......./......./.X.c.X./......./..c.c../......./.X.c.X./......./.......',
    ice: 114,
    tip: 'Stone and chains guard the vault. Open a column before clearing the gems below it.',
  },
  {
    map: '......./......./......./.c.c.c./......./......./......./......./.......',
    ice: 88,
    tip: 'Break free. An adjacent match can release several chains at once.',
  },
  {
    map: '......./......./.cX.Xc./......./..c.c../......./.Xc.cX./......./.......',
    ice: 126,
    tip: 'Free every link and clear the vault. Build bonuses in the open lanes.',
  },
  {
    map: '......./......./......./..r.r../......./...r.../......./......./.......',
    ice: 84,
    tip: 'Ruby seals: match red ruby gems on the R marks. A bonus hit opens any seal.',
  },
  {
    map: '......./......./..r.b../......./...b.../......./..b.r../......./.......',
    ice: 90,
    tip: 'R means ruby; S means sapphire. Bring the marked color onto each seal and match it.',
  },
  {
    map: '......./......./.r.g.b./......./...g.../......./.b.g.r./......./.......',
    ice: 98,
    tip: 'R: ruby. S: sapphire. E: emerald. Match the marked color on a seal, or use a bonus.',
  },
  {
    map: '......./......./.X.r.X./......./.b.g.b./......./.X.r.X./......./.......',
    ice: 110,
    tip: 'Open the stone chambers, then guide the right colors onto their seals.',
  },
  {
    map: '......./......./......./..r.g../......./..g.b../......./......./.......',
    ice: 86,
    tip: 'Let the prism bloom. Create a bonus to open several colored seals together.',
  },
  {
    map: '......./......./.Xr.bX./......./.b.g.r./......./.Xg.rX./......./.......',
    ice: 122,
    tip: 'Unlock every chamber. Save a well-placed bonus for the hardest seals to reach.',
  },
  {
    map: '......./...R.../......./......./......./......./......./......./...E...',
    ice: 84,
    tip: 'Drop the golden relic through its glowing bottom exit. Relics cannot swap or be blasted away.',
  },
  {
    map: '......./..R.R../......./......./......./......./......./......./..E.E..',
    ice: 92,
    tip: 'Clear beneath both relics to guide them down. Collect both and clear the remaining ice.',
  },
  {
    map: '......./..R.R../......./..#.#../......./..X.X../......./......./..E.E..',
    ice: 104,
    tip: 'Break the stone beneath the relics. Each open column brings the treasure closer to its exit.',
  },
  {
    map: '......./..R.R../......./..c.c../......./.c...c./......./......./..E.E..',
    ice: 110,
    tip: 'Free the chains holding up the relics, then clear beneath them to reach the exits.',
  },
  {
    map: '......./.R.R.R./......./......./......./......./......./......./.E.E.E.',
    ice: 88,
    tip: 'Three treasures, open paths. A cross or bomb beneath the relics can bring them home together.',
  },
  {
    map: '......./.R.R.R./......./.X.c.X./......./.c.X.c./......./......./.E.E.E.',
    ice: 126,
    tip: 'The great discovery: free the chains, break the stone, collect all three relics and clear the ice.',
  },
];
