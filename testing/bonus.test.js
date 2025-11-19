import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../src/stores/gameStore';
import { createPinia, setActivePinia } from 'pinia';
import { createGem } from '../src/game/engine/GemFactory';

describe('GameStore - Bonus Activation', () => {
  let gameStore;

  beforeEach(() => {
    setActivePinia(createPinia());
    gameStore = useGameStore();

    // Mock board and dimensions for testing
    gameStore.boardCols = 3;
    gameStore.boardRows = 3;
    gameStore.board = Array.from({ length: 9 }, (_, i) => createGem(`gem${i % 3}`));
    gameStore.tiles = Array.from({ length: 9 }, () => ({ state: 'PLAYABLE', health: 1 }));
    gameStore.sessionActive = true;
    gameStore.renderer = {
      animator: {
        playSteps: () => Promise.resolve(),
        updateTiles: () => {},
      },
    };
  });

  it('should activate a CLEAR_ROW bonus and clear a row', async () => {
    // Manually set gems to allow for a clear row bonus effect
    gameStore.board = [
      createGem('gem0'), createGem('gem1'), createGem('gem2'),
      createGem('gem0'), createGem('gem1'), createGem('gem2'),
      createGem('gem0'), createGem('gem1'), createGem('gem2'),
    ];

    const initialBoard = [...gameStore.board];
    const initialTiles = JSON.parse(JSON.stringify(gameStore.tiles));

    await gameStore.activateOneTimeBonus('CLEAR_ROW');

    // Expecting the first row to be cleared (nullified gems) and new gems to drop/spawn
    // Given the board setup, the activateBonus in BonusActivator will clear the first row
    // and then TileManager will handle drops and spawns.
    // So, we primarily check if some gems are null (cleared) and then new ones appear.

    const clearedCount = gameStore.board.filter(gem => gem === null).length;
    expect(clearedCount).toBeLessThan(initialBoard.length); // Some gems should have been replaced

    const nullCountInFirstRow = gameStore.board.slice(0, gameStore.boardCols).filter(gem => gem === null).length;
    expect(nullCountInFirstRow).toBe(gameStore.boardCols); // First row should be completely nullified before drops

    // Check if new gems were spawned
    const spawnedCount = gameStore.board.filter(gem => gem !== null).length;
    expect(spawnedCount).toBe(initialBoard.length); // Board should be full after drops and spawns
    expect(gameStore.board).not.toEqual(initialBoard);
  });

  it('should not activate bonus if session is not active', async () => {
    gameStore.sessionActive = false;
    const initialBoard = [...gameStore.board];
    const activated = await gameStore.activateOneTimeBonus('CLEAR_ROW');
    expect(activated).toBe(false);
    expect(gameStore.board).toEqual(initialBoard);
  });
});
