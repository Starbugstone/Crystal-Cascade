import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { createGem, GEM_TYPES } from '../src/game/engine/GemFactory';
import { MatchEngine } from '../src/game/engine/MatchEngine';
import { HintEngine } from '../src/game/engine/HintEngine';
import { TileManager } from '../src/game/engine/TileManager';
import { useGameStore } from '../src/stores/gameStore';

const engine = new MatchEngine();
const fixture = (type, length = 3) => {
  const board = Array.from({ length: 36 }, (_, i) =>
    createGem(GEM_TYPES[((i % 6) + 2 * Math.floor(i / 6)) % 6]),
  );
  for (let i = 6; i < 6 + length; i++) board[i] = createGem('ruby');
  board[6 + length] = createGem('sapphire');
  board[8] = createGem(type);
  board[14] = createGem('ruby');
  const tiles = board.map(() => ({ type: 'standard', health: 2, maxHealth: 2 }));
  return { board, tiles };
};
const resolve = ({ board, tiles }, a = 8, b = 14) =>
  new TileManager().getResolution({ ...engine.evaluateSwap(board, 6, 6, a, b, tiles), tiles });

beforeEach(() => {
  let seed = 12345;
  vi.spyOn(Math, 'random').mockImplementation(() => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  });
});
afterEach(() => vi.restoreAllMocks());

describe('alignments made by moving a bonus', () => {
  it.each(['bomb', 'cross', 'rainbow'])(
    'clears the match before the %s, with no gravity or cascade in between',
    (type) => {
      const setup = fixture(type);
      expect(engine.findMatches(setup.board, 6, 6)).toEqual([]);
      const gravity = vi.spyOn(TileManager.prototype, 'applyGravity');
      const result = resolve(setup);
      const [alignment, blast] = result.steps;
      expect(alignment.matches).toEqual([
        { type: 'ruby', indices: [6, 7, 8], orientation: 'horizontal' },
      ]);
      expect(alignment.cleared).toEqual([6, 7, 8]);
      expect(alignment.drops).toEqual([]);
      expect(alignment.spawns).toEqual([]);
      expect(alignment.collectedJewels).toHaveLength(3);
      expect(blast.matches[0].type).toBe('bonus-activation');
      expect(blast.cleared).toContain(14);
      expect(blast.cleared).not.toEqual(expect.arrayContaining([6, 7, 8]));
      expect(blast.spawns.length).toBeGreaterThan(0);
      expect(gravity.mock.calls[0][6]).toBe(blast);
      expect(result.steps.slice(0, 2).map((step) => step.index)).toEqual([0, 0]);
      expect(result.steps.slice(2).every((step) => step.index >= 1)).toBe(true);
      const collectedIds = result.steps.flatMap((step) =>
        step.collectedJewels.map((gem) => gem.id),
      );
      expect(new Set(collectedIds).size).toBe(collectedIds.length);
    },
  );

  it('also resolves the alignment when the swap is made in the opposite direction', () => {
    expect(resolve(fixture('bomb'), 14, 8).steps[0].cleared).toEqual([6, 7, 8]);
  });

  it('recognizes the earned match bonus when choosing a hint without rolling randomness', () => {
    const { board, tiles } = fixture('bomb', 4);
    for (const tile of tiles) tile.health = tile.maxHealth = 0;
    const hint = new HintEngine().findBestMove(board, tiles, 6, 6);
    expect(hint).toMatchObject({
      swap: { aIndex: 8, bIndex: 14 },
      usesBonus: true,
      createsBonus: true,
    });
    expect(Math.random).not.toHaveBeenCalled();
  });

  it('applies both the match and subsequent blast to overlapping ice', () => {
    const [alignment, blast] = resolve(fixture('bomb')).steps;
    expect(alignment.tileUpdates).toContainEqual(expect.objectContaining({ index: 7, health: 1 }));
    expect(blast.tileUpdates).toContainEqual(expect.objectContaining({ index: 7, health: 0 }));
    expect(blast.cleared).not.toContain(7);
  });

  it.each([
    [4, 'bomb'],
    [5, 'rainbow'],
  ])('awards the bonus for a match of %i before the moved bomb fires', (length, type) => {
    const [alignment, blast] = resolve(fixture('bomb', length)).steps;
    expect(alignment.bonuses).toEqual([
      expect.objectContaining({ index: 8, type, gem: expect.objectContaining({ type }) }),
    ]);
    expect(alignment.cleared).not.toContain(8);
    expect(blast.cleared).toEqual(expect.arrayContaining([8, 14]));
    expect(blast.bonuses).toEqual([]);
    expect(blast.bonusFusion).toBeUndefined();
    if (type === 'bomb') expect(blast.cleared).toContain(2); // Reached by the newly earned bomb.
  });

  it.each([3, 4, 5])(
    'keeps the rainbow target color after its counterpart makes a match of %i',
    (length) => {
      const setup = fixture('rainbow', length);
      const [alignment, blast] = resolve(setup).steps;
      const remainingRubies = setup.board.flatMap((gem, index) =>
        gem.type === 'ruby' && index !== 14 && (index < 6 || index >= 6 + length) ? [index] : [],
      );
      expect(blast.cleared).toEqual([...remainingRubies, 14].sort((a, b) => a - b));
      expect(blast.bonusFusion).toBeUndefined();
      if (length >= 4) {
        expect(alignment.bonuses).toHaveLength(1);
        expect(blast.cleared).not.toContain(8);
      }
    },
  );

  it('still activates when a frozen jewel survives the alignment', () => {
    const setup = fixture('bomb');
    setup.tiles[6].state = 'FROZEN';
    const [alignment, blast] = resolve(setup).steps;
    expect(alignment.cleared).toEqual([7, 8]);
    expect(blast.cleared).toContain(14);
  });

  it('awards a cross for intersecting alignments before chaining it into the blast', () => {
    const setup = fixture('bomb');
    for (const index of [2, 9]) setup.board[index] = createGem('ruby');
    expect(engine.findMatches(setup.board, 6, 6)).toEqual([]);
    const [alignment, blast] = resolve(setup, 8, 9).steps;
    expect(alignment.matches).toHaveLength(2);
    expect(alignment.bonuses).toEqual([expect.objectContaining({ type: 'cross', index: 8 })]);
    expect(blast.cleared).toEqual(expect.arrayContaining([8, 9, 32]));
    expect(blast.bonusFusion).toBeUndefined();
  });

  it('passes both phases to the renderer and scores them at the same tier', async () => {
    setActivePinia(createPinia());
    const game = useGameStore();
    const setup = fixture('bomb', 4);
    game.board = setup.board;
    game.tiles = setup.tiles;
    game.boardCols = game.boardRows = game.boardSize = 6;
    game.sessionActive = true;
    game.remainingLayers = 72;
    const playSteps = vi.fn();
    game.renderer = {
      animator: {
        animateSwap: vi.fn(),
        playSteps,
        clearQueuedSwapHighlight: vi.fn(),
        updateTiles: vi.fn(),
      },
    };
    // Isolate the swap's two phases from random refills and later cascades.
    vi.spyOn(TileManager.prototype, 'applyGravity').mockImplementation(() => {});
    vi.spyOn(game, 'ensurePlayableBoard').mockResolvedValue(true);
    try {
      expect(await game.resolveSwap(8, 14)).toBe(true);
      const steps = playSteps.mock.calls[0][0];
      expect(steps).toHaveLength(2);
      expect(steps[0].bonuses[0].type).toBe('bomb');
      expect(steps[1].matches[0].type).toBe('bonus-activation');
      expect(game.score).toBe(steps.reduce((sum, step) => sum + step.cleared.length * 100, 0));
      expect(game.collectedJewels).toBe(
        steps.reduce((sum, step) => sum + step.collectedJewels.length, 0),
      );
      expect(game.maxCascade).toBe(1);
      expect(game.comboCounts).toEqual({});
      expect(game.moves).toBe(1);
    } finally {
      game.cancelHint(true);
    }
  });
});
