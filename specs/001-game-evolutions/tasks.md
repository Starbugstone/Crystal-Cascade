# Tasks: Game Evolutions & New Mechanics

**Feature**: `001-game-evolutions`
**Generated**: 2025-11-19

This task list is generated from the feature specification and technical plan. Tasks are organized by user story and priority.

## Phase 1: Setup

- [x] T001 Create `testing` directory in the root of the project.
- [x] T002 Configure Vitest and Playwright in `vite.config.js` and create a `playwright.config.js`.
- [x] T003 Create `src/game/engine/EvolutionEngine.js` for handling gem evolution logic.

## Phase 2: Foundational

- [x] T004 [P] Implement `EvolvingElement` class in `src/game/engine/GemFactory.js` based on `data-model.md`.
- [x] T005 [P] Implement `OneTimeBonus` class in `src/game/engine/BonusActivator.js` based on `data-model.md`.
- [x] T006 [P] Implement `BoardLayout` class in `src/game/engine/LevelGenerator.js` based on `data-model.md`.
- [x] T007 [P] Implement `GameTile` class in `src/game/engine/TileManager.js` based on `data-model.md`.

## Phase 3: User Story 1 - Experience Evolving Gameplay (P1)

- [x] T008 [US1] Implement evolution trigger logic in `EvolutionEngine.js` to track match counts.
- [x] T009 [US1] Modify `MatchEngine.js` to call `EvolutionEngine.js` after a match is detected.
- [x] T010 [US1] Update `BoardAnimator.js` to visually represent gem evolution.
- [x] T011 [US1] Create a test for gem evolution in `testing/evolution.test.js`.

## Phase 4: User Story 2 - Utilize One-Time Bonuses (P2)

- [x] T012 [US2] Implement bonus activation logic in `BonusResolver.js` to apply bonus effects.
- [ ] T013 [US2] Connect `activateBonus` from `game-events.md` to the `BonusResolver.js`.
- [x] T014 [US2] Update `HudPanel.vue` to display and activate one-time bonuses.
- [x] T015 [US2] Create a test for bonus activation in `testing/bonus.test.js`.

## Phase 5: User Story 3 - Play on Diverse Boards (P2)

- [x] T016 [US3] Update `LevelGenerator.js` to handle different board layouts from `BoardLayout` data.
- [x] T017 [US3] Modify `BoardScene.js` to render boards with irregular shapes and blocked cells.
- [x] T018 [US3] Create a new level with a non-rectangular layout in `src/data/levels.json`.
- [x] T019 [US3] Create a test for diverse board layouts in `testing/board.test.js`.

## Phase 6: User Story 4 - Interact with Frozen Tiles (P3)

- [x] T020 [US4] Implement frozen tile logic in `TileManager.js` to restrict swaps.
- [x] T021 [US4] Update `MatchEngine.js` to unfreeze tiles adjacent to a match.
- [x] T022 [US4] Add visual feedback for frozen tiles in `BoardAnimator.js`.
- [x] T023 [US4] Create a test for frozen tiles in `testing/frozen.test.js`.

## Phase 7: Polish & Cross-Cutting Concerns

- [x] T024 Update documentation to reflect new features.
- [x] T025 Perform cross-browser testing with Playwright.

## Phase 8: User Story 5 - Arcade Intro Cascade (P1)

- [x] T026 [US5] Implement start-of-level waterfall cascade animation in `src/game/phaser/BoardAnimator.js`.
- [x] T027 [US5] Gate player input/hints until the intro cascade completes via `src/stores/gameStore.js`.
- [x] T028 [US5] Document the arcade cascade behavior in `TECH_README.md`.

## Phase 9: Bonus Drag Highlight (P1)

- [x] T029 Implement non-destructive `previewSwap` helper in `src/game/engine/BonusActivator.js`.
- [x] T030 Render glowing blue preview rectangles through `src/game/phaser/BoardAnimator.js`.
- [x] T031 Drive preview state via `src/stores/gameStore.js`, `BoardInput.js`, and cover with `testing/bonus.test.js`.

## Dependencies

- User Story 1 (Evolving Gameplay) is a prerequisite for User Story 2 (Bonuses) as bonuses may affect evolved gems.
- User Story 3 (Diverse Boards) and User Story 4 (Frozen Tiles) are independent and can be developed in parallel.

## Parallel Execution

- **US1 & US3**: Can be developed in parallel.
- **US2 & US4**: Can be developed in parallel after US1 is complete.
