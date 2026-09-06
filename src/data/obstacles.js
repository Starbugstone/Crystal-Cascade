export const OBSTACLES = [
  {
    id: 'ice',
    name: 'Ice',
    art: '/art/ice/frost.svg',
    instruction: 'Match gems on the frosted tile to remove the ice beneath them.',
    present: (tile) => tile.type !== 'blocker' && !tile.sealColor && tile.health === 1,
  },
  {
    id: 'stone',
    name: 'Stone',
    art: '/art/blocks/stone.svg',
    instruction:
      'Match directly beside stone, or hit it with a bonus. Diagonal matches do not count. Breaking stone lets the column refill.',
    present: (tile) => tile.type === 'blocker' && tile.maxHealth < 2,
  },
  {
    id: 'double-ice',
    name: 'Double ice',
    art: '/art/ice/frost.svg',
    instruction: 'Match on this tile twice. The first hit cracks the ice; the second clears it.',
    present: (tile) => tile.type !== 'blocker' && !tile.sealColor && tile.health > 1,
  },
  {
    id: 'reinforced',
    name: 'Reinforced stone',
    art: '/art/blocks/reinforced.svg',
    instruction:
      'Gold-banded stone needs two hits from adjacent matches or bonuses. A fusion can deal both hits at once.',
    present: (tile) => tile.type === 'blocker' && tile.maxHealth >= 2,
  },
  {
    id: 'frozen',
    name: 'Frozen gem',
    art: '/art/ice/frost.svg',
    instruction:
      'This gem cannot move yet. Clear a neighboring gem to thaw it, then match on its ice.',
    present: (tile) => tile.state === 'FROZEN',
  },
  {
    id: 'chain',
    name: 'Chained gem',
    art: '/art/obstacles/chain.svg',
    instruction:
      'Match beside the chain or hit it with a bonus to release the gem. Then clear any ice underneath. Chained gems cannot move or match.',
    present: (tile) => tile.chainHealth > 0,
  },
  ...[
    ['ruby', 'Ruby seal', 'R'],
    ['sapphire', 'Sapphire seal', 'S'],
    ['emerald', 'Emerald seal', 'E'],
  ].map(([color, name, mark]) => ({
    id: `seal-${color}`,
    name,
    art: `/art/obstacles/seal-${color}.svg`,
    instruction: `Match ${color} gems on the ${mark} seal, or hit it with any bonus. Other colors can move through but will not open it.`,
    present: (tile) => tile.health > 0 && tile.sealColor === color,
  })),
  {
    id: 'relic',
    name: 'Lost relic',
    art: '/art/relic.svg',
    instruction:
      'Clear gems below the golden relic so it falls through a marked exit at the bottom. Relics cannot be swapped or destroyed. Collect them all to finish.',
    present: (tile) => tile.exit,
  },
];
export const obstaclesInLevel = (tiles) =>
  OBSTACLES.filter((obstacle) => tiles.some((tile) => tile && obstacle.present(tile)));
