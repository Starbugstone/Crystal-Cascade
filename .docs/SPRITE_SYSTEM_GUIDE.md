# Crystal Cascade - Sprite System Technical Guide

_Last updated: 2025-10-28_

This document provides detailed technical specifications for the sprite system in Crystal Cascade, including how sprite sheets are structured, how they're processed, and how to modify them.

---

## Table of Contents

1. [Overview](#overview)
2. [Gem Sprite Sheet Specifications](#gem-sprite-sheet-specifications)
3. [Bonus Animation Sprite Sheet Specifications](#bonus-animation-sprite-sheet-specifications)
4. [Background Tile Overlay System](#background-tile-overlay-system)
5. [How Sprite Cutting Works](#how-sprite-cutting-works)
6. [Rendering Pipeline](#rendering-pipeline)
7. [Modifying Sprite Configurations](#modifying-sprite-configurations)
8. [Adding New Sprites](#adding-new-sprites)
9. [Performance Considerations](#performance-considerations)

---

## Overview

Crystal Cascade uses two separate sprite sheet systems:

1. **Gem Sprite Sheet** (`gem-sprite-1.png`) - Static sprites for the six base gem types
2. **Bonus Sprite Sheet** (`bonus-sprite-1.png`) - Animated sprite frames for three bonus types

Both systems use a **grid-based layout** where the sprite sheet is divided into equal-sized cells. The cutting algorithm calculates cell dimensions automatically based on the total image size and grid configuration.

---

## Gem Sprite Sheet Specifications

### Current Configuration

| Property | Value |
|----------|-------|
| **File Path** | `/public/sprite/gem-sprite-1.png` |
| **Recommended Size** | 1024×1024 pixels (or any square resolution divisible by 3) |
| **Grid Layout** | 3×3 (9 total cells) |
| **Used Cells** | 6 (first two rows) |
| **Unused Cells** | 3 (bottom row - reserved for future expansion) |
| **Cell Size** | Image width ÷ 3 = 341.33px (for 1024×1024) |

### Grid Layout and Mapping

The sprite sheet is read **left-to-right, top-to-bottom**:

```
┌─────────┬─────────┬─────────┐
│ Cell 0  │ Cell 1  │ Cell 2  │  Row 0
│  Ruby   │Sapphire │ Emerald │
├─────────┼─────────┼─────────┤
│ Cell 3  │ Cell 4  │ Cell 5  │  Row 1
│  Topaz  │Amethyst │Moonstone│
├─────────┼─────────┼─────────┤
│ Cell 6  │ Cell 7  │ Cell 8  │  Row 2
│(Reserved)│(Reserved)│(Reserved)│
└─────────┴─────────┴─────────┘
  Col 0     Col 1     Col 2
```

### Gem Type Order

The gems are mapped in this exact order:

```javascript
const BASE_GEM_TYPES = [
  'ruby',      // Cell 0 (Row 0, Col 0)
  'sapphire',  // Cell 1 (Row 0, Col 1)
  'emerald',   // Cell 2 (Row 0, Col 2)
  'topaz',     // Cell 3 (Row 1, Col 0)
  'amethyst',  // Cell 4 (Row 1, Col 1)
  'moonstone'  // Cell 5 (Row 1, Col 2)
];
```

### Recommended Specifications

- **Minimum Resolution**: 512×512 pixels (170×170 per cell)
- **Recommended Resolution**: 1024×1024 pixels (341×341 per cell)
- **Maximum Resolution**: 2048×2048 pixels (682×682 per cell)
- **Format**: PNG with transparency
- **Aspect Ratio**: 1:1 (perfect square)
- **Cell Aspect Ratio**: 1:1 (each cell should be square)
- **Padding**: None required (sprites are cut edge-to-edge)
- **Safe Area**: Keep important details within 90% of cell area (10% margin for anti-aliasing)

---

## Bonus Animation Sprite Sheet Specifications

### Current Configuration

| Property | Value |
|----------|-------|
| **File Path** | `/public/sprite/bonus-sprite-1.png` |
| **Current Size** | 1024×1024 pixels |
| **Grid Layout** | 3×3 (9 total frames) |
| **Animation Types** | 3 (bomb, rainbow, cross) |
| **Frames per Animation** | 3 frames each |
| **Cell Size** | Image width ÷ 3 = 341.33px (for 1024×1024) |

### Grid Layout and Animation Mapping

Each **row** contains one complete animation sequence:

```
┌─────────┬─────────┬─────────┐
│ Frame 0 │ Frame 1 │ Frame 2 │  Row 0: BOMB Animation
│  Bomb1  │  Bomb2  │  Bomb3  │
├─────────┼─────────┼─────────┤
│ Frame 3 │ Frame 4 │ Frame 5 │  Row 1: RAINBOW Animation
│Rainbow1 │Rainbow2 │Rainbow3 │
├─────────┼─────────┼─────────┤
│ Frame 6 │ Frame 7 │ Frame 8 │  Row 2: CROSS/FLAME Animation
│ Cross1  │ Cross2  │ Cross3  │
└─────────┴─────────┴─────────┘
  Col 0     Col 1     Col 2
```

### Bonus Type Order

```javascript
const SPECIAL_TYPES = [
  'bomb',    // Row 0 (frames 0, 1, 2)
  'rainbow', // Row 1 (frames 3, 4, 5)
  'cross'    // Row 2 (frames 6, 7, 8)
];
```

### Animation Frame Guidelines

- **Frame Count**: 3 frames per animation (can be modified, see [Modifying Configurations](#modifying-sprite-configurations))
- **Frame Rate**: Animations play at 0.1 speed (6 frames per second at 60 FPS)
- **Loop Behavior**: All animations loop continuously
- **Keyframes**: 
  - Frame 0: Start/rest pose
  - Frame 1: Mid-animation (peak effect)
  - Frame 2: End pose (should transition smoothly back to Frame 0)

### Recommended Specifications

- **Minimum Resolution**: 512×512 pixels (170×170 per frame)
- **Recommended Resolution**: 1024×1024 pixels (341×341 per frame)
- **Maximum Resolution**: 2048×2048 pixels (682×682 per frame)
- **Format**: PNG with transparency
- **Aspect Ratio**: 1:1 (perfect square)
- **Frame Aspect Ratio**: 1:1 (each frame should be square)
- **Padding**: None required
- **Animation Style**: Should loop smoothly (frame 2 → frame 0 transition)
- **Safe Area**: Keep important details within 90% of cell area

---

## Background Tile Overlay System

### Purpose

- Breakable board tiles now use dedicated overlay sprites so their health state is visible at all times, even while gems are moving or matches are animating.
- The renderer keeps tile overlays on a dedicated `tileLayer` that sits between the background grid and the gem sprites. This prevents the green debug rectangles from disappearing and gives space for art-driven feedback.

### Placeholder Implementation (Current)

The sprite loader now returns a `tileTextures` object alongside the gem textures and bonus animations:

```javascript
const { textures, bonusAnimations, tileTextures } = loadSpriteAtlas(scene);
```

`tileTextures` is populated today by `src/game/phaser/placeholder-tiles.js`, which draws simple plates with progressively heavier cracks. Four discrete states are generated and keyed by remaining health:

| Layer Key | Intended Health State | Visual Notes |
|-----------|-----------------------|--------------|
| `4`       | Pristine / full health | Cool teal plate with no cracks |
| `3`       | Lightly damaged        | Cyan plate with small corner fractures |
| `2`       | Damaged                | Blue plate with multiple cracks |
| `1`       | Critical               | Warm orange plate with heavy cracking |

Each placeholder tile is 256×256 pixels and is automatically scaled to ~92% of the board cell size so the interaction highlight (when active) still hugs the tile edges instead of sitting on top of the art.

### Runtime Integration

- `BoardScene` builds the layer stack as `[backgroundLayer, tileLayer, gemLayer, fxLayer]` and hands every layer to `BoardAnimator`.
- `BoardAnimator` keeps a `tileSprites` map and updates each sprite whenever `tile.health` changes. Health values are mapped to the closest available texture inside `tileTextures.layers` so the system gracefully handles boards with more (or fewer) damage stages than the placeholder set.
- The base grid rectangles are transparent by default; they only gain a stroke while you’re actively highlighting a cell, which keeps the placeholder art unobstructed.
- Placeholder tile overlays are rendered at roughly 78% opacity so you can still read the board background while testing different palettes.
- Tile overlays stay visible during swaps, cascades, and reshuffles because they never leave the scene—only their texture and visibility are toggled.

### Replacing the Placeholders

When the authored background tile sprite sheet is ready, replace the placeholder pipeline with the real art:

1. **Add the sprite sheet** to `public/sprite/tile-sprite-1.png` (or a new path of your choice). Recommended layout is a single row with one frame per damage stage (e.g. 4 columns × 1 row). Keep every frame square and evenly spaced.
2. **Update `SpriteLoader.js`**:
   - Call `scene.load.image('tile-sheet', '/sprite/tile-sprite-1.png')` from `preloadSpriteAssets`.
   - Replace the `createPlaceholderTiles(...)` call with a slicing helper that reads each frame from `tile-sheet` and fills `tileTextures.layers[layerValue]` with `{ key, width, height }` entries. The indices should still map to health values (`4` = full health, `1` = critical).
   - If you provide fewer or more stages, make sure the mapper in `BoardAnimator._resolveTileTexture` can still pick a sensible texture for every health ratio.
3. **Optional polish**: Add a `tileTextures.cleared` entry for decorative debris or sparkle sprites shown when a tile reaches zero health. The animator already hides the overlay if no texture is returned, so this is an additive enhancement.

Design tip: keep the outer 5–8% of each frame mostly transparent so the highlight stroke from the grid remains readable, and push any destruction FX into the FX layer rather than baking them into the static tiles.

---

## How Sprite Cutting Works

### Grid-Based Cutting Algorithm

Both sprite systems use the same cutting algorithm:

```javascript
// 1. Calculate cell dimensions
const cellWidth = Math.floor(textureWidth / GRID_COLS);
const cellHeight = Math.floor(textureHeight / GRID_ROWS);

// 2. For each sprite/frame, calculate position
const col = index % GRID_COLS;           // Column position (0, 1, or 2)
const row = Math.floor(index / GRID_COLS); // Row position (0, 1, or 2)
const x = col * cellWidth;               // Left edge in pixels
const y = row * cellHeight;              // Top edge in pixels

// 3. Create a Rectangle to define the cut area
const frame = new Rectangle(x, y, cellWidth, cellHeight);

// 4. Create a Texture using this Rectangle
const texture = new Texture({ 
  source: baseTexture.source, 
  frame: frame 
});
```

### Mathematical Details

For a **1024×1024** image with a **3×3 grid**:

```
Cell Width  = floor(1024 / 3) = 341 pixels
Cell Height = floor(1024 / 3) = 341 pixels
```

#### Example: Ruby (Cell 0)
```
Index = 0
Col   = 0 % 3 = 0
Row   = floor(0 / 3) = 0
X     = 0 × 341 = 0
Y     = 0 × 341 = 0
Cut Region = Rectangle(0, 0, 341, 341)
```

#### Example: Amethyst (Cell 4)
```
Index = 4
Col   = 4 % 3 = 1
Row   = floor(4 / 3) = 1
X     = 1 × 341 = 341
Y     = 1 × 341 = 341
Cut Region = Rectangle(341, 341, 341, 341)
```

#### Example: Rainbow Frame 2 (Cell 5)
```
Type Index = 1 (rainbow is second in SPECIAL_TYPES)
Frame Index = 2 (third frame)
Row   = 1 (one row per bonus type)
Col   = 2 (one column per frame)
X     = 2 × 341 = 682
Y     = 1 × 341 = 341
Cut Region = Rectangle(682, 341, 341, 341)
```

### Coordinate System

- **Origin**: Top-left corner (0, 0)
- **X-Axis**: Increases to the right
- **Y-Axis**: Increases downward (standard computer graphics convention)
- **No Padding**: Cells are cut edge-to-edge with no spacing

### Precision Note

The system uses `Math.floor()` for cell dimension calculations. This means:

- A 1024×1024 image divided by 3 = 341.33... → rounded down to **341 pixels**
- The last 1-2 pixels on the right/bottom edges may be excluded
- **Recommendation**: Use dimensions perfectly divisible by your grid size
  - 3×3 grid: Use 900×900, 1200×1200, 1500×1500, etc.
  - 4×4 grid: Use 1024×1024, 2048×2048, etc.

---

## Rendering Pipeline

### Load → Extract → Render Flow

```
1. Application Startup
   ↓
2. BoardCanvas.vue calls loadSpriteAtlas(app)
   ↓
3. SpriteLoader.js loads PNG files via PixiJS Assets
   ↓
4. Grid cutting algorithm extracts individual textures/frames
   ↓
5. Returns { textures, bonusAnimations } to BoardCanvas
   ↓
6. Passed to gameStore.attachRenderer()
   ↓
7. gameStore.refreshBoardVisuals() renders sprites
```

> **Tile overlays** follow the same path: `loadSpriteAtlas` now injects a `tileTextures` payload, the Phaser board scene forwards a dedicated `tileLayer`, and `BoardAnimator` keeps each overlay sprite in sync with the tile health.

### Rendering Logic (gameStore.js)

```javascript
// For each board cell:
if (bonusTypes.includes(cell.type) && bonusAnimations?.[cell.type]) {
  // Create animated sprite from frame array
  gemSprite = new AnimatedSprite(bonusAnimations[cell.type]);
  gemSprite.animationSpeed = 0.1; // Animation speed
  gemSprite.loop = true;          // Loop continuously
  gemSprite.play();               // Start playing
} else {
  // Create static sprite from texture
  gemSprite = new Sprite(sprites[cell.type]);
}

// Size the sprite to 85% of cell size (with 7.5% margin on all sides)
const spriteSize = cellSize * 0.85;
gemSprite.width = spriteSize;
gemSprite.height = spriteSize;
gemSprite.anchor.set(0.5); // Center the sprite's anchor point
```

### Animation Parameters

- **animationSpeed**: `0.1` = Play 0.1 frames per tick at 60 FPS = ~6 FPS effective
  - Lower values = slower animation
  - Higher values = faster animation
  - Formula: `Effective FPS = animationSpeed × Game FPS`
- **loop**: `true` = Animation repeats indefinitely
- **play()**: Starts animation immediately upon creation

---

## Modifying Sprite Configurations

### Scenario 1: Change Sprite Sheet Resolution

**No code changes required** if you maintain the same grid layout (3×3).

The cutting algorithm automatically adapts:
- Replace `gem-sprite-1.png` or `bonus-sprite-1.png` with your new resolution
- Keep the same grid structure (3 rows × 3 columns)
- The system will calculate new cell sizes automatically

**Example**: Upgrading from 1024×1024 to 2048×2048
```
Old cell size: 1024 / 3 = 341px
New cell size: 2048 / 3 = 682px  ← Automatically calculated
```

---

### Scenario 2: Change Grid Dimensions

**File to modify**: `src/game/pixi/SpriteLoader.js`

#### Example: Change gem grid from 3×3 to 4×4 (16 cells)

```javascript
// OLD VALUES
const SPRITE_GRID_COLS = 3;
const SPRITE_GRID_ROWS = 3;
const USED_SPRITES = 6;

// NEW VALUES
const SPRITE_GRID_COLS = 4;
const SPRITE_GRID_ROWS = 4;
const USED_SPRITES = 6; // Still using only 6 gems
```

**Grid layout with 4×4**:
```
┌────┬────┬────┬────┐
│Ruby│Saph│Emer│Topa│  Row 0
├────┼────┼────┼────┤
│Amet│Moon│ -- │ -- │  Row 1
├────┼────┼────┼────┤
│ -- │ -- │ -- │ -- │  Row 2
├────┼────┼────┼────┤
│ -- │ -- │ -- │ -- │  Row 3
└────┴────┴────┴────┘
```

**Recommended sprite sheet size for 4×4**: 1024×1024 (256×256 per cell)

---

### Scenario 3: Add More Gem Types

**Files to modify**:
1. `src/game/pixi/SpriteLoader.js`
2. `src/game/engine/LevelGenerator.js` (if gems should appear in levels)
3. `src/game/engine/GemFactory.js` (if it exists)

#### Step 1: Update SpriteLoader.js

```javascript
// OLD
const BASE_GEM_TYPES = ['ruby', 'sapphire', 'emerald', 'topaz', 'amethyst', 'moonstone'];
const USED_SPRITES = 6;

// NEW (adding 3 more gems)
const BASE_GEM_TYPES = [
  'ruby', 'sapphire', 'emerald', 
  'topaz', 'amethyst', 'moonstone',
  'diamond', 'onyx', 'jade'  // New gems
];
const USED_SPRITES = 9;
```

#### Step 2: Update your sprite sheet

Add sprites to cells 6, 7, and 8 (bottom row of 3×3 grid):
```
┌─────────┬─────────┬─────────┐
│  Ruby   │Sapphire │ Emerald │  Row 0
├─────────┼─────────┼─────────┤
│  Topaz  │Amethyst │Moonstone│  Row 1
├─────────┼─────────┼─────────┤
│ Diamond │  Onyx   │  Jade   │  Row 2 (NEW!)
└─────────┴─────────┴─────────┘
```

#### Step 3: Update LevelGenerator.js

Make sure new gem types can spawn in levels (check `generateRandomGem()` or similar functions).

---

### Scenario 4: Change Animation Frame Count

**File to modify**: `src/game/pixi/SpriteLoader.js`

#### Example: Increase from 3 frames to 5 frames per animation

```javascript
// OLD VALUES
const BONUS_GRID_COLS = 3;
const BONUS_FRAMES_PER_ANIMATION = 3;

// NEW VALUES
const BONUS_GRID_COLS = 5;  // Now 5 columns (5 frames per row)
const BONUS_FRAMES_PER_ANIMATION = 5;
```

**Grid layout with 3 rows × 5 columns**:
```
┌────┬────┬────┬────┬────┐
│Bom1│Bom2│Bom3│Bom4│Bom5│  Row 0: Bomb
├────┼────┼────┼────┼────┤
│Rai1│Rai2│Rai3│Rai4│Rai5│  Row 1: Rainbow
├────┼────┼────┼────┼────┤
│Cro1│Cro2│Cro3│Cro4│Cro5│  Row 2: Cross
└────┴────┴────┴────┴────┘
```

**Recommended sprite sheet size**: 1280×768 pixels
- Width: 256px per frame × 5 frames = 1280px
- Height: 256px per frame × 3 rows = 768px

**Note**: The sprite sheet no longer needs to be square!

---

### Scenario 5: Add More Bonus Types

**Files to modify**:
1. `src/game/pixi/SpriteLoader.js`
2. `src/stores/gameStore.js`
3. `src/game/engine/BonusResolver.js`
4. `src/game/engine/BonusActivator.js`

#### Step 1: Update SpriteLoader.js

```javascript
// OLD
const SPECIAL_TYPES = ['bomb', 'rainbow', 'cross'];
const BONUS_GRID_ROWS = 3;

// NEW (adding 'lightning' bonus)
const SPECIAL_TYPES = ['bomb', 'rainbow', 'cross', 'lightning'];
const BONUS_GRID_ROWS = 4;
```

#### Step 2: Update sprite sheet

Create a new 4-row sprite sheet:
```
┌─────────┬─────────┬─────────┐
│ Bomb1   │ Bomb2   │ Bomb3   │  Row 0
├─────────┼─────────┼─────────┤
│Rainbow1 │Rainbow2 │Rainbow3 │  Row 1
├─────────┼─────────┼─────────┤
│ Cross1  │ Cross2  │ Cross3  │  Row 2
├─────────┼─────────┼─────────┤
│Lightning1│Lightning2│Lightning3│ Row 3 (NEW!)
└─────────┴─────────┴─────────┘
```

**Recommended size**: 1024×1365 pixels (3 cols × 4 rows, 341px per cell)
Or better: 1200×1600 pixels (3 cols × 4 rows, 400px per cell)

#### Step 3: Update gameStore.js

```javascript
// Update the bonus types array in refreshBoardVisuals()
const bonusTypes = ['bomb', 'rainbow', 'cross', 'lightning']; // Add new type
```

#### Step 4: Implement bonus logic

Add creation logic in `BonusResolver.js` and activation logic in `BonusActivator.js`.

---

### Scenario 6: Change Animation Speed

**File to modify**: `src/stores/gameStore.js`

```javascript
// In refreshBoardVisuals() function:

// OLD
gemSprite.animationSpeed = 0.1; // Slow animation (~6 FPS)

// NEW OPTIONS
gemSprite.animationSpeed = 0.05;  // Very slow (~3 FPS)
gemSprite.animationSpeed = 0.15;  // Medium (~9 FPS)
gemSprite.animationSpeed = 0.2;   // Fast (~12 FPS)
gemSprite.animationSpeed = 0.5;   // Very fast (~30 FPS)
```

**Per-bonus type custom speeds**:

```javascript
if (bonusTypes.includes(cell.type) && bonusAnimations?.[cell.type]) {
  gemSprite = new AnimatedSprite(bonusAnimations[cell.type]);
  
  // Custom speed per type
  if (cell.type === 'bomb') {
    gemSprite.animationSpeed = 0.15; // Faster
  } else if (cell.type === 'rainbow') {
    gemSprite.animationSpeed = 0.08; // Slower
  } else {
    gemSprite.animationSpeed = 0.1; // Default
  }
  
  gemSprite.loop = true;
  gemSprite.play();
}
```

---

## Adding New Sprites

### Quick Reference Checklist

#### Adding a New Base Gem Type

- [ ] Add sprite to `gem-sprite-1.png` in an unused cell
- [ ] Update `BASE_GEM_TYPES` array in `SpriteLoader.js`
- [ ] Update `USED_SPRITES` count in `SpriteLoader.js`
- [ ] Add gem type to level generation logic
- [ ] Update `placeholder-gems.js` (add color and shape)

#### Adding a New Bonus Type

- [ ] Add 3 animation frames to `bonus-sprite-1.png` in a new row
- [ ] Update `SPECIAL_TYPES` array in `SpriteLoader.js`
- [ ] Update `BONUS_GRID_ROWS` in `SpriteLoader.js`
- [ ] Add to `bonusTypes` array in `gameStore.js`
- [ ] Implement creation logic in `BonusResolver.js`
- [ ] Implement activation logic in `BonusActivator.js`
- [ ] Update `placeholder-gems.js` (add color and shape)

#### Changing Grid Layout

- [ ] Update `SPRITE_GRID_COLS` and/or `SPRITE_GRID_ROWS` in `SpriteLoader.js`
- [ ] Update `BONUS_GRID_COLS` and/or `BONUS_GRID_ROWS` if needed
- [ ] Recreate sprite sheets with new dimensions
- [ ] Test that all sprites load correctly

---

## Performance Considerations

### Sprite Sheet Size Limits

| Resolution | Per-Cell Size | Performance | Recommendation |
|------------|---------------|-------------|----------------|
| 512×512    | 170×170       | Excellent   | Mobile/low-end devices |
| 1024×1024  | 341×341       | Excellent   | **Recommended** for most cases |
| 2048×2048  | 682×682       | Good        | High-DPI displays only |
| 4096×4096  | 1365×1365     | Poor        | Not recommended (excessive) |

### Memory Usage

- **Static sprites**: Each texture uses ~(width × height × 4) bytes in GPU memory
  - 1024×1024 PNG = ~4 MB per sprite sheet
- **Animated sprites**: Each frame is a separate texture reference (shares base texture memory)
  - 3 frames = 3 texture objects pointing to same 1024×1024 base = ~4 MB total

### Optimization Tips

1. **Use Power-of-Two Dimensions** (512, 1024, 2048) - More GPU-friendly
2. **Compress PNG Files** - Use tools like TinyPNG or pngcrush
3. **Avoid Excessive Frame Counts** - 3-5 frames is ideal for looping animations
4. **Use Appropriate Resolution** - 1024×1024 is the sweet spot for most screens
5. **Share Sprite Sheets** - Don't create multiple separate PNGs if you can fit sprites in one atlas

---

## File Reference Summary

### Files That Handle Sprite Loading

| File | Purpose | Modify To... |
|------|---------|--------------|
| `src/game/pixi/SpriteLoader.js` | Loads and slices sprite sheets | Change grid size, add/remove sprite types, change paths |
| `src/components/BoardCanvas.vue` | Initializes renderer and loads sprites | Change renderer initialization (rarely needed) |
| `src/stores/gameStore.js` | Renders sprites to board | Change animation speed, modify rendering behavior |
| `public/sprite/gem-sprite-1.png` | Gem sprite sheet image | Replace with new artwork |
| `public/sprite/bonus-sprite-1.png` | Bonus animation sprite sheet | Replace with new artwork |

### Configuration Constants Location

All in `src/game/pixi/SpriteLoader.js`:

```javascript
// Gem Sprite Configuration
const BASE_GEM_TYPES = [...];       // Line 4
const SPRITE_PATH = '...';          // Line 6
const SPRITE_GRID_COLS = 3;         // Line 12
const SPRITE_GRID_ROWS = 3;         // Line 13
const USED_SPRITES = 6;             // Line 15

// Bonus Sprite Configuration
const SPECIAL_TYPES = [...];        // Line 5
const BONUS_SPRITE_PATH = '...';    // Line 7
const BONUS_GRID_COLS = 3;          // Line 21
const BONUS_GRID_ROWS = 3;          // Line 22
const BONUS_FRAMES_PER_ANIMATION = 3; // Line 23
```

### Animation Configuration Location

In `src/stores/gameStore.js`, within `refreshBoardVisuals()`:

```javascript
gemSprite.animationSpeed = 0.1;  // Line ~121
gemSprite.loop = true;           // Line ~122
```

---

## Troubleshooting

### Sprites appear stretched or squished
- **Cause**: Sprite sheet is not square, or cells are not square
- **Fix**: Ensure your sprite sheet dimensions are divisible by grid size evenly

### Animations don't play
- **Check**: Console for errors loading `bonus-sprite-1.png`
- **Check**: `bonusAnimations` is being passed to `gameStore.attachRenderer()`
- **Check**: Animation frames are non-empty arrays

### Wrong sprite appears in wrong cell
- **Check**: Sprite order in PNG matches order in `BASE_GEM_TYPES` or `SPECIAL_TYPES` arrays
- **Check**: Grid is being read left-to-right, top-to-bottom

### Last column/row of pixels is cut off
- **Cause**: `Math.floor()` rounding when dimensions aren't perfectly divisible
- **Fix**: Use dimensions perfectly divisible by grid size (e.g., 900×900 for 3×3)

---

## Further Reading

- [PixiJS v8 Texture Documentation](https://pixijs.com/8.x/guides/components/textures)
- [PixiJS AnimatedSprite Documentation](https://pixijs.com/8.x/examples/sprite/animated-sprite)
- [Sprite Sheet Best Practices](https://www.codeandweb.com/texturepacker/tutorials/texture-settings)

---

_For questions or issues, please document them in the project's issue tracker._

