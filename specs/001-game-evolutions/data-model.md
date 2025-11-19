# Data Model: Game Evolutions & New Mechanics

This document outlines the data structures for the new game mechanics. These entities are primarily conceptual and will be implemented as JavaScript classes or objects within the game's data and state management layers.

## EvolvingElement

Represents a game element (e.g., a gem) that can change its state or properties based on in-game events.

-   **`type`**: `String` - The base type of the element (e.g., 'red_gem', 'blue_gem').
-   **`currentTier`**: `Integer` - The current evolution level of the element (e.g., 1, 2, 3).
-   **`evolutionRules`**: `Object` - Defines the conditions for the next evolution.
    -   **`trigger`**: `String` - The event that triggers an evolution check (e.g., 'MATCH_COUNT', 'TIME_ELAPSED').
    -   **`threshold`**: `Integer` - The value the trigger must reach (e.g., 5 matches).
-   **`evolvedProperties`**: `Object` - A map of properties that are applied at the next tier (e.g., `{ scoreMultiplier: 2, effect: 'line_clear' }`).

## OneTimeBonus

Represents a consumable in-game power-up that the player can activate.

-   **`name`**: `String` - The unique identifier for the bonus (e.g., 'row_clear_bonus').
-   **`effectType`**: `String` - The type of effect the bonus applies (e.g., 'CLEAR_ROW', 'TRANSFORM_GEMS', 'UNFREEZE_ALL').
-   **`targetCriteria`**: `Object` - (Optional) Defines what the bonus can target (e.g., `{ color: 'red' }`, `{ tileState: 'frozen' }`).
-   **`remainingUses`**: `Integer` - The number of times the bonus can be used. For one-time bonuses, this will be 1.

## BoardLayout

Defines the structure and initial state of a game board for a specific level.

-   **`name`**: `String` - A unique name for the layout (e.g., 'level_5_cross', 'tutorial_board').
-   **`shape`**: `String` - The overall geometry of the board (e.g., 'RECTANGLE', 'L_SHAPE', 'DONUT').
-   **`dimensions`**: `Object` - The size of the board grid (e.g., `{ rows: 9, cols: 9 }`).
-   **`blockedCells`**: `Array<Object>` - A list of coordinates that are not playable (e.g., `[{x: 0, y: 0}, {x: 0, y: 1}]`).
-   **`initialTilePlacements`**: `Array<Object>` - A list of pre-defined tiles and their states for the start of the level (e.g., `[{x: 4, y: 4, tileState: 'FROZEN', gemType: 'any'}]`).

## GameTile

Represents a single tile on the game board, holding its state and any game piece on it.

-   **`state`**: `String` - The current state of the tile (e.g., 'PLAYABLE', 'FROZEN', 'BLOCKED').
-   **`coordinates`**: `Object` - The `{x, y}` position of the tile on the board grid.
-   **`element`**: `EvolvingElement` - A reference to the game element currently on this tile.
-   **`unfreezeCondition`**: `Object` - (Optional) The condition required to change the state from 'FROZEN' to 'PLAYABLE' (e.g., `{ trigger: 'ADJACENT_MATCH' }`).
