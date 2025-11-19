# Quickstart: Game Evolutions & New Mechanics

This guide provides a high-level overview for developers looking to work on the new game mechanics feature.

## Key Concepts

The new mechanics are built around the data models defined in `data-model.md`. Understanding these models is the first step:

-   **EvolvingElement**: Game pieces that can upgrade.
-   **OneTimeBonus**: Consumable power-ups.
-   **BoardLayout**: Defines level shapes and initial conditions.
-   **GameTile**: The stateful container for each position on the board, which can be `FROZEN`.

Communication between the UI (Vue) and the game (Phaser) is handled via a set of commands and events defined in `contracts/game-events.md`.

## Where to Start

1.  **Data Definitions**: New board layouts, evolution rules, and bonus types will be defined as JSON or JavaScript objects in the `src/data/` directory. Refer to existing files like `levels.json` and `dropTables.json` for patterns.

2.  **Game Engine Logic**: The core implementation for the new mechanics will reside in the Phaser game engine code under `src/game/engine/`.
    *   **Frozen Tiles**: Modify `TileManager.js` and `MatchEngine.js` to handle the 'FROZEN' state.
    *   **Evolutions**: A new `EvolutionEngine.js` might be needed to track evolution progress and trigger changes.
    *   **Bonuses**: `BonusResolver.js` will need to be extended to handle the effects of the new one-time bonuses.
    *   **Board Layouts**: `LevelGenerator.js` will need to be updated to read the new `BoardLayout` data and generate the level accordingly.

3.  **UI Interaction**: The Vue components in `src/components/` will use the Pinia stores (`src/stores/`) to manage game state and interact with the game engine.
    *   To call a game engine command (e.g., `activateBonus`), dispatch an action to the `gameStore.js`.
    *   To react to game engine events (e.g., `gameStateUpdate`), subscribe to state changes in the `gameStore.js` from within your Vue component.

## Testing

The testing strategy is defined in `research.md`.

-   New, pure game logic functions (e.g., a function to calculate evolution progress) should be placed in utility modules and unit-tested with **Vitest**.
-   End-to-end user flows, such as activating a bonus and seeing the result, should be tested with **Playwright**.
