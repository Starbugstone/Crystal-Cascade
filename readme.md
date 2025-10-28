# Crystal Cascade: Complete Game Specification

## Executive Summary

**Crystal Cascade** is a premium match-3 puzzle game featuring tile-breaking mechanics, procedural level generation, arcade-style gameplay, and mobile-first design. This specification transforms the existing "Cascade Candy Clash" prototype into a full-featured game with progression systems, inventory management, and polished visual effects.

**Target Platforms:** Web (mobile-first), Progressive Web App (PWA) for iOS/Android tablets and phones, Capacitor shell for app stores  
**Engine:** Vue 3 + Vite front-end with PixiJS rendering layer for board visuals  
**Design Philosophy:** Snappy, arcade-style gameplay with immediate feedback and satisfying chain reactions

---

## Table of Contents

1. [Core Game Mechanics](#1-core-game-mechanics)
2. [Tile Breaking System](#2-tile-breaking-system)
3. [Level System & Win Conditions](#3-level-system--win-conditions)
4. [Match Types & Bonuses](#4-match-types--bonuses)
5. [Power-Up System](#5-power-up-system)
6. [Inventory & Lootbox System](#6-inventory--lootbox-system)
7. [Chain Reaction Mechanics](#7-chain-reaction-mechanics)
8. [Level Generation System](#8-level-generation-system)
9. [Visual Design & Art Direction](#9-visual-design--art-direction)
10. [Audio & Sound Design](#10-audio--sound-design)
11. [Mobile/Touch UX Design](#11-mobiletouch-ux-design)
12. [Game Motor Architecture](#12-game-motor-architecture)
13. [Progression & Difficulty Scaling](#13-progression--difficulty-scaling)
14. [Technical Requirements](#14-technical-requirements)

---

## 1. Core Game Mechanics

### 1.1 Game Theme: Crystal Cascade

**Setting:** A mystical crystalline realm where ancient gems hold elemental power. Players manipulate energy crystals to unlock deeper layers of a magical cavern system.

**Visual Theme:** 
- Crystalline, gem-based aesthetic (moving away from candy)
- Ethereal glow effects, particle trails, and energy bursts
- Dark background with luminous crystals for high contrast
- Arcane/mystical UI elements with runic accents

### 1.2 Core Loop

1. Player swaps adjacent crystals to create matches
2. Matches clear crystals and damage underlying tiles
3. Cleared crystals drop down, new ones spawn from top
4. Cascades trigger automatically, building multipliers
5. Level objectives remain active until completed, rewarding efficient play without hard turn limits
6. Victory rewards lootboxes containing inventory power-ups

### 1.3 Board Configuration

- **Standard Size:** 8×8 grid (adjustable per level: 6×6 to 9×9)
- **Crystal Types:** 6 base types (expandable to 7-8 for harder levels)
- **Swap Mechanic:** Drag or tap-select adjacent crystals
- **Match Requirements:** Minimum 3 in a row (horizontal/vertical)
- **Special Tiles:** Blockers, frozen tiles, chained crystals (see Section 2)

---

## 2. Tile Breaking System

### 2.1 Layered Tile Structure

**Concept:** Each board cell contains TWO layers:
1. **Top Layer:** The crystal/gem that can be matched
2. **Bottom Layer:** The tile/platform with a health value

**Tile Health System:**
- Tiles have 1-3 health layers (visual indicator: opacity, cracks, glow intensity)
- Matching crystals above a tile damages it by 1 layer
- Bonuses (bombs, beams) can damage multiple layers at once
- Tiles must reach 0 health to count toward win condition

### 2.2 Tile Types

#### Standard Tiles (1-3 layers)
- **Appearance:** Glowing platform beneath crystals, cracks form as health depletes
- **Behavior:** Each match above deals 1 damage
- **Visual States:**
  - 3 health: Full glow, pristine
  - 2 health: Dimmed glow, hairline cracks
  - 1 health: Faint glow, heavy cracks
  - 0 health (broken): Shatters with particle burst, becomes empty void

#### Frozen Tiles (special blockers)
- **Appearance:** Ice-covered, requires 2 matches to thaw, then 1-3 to break
- **Behavior:** First match removes ice layer, subsequent matches break tile
- **Effect:** Crystals above frozen tiles cannot be swapped until ice melts

#### Chained Tiles (spread mechanic)
- **Appearance:** Connected by glowing chains (visual link between 2-4 tiles)
- **Behavior:** Breaking one tile damages all connected tiles simultaneously
- **Strategy:** Creates high-value targets for combo planning

#### Locked Tiles (key-based)
- **Appearance:** Padlock icon overlay, dark metal frame
- **Behavior:** Cannot be damaged until player collects key crystal (special match-4 spawn)
- **Unlock:** Key crystal drops randomly; matching it near locks opens all locks on board

#### Indestructible Tiles
- **Appearance:** Dark, solid metal/stone, no glow
- **Behavior:** Cannot be broken; acts as permanent blocker
- **Use Case:** Forces specific board patterns, creates strategic bottlenecks

### 2.3 Tile Damage Distribution

- **Standard Match (3 crystals):** Damages 3 tiles (one per matched crystal) for 1 HP each
- **Extended Match (4+ crystals):** Damages all tiles beneath + creates bonus
- **Bomb Explosion:** Damages all tiles in 3×3 area for 2 HP each
- **Beam/Laser (Cross bonus):** Damages all tiles in row+column for 1 HP
- **Rainbow Orb:** Damages 8-12 random tiles for 1 HP each
- **Mega Combos:** Chain reactions increase damage to 3+ HP per tile

---

## 3. Level System & Win Conditions

### 3.1 Level Objectives (Win Conditions)

Each level has 1-3 primary objectives that must be completed to win:

#### Objective Type 1: Clear X Tiles
- **Example:** "Break 30 tiles" or "Clear all tiles on the board"
- **Visual Indicator:** Tile counter HUD element, broken tiles turn transparent/fade out
- **Difficulty Scaling:** More tiles, tougher health values, blockers

#### Objective Type 2: Reach Target Score
- **Example:** "Score 50,000 points"
- **Mechanic:** Encourages cascade-building and bonus creation
- **Difficulty Scaling:** Higher score thresholds, increased tile health, tougher layouts

#### Objective Type 3: Collect Special Crystals
- **Example:** "Collect 15 Ruby Crystals" (specific crystal type drops, player must match them)
- **Mechanic:** Special marked crystals spawn intermittently, must be matched to collect
- **Visual:** Glowing aura, counter icon in HUD

#### Objective Type 4: Activate X Bonuses
- **Example:** "Create and activate 5 Bomb Crystals"
- **Mechanic:** Rewards strategic play and bonus creation
- **Difficulty:** Requires planning, not just lucky cascades

### 3.2 Fail Conditions

- **Board Lock:** No legal moves remaining after automatic reshuffle attempts
- **Tile Overload:** Too many tiles reach critical health simultaneously (objective-specific)
- **Objective Failure:** Special objective constraints (e.g., locked tiles without key match) persist after safety threshold

### 3.3 Difficulty & Pacing Levers

- **Tile Health Scaling:** Increase layers (1-3) and distribution to tune challenge
- **Blocker Frequency:** Adjust frozen, chained, and indestructible tile density
- **Objective Targets:** Raise score/collection thresholds to demand deeper cascades
- **Bonus Availability:** Modify rainbow/bomb/cross spawn rates to influence strategy
- **Shuffle Budget:** Limit number of automatic board reshuffles before failure

### 3.4 Star Rating System

Victory is always awarded, but star rating adds replay value:

- **1 Star:** Complete the primary objective
- **2 Stars:** Complete all objectives OR exceed primary target by 50%
- **3 Stars:** Complete all objectives and hit the premium score benchmark + maintain cascade chain level 3+
- **Perfect:** Earn 3 stars without requiring manual reshuffle and clear every breakable tile

### 3.5 Level Progression Structure

- **World 1 (Tutorial):** Levels 1-15 — Introduce mechanics gradually
- **World 2 (Cascade Caverns):** Levels 16-40 — Standard tile-breaking focus
- **World 3 (Frozen Depths):** Levels 41-65 — Frozen tiles and blockers
- **World 4 (Chain Chambers):** Levels 66-90 — Chained tiles and complex patterns
- **World 5 (Prismatic Forge):** Levels 91-115 — Dense boards that reward precision cascades
- **World 6 (Master Gauntlet):** Levels 116-150 — Multi-objective, advanced blocker combinations
- **Endless Mode:** Unlocked after World 3, survival with increasing difficulty

---

## 4. Match Types & Bonuses

### 4.1 Standard Matches

#### Match-3 (Line)
- **Effect:** Clears 3 crystals, damages 3 tiles beneath, +100 points
- **Feedback:** Small particle burst, gentle chime

#### Match-4 (Line)
- **Effect:** Clears 4 crystals + creates **Bomb Crystal** at swap position
- **Bonus:** +250 points
- **Feedback:** Explosion sound, orange glow animation

#### Match-5 (Line)
- **Effect:** Clears 5 crystals + creates **Rainbow Orb** at swap position
- **Bonus:** +500 points
- **Feedback:** Rainbow shimmer, ethereal chime

### 4.2 Special Match Patterns

#### T-Shape or L-Shape (5 crystals)
- **Effect:** Creates **Cross Beam Crystal**
- **Bonus:** +400 points
- **Visual:** Golden plus-sign icon on crystal

### 4.3 Bonus Crystal Types (In-Game, Created by Matches)

#### 1. Bomb Crystal
- **Creation:** Match-4 in a line
- **Activation:** Match it OR swap it with any adjacent crystal
- **Effect:** Explodes 3×3 area (9 cells total)
- **Tile Damage:** 2 HP to all tiles in blast radius
- **Chain Reaction:** If a bomb hits another bomb, the secondary explosion uses the same 3×3 radius (no size escalation)
- **Visual:** Red/orange crystal with crackling energy, explodes with fire particles

#### 2. Rainbow Orb
- **Creation:** Match-5 in a line
- **Activation:** Swap with any crystal type
- **Effect:** Clears ALL crystals of the swapped type from the board
- **Tile Damage:** 1 HP to 8-12 random tiles (prioritizes high-health tiles)
- **Combo:** Swapping two Rainbow Orbs clears all crystals (tiles take standard 1 HP damage)
- **Visual:** Iridescent sphere, emits rainbow particle trails, activation sends beams to all targets

#### 3. Cross Beam Crystal
- **Creation:** T-shape or L-shape match (5 crystals)
- **Activation:** Match it OR swap with adjacent crystal
- **Effect:** Fires laser beams in 4 directions (full row + full column)
- **Tile Damage:** 1 HP to all tiles in beams (16 tiles on 8×8 board)
- **Chain Reaction:** If beam hits bomb, detonates bomb; if beam hits another cross beam, creates perpendicular beams
- **Visual:** Golden crystal with plus-sign icon, beams are bright yellow lasers with particle trails

---

## 5. Power-Up System

### 5.1 Pre-Move Power-Ups (Inventory Items)

These are **inventory items** obtained from lootboxes. Player can use them BEFORE making a move or activate them during gameplay.

#### A. Hand Power-Ups (Use Before Move)

##### 1. Hammer 🔨
- **Effect:** Destroy 1 selected crystal (no tile damage)
- **Use Case:** Remove blocking crystal to enable better match
- **Cooldown:** Single use per activation
- **Lootbox Rarity:** Common (60% drop rate)

##### 2. Color Wand 🪄
- **Effect:** Change 1 crystal to any color of your choice
- **Use Case:** Complete difficult matches, create bonuses
- **Cooldown:** Single use per activation
- **Lootbox Rarity:** Uncommon (30% drop rate)

##### 3. Shuffle 🔄
- **Effect:** Completely randomize all crystals on board (preserves bonuses)
- **Use Case:** Escape board locks, refresh bad board states
- **Cooldown:** Single use per activation
- **Lootbox Rarity:** Rare (8% drop rate)

##### 4. Tile Breaker ⛏️
- **Effect:** Instantly destroy 1 tile beneath a crystal (removes 3 HP layers)
- **Use Case:** Directly advance tile-clearing objectives
- **Cooldown:** Single use per activation
- **Lootbox Rarity:** Rare (10% drop rate)

#### B. Passive Boosts (Active for Entire Level)

##### 6. Cascade Amplifier 📈
- **Effect:** Cascade multiplier increases 2× faster (1×→3×→5× instead of 1×→2×→3×)
- **Use Case:** Maximize score on high-difficulty levels
- **Duration:** Entire level
- **Lootbox Rarity:** Epic (5% drop rate)

##### 7. Bonus Magnet 🧲
- **Effect:** All Match-4s create Match-5 bonuses (Rainbow Orbs instead of Bombs)
- **Use Case:** Generate more powerful bonuses easily
- **Duration:** Entire level
- **Lootbox Rarity:** Epic (4% drop rate)

##### 8. Double Damage 💥
- **Effect:** All tile damage doubled (match-3 deals 2 HP instead of 1)
- **Use Case:** Speed through tile-breaking objectives
- **Duration:** Entire level
- **Lootbox Rarity:** Legendary (2% drop rate)

### 5.2 Inventory Management

- **Inventory Slots:** Unlimited storage for power-ups
- **Quick Access Bar:** 4 slots for quick-select items (customizable)
- **Activation UI:** Tap power-up icon → tap target on board (for targeted items)
- **Economy:** Power-ups are NOT purchasable with in-game currency (lootbox-only to maintain balance)

---

## 6. Inventory & Lootbox System

### 6.1 Lootbox Mechanics

#### Earning Lootboxes
- **Victory Reward:** 1 lootbox per level completion (always)
- **Star Bonus:** +1 lootbox for 3-star victory
- **Streak Bonus:** +1 lootbox for every 5 levels completed without failure
- **Daily Login:** 1 free lootbox per day

#### Lootbox Tiers

##### Bronze Lootbox (Common)
- **Contents:** 2-4 common power-ups (Hammer, Color Wand)
- **Drop Rates:** 60% Common, 30% Uncommon, 10% Rare
- **Visual:** Bronze metallic box with faint glow

##### Silver Lootbox (Uncommon)
- **Contents:** 3-5 power-ups, at least 1 uncommon
- **Drop Rates:** 40% Common, 40% Uncommon, 18% Rare, 2% Epic
- **Visual:** Silver box with moderate glow, swirling particles

##### Gold Lootbox (Rare)
- **Contents:** 4-6 power-ups, guaranteed 1 rare or better
- **Drop Rates:** 20% Common, 35% Uncommon, 30% Rare, 12% Epic, 3% Legendary
- **Visual:** Golden box with intense glow, radiant aura

##### Platinum Lootbox (Legendary)
- **Contents:** 5-8 power-ups, guaranteed 1 epic + 1 legendary
- **Drop Rates:** 10% Common, 20% Uncommon, 30% Rare, 25% Epic, 15% Legendary
- **Visual:** Platinum box with rainbow prismatic effect, particle explosion on open

#### Opening Experience
- **Animation:** 3-second anticipation with box spinning/glowing
- **Reveal:** Cards flip one-by-one revealing power-ups
- **Sound:** Rarity-based audio cues (common = soft chime, legendary = triumphant fanfare)
- **Particle Effects:** Rarity-matched particle bursts (legendary = full-screen confetti)

### 6.2 Inventory Screen UI

- **Layout:** Grid view of all owned power-ups with quantity badges
- **Sorting:** By rarity, by type, by quantity
- **Details:** Tap item to see description, rarity, usage tips
- **Quick Equip:** Drag items to quick-access bar
- **Notifications:** Badge indicator for new items

---

## 7. Chain Reaction Mechanics

### 7.1 Cascade Multiplier System

- **Base Multiplier:** 1× for initial player move
- **Cascade Increment:** +1× for each automatic cascade (gravity-triggered matches)
- **Max Multiplier:** 10× (capped for balance)
- **Score Calculation:** (Crystals cleared × 50) × Cascade Multiplier
- **Reset:** Multiplier resets to 1× when board stabilizes (no more cascades)

### 7.2 Bonus Interaction Matrix

| **Combination**               | **Effect**                                                                 | **Tile Damage** | **Visual Effect**                          |
|-------------------------------|---------------------------------------------------------------------------|-----------------|-------------------------------------------|
| Bomb + Bomb                   | Sequential 3×3 blasts with slight delay                                   | 2 HP (both)     | Overlapping firebursts, gentle screen shake|
| Bomb + Cross Beam             | Bomb detonates first, then cross beam fires from blast center             | 2 HP (bomb area), 1 HP (row/column) | Expanding ring followed by laser sweep     |
| Bomb + Rainbow Orb            | Rainbow clears chosen color, then bomb explodes at swap position          | 1 HP (cleared tiles), 2 HP (3×3 area) | Color beams collapse into fiery burst      |
| Rainbow Orb + Rainbow Orb     | Clears all crystals; tiles take standard rainbow damage                   | 1 HP (all)      | Soft white flash with prismatic ripple     |
| Rainbow Orb + Cross Beam      | Cross beam fires, then rainbow clears a chosen color                      | 1 HP (row/column and color) | Golden beam streaks with rainbow afterglow |
| Cross Beam + Cross Beam       | First beam fires normally; second fires after delay at perpendicular axis | 1 HP (each affected tile) | Dual beam animation with shimmering cross  |

### 7.3 Chain Reaction Scoring

- **Base Bonus:** +500 points per bonus interaction
- **Chain Bonus:** +250 points for each subsequent bonus triggered by cascade
- **Mega Combo:** +2000 points for 3+ bonuses in single cascade
- **Perfect Chain:** +5000 points for clearing entire board via cascades (no moves between)

### 7.4 Advanced Combo Examples

#### Example 1: The Domino Effect
1. Player swaps to create Match-4 → Bomb spawns
2. Cascade triggers Match-3 next to bomb → Bomb explodes
3. Explosion creates Match-5 → Rainbow Orb spawns
4. Cascade triggers Match-3 with Rainbow Orb → Orb clears all of one type
5. Massive cascade continues, multiplier reaches 7×
6. **Result:** 15+ tiles broken, 50,000+ points

#### Example 2: Orbiting Beams
1. Player swaps Rainbow Orb + Cross Beam → cross fires, then rainbow clears blue crystals
2. Cascaded clears create two Bomb Crystals in adjacent columns
3. A falling crystal matches one bomb, triggering sequential 3×3 blasts
4. Blasts uncover chained tiles, creating another Rainbow Orb that clears remaining blues
5. **Result:** 12+ tiles broken, blockers removed, 65,000+ points

---

## 8. Level Generation System

### 8.1 Procedural Generation Algorithm

#### Phase 1: Board Layout
1. **Size Selection:** Choose grid size (6×6 to 9×9) based on difficulty
2. **Tile Placement:** 
   - Randomly place 60-100% of tiles as breakable
   - Add 0-10% frozen tiles (clusters or scattered)
   - Add 0-15% indestructible blockers (create pathways/patterns)
3. **Tile Health Distribution:**
   - Easy: 70% 1-layer, 25% 2-layer, 5% 3-layer
   - Medium: 50% 1-layer, 35% 2-layer, 15% 3-layer
   - Hard: 30% 1-layer, 40% 2-layer, 30% 3-layer

#### Phase 2: Special Tile Features
1. **Chained Tiles:** Place 1-3 chain groups (2-4 tiles each)
2. **Locked Tiles:** 0-5 locked tiles (only on hard levels)
3. **Symmetry Check:** Optional symmetric placement for aesthetic boards

#### Phase 3: Objective Assignment
1. **Determine Difficulty Tier:** Based on level number (see Section 13)
2. **Select 1-3 Objectives:**
   - Primary: Clear X tiles (always)
   - Secondary: Score threshold OR collect crystals OR activate bonuses
   - Tertiary (hard mode): Additional blocker constraints OR chained tile challenges
3. **Set Pacing Parameters:** Define shuffle allowance, cascade targets, and bonus spawn rates

#### Phase 4: Validation
1. **Solvability Check:** Run simulation to ensure level is completable
2. **Difficulty Calibration:** Adjust tile health or blocker density if simulation solves too easily/hard
3. **Playtest Metrics:** If win rate < 30% or > 80%, regenerate with adjusted parameters

### 8.2 Level Templates (Designer-Created)

For curated experiences, designers can create templates:

- **Template Structure:** JSON file defining tile positions, health, objectives
- **Variable Injection:** Templates use placeholders for randomized crystal types
- **Milestone Levels:** Every 10th level uses hand-crafted template for signature challenges

### 8.3 Endless Mode Generation

- **Incremental Difficulty:** Each survived level increases tile health and blocker density
- **Tile Spawn Rate:** +1 tile health per 5 levels survived
- **Blocker Density:** +2% indestructible tiles per 10 levels
- **Leaderboard:** Global ranking by highest level reached

---

## 9. Visual Design & Art Direction

### 9.1 Crystal Sprite Design

**Moving away from emojis to custom SVG/PNG sprites:**

#### Placeholder Graphics
The game currently uses placeholder graphics for the gems. These are generated in `src/game/pixi/placeholder-gems.js`. To replace them with real assets, you need to:

1.  Create your own sprite atlas with the gem sprites.
2.  Update `src/game/pixi/SpriteLoader.js` to load your sprite atlas instead of the placeholder graphics.
3.  Make sure the gem types in `src/game/engine/LevelGenerator.js` correspond to the names of the sprites in your atlas.

#### Crystal Types (6 Base Types)

##### 1. Ruby Crystal 💎 (Red)
- **Shape:** Octagonal gem, faceted
- **Color:** Deep crimson to bright scarlet gradient
- **Glow:** Warm orange aura
- **Particle Trail:** Fire sparks

##### 2. Sapphire Crystal 💠 (Blue)
- **Shape:** Hexagonal prism, pointed ends
- **Color:** Deep navy to bright cyan gradient
- **Glow:** Cool blue aura
- **Particle Trail:** Ice shards

##### 3. Emerald Crystal 💚 (Green)
- **Shape:** Square-cut gem with beveled edges
- **Color:** Forest green to lime gradient
- **Glow:** Soft green radiance
- **Particle Trail:** Leaves/nature sparkles

##### 4. Topaz Crystal ✨ (Yellow)
- **Shape:** Star-cut gem, 8 points
- **Color:** Golden amber to bright yellow gradient
- **Glow:** Bright golden aura
- **Particle Trail:** Light rays

##### 5. Amethyst Crystal 🔮 (Purple)
- **Shape:** Teardrop/oval cut
- **Color:** Deep violet to lavender gradient
- **Glow:** Mystical purple aura
- **Particle Trail:** Ethereal mist

##### 6. Moonstone Crystal 🌙 (White/Silver)
- **Shape:** Round brilliant cut
- **Color:** Pearlescent white to silver gradient
- **Glow:** Soft lunar glow
- **Particle Trail:** Stardust

#### Bonus Crystal Modifications
- **Bomb:** Base crystal wrapped in orange/red energy field with crackling arcs
- **Rainbow Orb:** Transparent sphere containing swirling rainbow liquid
- **Cross Beam:** Crystal emitting 4 golden laser lines

### 9.2 Tile Sprite Design

#### Tile Base (Platform beneath crystals)
- **Material:** Glowing runic stone with arcane symbols
- **Color:** Dark gray stone with teal/cyan glow lines
- **Animation:** Gentle pulse when healthy, flickering when damaged

#### Tile Health States
1. **3 Health:** Full brightness, strong glow, pristine surface
2. **2 Health:** 60% brightness, dimmed glow, hairline cracks appear
3. **1 Health:** 30% brightness, faint glow, deep cracks, edges crumbling
4. **Breaking Animation:** Shatters into 6-8 pieces that fade + 20+ particle burst

#### Frozen Tile Overlay
- **Ice Layer:** Semi-transparent blue-white ice with frost patterns
- **Thaw Animation:** Ice cracks spider-web style, then shatters

#### Locked Tile Overlay
- **Lock:** Golden padlock icon, metallic frame around tile
- **Unlock Animation:** Lock dissolves in golden light burst

### 9.3 Background & UI Elements

#### Game Board Background
- **Setting:** Deep cavern with glowing crystal formations in distance
- **Parallax Layers:** 3 layers (far crystals, mid-depth rock, near fog) scroll subtly
- **Lighting:** Ambient glow from crystals, dynamic lighting based on combos

#### UI Chrome
- **Style:** Mystical/arcane aesthetic (runes, glowing borders, ethereal fonts)
- **Color Palette:** Dark backgrounds (#0F172A, #1E293B) with bright accent colors
- **Font:** "Cinzel" or "Trajan Pro" for headers, "Inter" for body text
- **Buttons:** Raised 3D style with glow effects, tactile press animations

#### HUD Elements
- **Cascade Meter:** Circular icon showing current cascade level, pulses as it rises
- **Objective Tracker:** Progress bars with icon + fraction (e.g., "💎 15/30")
- **Score Display:** Large, prominent, animates on score gain (+1000 flies up)
- **Power-Up Bar:** Bottom of screen, 4 quick-access slots with cooldown overlays

### 9.4 Particle Effects System

#### Effect Categories

##### 1. Match Particles (Small)
- **Trigger:** Any match-3
- **Style:** 8-12 small sparkles in crystal's color, radiate outward
- **Duration:** 0.4 seconds
- **Physics:** Gravity + fade

##### 2. Cascade Particles (Medium)
- **Trigger:** Cascades (automatic matches)
- **Style:** 15-20 medium sparkles + trailing ribbons
- **Duration:** 0.6 seconds
- **Physics:** Gravity + lateral spread

##### 3. Bonus Explosion (Large)
- **Trigger:** Bomb or Cross Beam activations
- **Style:** 40-60 large particles + shockwave ring
- **Duration:** 0.8-1.2 seconds
- **Physics:** Radial explosion + gravity

##### 4. Rainbow Effects (Special)
- **Trigger:** Rainbow Orb activation, mega combos
- **Style:** 100+ rainbow-colored sparkles + beam trails
- **Duration:** 1.5 seconds
- **Physics:** Curved paths following beams

##### 5. Screen Effects (Full-Screen)
- **Trigger:** Double Rainbow clears, Perfect Clears, Level Victory
- **Style:** Screen flash (white/color), confetti burst, light rays
- **Duration:** 2-3 seconds
- **Physics:** Continuous spawn + gravity

### 9.5 Animation Timing & Feel

**Snappy Arcade Feel Requirements:**
- **Swap Animation:** 150ms (instant feedback)
- **Match Detection Delay:** 100ms (feels simultaneous)
- **Crystal Clear Animation:** 250ms (vanish with rotation + scale)
- **Gravity Drop Speed:** 300ms per tile (fast but readable)
- **Bonus Activation:** 400-600ms (dramatic but not sluggish)
- **Cascade Chain Delay:** 80ms between cascades (rapid-fire feel)

**Golden Rule:** Total time from swap to board stabilization should be < 2 seconds for standard match, < 4 seconds for mega combos.

---

## 10. Audio & Sound Design

### 10.1 Sound Effects (SFX)

#### Interaction Sounds
- **Crystal Select:** Soft crystalline "ting" (440Hz, 50ms)
- **Crystal Swap:** Whoosh + chime (200ms)
- **Invalid Swap:** Dull thud + error buzz (150ms)

#### Match Sounds
- **Match-3:** Gentle chime cascade (3 notes: C-E-G, 300ms)
- **Match-4:** Deeper chime + explosion (400ms)
- **Match-5:** Rising arpeggio + shimmer (600ms)
- **Special Patterns:** Unique signature sounds (T-shape = cross-bell tone)

#### Bonus Sounds
- **Bomb Explosion:** Deep bass thump + crackle (500ms)
- **Rainbow Orb:** Ethereal whoosh + sparkle rain (800ms)
- **Cross Beam:** Laser charge-up + zap (400ms)

#### Cascade Sounds
- **Cascade Multiplier:** Pitch increases with each cascade level (×1 = base pitch, ×10 = +2 octaves)
- **Cascade End:** Satisfying "completion" chord (major triad)

#### Tile Breaking Sounds
- **Tile Damage:** Crack sound (layered, intensity increases with damage)
- **Tile Shatter:** Glass break + bass thump (300ms)
- **Frozen Tile Thaw:** Ice crack + water trickle (400ms)
- **Lock Open:** Metallic click + unlock chime (250ms)

#### UI Sounds
- **Button Press:** Soft click (50ms)
- **Power-Up Activate:** Unique sound per power-up (200-400ms)
- **Lootbox Open:** Anticipation build (2s) + reveal fanfare (1s)
- **Victory:** Triumphant fanfare (3s)
- **Defeat:** Somber descending notes (2s)

### 10.2 Music Tracks

#### Main Menu Theme
- **Style:** Ambient, mysterious, inviting
- **Tempo:** 80-90 BPM
- **Instrumentation:** Synth pads, crystal chimes, soft drums
- **Duration:** 2-minute loop

#### Gameplay Theme (Standard Levels)
- **Style:** Upbeat, energetic, focus-enhancing
- **Tempo:** 120-130 BPM
- **Instrumentation:** Electronic beats, melodic synths, layered arpeggios
- **Dynamic Layers:** Add intensity layer when multiplier >5×
- **Duration:** 3-minute loop with variation

#### Gameplay Theme (Timed Levels)
- **Style:** Urgent, driving, tension-building
- **Tempo:** 140-150 BPM
- **Instrumentation:** Fast percussion, pulsing bass, staccato strings
- **Duration:** 2-minute loop (intentionally shorter to create urgency)

#### Victory Theme
- **Style:** Triumphant, celebratory
- **Duration:** 10-second stinger

#### Defeat Theme
- **Style:** Melancholic but encouraging
- **Duration:** 8-second stinger

### 10.3 Audio Mix & Levels

- **Master Volume:** Adjustable in settings (default 100%)
- **SFX Volume:** Adjustable independently (default 80%)
- **Music Volume:** Adjustable independently (default 60%)
- **Priority System:** Bonus explosions > match sounds > background music
- **Ducking:** Music volume reduces by 20% during major explosions

---

## 11. Mobile/Touch UX Design

### 11.1 Responsive Layout Architecture

#### Portrait Mode (Primary, Phones)
```
┌──────────────────┐
│   HUD (Score)    │ ← Compact, horizontal row
├──────────────────┤
│  Objective Bar   │ ← Collapsible, tap to expand
├──────────────────┤
│                  │
│   Game Board     │ ← Centered, max 80% width
│   (8×8 Grid)     │
│                  │
├──────────────────┤
│ Power-Up Bar (4) │ ← Bottom, easily reachable
└──────────────────┘
```

#### Landscape Mode (Tablets)
```
┌──────────────────────────────────────┐
│ Objectives │   Game Board   │  HUD   │
│  + Score   │   (8×8 Grid)   │ Power  │
│   Info     │                │  Ups   │
└──────────────────────────────────────┘
```

### 11.2 Touch Interactions

#### Crystal Swapping
- **Method 1 (Drag):** Touch and drag crystal to adjacent cell, release to swap
  - Visual: Crystal follows finger with 20px offset, ghosted outline in origin cell
  - Validation: If drag >60% into adjacent cell, trigger swap
  - Invalid: Snap back with bounce animation (200ms)

- **Method 2 (Tap-Select):** Tap crystal to select (glow outline), tap adjacent to swap
  - Visual: Selected crystal pulses with bright outline
  - Deselect: Tap selected crystal again OR tap non-adjacent cell
  - Timeout: Auto-deselect after 5 seconds of inactivity

#### Power-Up Activation
1. **Tap power-up icon** in quick-access bar → Icon follows finger
2. **Drag to target** on board (crystal or tile) → Highlight valid targets
3. **Release to activate** → Play activation animation + effect
4. **Cancel:** Drag outside board area and release

#### Gesture Shortcuts
- **Double-Tap Crystal:** Auto-select (same as single tap)
- **Long-Press Crystal:** Show info tooltip (crystal type, bonus potential)
- **Pinch Zoom:** Zoom board (1× to 1.5×) for precision on small screens
- **Swipe Down on HUD:** Pause menu

### 11.3 Touch Targets & Sizing

- **Minimum Crystal Size:** 48×48 CSS pixels (iOS/Android touch target standard)
- **Tap Tolerance:** 8px margin around crystals for forgiving input
- **Power-Up Buttons:** 64×64px (larger for important actions)
- **HUD Elements:** 40×40px minimum

### 11.4 Viewport & Scaling

- **Board Size Calculation:**
  ```javascript
  // Dynamically size crystals to fit screen
  const screenWidth = window.innerWidth;
  const cellSize = Math.min(
    Math.floor((screenWidth * 0.9) / boardSize), // 90% width
    64 // Max 64px per cell
  );
  ```

- **Safe Area Insets:** Respect iOS notch, Android navigation (use `env(safe-area-inset-*)`)
- **Minimum Resolution:** 360×640 (small phones)
- **Maximum Resolution:** 2048×2732 (iPad Pro)

### 11.5 Performance Optimization for Mobile

- **Canvas Rendering:** Use single canvas for particles (avoid DOM manipulation)
- **Animation Throttling:** Reduce particle count on low-end devices (detect via feature test)
- **Lazy Loading:** Load level data on-demand, not upfront
- **Asset Optimization:**
  - Crystal sprites: 128×128px, PNG with transparency
  - Tile sprites: 128×128px, PNG with transparency
  - Compress all images with TinyPNG (70% quality)
- **Memory Management:** Clear particle arrays after animations complete
- **Event Debouncing:** Throttle touch events to 60fps (16ms intervals)

### 11.6 Accessibility Considerations

- **High Contrast Mode:** Toggle for crystal color differentiation (add symbols/shapes)
- **Color Blind Support:** Unique crystal shapes for each type (not just colors)
- **Font Scaling:** Respect system font size settings (use `rem` units)
- **Screen Reader Support:** ARIA labels for all interactive elements
- **Reduced Motion:** Disable/simplify animations if `prefers-reduced-motion` is enabled

---

## 12. Game Motor Architecture

### 12.1 Core Engine Components

#### 1. Game State Manager
```javascript
const GameState = {
  board: Array(64),           // Flat array: [crystal objects]
  tiles: Array(64),           // Parallel array: [tile objects with health]
  score: 0,
  shuffleAllowance: 3,        // Automatic reshuffles allowed before failure
  reshufflesUsed: 0,
  level: 1,
  objectives: [],             // Array of objective objects
  inventory: {},              // Map of power-up IDs to quantities
  activePowerUps: [],         // Currently active boosts
  cascadeMultiplier: 1,
  isAnimating: false,
  selectedCell: null
};
```

#### 2. Match Detection Engine
```javascript
class MatchEngine {
  findMatches(board) {
    // Returns { matches: Set(indices), patterns: Array(pattern objects) }
  }
  
  detectPattern(matchIndices) {
    // Returns 'line' | 't-shape' | 'l-shape'
  }
  
  calculateBonusType(pattern, length) {
    // Returns bonus crystal type based on pattern + length
  }
}
```

#### 3. Animation Queue System
```javascript
class AnimationQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
  }
  
  add(animation) {
    // Adds animation to queue: { type, targets, duration, callback }
  }
  
  async process() {
    // Processes animations sequentially, respecting timing
  }
}
```

#### 4. Tile Damage System
```javascript
class TileManager {
  damageTile(index, amount) {
    // Reduces tile health, triggers visual update
  }
  
  getTileHealth(index) {
    // Returns current health (0-3)
  }
  
  breakTile(index) {
    // Destroys tile, plays animation, updates objective tracker
  }
  
  checkChains(index) {
    // If tile is chained, damage connected tiles
  }
}
```

#### 5. Combo Resolver
```javascript
class ComboResolver {
  async resolveCombination(bonusA, bonusB) {
    // Handles special bonus interactions (Bomb+Orb, etc.)
  }
  
  async cascadeResolve(board) {
    // Recursive function: resolve matches → drop crystals → check matches again
  }
  
  calculateScore(matches, cascadeLevel) {
    // Returns score with multiplier applied
  }
}
```

#### 6. Level Generator
```javascript
class LevelGenerator {
  generate(levelNumber) {
    // Returns level configuration object
  }
  
  generateTileLayout(difficulty) {
    // Returns tile array with health values
  }
  
  generateObjectives(tileCount, difficulty) {
    // Returns array of objective objects
  }
  
  validate(levelConfig) {
    // Simulates level to ensure solvability
  }
}
```

#### 7. Lootbox System
```javascript
class LootboxManager {
  open(tier) {
    // Rolls items based on rarity probabilities
  }
  
  addToInventory(items) {
    // Adds items to player inventory
  }
  
  roll(dropTable) {
    // Returns random item based on weighted probabilities
  }
}
```

### 12.2 Event-Driven Architecture

```javascript
// Use event emitter for decoupled communication
class GameEvents extends EventEmitter {
  // Events:
  // 'match-made' → { indices, pattern }
  // 'cascade-start' → { level }
  // 'tile-broken' → { index }
  // 'objective-complete' → { objective }
  // 'level-win' → { stars, score }
  // 'level-fail' → { reason }
}
```

### 12.3 Timing & Frame Budget

**Target:** 60fps (16.67ms per frame)

**Frame Budget Allocation:**
- Game logic: 4ms
- Rendering: 8ms
- Particle systems: 3ms
- Input handling: 1ms
- Buffer: 0.67ms

**Optimization Strategies:**
- Use `requestAnimationFrame` for all animations
- Batch DOM updates (read → calculate → write)
- Use CSS transforms (GPU-accelerated) for crystal movement
- Pool particle objects (avoid GC thrashing)
- Debounce input events

### 12.4 Save System

```javascript
// LocalStorage schema
const SaveData = {
  version: '1.0',
  player: {
    currentLevel: 15,
    highestLevel: 15,
    totalStars: 42,
    totalScore: 1250000,
    inventory: { hammer: 5, colorWand: 3, ... },
    unlockedWorlds: [1, 2],
    settings: { sfxVolume: 80, musicVolume: 60 }
  },
  levelProgress: {
    1: { stars: 3, bestScore: 25000, completed: true },
    2: { stars: 2, bestScore: 18000, completed: true },
    // ...
  },
  statistics: {
    totalMatches: 5420,
    totalCascades: 1230,
    longestCascade: 12,
    bombsActivated: 89,
    // ...
  }
};
```

**Auto-Save Triggers:**
- Level completion (victory/defeat)
- Power-up use
- Lootbox opening
- Settings change
- Every 30 seconds during gameplay (debounced)

---

## 13. Progression & Difficulty Scaling

### 13.1 Difficulty Tiers

| **Level Range** | **Tier**      | **Auto Reshuffles** | **Tile Health** | **Blockers** | **Objectives**     |
|-----------------|---------------|---------------------|-----------------|--------------|-------------------|
| 1-10            | Tutorial      | 5                   | 1-2 layers      | 0-5%         | 1 simple          |
| 11-25           | Easy          | 4                   | 1-2 layers      | 5-10%        | 1-2 simple        |
| 26-50           | Medium        | 3                   | 1-3 layers      | 10-15%       | 2 moderate        |
| 51-75           | Medium-Hard   | 3                   | 2-3 layers      | 15-20%       | 2-3 moderate      |
| 76-100          | Hard          | 2                   | 2-3 layers      | 20-25%       | 2-3 complex       |
| 101-125         | Very Hard     | 2                   | 2-3 layers      | 25-30%       | 3 complex         |
| 126-150         | Expert        | 1                   | 2-3 layers      | 30-35%       | 3 very complex    |
| 151+            | Master        | 1                   | 3 layers only   | 35-40%       | 3 master-level    |

### 13.2 Objective Complexity Scaling

**Simple Objectives (Levels 1-25):**
- Clear 20 tiles (all 1-layer)
- Score 15,000 points
- Collect 10 specific crystals

**Moderate Objectives (Levels 26-75):**
- Clear 40 tiles (mix of 1-3 layers)
- Score 35,000 points while reaching cascade multiplier 4
- Activate 3 bonus crystals

**Complex Objectives (Levels 76-125):**
- Clear 60 tiles (mostly 2-3 layers) + score 50,000
- Clear all frozen tiles + collect 15 crystals
- Stabilize 3 chained tile groups before they relock

**Very Complex Objectives (Levels 126+):**
- Clear 80 tiles (all 3-layer) + score 100,000 + activate 5 bonuses
- Perfect clear (entire board) with no manual reshuffles
- Chain 5 mega combos (3+ bonuses in cascade)

### 13.3 Reward Scaling

| **Achievement**         | **Reward**                               |
|-------------------------|------------------------------------------|
| Level Victory (1-star)  | 1 Bronze Lootbox                         |
| Level Victory (3-star)  | 1 Silver Lootbox                         |
| Perfect Victory         | 1 Gold Lootbox                           |
| World Completion        | 1 Platinum Lootbox + 5 Gold Lootboxes   |
| 5-Level Streak          | 1 Silver Lootbox                         |
| 10-Level Streak         | 1 Gold Lootbox                           |
| Daily Login (Day 1-6)   | 1 Bronze Lootbox                         |
| Daily Login (Day 7)     | 1 Gold Lootbox (reset streak)            |
| Master Level Clear      | 2 Platinum Lootboxes                     |

### 13.4 Tutorial Sequence (Levels 1-10)

**Level 1:** Match-3 introduction, no fail condition  
**Level 2:** Introduce tile breaking mechanic  
**Level 3:** First objective (clear 15 tiles)  
**Level 4:** Introduce Match-4 → Bomb bonus  
**Level 5:** Introduce Match-5 → Rainbow Orb  
**Level 6:** Introduce cascades and multipliers  
**Level 7:** First frozen tile (demonstrate thaw mechanic)  
**Level 8:** Introduce Cross Beam (T-shape match)  
**Level 9:** Introduce power-ups (give free Hammer)  
**Level 10:** Mini-boss level (multi-objective, 2-star minimum to progress)

---

## 14. Technical Requirements

### 14.1 Technology Stack

- **Core:** Vue 3 (Composition API) app scaffolded with Vite (TypeScript-ready)
- **Rendering:** PixiJS (WebGL canvas) for board + particle effects, standard Vue components for HUD/menus
- **State Management:** Pinia store modules with persisted state via LocalStorage (IndexedDB fallback for large data)
- **Audio:** Web Audio API wrapped with Howler.js for consistent cross-browser playback
- **Mobile Packaging:** Capacitor bridge for deploying the PWA as native shells on iOS/Android
- **Hosting:** Static hosting (Netlify, Vercel, GitHub Pages) with service worker enabled for offline play

### 14.2 Browser Compatibility

- **Target Browsers:**
  - Chrome 100+ (mobile + desktop)
  - Safari 15+ (iOS + macOS)
  - Firefox 100+
  - Edge 100+
- **Polyfills:** None required (modern baseline)
- **Fallbacks:** Graceful degradation for Web Audio API (silent mode if unavailable)

### 14.3 Asset Specifications

| **Asset Type**       | **Format**      | **Size**         | **Notes**                          |
|----------------------|-----------------|------------------|------------------------------------|
| Crystal Sprites      | PNG (RGBA)      | 128×128px        | 6-8 files, <50KB each              |
| Bonus Sprites        | PNG (RGBA)      | 128×128px        | 6 files, <60KB each                |
| Tile Sprites         | PNG (RGBA)      | 128×128px        | 4 files (states), <40KB each       |
| Background Image     | WebP/JPEG       | 1920×1080px      | <300KB, parallax layers            |
| UI Icons             | SVG             | Vector           | <10KB each                         |
| SFX Audio            | MP3 + OGG       | Mono, 44.1kHz    | <100KB per file                    |
| Music Tracks         | MP3 + OGG       | Stereo, 44.1kHz  | <2MB per track (2-3 min loops)     |
| Particle Textures    | PNG (RGBA)      | 32×32px          | <5KB each, soft-edged circles      |

### 14.4 Performance Targets

| **Metric**                  | **Target**         | **Acceptable**     |
|-----------------------------|--------------------|--------------------|
| Initial Load Time           | <2 seconds         | <4 seconds         |
| Frame Rate (Gameplay)       | 60fps              | 45fps minimum      |
| Frame Rate (Mega Combos)    | 50fps              | 30fps minimum      |
| Memory Usage (Mobile)       | <100MB             | <150MB             |
| Touch Response Latency      | <50ms              | <100ms             |
| Save Data Size              | <500KB             | <1MB               |

### 14.5 Code Architecture

```
/src
  main.ts                 // Bootstraps Vue app + Pixi stage
  App.vue                 // Root layout shell
  /components
    BoardCanvas.vue       // PixiJS board rendering + interactions
    HudPanel.vue          // Score, objectives, cascade meter
    PowerUpBar.vue        // Inventory quick access
    LevelSelectModal.vue  // World map UI
    SettingsDrawer.vue    // Options screen
  /game
    engine/
      GameLoop.ts         // Main game loop + tick scheduling
      MatchEngine.ts      // Match detection (line, T, L)
      TileManager.ts      // Tile health system
      BonusResolver.ts    // Bomb/Rainbow/Cross interactions
      LevelGenerator.ts   // Procedural levels + pacing params
    pixi/
      ParticleFactory.ts  // Particle effect definitions
      SpriteLoader.ts     // Asset loading + caching
  /stores
    gameStore.ts          // Pinia store for board + objectives
    inventoryStore.ts     // Power-up inventory state
    settingsStore.ts      // Audio, accessibility, preferences
  /composables
    useInputHandlers.ts   // Touch/mouse swipe helpers
    useAudio.ts           // Audio playback controls
  /assets
    /sprites
      crystals/           // Crystal images
      tiles/              // Tile images
      bonuses/            // Bonus overlays
    /audio
      sfx/                // Sound effects
      music/              // Music loops
    /fonts
      Cinzel-Bold.woff2
      Inter-Regular.woff2
  /styles
    base.css              // Tailwind-like utility classes
    theme.css             // Theming + color variables
  /data
    levels.json           // Level templates
    dropTables.json       // Lootbox probabilities
/capacitor
  capacitor.config.ts     // Capacitor configuration
  ios/                    // iOS native wrapper
  android/                // Android native wrapper
```

### 14.6 Testing Requirements

#### Functional Testing
- ✅ All match patterns detect correctly (line-3/4/5, T-shape, L-shape)
- ✅ Tile health decrements properly (1, 2, 3 layers)
- ✅ All bonus combinations work as specified
- ✅ Cascades resolve recursively until board stabilizes
- ✅ Objectives track accurately
- ✅ Power-ups activate correctly
- ✅ Lootbox drops follow probability tables

#### Platform Testing
- ✅ iOS Safari (iPhone 12+, iPad Air)
- ✅ Android Chrome (Samsung Galaxy S21+, Pixel 6+)
- ✅ Desktop Chrome, Firefox, Safari, Edge

#### Performance Testing
- ✅ 60fps sustained during standard gameplay
- ✅ 30fps minimum during extreme combos (10+ explosions)
- ✅ No memory leaks after 100+ levels
- ✅ <100ms input latency on all platforms

#### Accessibility Testing
- ✅ Color blind mode functional (symbols + colors)
- ✅ Screen reader announces game state changes
- ✅ Keyboard navigation works (desktop)
- ✅ Reduced motion mode disables particles

---

## 15. Development Phases

### Phase 1: Core Mechanics (Weeks 1-3)
- [x] Game board rendering
- [x] Crystal swapping
- [x] Match detection (3, 4, 5)
- [x] Tile health system
- [x] Basic animations
- [x] Cascade system

### Phase 2: Bonuses & Effects (Weeks 4-5)
- [ ] Bomb, Rainbow Orb, Cross Beam bonuses (implementation + polishing)
- [ ] Bonus combination matrix
- [ ] Particle system
- [ ] Audio integration

### Phase 3: Level System (Weeks 6-7)
- [ ] Level generator
- [ ] Objective system
- [ ] Win/fail conditions
- [ ] Star rating
- [ ] Tile types (frozen, locked, chained)

### Phase 4: Power-Ups & Inventory (Week 8)
- [ ] Power-up implementation (9 types)
- [ ] Inventory UI
- [ ] Lootbox system
- [ ] Rarity-based drop tables

### Phase 5: UI/UX Polish (Weeks 9-10)
- [ ] Custom crystal sprites
- [ ] HUD design
- [ ] Level select screen
- [ ] Settings menu
- [ ] Mobile touch optimization

### Phase 6: Content & Balancing (Weeks 11-12)
- [ ] 50 handcrafted levels
- [ ] Difficulty calibration
- [ ] Endless mode
- [ ] Tutorial sequence

### Phase 7: Testing & Optimization (Weeks 13-14)
- [ ] Cross-platform testing
- [ ] Performance optimization
- [ ] Accessibility pass
- [ ] Bug fixing

### Phase 8: Launch Preparation (Week 15)
- [ ] PWA setup
- [ ] App store assets
- [ ] Marketing materials
- [ ] Soft launch

---

## 16. Future Expansion Ideas

### Potential DLCs / Updates

#### Update 1: Elemental Powers (3 months post-launch)
- New crystal types with elemental effects (fire spreads, ice freezes, lightning chains)
- 30 new levels
- 2 new power-ups

#### Update 2: Multiplayer Arena (6 months post-launch)
- Asynchronous PvP (compete for high scores on shared levels)
- Leaderboards
- Weekly challenges

#### Update 3: Daily Quests (9 months post-launch)
- 3 daily quests (e.g., "Clear 100 tiles today")
- Quest rewards (Gold Lootboxes)
- Achievement system

#### Update 4: Seasonal Events (ongoing)
- Limited-time themed levels (Halloween, Winter, Spring)
- Exclusive cosmetic skins for crystals
- Event-specific lootboxes

---

## Appendix A: Glossary

- **Cascade:** Automatic match that occurs after crystals fall from gravity
- **Multiplier:** Score multiplier that increases with each cascade in a chain
- **Tile Health:** Number of layers (1-3) a tile has before breaking
- **Bonus Crystal:** Special crystal created by specific match patterns
- **Power-Up:** Inventory item used by player to gain advantage
- **Lootbox:** Randomized reward container earned after level victories
- **Blocker:** Indestructible tile that cannot be broken
- **Chain Reaction:** Series of bonus activations triggered by cascades

---

## Appendix B: Revision History

| **Version** | **Date**       | **Changes**                                  |
|-------------|----------------|----------------------------------------------|
| 1.0         | [Today]        | Initial specification document created       |

---

**End of Specification Document**

*This document is a living specification and will be updated as development progresses and playtesting reveals necessary adjustments.*

