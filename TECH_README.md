# Crystal Cascade – Technical Reference

_Last updated: 2025-11-21_

This document captures the current technical makeup of Crystal Cascade, a Vue 3 + Phaser 3 match-3 prototype. Use it alongside `readme.md`: the README explains the product snapshot, while this reference focuses on frameworks, architecture, and module responsibilities.

---

## Technology Stack

| Layer | Tools | Purpose |
|-------|-------|---------|
| Core Framework | **Vue 3 (Composition API)** | Application shell, component system, reactivity layer. |
| State Management | **Pinia** | Global stores for game, settings, and inventory state. |
| Rendering & Animation | **Phaser 3** | Scene graph, sprite handling, tweened gem animations, particle effects. |
| Audio | **Howler.js** | Volume management + future-proofed audio playback. |
| Tooling | **Vite** | Dev server, build pipeline, asset bundling. |
| Testing | **Vitest, Playwright** | Unit and component testing with Vitest, end-to-end testing with Playwright. |
| Mobile Packaging | **Capacitor 7** | Bridge for iOS/Android builds and native APIs. |
| Language Features | **ES Modules**, modern JavaScript | Tree-shakeable modules; project is configured as `"type": "module"`. |

Additional project-wide utilities:
- `ResizeObserver` (browser API) for responsive canvas sizing alongside Phaser's Scale manager.
- Composition helpers (custom composables) for input and audio.

## Engineering Principles

### Code Quality
- Keep Phaser/Vue boundary modules under 200 lines when possible; factor shared logic into composables or helpers instead of duplicating game math or store wiring.
- Any new Pinia action must document failure cases inline and guard against inconsistent board state (e.g., never mutate tiles without pairing `refreshBoardVisuals()`).

### Testing Standards
- Pure utilities (level generation, match detection, gravity resolution) require unit coverage via Vitest; add regression tests for every bug rooted in these modules.
- For Phaser- or DOM-bound logic, add executable story scripts under `src/game/sandboxes/` that devs can run in dev mode to demonstrate fixes when unit tests are impractical.

### User Experience Consistency
- Reuse the shared timing tokens in `BoardAnimator` for tweens and audio cues so cascades feel synchronized across devices; no custom magic numbers inside feature branches.
- Respect the accessibility toggles from `settingsStore` in any new UI: defaults must be readable at 12px minimum and new audio cues must honor global mute.

### Performance Requirements
- Maintain 60 FPS on mid-tier mobile by keeping per-frame allocations inside Phaser scenes near zero; cache tweens, textures, and particle emitters instead of instantiating per swap.
- Never block the UI thread for more than 4ms: long-running generation must run via requestIdleCallback or chunking; keep JSON payloads like `levels.json` under 50KB.

---

## Build & Project Structure

```
root/
  package.json            # npm metadata, scripts, dependency list
  vite.config.js          # Vite configuration for Vue plugin
  capacitor/              # Capacitor platform scaffolding (iOS/Android)
  public/                 # Static assets (favicon, placeholder sprite atlas folder)
  src/
    main.js               # App bootstrap (Vue + Pinia)
    App.vue               # Top-level layout and modal orchestration
    components/           # UI components (board, HUD, modals, drawers, etc.)
    composables/          # Reusable logic hooks (input, audio)
    data/                 # JSON stubs for levels, loot drops (unused)
    game/
      engine/             # Match logic, tile management, level generation, bonuses
      phaser/             # Scene setup, sprite slicing, particle helpers
    stores/               # Pinia stores (game, settings, inventory)
    styles/               # Global CSS tokens and resets
```

### Build Scripts (`package.json`)

- `npm run dev` – Vite dev server with hot module replacement.
- `npm run build` – Bundles production assets to `dist/`.
- `npm run preview` – Serves the production bundle locally.
- `npm run cap:sync` / `cap:open:*` – Synchronise Capacitor platforms and open native IDEs.

---

## Application Flow

1. **Bootstrapping** (`src/main.js`): Creates Vue app, installs Pinia, mounts `App.vue`.
2. **Session Initialization** (`App.vue`): `onMounted` triggers `gameStore.bootstrap()` to generate level data and populate the level select modal.
3. **Rendering** (`BoardCanvas.vue`): Boots a Phaser `Game` instance, slices sprite sheets, and attaches renderer metadata back into the game store for board drawing.
4. **Interaction Pipeline**:
   - Pointer and touch events are handled by `game/phaser/BoardInput`, which converts world coordinates into board indices.
   - `gameStore.resolveSwap()` delegates swap logic to `MatchEngine`.
   - `MatchEngine`/`BonusResolver`/`TileManager` coordinate swap validation, scoring, bonus creation, gravity, and cascades.
   - Store updates trigger HUD/UI changes; `refreshBoardVisuals()` keeps the Phaser scene in sync with board state.
5. **Settings & Inventory**: Secondary Pinia stores feed the settings drawer and quick-access power-up buttons.

---

## Vue Components

### `App.vue`
- Layout shell: header, board canvas, HUD, power-up bar.
- Manages modal visibility (`LevelSelectModal`, `SettingsDrawer`) and fullscreen toggling for the board.
- Boots and tears down the ambient audio loop + SFX manager via `useAudio`, forwarding the instance to the game store.

### `components/BoardCanvas.vue`
- Hosts the Phaser renderer and board container.
- Generates sliced gem textures (`SpriteLoader`) and particle layer (`ParticleFactory`).
- Observes container resize to keep board square and delegates redraw requests to the game store.
- Relies on the Phaser input controller for pointer/touch swapping.

### `components/HudPanel.vue`
- Displays score, cascade multiplier, and objective list from `gameStore`.
- Uses `storeToRefs` to maintain reactivity without manual computed props.

### `components/LevelSelectModal.vue`
- Modal overlay with procedurally generated levels.
- Emits `start-level` event for parent to start sessions.

### `components/PowerUpBar.vue`
- Visualises `inventoryStore.quickAccessSlots`.
- Invokes `inventoryStore.usePowerUp()` and exposes a (currently stub) inventory button.

### `components/SettingsDrawer.vue`
- Slide-in drawer for audio and accessibility toggles.
- Relies on `settingsStore` actions for state mutation.

Additional display logic is limited; there is no dedicated inventory modal, results screen, or tutorial component yet.

---

## Pinia Stores

### `stores/gameStore.js`
- Central coordinator for gameplay state.
- Maintains board data, layered tiles, objectives, scoring, cascade multiplier, reshuffle tracking, and Phaser renderer references.
- Key actions:
  - `bootstrap()` – Generates level configs using `generateLevelConfigs`.
  - `startLevel(levelId)` – Loads a level, resets session stats, and seeds tile-layer goals.
  - `attachRenderer(renderer)` / `refreshBoardVisuals()` – Integrate with the Phaser renderer and synchronise tile layers.
  - `resolveSwap()` → uses `MatchEngine.evaluateSwap`.
  - `applyMatchResult()` → merges results from `BonusResolver`, updates board via `TileManager`, and advances objectives/remaining layers.
  - `completeLevel()` – Marks the session as cleared once every tile layer is removed (currently console logging only).
  - `exitLevel()` – Resets session state and clears render/input layers.

### `stores/settingsStore.js`
- Controls settings drawer open state, music/sfx volumes, reduced motion, high contrast flags.
- Toggle/setter actions directly mutate the store.

### `stores/inventoryStore.js`
- Holds quick-access power-ups (`hammer`, `color-wand`, `shuffle`, `tile-breaker`).
- Provides `usePowerUp()` action to decrement quantities.
- `openInventory()`/`closeInventory()` stubs for future modal.

---

## Composables

- `composables/useAudio.js`
  - Creates a shared Howler-backed audio manager with ambient loop control, match/bomb/rainbow SFX helpers, and per-track volume clamping.
  - Watches `settingsStore` music/SFX sliders to update all active Howl instances in real time.

---

## Game Engine Modules

### `game/engine/MatchEngine.js`
- Validates swaps (adjacency, non-empty, etc.).
- Applies tentative swaps and checks for matches.
- Invokes `BonusActivator` to trigger special gem clears.
- Detects horizontal/vertical sequences ≥3 and returns match payloads.
- Calls `EvolutionEngine` to track match counts for evolving gems.

### `game/engine/EvolutionEngine.js`
- Tracks match counts for each gem type.
- Determines if a gem should evolve based on predefined rules and thresholds.

### `game/engine/TileManager.js`
- Applies match results to the board.
- Tracks tile health (`tiles` array) and decrements when hits occur.
- Manages tile states (e.g., `FROZEN`, `PLAYABLE`) and unfreezes adjacent tiles upon matches.
- Clears matched cells, applies gravity per column, spawns replacement gems.
- Recursively resolves cascades by re-running `MatchEngine.findMatches`.
- Emits per-step tile updates and an aggregate `layersCleared` count for the store/UI.

### `game/engine/BonusResolver.js`
- Calculates score gain and cascade multiplier.
- Determines if a swap should create a special gem (`bomb`, `rainbow`, `cross`) based on match patterns.
- Returns enriched payload consumed by `applyMatchResult`.

### `game/engine/BonusActivator.js`
- Implements area-clear logic when special gems participate in the initiating swap or when one-time bonuses are activated.
- Supports bomb (3×3), rainbow (all of a target type or random/board-wide when chained), cross (row + column) clears, clear row, transform gems, and unfreeze all. Includes chained bonus reactions.

### `game/engine/LevelGenerator.js`
- Produces deterministic level configurations using a seeded RNG.
- Outputs board layout, tile metadata, shuffle allowance, and objective stubs.
- Supports loading various board layouts, including irregular shapes and blocked cells, from `levels.json`.

### `game/engine/GameLoop.js`
- Thin wrapper around `requestAnimationFrame`; not yet wired into gameplay.

---

## Phaser Utilities

- `game/phaser/BoardScene.js`
  - Configures Phaser containers (background, gems, FX) and emits a `scene-ready` payload once textures and particles are prepared.

- `game/phaser/BoardInput.js`
  - Manages pointer/touch interactions, supporting both drag swaps and tap-to-select swapping.
  - Keeps gem highlights in sync with animator state.

- `game/phaser/SpriteLoader.js`
  - Loads sprite sheets from `public/sprite/`, slices frames into individual textures, and registers bonus animations.
  - Falls back to canvas-drawn placeholders via `placeholder-gems.js` if assets are missing.

- `game/phaser/BoardAnimator.js`
  - Maintains gem sprites, cell highlights, swap animations, combo celebrations, bonus-trigger particle effects, and dispatches contextual audio cues through the injected audio manager.

- `game/phaser/ParticleFactory.js`
  - Emits burst, explosion, and cross-beam particle presets used for cascades and special gem detonations.
- `game/phaser/particle-presets.js`
  - Centralises the particle helper implementations shared by combo celebrations and bonus effects.

---

## Styles & Theming

- `styles/base.css` – Resets, font stacks, layout defaults.
- `styles/theme.css` – CSS custom properties for colors, typography, spacing. Components rely on these vars for consistent theming.

---

## Data & Assets

- `data/levels.json`, `data/dropTables.json` – Legacy design documents; runtime code uses procedurally generated levels with placeholder layered tiles instead.
- `public/sprite/` – Contains the current gem and bonus sprite sheets sliced by `SpriteLoader`.
- `public/sound/` – Ambient loop and match/bonus SFX clips consumed by `useAudio`.
- `public/favicon.svg` – Branding placeholder.

---

## Integration Notes

- **Capacitor**: Configured via `capacitor.config.json`. Native platforms are synced through npm scripts but no platform-specific plugins are in use yet.
- **Howler**: Ambient loop and discrete SFX play through shared Howl instances managed by `useAudio`; library coverage is limited to the current asset set.
- **Keyboard/Accessibility**: No keyboard bindings, focus management, or ARIA labeling implemented; needs attention before broader releases.
- **Testing**: No automated tests or lint configuration shipped. Introduce Unit/E2E tooling (Vitest, Playwright, etc.) as the project matures.

---

## Future Technical Work

1. Replace placeholder textures with sprite sheets and integrate a loader pipeline.
2. Build a state machine for level progression, including objective tracking and result screens.
3. Implement persistent storage for player inventory and settings.
4. Broaden the audio system with layered ambience, responsive SFX variations, and persisted volume preferences; explore haptics and richer screen effects alongside audio cues.
5. Extend input handling with keyboard bindings, haptics, and accessibility affordances.
6. Add automated testing, linting, and continuous integration configuration.

---

For any new features, update both `readme.md` (product snapshot) and this technical reference, and capture supplemental details under `.docs/` to keep engineering documentation accurate.
