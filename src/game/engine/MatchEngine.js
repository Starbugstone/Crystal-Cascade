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

    const matches = this.findMatches(nextBoard, size, swap);

    if (!matches.length) {
      return { matches: [], board, size, swap: null };
    }

    return { matches, board: nextBoard, size, swap };
  }

  findMatches(board, size) {
    const matches = [];
    const visited = new Set();

    const collectMatch = (start, delta) => {
      const originType = board[start]?.type;
      if (!originType) {
        return;
      }

      const indices = [start];
      let cursor = start + delta;

      while (this.isWithinBounds(start, cursor, delta, size)) {
        const cursorType = board[cursor]?.type;
        if (cursorType === originType) {
          indices.push(cursor);
          cursor += delta;
        } else {
          break;
        }
      }

      if (indices.length >= 3) {
        indices.forEach((index) => visited.add(index));
        matches.push({ type: originType, indices });
      }
    };

    for (let i = 0; i < board.length; i++) {
      if (!visited.has(i)) {
        collectMatch(i, 1); // Horizontal
        collectMatch(i, size); // Vertical
      }
    }

    return matches;
  }

  isWithinBounds(origin, cursor, delta, size) {
    if (cursor < 0 || cursor >= size * size) {
      return false;
    }

    if (delta === 1) {
      const originRow = Math.floor(origin / size);
      const cursorRow = Math.floor(cursor / size);
      return originRow === cursorRow;
    }

    return true;
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
