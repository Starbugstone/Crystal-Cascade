import { BonusActivator } from './BonusActivator.js';

const bonusActivator = new BonusActivator();

export class BonusResolver {
  resolve(evaluation) {
    const { board, cols, rows, swap, matches } = evaluation;

    const clearedIndices = bonusActivator.activate(board, cols, rows, swap);

    if (clearedIndices.length > 0) {
      return {
        scoreGain: 0, // Score calculation will be handled elsewhere for now
        multiplier: 1, // Multiplier logic will be handled elsewhere
        board,
        matches: [{ type: 'bonus-activation', indices: clearedIndices }],
        bonusCreated: null,
        bonusIndex: null,
      };
    }

    return {
      scoreGain: 0,
      multiplier: 1,
      board,
      matches,
      bonusCreated: null,
      bonusIndex: null,
    };
  }
}
