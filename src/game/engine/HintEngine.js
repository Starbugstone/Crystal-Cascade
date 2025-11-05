import { MatchEngine } from './MatchEngine.js';
import { BonusResolver } from './BonusResolver.js';
import { TileManager } from './TileManager.js';
import { cloneGem } from './GemFactory.js';

const PRIORITY_WEIGHTS = {
  useBonus: 4,
  createBonus: 3,
  cascade: 2,
  basic: 1,
};

const isValidIndex = (index) => typeof index === 'number' && index >= 0;

export class HintEngine {
  constructor() {
    this.matchEngine = new MatchEngine();
    this.bonusResolver = new BonusResolver();
    this.tileManager = new TileManager();
  }

  findBestMove(board, tiles, cols, rows) {
    if (!Array.isArray(board) || !board.length || !cols || !rows) {
      return null;
    }

    const evaluations = [];

    for (let index = 0; index < board.length; index += 1) {
      const col = index % cols;

      // Right neighbour
      if (col < cols - 1) {
        const result = this.evaluateSwap(board, tiles, cols, rows, index, index + 1);
        if (result) {
          evaluations.push(result);
        }
      }

      // Down neighbour
      const below = index + cols;
      if (below < board.length) {
        const result = this.evaluateSwap(board, tiles, cols, rows, index, below);
        if (result) {
          evaluations.push(result);
        }
      }
    }

    if (!evaluations.length) {
      return null;
    }

    let currentBest = evaluations[0];

    for (let i = 1; i < evaluations.length; i += 1) {
      const candidate = evaluations[i];
      if (candidate.heuristicScore > currentBest.heuristicScore) {
        currentBest = candidate;
      }
    }

    return currentBest;
  }

  evaluateSwap(board, tiles, cols, rows, aIndex, bIndex) {
    const evaluation = this.matchEngine.evaluateSwap(board, cols, rows, aIndex, bIndex);
    if (!evaluation?.matches?.length) {
      return null;
    }

    const clonedBoard = evaluation.board.map((gem) => (gem ? cloneGem(gem) : gem));
    const clonedTiles = Array.isArray(tiles)
      ? tiles.map((tile) => (tile ? { ...tile } : tile))
      : [];

    const breakdown = this.bonusResolver.resolve({ ...evaluation, board: clonedBoard });

    const resolution = this.tileManager.getResolution({
      board: breakdown.board,
      tiles: clonedTiles,
      matches: breakdown.matches,
      cols,
      rows,
      bonusCreated: breakdown.bonusCreated,
      bonusIndex: breakdown.bonusIndex,
    });

    const usesBonus = evaluation.matches.some((match) => match.type === 'bonus-activation');
    const createsBonus = Boolean(breakdown.bonusCreated);

    const clearedSet = new Set();
    let maxMatchesInStep = 0;

    resolution.steps.forEach((step) => {
      step.cleared.forEach((index) => clearedSet.add(index));
      if (Array.isArray(step.matches)) {
        maxMatchesInStep = Math.max(maxMatchesInStep, step.matches.length);
      }
    });

    const cascadeCount = resolution.steps.length;
    const totalCleared = clearedSet.size;
    const scoreGain = breakdown.scoreGain ?? 0;

    const priorityTier = this.resolvePriority({
      usesBonus,
      createsBonus,
      cascadeCount,
      maxMatchesInStep,
    });

    const centerBias = this.computeCenterBias({ aIndex, bIndex, cols, rows });

    const heuristicScore = this.buildScore({
      priorityTier,
      usesBonus,
      createsBonus,
      totalCleared,
      cascadeCount,
      maxMatchesInStep,
      scoreGain,
      centerBias,
    });

    return {
      swap: { aIndex, bIndex },
      indices: [aIndex, bIndex],
      usesBonus,
      createsBonus,
      cascadeCount,
      totalCleared,
      scoreGain,
      priorityTier,
      maxMatchesInStep,
      centerBias,
      heuristicScore,
    };
  }

  resolvePriority({ usesBonus, createsBonus, cascadeCount, maxMatchesInStep }) {
    if (usesBonus) {
      return PRIORITY_WEIGHTS.useBonus;
    }
    if (createsBonus) {
      return PRIORITY_WEIGHTS.createBonus;
    }
    if (cascadeCount > 1 || maxMatchesInStep > 1) {
      return PRIORITY_WEIGHTS.cascade;
    }
    return PRIORITY_WEIGHTS.basic;
  }

  computeCenterBias({ aIndex, bIndex, cols, rows }) {
    if (!isValidIndex(aIndex) || !isValidIndex(bIndex) || !cols || !rows) {
      return Number.POSITIVE_INFINITY;
    }

    const centerX = (cols - 1) / 2;
    const centerY = (rows - 1) / 2;

    const distanceFor = (index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const dx = col - centerX;
      const dy = row - centerY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const distanceA = distanceFor(aIndex);
    const distanceB = distanceFor(bIndex);

    return (distanceA + distanceB) / 2;
  }

  buildScore({
    priorityTier,
    usesBonus,
    createsBonus,
    totalCleared,
    cascadeCount,
    maxMatchesInStep,
    scoreGain,
    centerBias,
  }) {
    const priorityWeight = priorityTier * 1e9;
    const bonusWeight = (usesBonus ? 5 : createsBonus ? 2 : 0) * 1e7;
    const clearedWeight = totalCleared * 1e6;
    const cascadeWeight = cascadeCount * 6e5 + maxMatchesInStep * 4e5;
    const scoreWeight = scoreGain * 100;
    const centerWeight = Number.isFinite(centerBias) ? -centerBias * 1e5 : 0;

    return priorityWeight + bonusWeight + clearedWeight + cascadeWeight + scoreWeight + centerWeight;
  }
}
