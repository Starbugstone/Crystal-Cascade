# Crystal Cascade

A jewel match-3 game built with Vue, Pinia, Phaser and Three.js. 60 levels across ten chapters, faceted crystal artwork, breakable stone barriers, cascading matches, earned power-up chests, and a small 3D Old West town to build.

## Run locally

Requires Node.js 20.19+ (or 22.12+).

```sh
npm ci
npm run dev
```

Open http://localhost:5173 for the introduction, then enter Prospect Hollow. Tap a plot to open its building sheet; the first materials are free. The plots have open yards and narrow dirt tracks between them, with prairie around the village. Drag to rotate and scroll or pinch to zoom. Click the mine or the Mine tab to play the next unfinished puzzle. Welcome, Village, Mine, and the completed Museum stay accessible in the header, including on phones. Basic wells, farms, and homes open immediately. Each normal completion finishes every active larger construction or improvement. Fund multiple projects when you have the coins.

Build the museum to replay completed levels or enter continuous play on any unlocked level. Continuous play keeps going beyond the objectives, saves its own scores, and grants no chests or construction progress; its coin allowance is capped at 25 per level across all visits. Choose **Exit mine** beside the saved-coin total when finished to return to the village with your earnings. The button becomes available once any active cascade finishes. Build and upgrade the armory to raise each puzzle bonus limit from 3 to 5, 8, then 12. Chests can also contain coins or a builder hammer; use a hammer in the village to advance one chosen construction by one step.

A completed mine pays **1 coin per collected gem + 10 coins per bonus gem left on the board**. The recap celebrates the saved total with a coin burst and count-up, shows the breakdown, and offers matching Continue mining (pickaxe) and Back to village (house) buttons. Reduced motion displays the total immediately.

Build the shop to buy from two random bonuses after each completed normal mine run. Upgrades add a third and fourth item. Tap an item to purchase one; sold-out stock, insufficient funds, and full storage disable purchases. Clear Row and Shuffle cost 40 coins; other puzzle powers cost 60; builder hammers cost 75. Reloading or abandoning a run does not refresh stock. Continuous play does not refresh it.

A first-visit illustrated tour explains building and village care. Reopen it from the village’s (i) icon. The expand icon fills a mobile viewport with the village; close it or press Escape to return. Every completed six-level chapter adds free visual improvements to the mine, through all ten chapters.

Every building can reach level 3, with visible improvements and wooden scaffolding during work. Upgrading the original home, well, and farm unlocks six extra plots. Roads, saloon visitors, and mounted travelers make the village busier. The saloon earns modest income automatically, including up to eight hours away. Larger villages attract larger mounted bandit gangs. The bank and sheriff each cover up to half the coins at risk; upgrade both for full protection. A quiet original village soundtrack includes occasional birds, neighbors, construction, mining, horses and raid cues.

The full site follows the browser's English or French language preference. Settings includes a confirmed **Reset progress for testing** action to restart the town, campaign, and power inventory on this device.

See the [town demo guide](docs/town-demo.md) for the story, local-save migration, mounted bandit raids, passive saloon income, and implementation details.

```sh
npm test              # Game logic and input regression tests
npm run build        # Production output in dist/
npm run preview      # Serve the production build
npm run format:check # Check source formatting
npm run assets       # Regenerate gem, bonus, power and ice artwork
```

## Playing

Swipe a gem, or tap two neighboring gems. Match at least three to break the ice underneath them. Fresh ice has frosted edges; damaged ice cracks, then shatters to reveal a dark cleared tile. Four in a line creates a sparking bomb; five creates a rotating rainbow orb; a T or L match creates a pulsing cross launcher. Swipe a bonus to activate it, or double-tap/double-click it to activate in place. Clear every ice layer and stone block to finish the level; the score target and best cascade determine extra stars.

- **Clear Row:** clears a random row.
- **Hammer:** shatters a 3 × 3 area around the selected gem.
- **Color Wand:** clears gems of the selected color.
- **Shuffle:** mixes the board.
- **Tile Breaker:** clears the selected row and column.

Power-ups start empty, with room for three of each before building the armory. Completed levels, best scores, stars, inventory and town progress save together in local storage (`crystal-cascade-profile-v2`). Existing `crystal-cascade-campaign-v1` progress migrates automatically and its original copy is retained. Saves stay on this device; clearing browser storage can erase them. No-move boards reshuffle automatically without a score penalty.

Stone starts at level 7. Match directly beside a block, or hit it with a bonus, to deal one damage per cascade step. Diagonal matches do not count. Blocks occupy cells and divide the falling column: gems below them can fall, but no new gems enter that section until the stone breaks. Gold-banded stone, introduced at level 19, needs two hits. Double ice starts at level 13. Objectives increase gradually while the number of gem colors stays at five.

Finish at or above the displayed score target to earn a **score chest**. Finish within the level's active-time target to earn a separate **speed chest**. **Each chest contains exactly one reward: at most two per completed level run.** Automatic rewards are 70% puzzle powers, 20% coins, and 10% builder hammers, with a builder hammer guaranteed within ten automatic chest rolls. Within puzzle powers, Clear Row and Shuffle each have a 35% chance; Hammer, Color Wand and Tile Breaker each have a 10% chance. Crystal, Radiant and Celestial titles celebrate higher scores or faster times; every tier has the same single reward and drop chances. Tap the chest itself to burst it open and start a slot-machine reel that slows to the earned bonus. Tap the spinning roulette itself to stop on the item at its selection line, or let it stop automatically. Tap the revealed prize to continue. Duplicate bonuses stack up to capacity; overflow becomes coins. Completion saves the pending chests and their automatic rewards. A roulette tap claims the selected item exactly once; skipping, leaving, or reloading claims any unopened automatic rewards. Replaying can earn both again.

Speed targets start at 60 seconds and rise by 4 seconds per level. The clock counts only when the board is ready for input, excluding intros, cascades, the expanded mobile controls, settings and background tabs. Missing the speed target never ends the run. The fastest time is saved alongside progress. Reduced motion reveals the bonus immediately, and the normal animation can be skipped.

The board’s lightbulb shows a move immediately; automatic hints still appear after waiting. The (i) guide explains the level’s obstacles, with a paused introduction the first time each appears. Seals carry distinct shapes and R/S/E marks; chains, exits and remaining hits have clearer overlays.

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

Run `npm run verify` for formatting, the complete regression suite, and a production build. GitHub Quality checks runs the same command for pull requests and main; verify it and the Vercel preview before merging a release.
