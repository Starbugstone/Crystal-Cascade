// Compare deterministic, hint-led playthroughs with another checkout:
// node scripts/measure-campaign.mjs [path-to-checkout]
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const source = resolve(process.argv[2] ?? '.', 'src');
const seedCount = Number(process.argv[3] ?? 0);
const levelCount = Number(process.argv[4] ?? 60);
const selectedIds = process.argv[5]?.split(',').map(Number);
const seeds = seedCount ? Array.from({ length: seedCount }, (_, i) => i + 1) : [1, 19, 73];
const moduleAt = (file) => import(pathToFileURL(resolve(source, file)));
const { generateLevelConfigs } = await moduleAt('game/engine/LevelGenerator.js');
const { MatchEngine } = await moduleAt('game/engine/MatchEngine.js');
const { HintEngine } = await moduleAt('game/engine/HintEngine.js');
const { TileManager } = await moduleAt('game/engine/TileManager.js');
const { canSwapGem, layerCount } = await moduleAt('game/engine/TileRules.js');
const { GEM_TYPES } = await moduleAt('game/engine/GemFactory.js');
const { detectBonusFromMatches } = await moduleAt('game/engine/MatchPatterns.js');
const engine = new MatchEngine(),
  hints = new HintEngine(),
  manager = new TileManager();
const results = [];
const originalRandom = Math.random;
try {
  for (const level of generateLevelConfigs(levelCount).filter(
    (level) => !selectedIds || selectedIds.includes(level.id),
  )) {
    for (const seed of seeds) {
      let randomState = level.id * seed * 7919;
      Math.random = () => {
        randomState = (randomState * 16807) % 2147483647;
        return (randomState - 1) / 2147483646;
      };
      let board = level.board.map((gem) => (gem ? { ...gem } : null));
      const tiles = level.tiles.map((tile) => ({ ...tile }));
      const cols = level.boardCols,
        rows = level.boardRows;
      const gemTypes =
        level.boardLayout.gemTypes ?? GEM_TYPES.slice(0, level.boardLayout.gemTypeCount);
      let turns = 0,
        shuffles = 0;
      const remaining = () =>
        tiles.some((tile) => layerCount(tile) > 0) || board.some((gem) => gem?.type === 'relic');
      while (remaining() && turns < 400 && shuffles < 30) {
        const move = hints.findBestMove(board, tiles, cols, rows);
        let evaluation;
        if (move) {
          evaluation = engine.evaluateSwap(
            board,
            cols,
            rows,
            move.swap.aIndex,
            move.swap.bIndex,
            tiles,
          );
          turns++;
        } else {
          const indices = board.flatMap((gem, index) =>
            canSwapGem(gem, tiles[index]) ? [index] : [],
          );
          for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [board[indices[i]], board[indices[j]]] = [board[indices[j]], board[indices[i]]];
          }
          const matches = engine.findMatches(board, cols, rows, tiles);
          const bonuses = detectBonusFromMatches(matches);
          for (const bonus of bonuses)
            board[bonus.index] = { ...board[bonus.index], type: bonus.type };
          evaluation = {
            board,
            matches,
            bonusesCreated: bonuses.map((bonus) => bonus.type),
            bonusIndices: bonuses.map((bonus) => bonus.index),
          };
          shuffles++;
        }
        board = manager.getResolution({ ...evaluation, tiles, cols, rows, gemTypes }).board;
      }
      results.push({ id: level.id, seed, turns, shuffles, complete: !remaining() });
    }
  }
} finally {
  Math.random = originalRandom;
}
const chapters = Array.from({ length: Math.ceil(levelCount / 6) }, (_, chapter) => {
  const runs = results.filter((run) => Math.floor((run.id - 1) / 6) === chapter);
  const turns = runs.map((run) => run.turns).sort((a, b) => a - b);
  return {
    chapter: chapter + 1,
    median: turns[Math.floor(turns.length / 2)],
    p90: turns[Math.ceil(turns.length * 0.9) - 1],
    max: turns.at(-1),
    shuffles: runs.reduce((sum, run) => sum + run.shuffles, 0),
  };
});
console.log(JSON.stringify({ chapters, results }, null, 2));
if (results.some((run) => !run.complete)) process.exitCode = 1;
