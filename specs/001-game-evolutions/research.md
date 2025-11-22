# Research: Game Evolutions & New Mechanics

## Unknown: Testing Strategy

**Task**: Research testing best practices for a Vue.js and Phaser 3 project.

### Decision

After reviewing the project's tech stack (Vite, Vue 3, Phaser 3) and considering best practices, the following testing strategy is recommended:

1.  **Unit & Component Testing**: **Vitest** will be used as the primary framework.
    *   It integrates seamlessly with the existing Vite build process, offering high performance.
    *   Vue components will be tested using `@vue/test-utils`.
    *   Core game logic (e.g., match detection, state transitions) will be written in pure, decoupled JavaScript/TypeScript modules to be tested directly by Vitest without requiring a browser environment.

2.  **End-to-End (E2E) Testing**: **Playwright** will be used for E2E testing.
    *   Its broad cross-browser support (Chromium, Firefox, WebKit/Safari) is critical for ensuring the game works consistently across all platforms, including iOS devices.
    *   It provides robust tooling for test generation, debugging, and parallel execution, which is beneficial for a growing project.

3.  **Integration Testing (for Phaser-coupled logic)**: For logic that cannot be fully decoupled from Phaser Scenes or GameObjects, Vitest will be used with a simulated browser environment.
    *   **Environment**: `happy-dom` will provide the necessary DOM simulation, and `jest-canvas-mock` (or a similar library) will mock the HTML Canvas API.
    *   **Method**: Tests will utilize mocks for Phaser objects and may use Phaser's `HEADLESS` mode to test scene-level logic without rendering.

### Rationale

This multi-tiered approach addresses the different testing needs of a hybrid Vue/Phaser application:

*   **Vitest** is the natural choice for a Vite-based project, minimizing configuration overhead and maximizing performance.
*   **Decoupling game logic** is the most critical principle for making the Phaser part of the codebase testable. It allows for fast, reliable unit tests on the core mechanics without the complexity of a full game engine instance.
*   **Playwright** provides the most comprehensive cross-browser coverage for E2E testing, mitigating the risk of platform-specific bugs, which is a major concern for a web-based game intended for desktop and mobile.

### Alternatives Considered

*   **Jest**: A viable alternative to Vitest for unit testing. However, Vitest offers better integration and performance within a Vite project.
*   **Cypress**: A strong candidate for E2E testing with an excellent developer experience. It was not chosen due to its lack of support for the WebKit (Safari) browser, which is a significant gap for a cross-platform game.

---

## Animation Design: Cascade on Start

**Task**: Design a cascading gem animation for the start of a level.

### Decision

A "waterfall" cascade animation will be implemented. When a level starts, gems will fall from the top of the board one column at a time, from left to right, with a slight delay between each column. This creates a visually appealing "waterfall" effect.

### Rationale

This approach is visually engaging and provides a clear sense of the board being populated. It is also relatively straightforward to implement using Phaser's tweening system.

### Alternatives Considered

*   **Simultaneous Drop**: All gems fall at the same time. This is less visually interesting.
*   **Random Drop**: Gems fall in a random order. This could be chaotic and less satisfying to watch.

---

## Drag Signaling for One-Time Bonuses

**Task**: Research how to communicate a bonus drag gesture from Vue UI controls to the Phaser board so preview logic can react before drop.

### Decision

Use the existing `gameStore` as the canonical source of bonus drag state. `PowerUpBar` (and any inventory surface) will:

1. On `pointerdown`, call `gameStore.startBonusDrag({ id, effectType })` to set `bonusDragState = { active: true, bonusId, effectType, pointerId }`.
2. During drag, a lightweight DOM listener reports pointer positions so `gameStore.updateBonusDragPointer({ clientX, clientY })` can compute board-local coordinates; `BoardInput` observes `bonusDragState.targetIndex` and triggers previews.
3. On `pointerup`/cancel, `gameStore.finishBonusDrag({ apply?: boolean })` clears the state and tells the animator to drop/clear the glow.

### Rationale

- `inventoryStore` already calls `useGameStore()`, so it can forward drag lifecycle events without new dependencies.
- Phaser input stays focused on board interactions; it simply reacts when `bonusDragState.active` flips true and pointer indices change.
- State-driven signaling survives edge cases (pointer release outside the canvas, multi-touch) because the store owns truth and can throttle updates.

### Alternatives Considered

- **Global DOM event bus** between Vue and Phaser: rejected because it duplicates responsibilities already solved by Pinia and complicates cleanup when components unmount.
- **Direct DOM → Phaser pointer bridging** (manually dispatching Phaser pointer events): rejected; Phaser expects events relative to its canvas, which becomes brittle with responsive layouts.

---

## Safe Bonus Preview Computation

**Task**: Determine how to reuse `BonusActivator` geometry without mutating board state while computing drag previews.

### Decision

Add a pure helper `bonusActivator.preview(type, boardSnapshot, cols, rows, index, context)` that:

- Clones only the tiles required by mutable effects (e.g., `unfreeze_all`) before passing them into `activateBonus`.
- Returns `{ clearedIndices, effectType, meta }`, where `meta` can capture context (rainbow target color, cross orientation) for UI effects.
- Never mutates the provided board snapshot; any effect needing mutation operates on the cloned subset and discards it.

`gameStore` and `BoardInput` will pass `activeBoard.slice()` snapshots to `preview` so the computation remains deterministic and side-effect free.

### Rationale

- `activateBonus` currently alters tile states (e.g., unfreezes tiles). Running it directly for previews would corrupt the live board.
- Wrapping the existing logic prevents drift between preview and actual activation; one code path defines both.
- Snapshots limited to touched indices keep computation under ~1 ms for an 8×8 board, supporting the 60 FPS goal.

### Alternatives Considered

- **Duplicate geometry math per bonus**: rejected due to maintenance risk and likely divergence.
- **Deep clone entire board** before each preview: rejected for GC pressure and unnecessary work when most bonuses only touch ≤15 tiles.

---

## Phaser Glow Implementation

**Task**: Decide on a visual technique for the “glowing blue background” requirement that performs well on desktop and mobile.

### Decision

Render previews with pooled Phaser `Rectangle` GameObjects on the `fxLayer`, tinted `0x38bdf8` fill with `0x0ea5e9` stroke, additive blend mode, and a pulsating tween (alpha 0.35↔0.85, scale 0.96↔1.02 over 480 ms). Rectangles are scaled to `cellSize * 0.94` and reused between pointer moves.

### Rationale

- Rectangles already exist for hints/queued swaps, so we can extend the pattern without introducing shaders.
- Additive blue overlays satisfy the “glowing blue background” look and stay performant on Canvas fallback.
- Pooling objects avoids frequent allocation/destruction, keeping pointer updates under 2 ms even for large previews.

### Alternatives Considered

- **Shader-based glow/highlight**: visually appealing but requires custom pipelines and multiplies QA surface.
- **DOM overlays** above the canvas: incompatible with full-screen Phaser scaling and would desync with board resizing.
