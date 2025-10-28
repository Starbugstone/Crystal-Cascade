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

    const primaryMatch = matches.find(m => m.indices.includes(swap.aIndex)) || 
                         matches.find(m => m.indices.includes(swap.bIndex)) || 
                         matches[0];

    const pattern = detectMatchPattern(primaryMatch, size);

    if (pattern) {
      const index = swap.aIndex; // Create bonus at the swap location
      if (pattern.shape === 'line' && pattern.length >= 5) {
        nextBoard[index] = { type: 'rainbow', highlight: true };
        bonusCreated = 'rainbow';
      } else if (pattern.shape === 'line' && pattern.length === 4) {
        nextBoard[index] = { type: 'bomb', highlight: true };
        bonusCreated = 'bomb';
      } else if (pattern.shape === 'cross') {
        nextBoard[index] = { type: 'cross', highlight: true };
        bonusCreated = 'cross';
      }
    }

    return {
      ...result,
      board: nextBoard,
      scoreGain,
      multiplier,
      bonusCreated,
    };
  }
}
