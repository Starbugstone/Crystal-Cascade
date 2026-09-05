import { MatchEngine } from './MatchEngine.js';
import { createGem, randomGemType, GEM_TYPES } from './GemFactory.js';
import { detectBonusFromMatches } from './MatchPatterns.js';

const matchEngine = new MatchEngine();

export class TileManager {
  getResolution({
    board,
    tiles,
    matches,
    cols,
    rows,
    bonusesCreated,
    bonusIndices,
    gemTypes = GEM_TYPES,
  }) {
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
      if (iteration >= 128) throw new Error('Cascade did not settle after 128 steps');
      const cleared = new Set();
      const impacted = new Set();
      const protectedIndices = new Set();
      const cascadeBonuses = [];

      pendingMatches.forEach((match) => {
        match.indices.forEach((index) => {
          const tile = tiles[index];
          if (!tile || tile.state !== 'FROZEN') {
            if (index < 0 || index >= workingBoard.length) return;
            impacted.add(index);
            if (workingBoard[index] && !(tile?.type === 'blocker' && tile.health > 0))
              cleared.add(index);
          }
        });
      });

      if (iteration > 0) {
        const newBonuses = detectBonusFromMatches(pendingMatches);
        if (newBonuses.length > 0) {
          newBonuses.forEach((bonus) => {
            cascadeBonuses.push(bonus);
            workingBoard[bonus.index] = createGem(bonus.type);
          });
        }
      }

      // Handle bonus from initial swap (iteration 0)
      if (iteration === 0) {
        const hasBonusArrays = Array.isArray(bonusesCreated) && Array.isArray(bonusIndices);
        if (hasBonusArrays) {
          const loopCount = Math.min(bonusesCreated.length, bonusIndices.length);
          for (let i = 0; i < loopCount; i += 1) {
            const bonusIndex = bonusIndices[i];
            protectedIndices.add(bonusIndex);
            cleared.delete(bonusIndex);
            cascadeBonuses.push({ type: bonusesCreated[i], index: bonusIndex });
          }
          if (bonusesCreated.length !== bonusIndices.length) {
            console.warn('TileManager: bonus metadata length mismatch', {
              bonusesCreatedLength: bonusesCreated.length,
              bonusIndicesLength: bonusIndices.length,
            });
          }
        } else if (bonusesCreated || bonusIndices) {
          console.warn(
            'TileManager: expected arrays for bonusesCreated and bonusIndices during initial swap handling',
          );
        }
      }

      // Handle bonus from cascade
      cascadeBonuses.forEach((bonus) => {
        protectedIndices.add(bonus.index);
        cleared.delete(bonus.index);
      });

      const damageTargets = new Set([...impacted, ...protectedIndices]);
      // A block takes one hit per cascade step, even if several matched gems
      // or overlapping blast cells touch it. Diagonal matches do not damage it.
      for (const index of [...damageTargets]) {
        const x = index % totalCols;
        for (const neighbor of [
          x > 0 ? index - 1 : -1,
          x < totalCols - 1 ? index + 1 : -1,
          index - totalCols,
          index + totalCols,
        ]) {
          if (tiles[neighbor]?.type === 'blocker' && tiles[neighbor].health > 0)
            damageTargets.add(neighbor);
        }
      }

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
        bonuses: cascadeBonuses.map((b) => ({
          type: b.type,
          index: b.index,
          gem: workingBoard[b.index],
        })),
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
            if (tile.type === 'blocker' && tile.health === 0) tile.type = 'standard';
            step.tileUpdates.push({ index, health: tile.health, maxHealth, type: tile.type });
          }
        }
        if (!protectedIndices.has(index)) {
          workingBoard[index] = null;
        }
      });

      // Unfreeze adjacent tiles
      cleared.forEach((index) => {
        const x = index % totalCols;
        const y = Math.floor(index / totalCols);
        const adjacent = [
          { x: x - 1, y },
          { x: x + 1, y },
          { x, y: y - 1 },
          { x, y: y + 1 },
        ];
        adjacent.forEach((pos) => {
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
          // Existing gems below a barrier can fall within their segment, but
          // refill only enters from the top. Breaking it reconnects the column.
          if (
            (tiles[index]?.type === 'blocker' && tiles[index].health > 0) ||
            tiles[index]?.state === 'FROZEN'
          ) {
            writeRow = row - 1;
            continue;
          }
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
          let type = randomGemType(gemTypes);
          // A pathological RNG (or deterministic test) must not create an endless cascade.
          if (iteration >= 24) {
            const types = gemTypes;
            type =
              types.find(
                (candidate) =>
                  ![1, totalCols].some((stride) =>
                    [-2, -1, 0].some((offset) => {
                      const run = [0, 1, 2].map((n) => index + (offset + n) * stride);
                      if (run.some((i) => i < 0 || i >= workingBoard.length)) return false;
                      if (stride === 1 && run.some((i) => Math.floor(i / totalCols) !== spawnRow))
                        return false;
                      return run.every((i) => i === index || workingBoard[i]?.type === candidate);
                    }),
                  ),
              ) ?? type;
          }
          const newGem = createGem(type);
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
