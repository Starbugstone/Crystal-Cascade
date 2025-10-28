const BASE_MATCH_SCORE = 100;

const detectMatchPattern = (match, size) => {
  if (match.indices.length < 3) return null;

  const rows = new Set(match.indices.map(i => Math.floor(i / size)));
  const cols = new Set(match.indices.map(i => i % size));

  const isLine = rows.size === 1 || cols.size === 1;
  if (isLine) {
    return { shape: 'line', length: match.indices.length };
  }

  if (rows.size >= 3 && cols.size >= 3) {
    return { shape: 'cross', length: match.indices.length };
  }

  return null;
};

export class BonusResolver {
  resolve(result) {
    const { matches, board, size, swap } = result;
    if (!matches.length) {
      return { ...result, scoreGain: 0, multiplier: 1 };
    }

    const clearedGems = matches.reduce((total, match) => total + match.indices.length, 0);
    const cascades = matches.length - 1;
    const multiplier = Math.min(10, 1 + cascades);
    const scoreGain = clearedGems * BASE_MATCH_SCORE * multiplier;

    let nextBoard = [...board];
    let bonusCreated = null;
    let bonusIndex = null;

    // Only process pattern detection for normal matches, not bonus activations
    const primaryMatch = matches.find((m) => m.type !== 'bonus-activation' && m.indices.includes(swap.aIndex)) ||
      matches.find((m) => m.type !== 'bonus-activation' && m.indices.includes(swap.bIndex)) ||
      matches.find((m) => m.type !== 'bonus-activation');

    const pattern = primaryMatch ? detectMatchPattern(primaryMatch, size) : null;

    if (pattern && primaryMatch) {
      const swapIndex = primaryMatch.indices.includes(swap.aIndex)
        ? swap.aIndex
        : primaryMatch.indices.includes(swap.bIndex)
          ? swap.bIndex
          : primaryMatch.indices[0];

      if (pattern.shape === 'line' && pattern.length >= 5) {
        nextBoard[swapIndex] = { type: 'rainbow', highlight: true };
        bonusCreated = 'rainbow';
        bonusIndex = swapIndex;
      } else if (pattern.shape === 'line' && pattern.length === 4) {
        nextBoard[swapIndex] = { type: 'bomb', highlight: true };
        bonusCreated = 'bomb';
        bonusIndex = swapIndex;
      } else if (pattern.shape === 'cross') {
        nextBoard[swapIndex] = { type: 'cross', highlight: true };
        bonusCreated = 'cross';
        bonusIndex = swapIndex;
      }
    }

    return {
      ...result,
      board: nextBoard,
      scoreGain,
      multiplier,
      bonusCreated,
      bonusIndex,
    };
  }
}
