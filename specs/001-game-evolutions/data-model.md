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
-   **`effectType`**: `String` - The type of effect the bonus applies (e.g., 'clear_row', 'transform_gems', 'unfreeze_all').
-   **`targetCriteria`**: `Object` - (Optional) Defines what the bonus can target (e.g., `{ color: 'red' }`, `{ tileState: 'frozen' }`).
-   **`remainingUses`**: `Integer` - The number of times the bonus can be used. For one-time bonuses, this will be 1.
-   **`previewProfile`**: `Object` - Metadata for drag previews (e.g., `{ glowColor: '#38BDF8', maxRange: 15 }`) so UI can stay in sync with engine calculations.

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

## BonusPreviewState

Tracks the transient data required to render glowing previews while a one-time bonus is being dragged.

-   **`active`**: `Boolean` - Whether a drag preview is in progress.
-   **`bonusId` / `effectType`**: `String` - Identifiers for the bonus being previewed.
-   **`pointer`**: `Object` - Latest pointer data (`{ clientX, clientY, pointerId }`) from the DOM drag.
-   **`targetIndex`**: `Number | null` - Board index currently under the pointer, computed by `BoardInput`.
-   **`affectedIndices`**: `Number[]` - Cached result from `BonusActivator.preview`.
-   **`previewMeta`**: `Object` - Extra info returned by preview (e.g., rainbow mode, requires secondary selection).
-   **`lastUpdatedAt`**: `Number (ms)` - Timestamp for throttling; helps Phaser avoid redundant renders.

Pinia (`gameStore`) owns this state. `BoardInput` updates `targetIndex` and `affectedIndices`, while `BoardAnimator` listens for changes to drive the glowing rectangles. When `active` becomes `false`, both the store and animator clear caches immediately so outdated highlights never persist.
