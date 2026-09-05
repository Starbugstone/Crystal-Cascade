import { MatchEngine } from './MatchEngine.js';

const SPECIAL = new Set(['bomb', 'cross', 'rainbow']);

export class HintEngine {
  constructor() {
    this.matchEngine = new MatchEngine();
  }

  findBestMove(board, tiles, cols, rows, { first = false } = {}) {
    if (!board?.length || !cols || !rows) return null;
    let best = null;
    for (let a = 0; a < board.length; a++) {
      for (const b of [a % cols < cols - 1 ? a + 1 : -1, a + cols]) {
        if (
          b < 0 ||
          b >= board.length ||
          !board[a] ||
          !board[b] ||
          tiles[a]?.state === 'FROZEN' ||
          tiles[b]?.state === 'FROZEN'
        )
          continue;
        const usesBonus = SPECIAL.has(board[a].type) || SPECIAL.has(board[b].type);
        // Bonus swaps are always legal. Never simulate their random clears or refills to suggest a move.
        const evaluation = usesBonus
          ? null
          : this.matchEngine.evaluateSwap(board, cols, rows, a, b);
        if (!usesBonus && !evaluation.matches.length) continue;
        const createsBonus = !!evaluation?.bonusesCreated.length;
        const indices = [
          ...new Set(evaluation?.matches.flatMap((match) => match.indices) ?? [a, b]),
        ];
        const damage = indices.reduce(
          (sum, index) => sum + Number((tiles[index]?.health ?? 0) > 0),
          0,
        );
        const heuristicScore =
          Number(usesBonus) * 10000 + Number(createsBonus) * 1000 + damage * 10 + indices.length;
        const candidate = {
          swap: { aIndex: a, bIndex: b },
          indices: [a, b],
          usesBonus,
          createsBonus,
          totalCleared: indices.length,
          heuristicScore,
        };
        if (first) return candidate;
        if (!best || candidate.heuristicScore > best.heuristicScore) best = candidate;
      }
    }
    return best;
  }
}
