# Crystal Cascade

Crystal Cascade is a Vue 3 + Pixi.js match‑3 prototype that focuses on delivering a responsive board, procedural levels, and basic bonus logic. The project is currently in a **pre-alpha** state: the core technical pieces are scaffolded, but most of the design specification captured in earlier drafts has not been implemented yet.

_Last updated: 2025-10-28_

---

## Current Snapshot

- ✅ 8×8 match-3 board rendered with Pixi.js, including swap interaction and cascades.
- ✅ Procedural level generator that creates 12 seed-based level configs with simple objectives.
- ✅ Score + cascade HUD, level select modal, quick power-up bar, and settings drawer.
- ✅ Bonus resolver that can spawn `bomb`, `rainbow`, and `cross` specials on long matches.
- ✅ Capacitor tooling is wired up for future mobile builds.
- 🚧 Objective progress, tile health variants, blockers, and win/lose conditions are not tracked.
- 🚧 Inventory, loot tables, audio, and art assets are placeholders or unused stubs.
- 🚧 Documentation now reflects the working feature set instead of the aspirational spec.

---

## Getting Started

### Prerequisites

- Node.js 18 or newer
- npm 9 or newer

### Installation & Scripts

```bash
npm install        # install dependencies
npm run dev        # start Vite dev server at http://localhost:5173
npm run build      # produce a production build in dist/
npm run preview    # preview the production build locally

# Capacitor helpers for platform shells
npm run cap:sync
npm run cap:open:ios
npm run cap:open:android
```

---

## Gameplay Overview (Current Build)

- **Session flow:** The app boots to a level select modal fed by the procedural generator. Selecting a level seeds the board and objectives. Sessions can be exited via the header button.
- **Controls:** Click/tap-and-release swapping is handled by `useInputHandlers`, which converts pointer coordinates into board indices. Drag gestures are not yet implemented.
- **Scoring:** Matches award `tileCount × 100` points scaled by a cascade multiplier that grows with chained clears. Multiplier resets when a cascade sequence ends.
- **Bonuses:** Matches of 4+ crystals dispatch through `BonusResolver` to replace the swapped gem with a special (`bomb`, `rainbow`, `cross`). `BonusActivator` handles activation when these specials are part of a swap.
- **Objectives:** The HUD lists level objectives, but progress values never change—no win detection, failure conditions, or reward flow are in place.
- **Audio & FX:** `useAudio` wires up Howler volume control, yet no sound effects or music tracks are loaded. `ParticleFactory` exists, but no emitters are triggered during play.

---

## Architecture Notes

### Key Technologies

- **Vue 3 + Vite** for the application shell.
- **Pinia** stores (`game`, `settings`, `inventory`) for state management.
- **Pixi.js v8** for board rendering and placeholder gem textures.
- **Howler.js** prepared for future audio work.
- **Capacitor** project scaffold for native packaging.

### Project Structure (abridged)

```
src/
  App.vue                 # UI shell with header, board, HUD, modals
  main.js                 # Vue bootstrap + Pinia registration
  components/             # BoardCanvas, HudPanel, LevelSelectModal, etc.
  composables/            # useAudio (stub), useInputHandlers
  data/                   # Static level/drop-table JSON (currently unused)
  game/
    engine/               # MatchEngine, TileManager, LevelGenerator, bonuses
    pixi/                 # Placeholder sprite + particle helpers
  stores/                 # Pinia stores for game, settings, inventory
  styles/                 # Base + theme CSS tokens
```

### Core Systems

- `src/stores/gameStore.js` orchestrates game sessions, coordinates rendering hooks (`attachRenderer`, `refreshBoardVisuals`), and delegates logic to the engine modules.
- `src/game/engine/MatchEngine.js` evaluates swaps, prevents illegal moves, and searches for horizontal/vertical matches.
- `src/game/engine/TileManager.js` applies match results, handles gravity, generates replacement gems, and recurses to resolve cascades.
- `src/game/engine/BonusResolver.js` scores clears and injects special gems; `BonusActivator.js` executes effects when specials are swapped.
- `src/game/engine/LevelGenerator.js` seeds reproducible 8×8 boards with two simple objectives per level.
- `src/components/BoardCanvas.vue` hosts the Pixi renderer, builds placeholder textures via `src/game/pixi/placeholder-gems.js`, and responds to container resize events.

---

## Content & Data Status

- `src/data/levels.json` and `dropTables.json` are legacy design artefacts and not consumed by runtime code.
- Levels generated at bootstrap contain only basic gem data (`type`, `highlight`) and single-hit tiles (`health: 1`). There are no blockers, multi-layer tiles, or scripted layouts yet.
- The inventory store exposes four quick-access slots with static quantities; the "Inventory" button does not open a modal.
- Asset pipeline is placeholder-only: sprites are runtime-generated vector shapes, and there are no packaged textures, sound files, or fonts beyond CSS-defined web fonts.

---

## Known Limitations & Issues

- Objective progress never advances, preventing level completion or rewards.
- Tile health mutation is applied, but no visuals reflect damage and no tiles start above 1 HP.
- Special gem activation happens only on swap; passive cascades do not trigger them.
- `ParticleFactory` is created but unused; cascades and matches have no visual feedback beyond gem disappearance.
- UI glyphs for icons in `App.vue`/`SettingsDrawer.vue` are placeholder characters that render as garbled symbols.
- No persistence, user profile, or analytics hooks are implemented.
- No automated testing or linting scripts are configured.

---

## Suggested Next Steps

1. **Gameplay progression:** Track objective progress, detect level completion/failure, and surface results to players.
2. **Tile variety:** Introduce multi-hit tiles, blockers, and scripted level layouts (reuse `levels.json` or extend the generator).
3. **Visual polish:** Replace placeholder graphics with production art, hook up particle bursts, and tune animations.
4. **Audio pass:** Integrate background music and match effects using the existing Howler scaffolding.
5. **Inventory & power-ups:** Build a full inventory modal, connect drop tables, and implement power-up interactions.
6. **Quality of life:** Add drag input, mobile responsiveness checks, accessibility settings (reduced motion, high contrast), and automated tests.

---

## Contributing & Licensing

- The project license is set to **ISC** in `package.json`.
- Follow typical Git workflows: create a branch, make changes, run `npm run build` to ensure Vite succeeds, then open a pull request.
- Please document any new systems in this README to keep the project state accurate.

---

By keeping this README aligned with the actual implementation, future contributors can quickly understand what exists today, what is stubbed, and where development should focus next.

