import { MatchEngine } from './MatchEngine.js';
import { createGem, randomGemType } from './GemFactory.js';
import { detectBonusFromMatches } from './MatchPatterns.js';

const matchEngine = new MatchEngine();

export class TileManager {
  getResolution({ board, tiles, matches, size, bonusCreated, bonusIndex }) {
    if (!matches?.length) {
      return { board, steps: [] };
    }

    const workingBoard = [...board];
    const steps = [];

    let iteration = 0;
    let pendingMatches = matches.map((match) => ({
      type: match.type,
      indices: [...match.indices],
      orientation: match.orientation,
    }));

    while (pendingMatches.length) {
      const cleared = new Set();
      let cascadeBonusType = null;
      let cascadeBonusIndex = null;
      
      pendingMatches.forEach((match) => {
        match.indices.forEach((index) => {
          cleared.add(index);
        });
      });

      if (iteration > 0) {
        const cascadeBonus = detectBonusFromMatches(pendingMatches);
        if (cascadeBonus && typeof cascadeBonus.index === 'number') {
          cascadeBonusType = cascadeBonus.type;
          cascadeBonusIndex = cascadeBonus.index;
          workingBoard[cascadeBonusIndex] = createGem(cascadeBonusType);
        }
      }

      // Handle bonus from initial swap (iteration 0)
      if (iteration === 0 && bonusCreated && typeof bonusIndex === 'number') {
        cleared.delete(bonusIndex);
        cascadeBonusType = bonusCreated;
        cascadeBonusIndex = bonusIndex;
      }
      // Handle bonus from cascade
      else if (cascadeBonusType && typeof cascadeBonusIndex === 'number') {
        cleared.delete(cascadeBonusIndex);
      }

      if (!cleared.size) {
        break;
      }

      const step = {
        index: iteration,
        matches: pendingMatches.map((match) => ({
          type: match.type,
          indices: [...match.indices],
        })),
        cleared: [...cleared].sort((a, b) => a - b),
        drops: [],
        spawns: [],
        bonus:
          cascadeBonusType && typeof cascadeBonusIndex === 'number'
            ? { type: cascadeBonusType, index: cascadeBonusIndex, gem: workingBoard[cascadeBonusIndex] }
            : null,
      };

      step.cleared.forEach((index) => {
        if (tiles[index]) {
          tiles[index].health = Math.max(0, tiles[index].health - 1);
        }
        workingBoard[index] = null;
      });

      for (let col = 0; col < size; col += 1) {
        let writeRow = size - 1;
        for (let row = size - 1; row >= 0; row -= 1) {
          const index = row * size + col;
          const gem = workingBoard[index];
          if (gem) {
            const targetIndex = writeRow * size + col;
            if (targetIndex !== index) {
              workingBoard[targetIndex] = gem;
              workingBoard[index] = null;
              step.drops.push({ from: index, to: targetIndex, gem });
            }
            writeRow -= 1;
          }
        }

        for (let spawnRow = writeRow; spawnRow >= 0; spawnRow -= 1) {
          const index = spawnRow * size + col;
          const newGem = createGem(randomGemType());
          workingBoard[index] = newGem;
          step.spawns.push({ index, gem: newGem });
        }
      }

      steps.push(step);

      pendingMatches = matchEngine.findMatches(workingBoard, size);
      iteration += 1;
    }

    return {
      board: workingBoard,
      steps,
    };
  }

  applyMatchResult(payload) {
    return this.getResolution(payload).board;
  }
}
