import { BonusActivator } from './BonusActivator.js';
import { detectBonusFromMatches } from './MatchPatterns.js';
import { canSwapGem } from './TileRules.js';

const bonusActivator = new BonusActivator();
export class MatchEngine {
  evaluateSwap(board, cols, rows, aIndex, bIndex, tiles = []) {
    if (
      !Number.isInteger(aIndex) ||
      !Number.isInteger(bIndex) ||
      aIndex < 0 ||
      bIndex < 0 ||
      aIndex >= board.length ||
      bIndex >= board.length ||
      !canSwapGem(board[aIndex], tiles[aIndex]) ||
      !canSwapGem(board[bIndex], tiles[bIndex]) ||
      aIndex === bIndex
    ) {
      return { matches: [], board, cols, rows, swap: null, bonusesCreated: [], bonusIndices: [] };
    }

    if (!this.areAdjacent(aIndex, bIndex, cols)) {
      return { matches: [], board, cols, rows, swap: null, bonusesCreated: [], bonusIndices: [] };
    }

    const nextBoard = [...board];
    [nextBoard[aIndex], nextBoard[bIndex]] = [nextBoard[bIndex], nextBoard[aIndex]];

    const swap = { aIndex, bIndex };

    const bonusClear = bonusActivator.activate(nextBoard, cols, rows, swap);
    if (bonusClear.length > 0) {
      return {
        matches: [{ type: 'bonus-activation', indices: bonusClear }],
        board: nextBoard,
        cols,
        rows,
        swap,
        bonusesCreated: [],
        bonusIndices: [],
      };
    }

    const matches = this.findMatches(nextBoard, cols, rows, tiles);

    if (!matches.length) {
      return { matches: [], board, cols, rows, swap: null, bonusesCreated: [], bonusIndices: [] };
    }

    const bonuses = detectBonusFromMatches(matches, { swap });
    const bonusesCreated = [];
    const bonusIndices = [];

    if (bonuses.length > 0) {
      bonuses.forEach((bonus) => {
        nextBoard[bonus.index] = { ...nextBoard[bonus.index], type: bonus.type };
        bonusesCreated.push(bonus.type);
        bonusIndices.push(bonus.index);
      });
    }

    return { matches, board: nextBoard, cols, rows, swap, bonusesCreated, bonusIndices };
  }

  findMatches(board, cols, rows, tiles = []) {
    const matches = [];
    const total = board.length;

    const typeAt = (index) =>
      board[index]?.type !== 'relic' && !(tiles[index]?.chainHealth > 0)
        ? board[index]?.type
        : null;

    for (let index = 0; index < total; index += 1) {
      const gem = board[index];
      if (!gem || !typeAt(index)) {
        continue;
      }

      const row = Math.floor(index / cols);
      const col = index % cols;

      // Horizontal run – only evaluate if this cell is the leftmost in the run
      const leftIndex = index - 1;
      const leftSame = col > 0 && typeAt(leftIndex) === gem.type;
      if (!leftSame) {
        const horizontal = [index];
        let cursor = index + 1;
        while (cursor % cols !== 0 && typeAt(cursor) === gem.type) {
          horizontal.push(cursor);
          cursor += 1;
        }
        if (horizontal.length >= 3) {
          matches.push({ type: gem.type, indices: horizontal, orientation: 'horizontal' });
        }
      }

      // Vertical run – only evaluate if this cell is the topmost in the run
      const upperIndex = index - cols;
      const upperSame = row > 0 && typeAt(upperIndex) === gem.type;
      if (!upperSame) {
        const vertical = [index];
        let cursor = index + cols;
        while (cursor < total && typeAt(cursor) === gem.type) {
          vertical.push(cursor);
          cursor += cols;
        }
        if (vertical.length >= 3) {
          matches.push({ type: gem.type, indices: vertical, orientation: 'vertical' });
        }
      }
    }

    return matches;
  }

  areAdjacent(aIndex, bIndex, cols) {
    const ax = aIndex % cols;
    const ay = Math.floor(aIndex / cols);
    const bx = bIndex % cols;
    const by = Math.floor(bIndex / cols);
    const dx = Math.abs(ax - bx);
    const dy = Math.abs(ay - by);
    return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
  }
}
