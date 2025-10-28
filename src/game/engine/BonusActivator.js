export class BonusActivator {
  activate(board, size, swap) {
    const a = board[swap.aIndex];
    const b = board[swap.bIndex];

    const allCleared = new Set();

    // Check and activate bonus at position A
    if (a.type === 'bomb') {
      this.activateBomb(board, size, swap.aIndex).forEach(i => allCleared.add(i));
    } else if (a.type === 'rainbow') {
      this.activateRainbow(board, size, swap.aIndex, b.type).forEach(i => allCleared.add(i));
    } else if (a.type === 'cross') {
      this.activateCross(board, size, swap.aIndex).forEach(i => allCleared.add(i));
    }

    // Check and activate bonus at position B
    if (b.type === 'bomb') {
      this.activateBomb(board, size, swap.bIndex).forEach(i => allCleared.add(i));
    } else if (b.type === 'rainbow') {
      this.activateRainbow(board, size, swap.bIndex, a.type).forEach(i => allCleared.add(i));
    } else if (b.type === 'cross') {
      this.activateCross(board, size, swap.bIndex).forEach(i => allCleared.add(i));
    }

    return [...allCleared];
  }

  activateBomb(board, size, index) {
    const cleared = new Set();
    const row = Math.floor(index / size);
    const col = index % size;
    for (let r = row - 1; r <= row + 1; r++) {
      for (let c = col - 1; c <= col + 1; c++) {
        if (r >= 0 && r < size && c >= 0 && c < size) {
          cleared.add(r * size + c);
        }
      }
    }
    return [...cleared];
  }

  activateRainbow(board, size, index, targetType) {
    const cleared = new Set();
    board.forEach((cell, i) => {
      if (cell.type === targetType) {
        cleared.add(i);
      }
    });
    cleared.add(index);
    cleared.add(index);
    return [...cleared];
  }

  activateCross(board, size, index) {
    const cleared = new Set();
    const row = Math.floor(index / size);
    const col = index % size;
    for (let i = 0; i < size; i++) {
      cleared.add(row * size + i);
      cleared.add(i * size + col);
    }
    cleared.add(index);
    return [...cleared];
  }
}
