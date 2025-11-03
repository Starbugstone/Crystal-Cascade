import { BonusActivator } from './BonusActivator.js';

const bonusActivator = new BonusActivator();

export class MatchEngine {
  evaluateSwap(board, size, aIndex, bIndex) {
    if (aIndex === bIndex) {
      return { matches: [], board, size, swap: null };
    }

    if (!this.areAdjacent(aIndex, bIndex, size)) {
      return { matches: [], board, size, swap: null };
    }

    const nextBoard = [...board];
    [nextBoard[aIndex], nextBoard[bIndex]] = [nextBoard[bIndex], nextBoard[aIndex]];

    const swap = { aIndex, bIndex };

    const bonusClear = bonusActivator.activate(nextBoard, size, swap);
    if (bonusClear.length > 0) {
      return { matches: [{ type: 'bonus-activation', indices: bonusClear }], board: nextBoard, size, swap };
    }

    const matches = this.findMatches(nextBoard, size);

    if (!matches.length) {
      return { matches: [], board, size, swap: null };
    }

    return { matches, board: nextBoard, size, swap };
  }

  findMatches(board, size) {
    const matches = [];
    const total = board.length;

    for (let index = 0; index < total; index += 1) {
      const gem = board[index];
      if (!gem) {
        continue;
      }

      const row = Math.floor(index / size);
      const col = index % size;

      // Horizontal run – only evaluate if this cell is the leftmost in the run
      const leftIndex = index - 1;
      const leftSame = col > 0 && board[leftIndex]?.type === gem.type;
      if (!leftSame) {
        const horizontal = [index];
        let cursor = index + 1;
        while (cursor % size !== 0 && board[cursor]?.type === gem.type) {
          horizontal.push(cursor);
          cursor += 1;
        }
        if (horizontal.length >= 3) {
          matches.push({ type: gem.type, indices: horizontal, orientation: 'horizontal' });
        }
      }

      // Vertical run – only evaluate if this cell is the topmost in the run
      const upperIndex = index - size;
      const upperSame = row > 0 && board[upperIndex]?.type === gem.type;
      if (!upperSame) {
        const vertical = [index];
        let cursor = index + size;
        while (cursor < total && board[cursor]?.type === gem.type) {
          vertical.push(cursor);
          cursor += size;
        }
        if (vertical.length >= 3) {
          matches.push({ type: gem.type, indices: vertical, orientation: 'vertical' });
        }
      }
    }

    return matches;
  }

  areAdjacent(aIndex, bIndex, size) {
    const ax = aIndex % size;
    const ay = Math.floor(aIndex / size);
    const bx = bIndex % size;
    const by = Math.floor(bIndex / size);
    const dx = Math.abs(ax - bx);
    const dy = Math.abs(ay - by);
    return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
  }
}
