import { BonusActivator } from './BonusActivator.js';
import { EvolutionEngine } from './EvolutionEngine.js';
import { detectBonusFromMatches } from './MatchPatterns.js';

const bonusActivator = new BonusActivator();
const evolutionEngine = new EvolutionEngine();

export class MatchEngine {
  evaluateSwap(board, cols, rows, aIndex, bIndex) {
    if (aIndex === bIndex) {
      return { matches: [], board, cols, rows, swap: null, bonusCreated: null, bonusIndex: null };
    }

    if (!this.areAdjacent(aIndex, bIndex, cols)) {
      return { matches: [], board, cols, rows, swap: null, bonusCreated: null, bonusIndex: null };
    }

    const nextBoard = [...board];
    [nextBoard[aIndex], nextBoard[bIndex]] = [nextBoard[bIndex], nextBoard[aIndex]];

    const swap = { aIndex, bIndex };

    const bonusClear = bonusActivator.activate(nextBoard, cols, rows, swap);
    if (bonusClear.length > 0) {
      return { matches: [{ type: 'bonus-activation', indices: bonusClear }], board: nextBoard, cols, rows, swap, bonusCreated: null, bonusIndex: null };
    }

    const matches = this.findMatches(nextBoard, cols, rows);

    if (!matches.length) {
      return { matches: [], board, cols, rows, swap: null, bonusCreated: null, bonusIndex: null };
    }

    const bonus = detectBonusFromMatches(matches, { swap });

    if (bonus) {
        nextBoard[bonus.index] = { ...nextBoard[bonus.index], type: bonus.type };
    }

    matches.forEach(match => {
      match.indices.forEach(index => {
        const gem = nextBoard[index];
        if (gem) {
          evolutionEngine.trackMatch(gem.type);
        }
      });
    });

    return { matches, board: nextBoard, cols, rows, swap, bonusCreated: bonus?.type, bonusIndex: bonus?.index };
  }

  findMatches(board, cols) {
    const matches = [];
    const total = board.length;

    for (let index = 0; index < total; index += 1) {
      const gem = board[index];
      if (!gem) {
        continue;
      }

      const row = Math.floor(index / cols);
      const col = index % cols;

      // Horizontal run – only evaluate if this cell is the leftmost in the run
      const leftIndex = index - 1;
      const leftSame = col > 0 && board[leftIndex]?.type === gem.type;
      if (!leftSame) {
        const horizontal = [index];
        let cursor = index + 1;
        while (cursor % cols !== 0 && board[cursor]?.type === gem.type) {
          horizontal.push(cursor);
          cursor += 1;
        }
        if (horizontal.length >= 3) {
          matches.push({ type: gem.type, indices: horizontal, orientation: 'horizontal' });
        }
      }

      // Vertical run – only evaluate if this cell is the topmost in the run
      const upperIndex = index - cols;
      const upperSame = row > 0 && board[upperIndex]?.type === gem.type;
      if (!upperSame) {
        const vertical = [index];
        let cursor = index + cols;
        while (cursor < total && board[cursor]?.type === gem.type) {
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