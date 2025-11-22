# Feature Specification: Game Evolutions & New Mechanics

**Feature Branch**: `001-game-evolutions`  
**Created**: 2025-11-19  
**Status**: Draft  
**Input**: User description: "evolutions, win one time bonuses (gui already implemented), different boards and frozen tiles"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Experience Evolving Gameplay (Priority: P1)

Players encounter game elements (e.g., gems, tiles) that evolve or change state during gameplay, leading to new strategic opportunities.

**Why this priority**: Introduces core "evolution" concept, driving engagement.

**Independent Test**: Play a level with evolving elements (e.g., a gem that upgrades after N matches); verify its behavior and impact on strategy.

**Acceptance Scenarios**:

1. **Given** a player makes N matches with a specific gem type, **When** the Nth match occurs, **Then** the gem visibly evolves to a higher tier with enhanced properties.
2. **Given** a game board state changes (e.g., after clearing a section), **When** the change occurs, **Then** certain tiles on the board visibly transform or upgrade.

---

### User Story 2 - Utilize One-Time Bonuses (Priority: P2)

Players acquire and strategically deploy powerful one-time bonuses to clear difficult sections or achieve high scores.

**Why this priority**: Leverages existing GUI and provides player agency.

**Independent Test**: Acquire a specific bonus (e.g., through an in-game event), activate it, and verify its intended effect on the board.

**Acceptance Scenarios**:

1. **Given** a player has an active bonus and taps the bonus UI element, **When** the bonus is activated, **Then** its effect is applied to the board (e.g., clears a row, transforms gems), and the bonus is consumed.

---

### User Story 3 - Play on Diverse Boards (Priority: P2)

Players can choose or encounter different board layouts and configurations, adding variety and new challenges to the game.

**Why this priority**: Addresses "different boards" and increases replayability.

**Independent Test**: Load the game with a non-standard board layout (e.g., an L-shaped board) and verify that gameplay (matches, swaps) functions correctly within the new geometry.

**Acceptance Scenarios**:

1. **Given** a player selects a level associated with a specific board type (e.g., "Circular", "Blocked"), **When** the level loads, **Then** the game board is rendered with the selected geometry and initial tile placements.

---

### User Story 4 - Interact with Frozen Tiles (Priority: P3)

Players encounter tiles that are "frozen," requiring specific actions or conditions to unfreeze them and become playable.

**Why this priority**: Introduces "frozen tiles" mechanic.

**Independent Test**: Play a level with frozen tiles; verify that matches adjacent to them unfreeze them and that frozen tiles cannot be swapped.

**Acceptance Scenarios**:

1. **Given** a frozen tile is on the board, **When** a match is made involving an adjacent unfrozen tile, **Then** the frozen tile becomes unfrozen and playable.
2. **Given** a frozen tile, **When** a player attempts to swap it, **Then** the swap action is prevented, and visual/audio feedback indicates it's unswappable.

## Edge Cases

- What happens if an evolution condition is met but there are no valid targets on the board? (e.g., no room for an upgraded gem)
- How do one-time bonuses interact with frozen tiles or evolving elements? (e.g., can a bonus unfreeze tiles, or affect evolving gems?)
- What if a custom board layout leads to an unplayable state (e.g., no possible matches)?
- Can frozen tiles be part of a match or only block them?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Game MUST support defining and applying evolution rules for game elements (e.g., gems, tiles) based on in-game conditions (e.g., number of matches, time).
- **FR-002**: Game MUST apply the effects of one-time bonuses to the game board, consuming the bonus upon activation.
- **FR-003**: Game MUST support loading and rendering various pre-defined board geometries and initial tile configurations.
- **FR-004**: Game MUST implement "frozen" tile mechanics where tiles can be in a frozen state, preventing swaps and requiring specific conditions (e.g., adjacent matches, bonus activation) to unfreeze.
- **FR-005**: Game MUST visually indicate the evolved state of elements and the frozen state of tiles.

### Key Entities *(include if feature involves data)*

- **EvolvingElement**: Represents a game element (e.g., gem, tile) that can change state or properties based on predefined rules. Attributes: `type`, `currentTier`, `evolutionRules` (conditions for upgrade), `evolvedProperties`.
- **OneTimeBonus**: Represents a consumable in-game power-up. Attributes: `name`, `effectType` (e.g., `ClearRow`, `TransformGems`), `targetCriteria` (e.g., `AnyTile`, `SpecificColor`), `remainingUses`.
- **BoardLayout**: Defines the structural properties of a game board. Attributes: `shape` (e.g., `Rectangle`, `L-Shape`), `dimensions` (rows, columns), `blockedCells` (coordinates of impassable areas), `initialTilePlacements`.
- **GameTile**: Represents a single tile on the game board. Attributes: `state` (e.g., `Playable`, `Frozen`), `coordinates`, `currentGem` (reference to EvolvingElement), `unfreezeCondition` (e.g., `AdjacentMatch`).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 90% of playtesters can successfully activate and understand the effect of a one-time bonus on their first attempt.
- **SC-002**: Levels incorporating "evolved" game elements are perceived as offering new strategic depth by 80% of surveyed players.
- **SC-003**: Gameplay on at least 3 distinct non-rectangular board layouts maintains an average match-finding rate and player satisfaction comparable to standard boards.
- **SC-004**: The "frozen tile" mechanic is understood and correctly interacted with by 95% of new players within their first 5 minutes of encountering it.
- **SC-005**: Game performance (FPS, input latency) remains within acceptable limits (as defined by previous specs) when evolving elements, bonuses, and frozen tiles are simultaneously active.

## Assumptions

- Existing match-3 logic (swapping, matching, cascading) will be adapted to accommodate new elements and mechanics.
- The GUI for activating one-time bonuses is already implemented and will trigger the new backend logic.
- Visual and audio assets for evolved elements, different board types, and frozen tiles will be provided.