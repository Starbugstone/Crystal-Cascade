export class BonusActivator {
  constructor() {
    this.BONUS_TYPES = new Set(['bomb', 'rainbow', 'cross']);
  }

  isBonus(type) {
    return this.BONUS_TYPES.has(type);
  }

  activate(board, size, swap) {
    if (!swap) {
      return [];
    }

    const a = board[swap.aIndex];
    const b = board[swap.bIndex];

    const allCleared = new Set();
    const queue = [];
    const processed = new Set();

    const enqueue = (index, gem, context = {}) => {
      if (!gem || !this.isBonus(gem.type)) {
        return;
      }
      queue.push({ index, type: gem.type, context });
    };

    const rainbowContext = (gem, counterpart) => {
      if (!counterpart) {
        return { mode: 'random' };
      }
      if (counterpart.type === 'rainbow') {
        return { mode: 'all' };
      }
      if (this.isBonus(counterpart.type)) {
        return { mode: 'random' };
      }
      return { mode: 'target', targetType: counterpart.type };
    };

    // Check and activate bonus at position A
    enqueue(swap.aIndex, a, a?.type === 'rainbow' ? rainbowContext(a, b) : {});

    // Check and activate bonus at position B
    enqueue(swap.bIndex, b, b?.type === 'rainbow' ? rainbowContext(b, a) : {});

    while (queue.length) {
      const { index, type, context } = queue.shift();
      if (processed.has(index)) {
        continue;
      }
      processed.add(index);

      const result = this.activateBonus(type, board, size, index, context);
      result.forEach((resolvedIndex) => {
        if (!allCleared.has(resolvedIndex)) {
          allCleared.add(resolvedIndex);
          if (resolvedIndex !== index) {
            const gem = board[resolvedIndex];
            if (this.isBonus(gem?.type) && !processed.has(resolvedIndex)) {
              queue.push({ index: resolvedIndex, type: gem.type, context: this.chainContextFor(gem) });
            }
          }
        }
      });
    }

    return [...allCleared];
  }

  activateBonus(type, board, size, index, context = {}) {
    switch (type) {
      case 'bomb':
        return this.activateBomb(board, size, index);
      case 'cross':
        return this.activateCross(board, size, index);
      case 'rainbow':
        return this.activateRainbow(board, size, index, context);
      default:
        return [index];
    }
  }

  chainContextFor(gem) {
    if (!gem || !this.isBonus(gem.type)) {
      return {};
    }
    if (gem.type === 'rainbow') {
      return { mode: 'random' };
    }
    return {};
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

  activateRainbow(board, size, index, context) {
    const cleared = new Set();
    const mode = context?.mode ?? 'target';

    if (mode === 'all') {
      board.forEach((cell, i) => {
        if (cell) {
          cleared.add(i);
        }
      });
    } else if (mode === 'target' && context?.targetType) {
      board.forEach((cell, i) => {
        if (cell?.type === context.targetType) {
          cleared.add(i);
        }
      });
    } else {
      const available = board
        .map((cell, i) => (cell ? i : null))
        .filter((i) => i != null && i !== index);

      const picks = Math.min(15, available.length);
      for (let count = 0; count < picks; count += 1) {
        if (!available.length) {
          break;
        }
        const randomIndex = Math.floor(Math.random() * available.length);
        const [selected] = available.splice(randomIndex, 1);
        cleared.add(selected);
      }
    }

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
