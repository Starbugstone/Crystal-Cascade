import { MatchEngine } from './MatchEngine.js';
import { createGem, randomGemType } from './GemFactory.js';
import { detectBonusFromMatches } from './MatchPatterns.js';

const matchEngine = new MatchEngine();

class GameTile {
  constructor(state, coordinates, element, unfreezeCondition = { trigger: 'ADJACENT_MATCH' }) {
    this.state = state;
    this.coordinates = coordinates;
    this.element = element;
    this.unfreezeCondition = unfreezeCondition;
  }
}

export class TileManager {
  getResolution({ board, tiles, matches, cols, rows, bonusesCreated, bonusIndices }) {
    if (!matches?.length) {
      return { board, steps: [] };
    }

    const totalCols = cols;
    const inferredRows = cols ? board.length / cols : 0;
    const totalRows = rows ?? Math.max(0, Math.round(inferredRows));

    if (!totalCols || !totalRows) {
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
    let totalLayersCleared = 0;

    while (pendingMatches.length) {
      const cleared = new Set();
      const protectedIndices = new Set();
      const cascadeBonuses = [];
      
      pendingMatches.forEach((match) => {
        match.indices.forEach((index) => {
          const tile = tiles[index];
          if (tile.state !== 'FROZEN') {
            cleared.add(index);
          }
        });
      });

      if (iteration > 0) {
        const newBonuses = detectBonusFromMatches(pendingMatches);
        if (newBonuses.length > 0) {
          newBonuses.forEach(bonus => {
            cascadeBonuses.push(bonus);
            workingBoard[bonus.index] = createGem(bonus.type);
          });
        }
      }

      // Handle bonus from initial swap (iteration 0)
      if (iteration === 0 && bonusesCreated && bonusIndices) {
        bonusesCreated.forEach((bonusCreated, i) => {
          const bonusIndex = bonusIndices[i];
          protectedIndices.add(bonusIndex);
          cleared.delete(bonusIndex);
          cascadeBonuses.push({ type: bonusCreated, index: bonusIndex });
        });
      }
      
      // Handle bonus from cascade
      cascadeBonuses.forEach(bonus => {
        protectedIndices.add(bonus.index);
        cleared.delete(bonus.index);
      });

      const damageTargets = new Set([...cleared, ...protectedIndices]);

      if (!damageTargets.size) {
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
        bonuses: cascadeBonuses.map(b => ({ type: b.type, index: b.index, gem: workingBoard[b.index] })),
        tileUpdates: [],
      };

      damageTargets.forEach((index) => {
        const tile = tiles[index];
        if (tile && tile.health > 0) {
          const before = tile.health;
          tile.health = Math.max(0, tile.health - 1);
          if (tile.maxHealth == null) {
            tile.maxHealth = before;
          }
          tile.cleared = tile.health === 0;
          const maxHealth = tile.maxHealth ?? before;
          if (before !== tile.health) {
            totalLayersCleared += before - tile.health;
            step.tileUpdates.push({ index, health: tile.health, maxHealth });
          }
        }
        if (!protectedIndices.has(index)) {
          workingBoard[index] = null;
        }
      });
      
      // Unfreeze adjacent tiles
      cleared.forEach(index => {
        const x = index % totalCols;
        const y = Math.floor(index / totalCols);
        const adjacent = [
          { x: x - 1, y },
          { x: x + 1, y },
          { x, y: y - 1 },
          { x, y: y + 1 },
        ];
        adjacent.forEach(pos => {
          if (pos.x >= 0 && pos.x < totalCols && pos.y >= 0 && pos.y < totalRows) {
            const adjacentIndex = pos.y * totalCols + pos.x;
            const adjacentTile = tiles[adjacentIndex];
            if (adjacentTile && adjacentTile.state === 'FROZEN') {
              adjacentTile.state = 'PLAYABLE';
              step.tileUpdates.push({ index: adjacentIndex, state: 'PLAYABLE' });
            }
          }
        });
      });

      for (let col = 0; col < totalCols; col += 1) {
        let writeRow = totalRows - 1;
        for (let row = totalRows - 1; row >= 0; row -= 1) {
          const index = row * totalCols + col;
          const gem = workingBoard[index];
          if (gem) {
            const targetIndex = writeRow * totalCols + col;
            if (targetIndex !== index) {
              workingBoard[targetIndex] = gem;
              workingBoard[index] = null;
              step.drops.push({ from: index, to: targetIndex, gem });
            }
            writeRow -= 1;
          }
        }

        for (let spawnRow = writeRow; spawnRow >= 0; spawnRow -= 1) {
          const index = spawnRow * totalCols + col;
          const newGem = createGem(randomGemType());
          workingBoard[index] = newGem;
          step.spawns.push({ index, gem: newGem });
        }
      }

      steps.push(step);

      pendingMatches = matchEngine.findMatches(workingBoard, totalCols);
      iteration += 1;
    }

    return {
      board: workingBoard,
      steps,
      cols: totalCols,
      rows: totalRows,
      layersCleared: totalLayersCleared,
    };
  }

  applyMatchResult(payload) {
    return this.getResolution(payload).board;
  }
}
