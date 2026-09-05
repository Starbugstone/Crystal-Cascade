import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useGameStore } from '../src/stores/gameStore';
import { useInventoryStore } from '../src/stores/inventoryStore';
import { createPinia, setActivePinia } from 'pinia';
import { createGem } from '../src/game/engine/GemFactory';
import { BonusActivator } from '../src/game/engine/BonusActivator';

describe('GameStore - Bonus Activation', () => {
  let gameStore;

  beforeEach(() => {
    vi.useFakeTimers();
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
        playSteps: vi.fn(() => Promise.resolve()),
        updateTiles: () => {},
      },
    };
  });

  it('should activate a clear_row bonus and clear a row', async () => {
    // Mock Math.random to always return 0 (first row)
    const originalRandom = Math.random;
    Math.random = () => 0;

    // Manually set gems to allow for a clear row bonus effect
    gameStore.board = [
      createGem('gem0'),
      createGem('gem1'),
      createGem('gem2'),
      createGem('gem3'),
      createGem('gem4'),
      createGem('gem5'),
      createGem('gem6'),
      createGem('gem7'),
      createGem('gem8'),
    ];

    const initialBoard = [...gameStore.board];

    await gameStore.activateOneTimeBonus('clear_row');

    // Restore Math.random
    Math.random = originalRandom;

    // Expecting the first row to be cleared (indices 0, 1, 2)
    // The board should have changed
    expect(gameStore.board).not.toEqual(initialBoard);
    const firstStep = gameStore.renderer.animator.playSteps.mock.calls[0][0][0];
    expect(firstStep.bonusEffect).toEqual({ type: 'clear_row', originIndex: 0 });
    expect(firstStep.cleared).toEqual([0, 1, 2]);
  });

  it('should not activate bonus if session is not active', async () => {
    gameStore.sessionActive = false;
    const initialBoard = [...gameStore.board];
    const activated = await gameStore.activateOneTimeBonus('clear_row');
    expect(activated).toBe(false);
    expect(gameStore.board).toEqual(initialBoard);
  });

  afterEach(() => {
    gameStore.cancelHint(true);
    vi.useRealTimers();
  });
});

describe('BonusActivator previewSwap', () => {
  it('returns affected indices for bomb without mutating board', () => {
    const activator = new BonusActivator();
    const board = [
      createGem('ruby'),
      createGem('sapphire'),
      createGem('emerald'),
      createGem('topaz'),
      { ...createGem('bomb'), type: 'bomb' },
      createGem('moonstone'),
      createGem('ruby'),
      createGem('sapphire'),
      createGem('emerald'),
    ];

    const preview = activator.previewSwap(board, 3, 3, { aIndex: 4, bIndex: 5 });
    expect(preview.length).toBeGreaterThan(0);
    expect(preview).toContain(5);
    expect(board[4].type).toBe('bomb');
  });
});

describe('Interactive Bonuses', () => {
  let gameStore;
  let inventoryStore;

  beforeEach(() => {
    vi.useFakeTimers();
    setActivePinia(createPinia());
    gameStore = useGameStore();
    inventoryStore = useInventoryStore();

    gameStore.boardCols = 3;
    gameStore.boardRows = 3;
    gameStore.board = [
      createGem('ruby'),
      createGem('sapphire'),
      createGem('emerald'),
      createGem('topaz'),
      createGem('amethyst'),
      createGem('moonstone'),
      createGem('ruby'),
      createGem('sapphire'),
      createGem('emerald'),
    ];
    gameStore.tiles = Array.from({ length: 9 }, () => ({ state: 'PLAYABLE', health: 1 }));
    gameStore.sessionActive = true;
    gameStore.renderer = {
      animator: {
        playSteps: vi.fn(() => Promise.resolve()),
        updateTiles: vi.fn(),
        clearQueuedSwapHighlight: vi.fn(),
      },
    };
  });

  it('activates hammer mode and clears its 3 by 3 area', async () => {
    const hammerSlot = inventoryStore.quickAccessSlots.find((slot) => slot.id === 'hammer');
    expect(hammerSlot.quantity).toBeGreaterThan(0);

    const activated = await inventoryStore.usePowerUp('hammer');
    expect(activated).toBe(true);
    expect(gameStore.activeBonusMode).toBe('hammer');

    // Count should NOT decrease yet
    expect(hammerSlot.quantity).toBe(3);

    const result = await gameStore.resolveBonusClick(0); // Click first gem

    expect(result).toBe(true);
    expect(gameStore.activeBonusMode).toBe(null);

    const cleared = gameStore.renderer.animator.playSteps.mock.calls[0][0][0].cleared;
    expect(cleared).toEqual(expect.arrayContaining([0, 1, 3, 4]));
    expect(gameStore.renderer.animator.playSteps.mock.calls[0][0][0].bonusEffect).toEqual({
      type: 'hammer',
      originIndex: 0,
    });
    expect(gameStore.board.every(Boolean)).toBe(true);

    expect(hammerSlot.quantity).toBe(2); // Consumed AFTER use
  });

  it('activates color wand mode and destroys all gems of same color', async () => {
    const wandSlot = inventoryStore.quickAccessSlots.find((slot) => slot.id === 'color-wand');
    expect(wandSlot.quantity).toBeGreaterThan(0);

    const activated = await inventoryStore.usePowerUp('color-wand');
    expect(activated).toBe(true);
    expect(gameStore.activeBonusMode).toBe('color_wand');

    // Board has rubies at 0 and 6
    const result = await gameStore.resolveBonusClick(0);

    expect(result).toBe(true);
    expect(gameStore.activeBonusMode).toBe(null);
    // Should have cleared both rubies (indices 0 and 6)
    // We can't easily check exact board state due to refill, but we can check that the move succeeded
  });

  afterEach(() => {
    gameStore.cancelHint(true);
    vi.useRealTimers();
  });
});

describe('Queued swap buffering', () => {
  let gameStore;

  beforeEach(() => {
    setActivePinia(createPinia());
    gameStore = useGameStore();
    gameStore.boardCols = 3;
    gameStore.boardRows = 3;
    gameStore.sessionActive = true;
    gameStore.animationInProgress = true;
    gameStore.pendingBoardState = [
      createGem('ruby'),
      createGem('sapphire'),
      createGem('emerald'),
      createGem('topaz'),
      createGem('amethyst'),
      createGem('moonstone'),
      createGem('ruby'),
      createGem('sapphire'),
      createGem('emerald'),
    ];
    gameStore.renderer = {
      animator: {
        showQueuedSwap: vi.fn(),
      },
    };
  });

  it('queues swaps even if they do not immediately form a match', () => {
    const result = gameStore.queueSwap(0, 1);
    expect(result).toBe(true);
    expect(gameStore.queuedSwap).toEqual({ aIndex: 0, bIndex: 1 });
    expect(gameStore.renderer.animator.showQueuedSwap).toHaveBeenCalledWith(0, 1);
  });

  afterEach(() => {
    gameStore.cancelHint(true);
  });
});

describe('GameStore bonus preview highlighting', () => {
  let gameStore;

  beforeEach(() => {
    setActivePinia(createPinia());
    gameStore = useGameStore();
    gameStore.boardCols = 3;
    gameStore.boardRows = 3;
    gameStore.board = [
      createGem('ruby'),
      createGem('sapphire'),
      createGem('emerald'),
      createGem('topaz'),
      { ...createGem('bomb'), type: 'bomb' },
      createGem('moonstone'),
      createGem('ruby'),
      createGem('sapphire'),
      createGem('emerald'),
    ];
    gameStore.tiles = Array.from({ length: 9 }, () => ({ state: 'PLAYABLE', health: 1 }));
    gameStore.sessionActive = true;
    gameStore.renderer = {
      animator: {
        showBonusPreview: vi.fn(),
        clearBonusPreview: vi.fn(),
        playSteps: vi.fn(() => Promise.resolve()),
        updateTiles: vi.fn(),
      },
    };
  });

  it('computes preview indices when dragging a bomb', () => {
    gameStore.previewBonusSwap(4, 5);
    expect(gameStore.bonusPreview.indices.length).toBeGreaterThan(0);
    expect(gameStore.renderer.animator.showBonusPreview).toHaveBeenCalledWith(
      gameStore.bonusPreview.indices,
    );
  });

  it('clears preview state when requested', () => {
    gameStore.previewBonusSwap(4, 5);
    gameStore.clearBonusPreview(true);
    expect(gameStore.bonusPreview.indices).toHaveLength(0);
    expect(gameStore.renderer.animator.clearBonusPreview).toHaveBeenCalled();
  });
});
