# Game Engine Contracts & Events

This document defines the interfaces and events used for communication between the Vue.js UI layer and the Phaser 3 game engine. This ensures that the UI (components) and the game logic (engine) are decoupled.

The primary communication channel will be a shared event bus or direct function calls exposed by the game engine instance.

## UI -> Game Engine

These are actions initiated by the user through the Vue UI that command the game engine.

### `startGame(levelData)`

-   **Description**: Starts a new game level.
-   **Payload**:
    -   `levelData`: `Object` - An object containing all the necessary information to generate the level.
        -   `boardLayout`: `BoardLayout` - The board layout to use (see `data-model.md`).
        -   `levelGoals`: `Object` - The objectives for the level (e.g., `{ score: 10000, frozenTiles: 0 }`).
-   **Example**: The `LevelSelectModal.vue` component will call this when a user selects a level.

### `activateBonus(bonusName)`

-   **Description**: Activates a one-time bonus that the player has acquired. This is triggered by the user clicking on the corresponding UI element.
-   **Payload**:
    -   `bonusName`: `String` - The unique identifier for the bonus to activate (e.g., 'row_clear_bonus').
-   **Example**: A button in the `HudPanel.vue` or `PowerUpBar.vue` component would call this method.

### `pauseGame()`

-   **Description**: Pauses the game loop and animations.
-   **Payload**: None.

### `resumeGame()`

-   **Description**: Resumes the game loop and animations.
-   **Payload**: None.

## Game Engine -> UI

These are events emitted by the game engine to inform the UI about changes in the game state. The UI components will listen for these events to update their display.

### `event: 'gameStateUpdate'`

-   **Description**: Fired whenever a key game metric changes.
--   **Payload**: `Object`
    -   `score`: `Integer`
    -   `movesRemaining`: `Integer`
    -   `levelProgress`: `Object` - Progress towards level goals.

### `event: 'bonusAcquired'`

-   **Description**: Fired when the player earns a new one-time bonus.
-   **Payload**: `Object`
    -   `bonus`: `OneTimeBonus` - The bonus that was acquired.

### `event: 'bonusUsed'`

-   **Description**: Fired when a bonus is consumed.
-   **Payload**: `Object`
    -   `bonusName`: `String` - The identifier of the consumed bonus.

### `event: 'levelComplete'`

-   **Description**: Fired when the player successfully meets all level objectives.
-   **Payload**: `Object`
    -   `finalScore`: `Integer`
    -   `starsEarned`: `Integer`

### `event: 'levelFailed'`

-   **Description**: Fired when the player fails to meet the level objectives (e.g., runs out of moves).
-   **Payload**: `Object`
    -   `reason`: `String` (e.g., 'OUT_OF_MOVES').
