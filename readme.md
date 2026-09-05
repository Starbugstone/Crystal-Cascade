# Crystal Cascade

A jewel match-3 game built with Vue, Pinia and Phaser. 36 levels across six chapters, faceted crystal artwork, breakable stone barriers, cascading matches and earned power-up chests.

## Run locally

Requires Node.js 20.19+ (or 22.12+).

```sh
npm ci
npm run dev
```

Open http://localhost:5173. Start at level 1. Clearing each level unlocks the next; completed levels remain available for replay.

```sh
npm test              # Game logic and input regression tests
npm run build        # Production output in dist/
npm run preview      # Serve the production build
npm run format:check # Check source formatting
npm run assets       # Regenerate gem, bonus, power and ice artwork
```

## Playing

Swipe a gem, or tap two neighboring gems. Match at least three to break the ice underneath them. Fresh ice has frosted edges; damaged ice cracks, then shatters to reveal a dark cleared tile. Four in a line creates a sparking bomb; five creates a rotating rainbow orb; a T or L match creates a pulsing cross launcher. Swap a bonus to activate it. Clear every ice layer and stone block to finish the level; the score target and best cascade determine extra stars.

- **Clear Row:** clears a random row.
- **Hammer:** shatters a 3 × 3 area around the selected gem.
- **Color Wand:** clears gems of the selected color.
- **Shuffle:** mixes the board.
- **Tile Breaker:** clears the selected row and column.

Power-ups start with three uses each. Completed levels, best scores, stars and inventory save together in local storage (`crystal-cascade-campaign-v1`). No-move boards reshuffle automatically without a score penalty.

Stone starts at level 7. Match directly beside a block, or hit it with a bonus, to deal one damage per cascade step. Diagonal matches do not count. Blocks occupy cells and divide the falling column: gems below them can fall, but no new gems enter that section until the stone breaks. Gold-banded stone, introduced at level 19, needs two hits. Double ice starts at level 13. Objectives increase gradually while the number of gem colors stays at five.

Finish at or above the displayed score target to earn a **score chest**. Finish within the level's active-time target to earn a separate **speed chest**. **Each chest contains exactly one power-up: at most two bonuses per completed level run.** Clear Row and Shuffle each have a 35% drop chance; Hammer, Color Wand and Tile Breaker each have a 10% chance. Crystal, Radiant and Celestial titles celebrate higher scores or faster times; every tier has the same single reward and drop chances. Tap the chest itself to burst it open and start a slot-machine reel that slows to the earned bonus. Tap the revealed bonus to open the next chest, or to see the results after the last chest. Duplicate bonuses stack. Rewards save together at completion, before the full-screen reveal, so skipping or leaving never loses them or awards them twice. Replaying can earn both again.

Speed targets start at 60 seconds and rise by 4 seconds per level. The clock counts only when the board is ready for input, excluding intros, cascades, the expanded mobile controls, settings and background tabs. Missing the speed target never ends the run. The fastest time is saved alongside progress. Reduced motion reveals the bonus immediately, and the normal animation can be skipped.

On phones, a compact status strip shows the level, score, active time and cleared layers. Tap it to slide down detailed stats, audio, settings and the play guide; opening these controls pauses play and the speed clock. The arcade banner stays above the board, which uses the available screen space. Power-ups show just their icons and quantities, beneath the board in portrait and beside it in landscape. The board supports touch swipes and tapping two neighbors.

Keyboard controls: focus the board with Tab, use arrows to move, Enter or Space to select, and Shift + arrow to swap. Escape cancels a selection or closes settings. Settings include music, sound effects, reduced motion and high contrast. Desktop focus mode enlarges the play area.

## Project structure

- `src/game/engine/`: level generation, matches, bonuses, gravity and deterministic hints.
- `src/game/phaser/`: rendering, animation, gesture input and pooled particles.
- `src/stores/`: game sessions, saved campaign progress, inventory and preferences.
- `src/components/`: menus, board host, HUD and dialogs.
- `public/art/`: generated SVG gems, animated bonus atlas, illustrated powers and ice. The generators live in `scripts/`; Phaser rasterizes the art once when loading.
- `testing/`: Vitest regression tests running in Node, without a browser or canvas mock.

Phaser loads when a chapter opens. Vue never wraps the renderer's internal object graph in reactive proxies. Bonuses use an eight-frame animation atlas and a 230 ms activation wind-up and 160 ms impact beat. Shockwaves, directional blasts, rainbow lightning and ice shards run alongside the clear and fall phases. Bonus and combo banners occupy a fixed strip above the board. Screen-edge glows, expanding firebursts, cross beams and lightning accompany activated bonuses. Cosmetic effects may continue after the board becomes playable; every board animation is cancellable on a level change.

See [the analysis and verification report](docs/analysis.md) for the performance findings, changes and testing limits. Capacitor configuration and the existing Azure deployment workflow are retained; native platforms need their usual platform setup before using the `cap:*` commands.
