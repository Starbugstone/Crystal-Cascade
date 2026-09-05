import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../src/stores/gameStore';
import { createPinia, setActivePinia } from 'pinia';
import { MatchEngine } from '../src/game/engine/MatchEngine';
import { LEVEL_STARTING_MOVE_REQUIREMENTS } from '../src/game/engine/LevelGenerator';

const matchEngine = new MatchEngine();
const DEFAULT_MIN_MOVES = 1;

const countPlayableMoves = (board, cols, rows) => {
  if (!Array.isArray(board) || !cols || !rows) {
    return 0;
  }

  let moveCount = 0;

  for (let index = 0; index < board.length; index += 1) {
    if (!board[index]) {
      continue;
    }

    const col = index % cols;
    const rightIndex = col < cols - 1 ? index + 1 : -1;
    if (rightIndex >= 0 && board[rightIndex]) {
      const evaluation = matchEngine.evaluateSwap(board, cols, rows, index, rightIndex);
      if (evaluation?.matches?.length) {
        moveCount += 1;
      }
    }

    const belowIndex = index + cols;
    if (belowIndex < board.length && board[belowIndex]) {
      const evaluation = matchEngine.evaluateSwap(board, cols, rows, index, belowIndex);
      if (evaluation?.matches?.length) {
        moveCount += 1;
      }
    }
  }

  return moveCount;
};

describe('GameStore - Diverse Board Layouts', () => {
  let gameStore;

  beforeEach(() => {
    setActivePinia(createPinia());
    gameStore = useGameStore();

    // Mock minimal renderer for testing attachRenderer
    gameStore.attachRenderer({
      scene: {}, // Mock scene
      boardContainer: { add: () => {}, removeAll: () => {} },
      backgroundLayer: { add: () => {}, removeAll: () => {} },
      tileLayer: { add: () => {}, removeAll: () => {} },
      gemLayer: { add: () => {}, removeAll: () => {} },
      fxLayer: { add: () => {}, removeAll: () => {} },
      textures: {},
      bonusAnimations: {},
      tileTextures: {},
      particles: {},
    });

    gameStore.bootstrap(); // Load levels
    gameStore.sessionActive = true;
  });

  it('starts level 3 with a compact, fully populated, and playable board', () => {
    const levelThree = gameStore.availableLevels.find((level) => level.id === 3);
    expect(levelThree).toBeDefined();

    gameStore.startLevel(levelThree.id);

    expect(gameStore.boardCols).toBe(5);
    expect(gameStore.boardRows).toBe(5);
    expect(gameStore.currentBoardLayout.name).toBe('Compact-5x5');

    const allCellsFilled = gameStore.board.every((cell) => cell !== null);
    expect(allCellsFilled).toBe(true);

    const requiredMoves = LEVEL_STARTING_MOVE_REQUIREMENTS[levelThree.id] ?? DEFAULT_MIN_MOVES;
    const actualMoves = countPlayableMoves(
      gameStore.board,
      gameStore.boardCols,
      gameStore.boardRows,
    );
    expect(actualMoves).toBeGreaterThanOrEqual(requiredMoves);
  });
});
