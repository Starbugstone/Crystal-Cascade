import { createGem } from './GemFactory.js';

const GEM_TYPES = ['ruby', 'sapphire', 'emerald', 'topaz', 'amethyst', 'moonstone'];

const pickRandomType = (rng) => GEM_TYPES[Math.floor(rng() * GEM_TYPES.length)];

const createSeededRng = (seed) => {
  let current = seed % 2147483647;
  if (current <= 0) current += 2147483646;
  return () => {
    current = (current * 16807) % 2147483647;
    return (current - 1) / 2147483646;
  };
};

const createBoard = (cols, rows, rng) =>
  Array.from({ length: cols * rows }, () => createGem(pickRandomType(rng)));

const createTiles = (cols, rows, layerCount = 1) =>
  Array.from({ length: cols * rows }, () => ({
    type: 'standard',
    maxHealth: layerCount,
    health: layerCount,
  }));

export const generateLevelConfigs = (count = 12) => {
  const levels = [];

  for (let index = 0; index < count; index += 1) {
    const id = index + 1;
    const columns = 8;
    const rows = 9;
    const rng = createSeededRng(id * 1337);
    const layerCount = id === 1 ? 1 : 2;
    const board = createBoard(columns, rows, rng);
    const tiles = createTiles(columns, rows, layerCount);
    const totalLayers = tiles.reduce((sum, tile) => sum + (tile.maxHealth ?? tile.health ?? 0), 0);

    levels.push({
      id,
      boardCols: columns,
      boardRows: rows,
      boardSize: columns,
      shuffleAllowance: Math.max(1, 4 - Math.floor(id / 5)),
      board,
      tiles,
      objectives: [
        {
          id: `clear-${id}`,
          type: 'clear-layers',
          label: 'Clear Tile Layers',
          target: totalLayers,
          progress: 0,
        },
        {
          id: `score-${id}`,
          type: 'score',
          label: 'Score Points',
          target: 20000 + id * 1500,
          progress: 0,
        },
      ],
      summary: `Remove all ${totalLayers.toLocaleString()} tile layers and score ${(20000 + id * 1500).toLocaleString()} points.`,
    });
  }

  return levels;
};
