import { createGem } from './GemFactory.js';
import { MatchEngine } from './MatchEngine.js';
import { LEVEL_COUNT, CHAPTERS } from '../../data/campaign.js';

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

const DEFAULT_MIN_STARTING_MOVES = 3;
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
    if (x >= 2 && board[i - 1]?.type === board[i - 2]?.type) forbidden.add(board[i - 1]?.type);
    if (y >= 2 && board[i - cols]?.type === board[i - 2 * cols]?.type)
      forbidden.add(board[i - cols]?.type);
    const choices = GEM_TYPES.slice(0, layout.gemTypeCount ?? 6).filter(
      (type) => !forbidden.has(type),
    );
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

// Evenly distributed ice grows by two layers per level. Stone is introduced
// separately, with open side columns so every barrier stays approachable.
export const generateLevelConfigs = (count = LEVEL_COUNT) => {
  const levels = [];
  for (let index = 0; index < count; index++) {
    const id = index + 1;
    const chapter = Math.min(5, Math.floor(index / 6));
    const cols = id <= 12 ? 6 : 7;
    const rows = id <= 12 ? 7 : 8;
    const rng = createSeededRng(id * 1337);
    const layout = new BoardLayout(`level_${id}`, 'RECTANGLE', { cols, rows });
    // Keep five colors throughout: difficulty grows through objectives and obstacles.
    layout.gemTypeCount = 5;
    const tiles = Array.from({ length: cols * rows }, () => ({
      type: 'standard',
      health: 0,
      maxHealth: 0,
    }));
    const blockCount = id < 7 ? 0 : Math.min(10, 2 + Math.floor((id - 7) / 3));
    const candidates = [];
    for (let y = 2; y < rows - 1; y += 2) {
      for (let x = 1; x < cols - 1; x++) candidates.push({ x, y });
    }
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    layout.blockedCells = candidates.slice(0, blockCount);
    layout.blockedCells.forEach(({ x, y }, i) => {
      const health = id >= 19 && i < Math.ceil((id - 18) / 3) ? 2 : 1;
      tiles[y * cols + x] = { type: 'blocker', health, maxHealth: health };
    });
    const iceCells = tiles
      .map((tile, i) => (tile.type === 'standard' ? i : -1))
      .filter((i) => i >= 0);
    // Shuffle placement with the level seed; replay keeps the same puzzle.
    for (let i = iceCells.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [iceCells[i], iceCells[j]] = [iceCells[j], iceCells[i]];
    }
    if (id <= 6) {
      const edgeDistance = (i) =>
        Math.min(
          i % cols,
          cols - 1 - (i % cols),
          Math.floor(i / cols),
          rows - 1 - Math.floor(i / cols),
        );
      iceCells.sort((a, b) => edgeDistance(b) - edgeDistance(a));
    }
    const iceLayers = 12 + index * 2;
    for (let layer = 0; layer < iceLayers; layer++) {
      const iceCellCount =
        id < 13 ? iceCells.length : Math.min(iceCells.length, Math.ceil(iceLayers * 0.8));
      const tile = tiles[iceCells[layer % iceCellCount]];
      tile.health++;
      tile.maxHealth++;
    }
    const board = createPlayableBoard(layout, rng, { minMoves: DEFAULT_MIN_STARTING_MOVES });
    const totalLayers = tiles.reduce((sum, tile) => sum + tile.health, 0);
    const chestTarget = Math.ceil((6000 + index * 1000) / 500) * 500;
    const tip =
      id < 7
        ? 'Match 3 gems on the ice. Match 4 or 5 to create bonuses.'
        : id < 19
          ? 'Match beside stone to break it and release the gems above.'
          : 'Banded stone takes two hits. Match beside it or use a bonus.';
    levels.push({
      id,
      chapter,
      chapterName: CHAPTERS[chapter].name,
      tip,
      chestTarget,
      speedTargetMs: (60 + index * 4) * 1000,
      boardCols: cols,
      boardRows: rows,
      boardSize: cols,
      shuffleAllowance: 3,
      board,
      tiles,
      boardLayout: layout,
      objectives: [
        {
          id: `clear-${id}`,
          type: 'clear-layers',
          label: 'Clear ice & stone',
          target: totalLayers,
          progress: 0,
        },
        {
          id: `score-${id}`,
          type: 'score',
          label: 'Earn a chest',
          target: chestTarget,
          progress: 0,
        },
      ],
      summary: `Clear ${iceLayers} ice layers${blockCount ? ` and ${blockCount} stone blocks` : ''}. Earn a chest at ${chestTarget.toLocaleString()} points.`,
    });
  }
  return levels;
};
