# Crystal Cascade

Crystal Cascade is a Vue 3 + Phaser 3 match‑3 prototype that focuses on delivering a responsive board, procedural levels, and emergent bonus logic. The project is currently in a **pre-alpha** state: the core technical pieces are scaffolded, but most of the design specification captured in earlier drafts has not been implemented yet.

_Last updated: 2025-11-21_

---

## Current Snapshot

- ✅ 8×8 match-3 board rendered with Phaser, including swap interaction and cascades.
- ✅ Procedural level generator that creates 12 seed-based level configs with simple objectives.
- ✅ Score + cascade HUD, level select modal, quick power-up bar, and settings drawer.
- ✅ Bonus resolver that can spawn `bomb`, `rainbow`, and `cross` specials on long matches.
- ✅ Capacitor tooling is wired up for future mobile builds.
- ✅ Tile layers under each gem chip away with clears; clearing the entire board now ends the level (console celebration still pending).
- ✅ Ambient music loop and a first pass of match/bonus SFX are wired through Howler.js and the Phaser animator hooks.
- 🚧 Win/fail UI, multi-layer tile art, and advanced block behaviours (frozen tiles, dwarfs, etc.) are still unimplemented.
- 🚧 Inventory, loot tables, and art assets remain placeholders or unused stubs.
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
- **Controls:** Click/tap swapping runs through a Phaser-driven board input system that supports both tap-to-select and drag swaps with pointer and touch support. A fullscreen toggle keeps the board square on wide screens.
- **Scoring:** Matches award `tileCount × 100` points scaled by a cascade multiplier that grows with chained clears. Multiplier resets when a cascade sequence ends.
- **Bonuses:** Matches of 4+ crystals dispatch through `BonusResolver` to replace the swapped gem with a special (`bomb`, `rainbow`, `cross`). `BonusActivator` handles activation when these specials are part of a swap.
- **Objectives:** Strip every tile layer to win; HUD objectives now track remaining layers alongside score, but there is still no win/fail overlay or reward flow.
- **Audio & FX:** `useAudio` wires up Howler-backed ambient music and targeted SFX triggers (`playMatch`, `playBomb`, `playRainbowLaser`, etc.), all routed through the Phaser animator. Particle bursts highlight swaps, cascades, and special gem detonations.

---

## Architecture Notes

### Key Technologies

- **Vue 3 + Vite** for the application shell.
- **Pinia** stores (`game`, `settings`, `inventory`) for state management.
- **Phaser 3** scene + tween system for board rendering, sprites, and particles.
- **Howler.js** drives ambient music and context-aware SFX dispatched from Phaser.
- **Capacitor** project scaffold for native packaging.

### Project Structure (abridged)

```
src/
  App.vue                 # UI shell with header, board, HUD, modals
  main.js                 # Vue bootstrap + Pinia registration
  components/             # BoardCanvas, HudPanel, LevelSelectModal, etc.
  composables/            # useAudio (ambient + SFX manager), other hooks
  game/phaser/            # Scene, animator, input, sprite helpers
  data/                   # Static level/drop-table JSON (currently unused)
  game/
    engine/               # MatchEngine, TileManager, LevelGenerator, bonuses
    phaser/               # Phaser scene, sprite helpers, particles
  stores/                 # Pinia stores for game, settings, inventory
  styles/                 # Base + theme CSS tokens
```

### Core Systems

- `src/stores/gameStore.js` orchestrates game sessions, coordinates rendering hooks (`attachRenderer`, `refreshBoardVisuals`), tracks layered tile progress, and delegates logic to the engine modules.
- `src/game/engine/MatchEngine.js` evaluates swaps, prevents illegal moves, and searches for horizontal/vertical matches.
- `src/game/engine/TileManager.js` applies match results, handles gravity, generates replacement gems, and recurses to resolve cascades.
- `src/game/engine/BonusResolver.js` scores clears and injects special gems; `BonusActivator.js` executes effects when specials are swapped.
- `src/game/engine/LevelGenerator.js` seeds reproducible 8×8 boards with layered tile objectives and score targets per level.
- `src/components/BoardCanvas.vue` boots the Phaser scene, builds placeholder textures via `src/game/phaser/placeholder-gems.js`, and responds to container resize events.

---

## Content & Data Status

- `src/data/levels.json` and `dropTables.json` are legacy design artefacts and not consumed by runtime code.
- Levels generated at bootstrap contain basic gem data plus placeholder layered tiles (currently 1–2 layers). Advanced tile types (frozen blocks, dwarfs to rescue, scripted layouts) are still on the backlog.
- The inventory store exposes four quick-access slots with static quantities; the "Inventory" button does not open a modal.
- Asset pipeline is placeholder-only: sprites are runtime-generated vector shapes, and audio assets are limited to the current ambient loop and SFX stubs. There are no packaged textures or custom fonts beyond CSS-defined web fonts.

---

## Known Limitations & Issues

- Level completion currently just disables input and logs to the console—there is no victory/failure UI, rewards, or progression flow.
- Tile layers use simple colour fills; there is no production art, texture variation, or special block behaviour yet.
- Special gem activation happens only on swap; passive cascades do not trigger them.
- Cascades and bonuses trigger Phaser particle FX plus the current ambient loop and SFX set; richer sound design is still pending.
- UI glyphs for icons in `App.vue`/`SettingsDrawer.vue` are placeholder characters that render as garbled symbols.
- No persistence, user profile, or analytics hooks are implemented.
- No automated testing or linting scripts are configured.

---

## Suggested Next Steps

1. **Gameplay progression:** Build victory/defeat overlays, reward flows, and persistent progression once tile layers are cleared.
2. **Tile variety:** Implement additional tile types (frozen blocks, dwarfs to rescue, blockers) and author scripted layouts.
3. **Visual polish:** Replace placeholder board art, design distinctive tile-layer textures, and refine combo/bonus animations.
4. **Audio pass:** Expand the Howler library with layered ambience, responsive SFX variations, and volume-setting persistence.
5. **Inventory & power-ups:** Build a full inventory modal, connect drop tables, and implement power-up interactions.
6. **Quality of life:** Add accessibility settings, mobile-responsive tuning, keyboard bindings, automated tests, and CI tooling.

---

## Contributing & Licensing

- The project license is set to **ISC** in `package.json`.
- Follow typical Git workflows: create a branch, make changes, run `npm run build` to ensure Vite succeeds, then open a pull request.
- Please document any new systems in this README, `TECH_README.md`, and mirror supporting detail under `.docs/` to keep the project state accurate.

---

By keeping this README aligned with the actual implementation, future contributors can quickly understand what exists today, what is stubbed, and where development should focus next.
