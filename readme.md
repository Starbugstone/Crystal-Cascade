# Crystal Cascade

A jewel match-3 game built with Vue, Pinia and Phaser. Twelve chapters, faceted crystal artwork, quick swipes, cascading matches and five power-ups.

## Run locally

Requires Node.js 20.19+ (or 22.12+).

```sh
npm ci
npm run dev
```

Open http://localhost:5173. Choose any chapter to play.

```sh
npm test              # Game logic and input regression tests
npm run build        # Production output in dist/
npm run preview      # Serve the production build
npm run format:check # Check source formatting
npm run assets       # Regenerate gem, bonus, power and ice artwork
```

## Playing

Swipe a gem, or tap two neighboring gems. Match at least three to break the ice underneath them. Fresh ice has frosted edges; damaged ice cracks, then shatters to reveal a dark cleared tile. Four in a line creates a sparking bomb; five creates a rotating rainbow orb; a T or L match creates a pulsing cross launcher. Swap a bonus to activate it. Clear every ice layer to finish the chapter; the score target and best cascade determine extra stars.

- **Clear Row:** clears a random row.
- **Hammer:** shatters a 3 × 3 area around the selected gem.
- **Color Wand:** clears gems of the selected color.
- **Shuffle:** mixes the board.
- **Tile Breaker:** clears the selected row and column.

Power-ups start with 20 uses each per application session. Progress and inventory are currently in memory. The existing automatic reshuffle rule retains one third of your score when no legal moves remain.

Keyboard controls: focus the board with Tab, use arrows to move, Enter or Space to select, and Shift + arrow to swap. Escape cancels a selection or closes settings. Settings include music, sound effects, reduced motion and high contrast. Focus mode enlarges the play area.

## Project structure

- `src/game/engine/`: level generation, matches, bonuses, gravity and deterministic hints.
- `src/game/phaser/`: rendering, animation, gesture input and pooled particles.
- `src/stores/`: game sessions, inventory and preferences.
- `src/components/`: menus, board host, HUD and dialogs.
- `public/art/`: generated SVG gems, animated bonus atlas, illustrated powers and ice. The generators live in `scripts/`; Phaser rasterizes the art once when loading.
- `testing/`: Vitest regression tests running in Node, without a browser or canvas mock.

Phaser loads when a chapter opens. Vue never wraps the renderer's internal object graph in reactive proxies. Bonuses use an eight-frame animation atlas and a 120 ms activation wind-up. Shockwaves, directional blasts, rainbow lightning and ice shards run alongside the clear and fall phases. Cosmetic effects may continue after the board becomes playable; every board animation is cancellable on a level change.

See [the analysis and verification report](docs/analysis.md) for the performance findings, changes and testing limits. Capacitor configuration and the existing Azure deployment workflow are retained; native platforms need their usual platform setup before using the `cap:*` commands.
