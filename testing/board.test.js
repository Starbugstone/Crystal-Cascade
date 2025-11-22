import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../src/stores/gameStore';
import { createPinia, setActivePinia } from 'pinia';
import { createGem } from '../src/game/engine/GemFactory';
import { generateLevelConfigs } from '../src/game/engine/LevelGenerator';

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

  it('should load a level with a non-rectangular board layout', () => {
    const lShapeLevel = gameStore.availableLevels.find(level => level.config.boardLayout?.name === 'L-Shape');
    expect(lShapeLevel).toBeDefined();

    gameStore.startLevel(lShapeLevel.id);

    expect(gameStore.boardCols).toBe(lShapeLevel.config.boardLayout.dimensions.cols);
    expect(gameStore.boardRows).toBe(lShapeLevel.config.boardLayout.dimensions.rows);
    expect(gameStore.currentBoardLayout).toEqual(lShapeLevel.config.boardLayout);

    // Verify blocked cells are null in the board
    lShapeLevel.config.boardLayout.blockedCells.forEach(cell => {
      const index = cell.y * gameStore.boardCols + cell.x;
      expect(gameStore.board[index]).toBeNull();
    });

    // Verify non-blocked cells have gems
    const totalCells = lShapeLevel.config.boardLayout.dimensions.cols * lShapeLevel.config.boardLayout.dimensions.rows;
    const blockedCount = lShapeLevel.config.boardLayout.blockedCells.length;
    let gemCount = 0;
    for (let i = 0; i < totalCells; i++) {
      if (!lShapeLevel.config.boardLayout.blockedCells.some(cell => cell.y * gameStore.boardCols + cell.x === i)) {
        if (gameStore.board[i]) {
          gemCount++;
        }
      }
    }
    expect(gemCount).toBe(totalCells - blockedCount);
  });
});
