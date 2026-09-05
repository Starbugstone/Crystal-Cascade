import { afterEach, expect, it, vi } from 'vitest';
import { generateLevelConfigs } from '../src/game/engine/LevelGenerator';
import { MatchEngine } from '../src/game/engine/MatchEngine';
import { HintEngine } from '../src/game/engine/HintEngine';
import { TileManager } from '../src/game/engine/TileManager';
import { canSwapGem, layerCount } from '../src/game/engine/TileRules';
import { GEM_TYPES } from '../src/game/engine/GemFactory';
import { detectBonusFromMatches } from '../src/game/engine/MatchPatterns';

const levels = generateLevelConfigs();
const engine = new MatchEngine();
const hints = new HintEngine();
const manager = new TileManager();
afterEach(() => vi.restoreAllMocks());

// Exercise full games using legal hints, earned board bonuses and free
// dead-board shuffles. Inventory powers are never required for completion.
it.each(levels.map((level) => [level.id, level]))(
  'can finish level %i without inventory powers',
  (id, level) => {
    const cols = level.boardCols;
    const rows = level.boardRows;
    const gemTypes = GEM_TYPES.slice(0, level.boardLayout.gemTypeCount);
    for (const seed of [1, 19, 73]) {
      let randomState = id * seed * 7919;
      vi.spyOn(Math, 'random').mockImplementation(() => {
        randomState = (randomState * 16807) % 2147483647;
        return (randomState - 1) / 2147483646;
      });
      let board = level.board.map((gem) => (gem ? { ...gem } : null));
      const tiles = level.tiles.map((tile) => ({ ...tile }));
      const initialLayers = tiles.reduce((sum, tile) => sum + layerCount(tile), 0);
      const initialRelics = board.filter((gem) => gem?.type === 'relic').length;
      let cleared = 0,
        collected = 0,
        turns = 0,
        shuffles = 0;
      const remaining = () =>
        tiles.some((tile) => layerCount(tile) > 0) || board.some((gem) => gem?.type === 'relic');
      while (remaining() && turns < 400 && shuffles < 30) {
        const move = hints.findBestMove(board, tiles, cols, rows);
        let evaluation;
        if (move) {
          const { aIndex, bIndex } = move.swap;
          evaluation = engine.evaluateSwap(board, cols, rows, aIndex, bIndex, tiles);
          expect(evaluation.matches.length).toBeGreaterThan(0);
          turns++;
        } else {
          const indices = board.flatMap((gem, index) =>
            canSwapGem(gem, tiles[index]) ? [index] : [],
          );
          for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const a = indices[i],
              b = indices[j];
            [board[a], board[b]] = [board[b], board[a]];
          }
          const matches = engine.findMatches(board, cols, rows, tiles);
          // Preserve earned shuffle bonuses just as the game store does.
          const bonuses = detectBonusFromMatches(matches);
          for (const bonus of bonuses)
            board[bonus.index] = { ...board[bonus.index], type: bonus.type };
          evaluation = {
            board,
            matches,
            bonusesCreated: bonuses.map((bonus) => bonus.type),
            bonusIndices: bonuses.map((bonus) => bonus.index),
          };
          shuffles++;
        }
        const result = manager.getResolution({
          ...evaluation,
          tiles,
          cols,
          rows,
          gemTypes,
        });
        board = result.board;
        cleared += result.layersCleared ?? 0;
        collected += result.relicsCollected ?? 0;
        expect(cleared + tiles.reduce((sum, tile) => sum + layerCount(tile), 0)).toBe(
          initialLayers,
        );
        expect(collected + board.filter((gem) => gem?.type === 'relic').length).toBe(initialRelics);
      }
      expect({
        seed,
        remaining: remaining(),
        layers: initialLayers - cleared,
        relics: initialRelics - collected,
      }).toEqual({ seed, remaining: false, layers: 0, relics: 0 });
    }
  },
  15000,
);
