import { MatchEngine } from './MatchEngine.js';

const matchEngine = new MatchEngine();
const GEM_TYPES = ['ruby', 'sapphire', 'emerald', 'topaz', 'amethyst', 'moonstone'];

const randomGem = () => GEM_TYPES[Math.floor(Math.random() * GEM_TYPES.length)];

export class TileManager {
  applyMatchResult({ board, tiles, matches, size, bonusCreated, bonusIndex }) {
    if (!matches?.length) {
      return board;
    }

    const nextBoard = [...board];
    const clearedIndices = new Set();

    matches.forEach((match) => {
      match.indices.forEach((index) => {
        clearedIndices.add(index);
        if (tiles[index]) {
          tiles[index].health = Math.max(0, tiles[index].health - 1);
        }
      });
    });

    // If a bonus was created, don't clear the gem at the swap location
    if (bonusCreated && typeof bonusIndex === 'number') {
      clearedIndices.delete(bonusIndex);
    }

    // Remove gems that were cleared
    clearedIndices.forEach((index) => {
      nextBoard[index] = null;
    });

    // Apply gravity column by column
    for (let col = 0; col < size; col += 1) {
      let empty = 0;
      for (let row = size - 1; row >= 0; row--) {
        const index = row * size + col;
        if (nextBoard[index] === null) {
          empty++;
        } else if (empty > 0) {
          nextBoard[index + empty * size] = nextBoard[index];
          nextBoard[index] = null;
        }
      }

      for (let i = 0; i < empty; i++) {
        nextBoard[i * size + col] = {
          type: randomGem(),
          highlight: false,
        };
      }
    }

    const newMatches = matchEngine.findMatches(nextBoard, size);
    if (newMatches.length > 0) {
      return this.applyMatchResult({ board: nextBoard, tiles, matches: newMatches, size });
    }

    return nextBoard;
  }
}
