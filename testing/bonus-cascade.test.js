import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGem, GEM_TYPES } from '../src/game/engine/GemFactory';
import { MatchEngine } from '../src/game/engine/MatchEngine';
import { TileManager } from '../src/game/engine/TileManager';

const engine = new MatchEngine();
const makeBoard = () => Array.from({ length: 25 }, (_, i) => createGem(GEM_TYPES[i % 6]));

afterEach(() => vi.restoreAllMocks());

describe.each(['bomb', 'cross', 'rainbow'])('%s alignment during cascades', (type) => {
  it.each([
    [3, 1],
    [4, 1],
    [5, 1],
    [3, 5],
    [4, 5],
    [5, 5],
  ])('does not match a line of %i bonuses with stride %i', (length, stride) => {
    const board = makeBoard();
    for (let i = 0; i < length; i++) board[i * stride] = createGem(type);
    expect(engine.findMatches(board, 5, 5)).toEqual([]);
  });

  it('preserves all three bonus identities when gravity brings them into a line', () => {
    let refill = 0;
    vi.spyOn(Math, 'random').mockImplementation(() => (refill++ % 6) / 6);
    const board = makeBoard();
    const bonuses = [5, 21, 22].map((index) => (board[index] = createGem(type)));
    for (const index of [10, 15, 20]) board[index] = createGem('ruby');
    const matches = engine.findMatches(board, 5, 5);
    expect(matches).toEqual([{ type: 'ruby', indices: [10, 15, 20], orientation: 'vertical' }]);

    const result = new TileManager().getResolution({
      board,
      tiles: board.map(() => ({ type: 'standard', health: 0 })),
      matches,
      cols: 5,
      rows: 5,
    });

    expect(result.steps[0].drops).toContainEqual({ from: 5, to: 20, gem: bonuses[0] });
    expect(result.board.slice(20, 23)).toEqual(bonuses);
    expect(result.steps.flatMap((step) => step.matches).every((match) => match.type !== type)).toBe(
      true,
    );
    expect(result.steps.flatMap((step) => step.bonuses)).toEqual([]);

    // The preserved pieces still activate and fuse through the usual controls.
    expect(engine.evaluateActivation(result.board, 5, 5, 20).matches[0].type).toBe(
      'bonus-activation',
    );
    expect(engine.evaluateSwap(result.board, 5, 5, 20, 21).matches[0].fusion).toBeDefined();
  });
});
