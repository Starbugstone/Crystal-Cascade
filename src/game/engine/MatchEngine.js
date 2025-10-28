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
    const matches = this.findMatches(nextBoard, size, swap);

    if (!matches.length) {
      return { matches: [], board, size, swap: null };
    }

    return { matches, board: nextBoard, size, swap };
  }

  findMatches(board, size, swap = null) {
    const matches = [];
    const visited = new Set();

    // Handle rainbow swap first
    if (swap) {
      const a = board[swap.aIndex];
      const b = board[swap.bIndex];
      if (a.type === 'rainbow') {
        const targetType = b.type;
        const indices = board.map((c, i) => c.type === targetType ? i : -1).filter(i => i !== -1);
        matches.push({ type: 'rainbow-blast', indices: [...indices, swap.aIndex] });
        return matches;
      } else if (b.type === 'rainbow') {
        const targetType = a.type;
        const indices = board.map((c, i) => c.type === targetType ? i : -1).filter(i => i !== -1);
        matches.push({ type: 'rainbow-blast', indices: [...indices, swap.bIndex] });
        return matches;
      }
    }

    const collectMatch = (start, delta) => {
      const originType = board[start]?.type;
      if (!originType || originType === 'wildcard') {
        return;
      }

      const indices = [start];
      let cursor = start + delta;

      while (this.isWithinBounds(start, cursor, delta, size)) {
        const cursorType = board[cursor]?.type;
        if (cursorType === originType || cursorType === 'wildcard') {
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

    // Handle special gems in matches
    const matchedIndices = matches.flatMap(m => m.indices);
    const specialGems = matchedIndices.map(i => ({ index: i, type: board[i]?.type })).filter(g => g.type === 'bomb' || g.type === 'cross');

    if (specialGems.length > 0) {
      const clearedBySpecial = new Set();
      specialGems.forEach(gem => {
        if (gem.type === 'bomb') {
          const row = Math.floor(gem.index / size);
          const col = gem.index % size;
          for (let r = row - 1; r <= row + 1; r++) {
            for (let c = col - 1; c <= col + 1; c++) {
              if (r >= 0 && r < size && c >= 0 && c < size) {
                clearedBySpecial.add(r * size + c);
              }
            }
          }
        } else if (gem.type === 'cross') {
          const row = Math.floor(gem.index / size);
          const col = gem.index % size;
          for (let i = 0; i < size; i++) {
            clearedBySpecial.add(row * size + i);
            clearedBySpecial.add(i * size + col);
          }
        }
      });
      matches.push({ type: 'special-blast', indices: [...clearedBySpecial] });
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
