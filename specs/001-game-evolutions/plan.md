# Implementation Plan: Game Evolutions & New Mechanics – Bonus Drag Highlight

**Branch**: `001-game-evolutions` | **Date**: 2025-11-22 | **Spec**: `/specs/001-game-evolutions/spec.md`
**Input**: Feature specification for evolving gameplay, one-time bonuses, new boards, frozen tiles

## Summary

Players must see exactly which tiles a dragged one-time bonus will affect before releasing it. We will reuse the existing `BonusActivator` geometry to compute affected indices, expose a safe preview API, and drive a Phaser-powered glow overlay (blue additive rectangles) while the bonus is hovering above the board. Drag state will travel from the Vue inventory UI → Pinia stores → Phaser `BoardInput` so previews clear immediately when the pointer leaves the board or the drag ends.

## Technical Context

**Language/Version**: TypeScript / modern ES modules compiled by Vite (Vue 3 Composition API)  
**Primary Dependencies**: Vue 3, Pinia, Phaser 3, Howler.js, Vite, Capacitor 7, Vitest  
**Storage**: In-memory Pinia state plus Phaser scene objects (no external persistence)  
**Testing**: Vitest for unit logic (Bonus preview math, Pinia state); Playwright for drag→highlight UX flows  
**Target Platform**: Web (desktop + touch) with Capacitor mobile shell  
**Project Type**: Single-page front-end with embedded Phaser renderer  
**Performance Goals**: Maintain 60 FPS; pointer-to-preview latency < 50 ms; preview computation < 2 ms per move  
**Constraints**: Preview must not mutate board tiles/bonuses; highlight uses Phaser layers (not DOM overlays) to respect Howler audio timing – NEEDS CLARIFICATION on permitted blend/tint palette  
**Scale/Scope**: Default 8×8 boards but must support up to 12×12 layouts and six active bonus archetypes per drag  
**Bonus Drag Signaling**: NEEDS CLARIFICATION – confirm whether drag originates from `PowerUpBar` buttons or separate inventory modal and what events are already fired

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project constitution placeholder (`.specify/memory/constitution.md`) defines no enforceable principles, so no explicit gates are triggered. We still align with SOLID/DRY requirements from workspace rules. ✅ Gate PASSED.

## Project Structure

### Documentation (this feature)

```text
specs/001-game-evolutions/
├── plan.md              # This file (/speckit.plan output)
├── research.md          # Phase 0 research log
├── data-model.md        # Phase 1 entity definitions
├── quickstart.md        # Phase 1 developer onboarding
├── contracts/           # Phase 1 API/events (e.g., game-events.md)
└── tasks.md             # Phase 2 task backlog (via /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── components/          # Vue UI (BoardCanvas, PowerUpBar, HUD, modals)
├── composables/         # Shared hooks (e.g., audio manager)
├── data/                # Level + loot tables
├── game/
│   ├── engine/          # Pure logic (MatchEngine, TileManager, BonusActivator)
│   └── phaser/          # Rendering + input (BoardScene, BoardAnimator, BoardInput)
├── stores/              # Pinia stores (gameStore, inventoryStore, settingsStore)
├── styles/              # Base/theme CSS
└── main.js              # Vite entry (mounts Vue, boots Pinia)

testing/
├── bonus.test.js
├── board.test.js
├── evolution.test.js
└── frozen.test.js
```

**Structure Decision**: Single Vite/Phaser front-end. Feature work spans Pinia stores (`src/stores`), bonus math (`src/game/engine`), Phaser input/rendering (`src/game/phaser`), and tests under `testing/`.

## Complexity Tracking

> No constitution violations identified; table intentionally left empty.
