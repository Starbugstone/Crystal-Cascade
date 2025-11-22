import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useGameStore } from '../src/stores/gameStore';
import { useInventoryStore } from '../src/stores/inventoryStore';
import { createPinia, setActivePinia } from 'pinia';
import { createGem } from '../src/game/engine/GemFactory';
import { BonusActivator } from '../src/game/engine/BonusActivator';

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

  it('should activate a clear_row bonus and clear a row', async () => {
    // Manually set gems to allow for a clear row bonus effect
    gameStore.board = [
      createGem('gem0'), createGem('gem1'), createGem('gem2'),
      createGem('gem0'), createGem('gem1'), createGem('gem2'),
      createGem('gem0'), createGem('gem1'), createGem('gem2'),
    ];

    const initialBoard = [...gameStore.board];
    const initialTiles = JSON.parse(JSON.stringify(gameStore.tiles));

    await gameStore.activateOneTimeBonus('clear_row');

    // Expecting the first row to be cleared, then immediately refilled once drops/spawns complete.
    // Because activateOneTimeBonus awaits the full animation pipeline, we only care that replacements happen.

    const clearedCount = gameStore.board.filter(gem => gem === null).length;
    expect(clearedCount).toBeLessThan(initialBoard.length); // Some gems should have been replaced

    const firstRowFilled = gameStore.board.slice(0, gameStore.boardCols).every(gem => gem !== null);
    expect(firstRowFilled).toBe(true); // First row should be refilled after drops/spawns resolve

    // Check if new gems were spawned
    const spawnedCount = gameStore.board.filter(gem => gem !== null).length;
    expect(spawnedCount).toBe(initialBoard.length); // Board should be full after drops and spawns
    expect(gameStore.board).not.toEqual(initialBoard);
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
  });
});

describe('BonusActivator previewSwap', () => {
  it('returns affected indices for bomb without mutating board', () => {
    const activator = new BonusActivator();
    const board = [
      createGem('ruby'), createGem('sapphire'), createGem('emerald'),
      createGem('topaz'), { ...createGem('bomb'), type: 'bomb' }, createGem('moonstone'),
      createGem('ruby'), createGem('sapphire'), createGem('emerald'),
    ];

    const preview = activator.previewSwap(board, 3, 3, { aIndex: 4, bIndex: 5 });
    expect(preview.length).toBeGreaterThan(0);
    expect(preview).toContain(5);
    expect(board[4].type).toBe('bomb');
  });
});

describe('Swap Bonus Power-up', () => {
  let gameStore;
  let inventoryStore;

  beforeEach(() => {
    setActivePinia(createPinia());
    gameStore = useGameStore();
    inventoryStore = useInventoryStore();

    gameStore.boardCols = 3;
    gameStore.boardRows = 3;
    gameStore.board = [
      createGem('ruby'), createGem('sapphire'), createGem('emerald'),
      createGem('topaz'), createGem('amethyst'), createGem('moonstone'),
      createGem('ruby'), createGem('sapphire'), createGem('emerald'),
    ];
    gameStore.tiles = Array.from({ length: 9 }, () => ({ state: 'PLAYABLE', health: 1 }));
    gameStore.sessionActive = true;
    gameStore.renderer = {
      animator: {
        animateSwap: vi.fn(() => Promise.resolve()),
        updateTiles: vi.fn(),
        clearQueuedSwapHighlight: vi.fn(),
      },
    };
  });

  it('starts with 10 swap bonuses and consumes one for a forced swap', async () => {
    const swapSlot = inventoryStore.quickAccessSlots.find((slot) => slot.id === 'swap-extra');
    expect(swapSlot.quantity).toBe(10);

    const activated = inventoryStore.usePowerUp('swap-extra');
    expect(activated).toBe(true);
    expect(gameStore.swapBonusArmed).toBe(true);

    const result = await gameStore.resolveSwap(0, 1);

    expect(result).toBe(true);
    expect(gameStore.swapBonusArmed).toBe(false);
    expect(gameStore.board[0].type).toBe('sapphire');
    expect(gameStore.board[1].type).toBe('ruby');
    expect(swapSlot.quantity).toBe(9);
    expect(gameStore.renderer.animator.animateSwap).toHaveBeenCalledWith({ aIndex: 0, bIndex: 1 });
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
      createGem('ruby'), createGem('sapphire'), createGem('emerald'),
      createGem('topaz'), { ...createGem('bomb'), type: 'bomb' }, createGem('moonstone'),
      createGem('ruby'), createGem('sapphire'), createGem('emerald'),
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
    expect(gameStore.renderer.animator.showBonusPreview).toHaveBeenCalledWith(gameStore.bonusPreview.indices);
  });

  it('clears preview state when requested', () => {
    gameStore.previewBonusSwap(4, 5);
    gameStore.clearBonusPreview(true);
    expect(gameStore.bonusPreview.indices).toHaveLength(0);
    expect(gameStore.renderer.animator.clearBonusPreview).toHaveBeenCalled();
  });
});
