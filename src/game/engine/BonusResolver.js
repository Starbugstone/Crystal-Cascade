import { createGem } from './GemFactory.js';
import { detectBonusFromMatches } from './MatchPatterns.js';

const BASE_MATCH_SCORE = 100;

export class BonusResolver {
  resolve(result) {
    const { matches, board, cols, rows, swap } = result;
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

    const bonusPattern = detectBonusFromMatches(matches, { swap });

    if (bonusPattern) {
      const { type, index } = bonusPattern;
      if (typeof index === 'number') {
        nextBoard[index] = createGem(type);
        bonusCreated = type;
        bonusIndex = index;
      }
    }

    return {
      ...result,
      board: nextBoard,
      scoreGain,
      multiplier,
      bonusCreated,
      bonusIndex,
      cols,
      rows,
    };
  }
}
