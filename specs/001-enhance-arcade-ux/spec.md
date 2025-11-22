# Feature Specification: Arcade UX Overhaul

**Feature Branch**: `001-enhance-arcade-ux`  
**Created**: 2025-11-19  
**Status**: Draft  
**Input**: User description: "this project is a candy crush clone on the web using Vue.js and Phaser. The UI needs to be user-friendly and fast, adapted to PC and mobile + touchscreen. We need a fast and snappy interface. The animations should be over the top, very arcade, and visually dynamic"

## Clarifications
### Session 2025-11-19
- Q: What is the preferred strategy for devices that cannot maintain 60 FPS during intense animations? → A: We shouldn't downgrade unless necessary. We should just log if detecting performance degradations.
- Q: Regarding user analytics (like performance logs and UX survey data), what level of user privacy should be enforced? → A: This is a Vue.js app, no server so no user data apart from on the clients browser.
- Q: What specific properties should an `AnimationPresetCatalog` entry (i.e., a single animation bundle) contain to be configurable and reusable? → A: name (string), duration (number), easing (string), particles (array of particle configs), sprites (array of sprite configs), screenShake (object with intensity/duration), audioCue (string or array of audio paths), triggerNext (string, name of another preset to chain).
- Q: For "reduced motion" mode (e.g., via OS settings or in-game toggle), should animations be disabled completely, or should they be replaced with simpler, cross-fade-style transitions for feedback? → A: Replace complex animations with simpler, instant-on or cross-fade transitions for critical feedback (e.g., gem swaps, win/loss cues).

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Cross-Device Candy Board (Priority: P1)

Match-3 players on phones, tablets, or desktops experience the same layout, controls, and HUD real estate without sacrificing clarity or access to gestures.

**Why this priority**: Without a unified responsive shell, the game feels clunky on mobile and wastes space on desktop, blocking playtester adoption.

**Independent Test**: Load the game on a 5.5" phone, a tablet, and a desktop browser; verify the board scales, retains readable HUD text ≥12px, and maintains input precision without other new features.

**Acceptance Scenarios**:

1. **Given** a user opening the game on a mobile device in portrait, **When** the viewport loads, **Then** the board snaps to full width, HUD stacks vertically, and level start is accessible without pinch-zoom.
2. **Given** a user resizing the browser from 1440px to 768px, **When** the resize completes, **Then** the layout reflows within 250 ms and preserves button hit areas ≥44px.

---

### User Story 2 - Snappy Touch & Pointer Feedback (Priority: P2)

Players feel immediate tactile confirmation (audio, motion, haptics-ready cues) whenever they tap, drag, or release gems, regardless of input method.

**Why this priority**: Perceived responsiveness drives retention; anything slower than instant feedback makes the clone feel laggy compared to genre benchmarks.

**Independent Test**: Simulate tap, drag, and swap on desktop mouse, touch-enabled laptop, and mobile touchscreen; measure response time and confirm consistent highlight/audio cues.

**Acceptance Scenarios**:

1. **Given** a player tapping a gem, **When** the tap lands, **Then** a highlight and SFX trigger within 100 ms and persist until the finger lifts or a swap completes.
2. **Given** a drag swap on touchscreen, **When** the finger crosses into a neighboring cell, **Then** the target gem previews the swap with directional animation plus vibration hook (if available).

---

### User Story 3 - Arcade Spectacle Cascades (Priority: P3)

Combo chains explode with over-the-top particles, screen shake, and synchronized audio that remain readable and performant on both mobile and desktop.

**Why this priority**: The feature promise is “very arcade and visually dynamic”; without big cascades, the experience feels generic.

**Independent Test**: Trigger scripted cascades (3-match, bomb, rainbow) via sandbox data; confirm animation presets, multipliers, and camera cues run within frame budgets without other dependencies.

**Acceptance Scenarios**:

1. **Given** a level where a bomb clears 9 tiles, **When** the detonation runs, **Then** layered particles, screen shake, and strobing HUD multipliers play in sync and finish inside 900 ms.
2. **Given** a rainbow combo clearing all gems of a color, **When** the reaction starts, **Then** the interface chains SFX, color pulses, and score popups without dropping below 55 FPS on reference hardware.

---
### Edge Cases

- Device rotates mid-swap (portrait ↔ landscape) while a cascade is active—board must pause, reflow, and resume without duplicating animation cues.
- Low-power mode browsers (battery saver) throttle animation frames; performance degradation should be logged without stalling input.
- Players with reduced motion enabled still need readable win/loss cues even when most animations are suppressed.
- Simultaneous pointer inputs (mouse + touch on hybrids) should not trigger duplicate swaps or stuck highlights.
- Asset preloading failure (missing sprite/audio) should fall back to placeholder visuals/audio without silent hangs.

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: Experience MUST present a responsive layout that prioritizes the board and HUD across ≥3 breakpoints (phone portrait, tablet, desktop) while keeping tap targets ≥44px and text ≥12px.
- **FR-002**: Interface MUST auto-detect active input method (mouse, touch, stylus) and surface the correct affordances (hover tips vs. press-and-hold) without requiring reloads.
- **FR-003**: Swap gestures MUST provide visual and audio feedback within 100 ms of user input and complete the swap preview animation within 250 ms even on mid-tier mobile hardware.
- **FR-004**: Animation system MUST expose reusable “arcade” presets (explosion, rainbow pulse, combo trail) with configurable intensity so cascades stay synchronized and testable.
- **FR-005**: Reduced motion toggles from settings MUST replace complex animations with simpler, instant-on or cross-fade transitions for critical feedback (e.g., gem swaps, win/loss cues), and mute toggles MUST override any new audio effects while still conveying success/failure through alternative cues.
- **FR-006**: Performance budget MUST keep steady-state gameplay at ≥60 FPS and <4 ms main-thread work per frame during idle, logging any violation for tuning.
- **FR-007**: Mobile web UI MUST adapt to safe-area insets (notches, rounded corners) so critical controls stay visible and touchable.
- **FR-008**: Loading experience MUST prefetch required sprites/audio for the first cascade and show a progress indicator if prep exceeds 1 s to keep perceived speed high.

### Key Entities *(include if feature involves data)*

- **InteractionSurface**: Defines layout breakpoints, safe areas, and target sizes for board, HUD, and controls; referenced by responsive layout logic.
- **AnimationPresetCatalog**: Collection of named animation bundles (each containing: `name` (string), `duration` (number), `easing` (string), `particles` (array of particle configs), `sprites` (array of sprite configs), `screenShake` (object with intensity/duration), `audioCue` (string or array of audio paths), `triggerNext` (string, name of another preset to chain)) used by swaps, cascades, and HUD reactions.
- **InputFeedbackState**: Tracks current selection, drag vector, active highlights, and haptic/audio flags per input device so feedback stays consistent during rapid interactions.

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: 95% of mobile playtesters can start a level within 2 seconds of loading the game without pinch-zooming or scrolling.
- **SC-002**: Input latency (tap/drag to visual confirmation) stays under 100 ms for 95th percentile interactions on target hardware.
- **SC-003**: Average frame rate remains ≥60 FPS for a continuous 3-minute cascade stress test on mid-tier Android/iOS and desktop reference devices.
- **SC-004**: 90% of surveyed users describe the animations as “exciting” or “very exciting” in UX testing, and at least 80% feel the UI is “fast/snappy.”
- **SC-005**: Less than 1% of sessions log fallback mode (missing asset, forced reduced motion) without showing a user-facing message.

## Assumptions

- Existing match logic, scoring, and inventory systems remain unchanged; this work focuses on presentation and interaction.
- Reference devices mirror current internal hardware list (mid-tier Android 12, iPhone 13, Surface Laptop touch, 1080p desktop).
- Haptic feedback is optional; platform support will be considered later but hooks must exist for future wiring.
