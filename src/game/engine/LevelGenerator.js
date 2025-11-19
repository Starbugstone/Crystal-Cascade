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

class BoardLayout {
  constructor(name, shape, dimensions, blockedCells = [], initialTilePlacements = []) {
    this.name = name;
    this.shape = shape;
    this.dimensions = dimensions;
    this.blockedCells = blockedCells;
    this.initialTilePlacements = initialTilePlacements;
  }
}

const createBoard = (layout, rng) => {
  const board = Array.from({ length: layout.dimensions.cols * layout.dimensions.rows });
  for (let i = 0; i < board.length; i++) {
    const x = i % layout.dimensions.cols;
    const y = Math.floor(i / layout.dimensions.cols);
    if (!layout.blockedCells.some(cell => cell.x === x && cell.y === y)) {
      board[i] = createGem(pickRandomType(rng));
    }
  }
  return board;
}

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
    const layout = new BoardLayout(`level_${id}`, 'RECTANGLE', { cols: 8, rows: 9 });
    const rng = createSeededRng(id * 1337);
    const layerCount = id === 1 ? 1 : 2;
    const board = createBoard(layout, rng);
    const tiles = createTiles(layout.dimensions.cols, layout.dimensions.rows, layerCount);
    const totalLayers = tiles.reduce((sum, tile) => sum + (tile.maxHealth ?? tile.health ?? 0), 0);

    levels.push({
      id,
      boardCols: layout.dimensions.cols,
      boardRows: layout.dimensions.rows,
      boardSize: layout.dimensions.cols,
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
