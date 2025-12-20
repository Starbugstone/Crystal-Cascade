# Level Generation Notes

_Last updated: 2025-12-20_

Crystal Cascade now enforces deterministic-yet-playable starting layouts for generated levels, with special constraints for the compact third level.

## Compact Level 3

- **Layout**: `Compact-5x5` rectangular grid (5 columns × 5 rows)
- **Blocked Cells**: None – every coordinate is expected to hold a gem at spawn
- **Move Budget**: Requires at least three valid swaps before the first player action

The generator keeps rolling the RNG (seeded per level for determinism) until it finds a board that satisfies both of these rules, or it logs a warning after 60 attempts and falls back to the last attempt.

## Implementation Details

- `LEVEL_STARTING_MOVE_REQUIREMENTS` maps level IDs to their minimum move counts (level 3 → 3). The default for other levels remains one valid move.
- `createPlayableBoard()` now:
  1. Populates the grid using the seeded RNG.
  2. Rejects boards with unexpected null cells (unblocked holes).
  3. Counts candidate swaps via `MatchEngine.evaluateSwap()` until it hits the required move count.
  4. Retries (up to 60 passes) before logging a warning and returning the last board.

These constraints guarantee the compact board always spawns full and offers “a few” tactical options at the start of the level, aligning with the latest gameplay feedback.






