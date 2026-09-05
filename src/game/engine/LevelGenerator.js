import { createGem } from './GemFactory.js';
import { MatchEngine } from './MatchEngine.js';

const GEM_TYPES = ['ruby', 'sapphire', 'emerald', 'topaz', 'amethyst', 'moonstone'];

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

export const LEVEL_STARTING_MOVE_REQUIREMENTS = {
  3: 3,
};

const DEFAULT_MIN_STARTING_MOVES = 1;
const MAX_BOARD_GENERATION_ATTEMPTS = 60;
const matchEngine = new MatchEngine();

const isBlockedCell = (layout, x, y) =>
  layout.blockedCells.some((cell) => cell.x === x && cell.y === y);

const createBoard = (layout, rng) => {
  const board = Array.from({ length: layout.dimensions.cols * layout.dimensions.rows });
  for (let i = 0; i < board.length; i++) {
    const x = i % layout.dimensions.cols;
    const y = Math.floor(i / layout.dimensions.cols);
    if (isBlockedCell(layout, x, y)) {
      board[i] = null;
      continue;
    }
    const forbidden = new Set();
    const cols = layout.dimensions.cols;
    if (x >= 2 && board[i - 1]?.type === board[i - 2]?.type) forbidden.add(board[i - 1].type);
    if (y >= 2 && board[i - cols]?.type === board[i - 2 * cols]?.type)
      forbidden.add(board[i - cols].type);
    const choices = GEM_TYPES.filter((type) => !forbidden.has(type));
    board[i] = createGem(choices[Math.floor(rng() * choices.length)]);
  }
  return board;
};

const hasMissingGems = (board, layout) => {
  for (let i = 0; i < board.length; i += 1) {
    if (board[i]) {
      continue;
    }
    const x = i % layout.dimensions.cols;
    const y = Math.floor(i / layout.dimensions.cols);
    if (!isBlockedCell(layout, x, y)) {
      return true;
    }
  }
  return false;
};

const countPotentialMoves = (board, cols, rows, minMoves = 1) => {
  if (!Array.isArray(board) || !cols || !rows) {
    return 0;
  }

  let moveCount = 0;

  for (let index = 0; index < board.length; index += 1) {
    const gem = board[index];
    if (!gem) {
      continue;
    }

    const col = index % cols;

    // Adjacent right swap
    const rightIndex = col < cols - 1 ? index + 1 : -1;
    if (rightIndex >= 0 && board[rightIndex]) {
      const evaluation = matchEngine.evaluateSwap(board, cols, rows, index, rightIndex);
      if (evaluation?.matches?.length) {
        moveCount += 1;
      }
    }

    // Adjacent down swap
    const belowIndex = index + cols;
    if (belowIndex < board.length && board[belowIndex]) {
      const evaluation = matchEngine.evaluateSwap(board, cols, rows, index, belowIndex);
      if (evaluation?.matches?.length) {
        moveCount += 1;
      }
    }

    if (moveCount >= minMoves) {
      break;
    }
  }

  return moveCount;
};

const createPlayableBoard = (layout, rng, { minMoves = 1 } = {}) => {
  let lastBoard = null;
  for (let attempt = 0; attempt < MAX_BOARD_GENERATION_ATTEMPTS; attempt += 1) {
    const board = createBoard(layout, rng);
    lastBoard = board;

    if (hasMissingGems(board, layout)) {
      continue;
    }

    const moves = countPotentialMoves(
      board,
      layout.dimensions.cols,
      layout.dimensions.rows,
      minMoves,
    );
    if (moves >= minMoves) {
      return board;
    }
  }

  console.warn('LevelGenerator: falling back to last board after exhausting attempts', {
    layout: layout.name,
    minMoves,
    attempts: MAX_BOARD_GENERATION_ATTEMPTS,
  });

  return lastBoard ?? createBoard(layout, rng);
};

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
    let layout = new BoardLayout(`level_${id}`, 'RECTANGLE', { cols: 8, rows: 9 });

    if (id === 3) {
      layout = new BoardLayout('Compact-5x5', 'RECTANGLE', { cols: 5, rows: 5 }, []);
    }

    const rng = createSeededRng(id * 1337);
    const layerCount = id === 1 ? 1 : 2;
    const minMoves = LEVEL_STARTING_MOVE_REQUIREMENTS[id] ?? DEFAULT_MIN_STARTING_MOVES;
    const board = createPlayableBoard(layout, rng, { minMoves });
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
      boardLayout: layout,
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
      summary: `Clear ${totalLayers.toLocaleString()} layers. Aim for ${(20000 + id * 1500).toLocaleString()} points for an extra star.`,
    });
  }

  return levels;
};
