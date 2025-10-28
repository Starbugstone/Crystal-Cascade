# Crystal Cascade – Technical Reference

_Last updated: 2025-10-28_

This document captures the current technical makeup of Crystal Cascade, a Vue 3 + Pixi.js match-3 prototype. Use it alongside `readme.md`: the README explains the product snapshot, while this reference focuses on frameworks, architecture, and module responsibilities.

---

## Technology Stack

| Layer | Tools | Purpose |
|-------|-------|---------|
| Core Framework | **Vue 3 (Composition API)** | Application shell, component system, reactivity layer. |
| State Management | **Pinia** | Global stores for game, settings, and inventory state. |
| Rendering | **Pixi.js v8** | Hardware-accelerated board rendering, sprite generation, particles. |
| Audio | **Howler.js** | Volume management + future-proofed audio playback. |
| Tooling | **Vite** | Dev server, build pipeline, asset bundling. |
| Mobile Packaging | **Capacitor 7** | Bridge for iOS/Android builds and native APIs. |
| Language Features | **ES Modules**, modern JavaScript | Tree-shakeable modules; project is configured as `"type": "module"`. |

Additional project-wide utilities:
- `ResizeObserver` (browser API) for responsive Pixi canvas sizing.
- Composition helpers (custom composables) for input and audio.

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
      pixi/               # Texture creation + particle helper
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
3. **Rendering** (`BoardCanvas.vue`): Instantiates a Pixi Application, generates placeholder textures, and attaches renderer metadata back into the game store for board drawing.
4. **Interaction Pipeline**:
   - Pointer events captured in `useInputHandlers` → resolved to board indices.
   - `gameStore.resolveSwap()` delegates swap logic to `MatchEngine`.
   - `MatchEngine`/`BonusResolver`/`TileManager` coordinate swap validation, scoring, bonus creation, gravity, and cascades.
   - Store updates trigger HUD/UI changes; `refreshBoardVisuals()` rebuilds Pixi sprites.
5. **Settings & Inventory**: Secondary Pinia stores feed the settings drawer and quick-access power-up buttons.

---

## Vue Components

### `App.vue`
- Layout shell: header, board canvas, HUD, power-up bar.
- Manages modal visibility (`LevelSelectModal`, `SettingsDrawer`).
- Provides exit button for resetting sessions.

### `components/BoardCanvas.vue`
- Hosts the Pixi.js renderer and board container.
- Generates placeholder gem textures (`SpriteLoader`) and particle layer (`ParticleFactory`).
- Observes container resize to keep board square and delegates redraw requests to the game store.
- Binds pointer input via `useInputHandlers`.

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
- Maintains board data, tiles, objectives, scoring, cascade multiplier, reshuffle tracking, and Pixi renderer references.
- Key actions:
  - `bootstrap()` – Generates level configs using `generateLevelConfigs`.
  - `startLevel(levelId)` – Loads a level, resets session stats.
  - `attachRenderer(renderer)` and `refreshBoardVisuals()` – Integrate with Pixi renderer.
  - `resolveSwap()` → uses `MatchEngine.evaluateSwap`.
  - `applyMatchResult()` → merges results from `BonusResolver`, updates board via `TileManager`.
  - `exitLevel()` – Resets session state and clears render layer.

### `stores/settingsStore.js`
- Controls settings drawer open state, music/sfx volumes, reduced motion, high contrast flags.
- Toggle/setter actions directly mutate the store.

### `stores/inventoryStore.js`
- Holds quick-access power-ups (`hammer`, `color-wand`, `shuffle`, `tile-breaker`).
- Provides `usePowerUp()` action to decrement quantities.
- `openInventory()`/`closeInventory()` stubs for future modal.

---

## Composables

- `composables/useInputHandlers.js`
  - Translates pointer coordinates to board indices.
  - Detects swap start/end and dispatches `gameStore.resolveSwap`.
  - Handles event binding/unbinding for the Pixi canvas root.

- `composables/useAudio.js`
  - Watches `settingsStore.musicVolume` and syncs Howler global volume.
  - Exposes a placeholder `playSfx` for future effect playback.

---

## Game Engine Modules

### `game/engine/MatchEngine.js`
- Validates swaps (adjacency, non-empty, etc.).
- Applies tentative swaps and checks for matches.
- Invokes `BonusActivator` to trigger special gem clears.
- Detects horizontal/vertical sequences ≥3 and returns match payloads.

### `game/engine/TileManager.js`
- Applies match results to the board.
- Tracks tile health (`tiles` array) and decrements when hits occur.
- Clears matched cells, applies gravity per column, spawns replacement gems.
- Recursively resolves cascades by re-running `MatchEngine.findMatches`.

### `game/engine/BonusResolver.js`
- Calculates score gain and cascade multiplier.
- Determines if a swap should create a special gem (`bomb`, `rainbow`, `cross`) based on match patterns.
- Returns enriched payload consumed by `applyMatchResult`.

### `game/engine/BonusActivator.js`
- Implements area-clear logic when special gems participate in the initiating swap.
- Supports bomb (3×3), rainbow (all of a target type), and cross (row + column) clears.

### `game/engine/LevelGenerator.js`
- Produces deterministic level configurations using a seeded RNG.
- Outputs board layout, tile metadata, shuffle allowance, and objective stubs.
- Currently generates 12 levels with identical 8×8 dimensions and 1 HP tiles.

### `game/engine/GameLoop.js`
- Thin wrapper around `requestAnimationFrame`; not yet wired into gameplay.

---

## Pixi Utilities

- `game/pixi/SpriteLoader.js`
  - Builds placeholder textures by delegating to `createPlaceholderGems`.
  - Uses Pixi renderer to generate textures at runtime (avoids external assets for now).

- `game/pixi/placeholder-gems.js`
  - Programmatically draws simple shapes (circle, square, diamond, etc.) for gem types and specials.

- `game/pixi/ParticleFactory.js`
  - Prepares a particle layer and exposes `emitBurst()` for effect bursts.
  - Currently unused; no gameplay hooks trigger particle emission yet.

---

## Styles & Theming

- `styles/base.css` – Resets, font stacks, layout defaults.
- `styles/theme.css` – CSS custom properties for colors, typography, spacing. Components rely on these vars for consistent theming.

---

## Data & Assets

- `data/levels.json`, `data/dropTables.json` – Legacy design documents; runtime code uses procedurally generated data instead.
- `public/sprite/` – Placeholder folder for future sprite atlases (currently empty).
- `public/favicon.svg` – Branding placeholder.

---

## Integration Notes

- **Capacitor**: Configured via `capacitor.config.json`. Native platforms are synced through npm scripts but no platform-specific plugins are in use yet.
- **Howler**: Only the global volume slider is functional; actual audio tracks need loading and playback logic.
- **Keyboard/Accessibility**: No keyboard bindings, focus management, or ARIA labeling implemented; needs attention before broader releases.
- **Testing**: No automated tests or lint configuration shipped. Introduce Unit/E2E tooling (Vitest, Playwright, etc.) as the project matures.

---

## Future Technical Work

1. Replace placeholder textures with sprite sheets and integrate a loader pipeline.
2. Build a state machine for level progression, including objective tracking and result screens.
3. Implement persistent storage for player inventory and settings.
4. Wire particle and audio systems into match events for better feedback.
5. Expand input handling to support drag gestures and mobile-first ergonomics.
6. Add automated testing, linting, and continuous integration configuration.

---

For any new features, update both `readme.md` (product snapshot) and this technical reference to keep engineering documentation accurate.

