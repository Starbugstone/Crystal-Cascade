import { Assets, Rectangle, Texture } from 'pixi.js';
import { createPlaceholderGems } from './placeholder-gems.js';

const BASE_GEM_TYPES = ['ruby', 'sapphire', 'emerald', 'topaz', 'amethyst', 'moonstone'];
const SPECIAL_TYPES = ['bomb', 'rainbow', 'cross'];
const SPRITE_PATH = '/sprite/gem-sprite-1.png';
const BONUS_SPRITE_PATH = '/sprite/bonus-sprite-1.png';

// Sprite sheet configuration: 3x3 grid with 9 total sprites
// We use the first 6 sprites for the base gem types
// The remaining 3 sprites (indices 6, 7, 8) are reserved for future gem types
const SPRITE_GRID_COLS = 3;
const SPRITE_GRID_ROWS = 3;
const TOTAL_SPRITES = 9; // Available sprites in the sheet
const USED_SPRITES = 6; // Currently using only the first 6

// Bonus sprite configuration: 3x3 grid with 9 animation frames
// Row 0 (indices 0,1,2): bomb animation
// Row 1 (indices 3,4,5): rainbow animation
// Row 2 (indices 6,7,8): cross animation
const BONUS_GRID_COLS = 3;
const BONUS_GRID_ROWS = 3;
const BONUS_FRAMES_PER_ANIMATION = 3;

export const loadSpriteAtlas = async (app) => {
  const textures = {};
  const bonusAnimations = {};

  // Attempt to slice real sprite textures for the core gem types.
  try {
    const baseTexture = await loadBaseTexture(SPRITE_PATH);
    const tileWidth = Math.floor(baseTexture.width / SPRITE_GRID_COLS);
    const tileHeight = Math.floor(baseTexture.height / SPRITE_GRID_ROWS);

    // Map the first 6 sprites from the 3x3 grid to our base gem types
    // Grid reading order: left-to-right, top-to-bottom
    // [0,1,2]  <- Row 0: ruby, sapphire, emerald
    // [3,4,5]  <- Row 1: topaz, amethyst, moonstone
    // [6,7,8]  <- Row 2: (reserved for future use)
    BASE_GEM_TYPES.forEach((type, index) => {
      const col = index % SPRITE_GRID_COLS;
      const row = Math.floor(index / SPRITE_GRID_COLS);
      const x = col * tileWidth;
      const y = row * tileHeight;
      
      const frame = new Rectangle(x, y, tileWidth, tileHeight);
      textures[type] = new Texture({ source: baseTexture.source, frame });
    });
  } catch (error) {
    console.warn('Failed to load gem sprite sheet; using placeholders for all gem types.', error);
  }

  // Attempt to load bonus sprite animations
  try {
    const bonusTexture = await loadBonusTexture(BONUS_SPRITE_PATH);
    const frameWidth = Math.floor(bonusTexture.width / BONUS_GRID_COLS);
    const frameHeight = Math.floor(bonusTexture.height / BONUS_GRID_ROWS);

    // Extract animation frames for each bonus type
    // Row 0: bomb (frames 0,1,2)
    // Row 1: rainbow (frames 3,4,5)
    // Row 2: cross (frames 6,7,8)
    SPECIAL_TYPES.forEach((type, typeIndex) => {
      const frames = [];
      const row = typeIndex; // Each bonus type is on its own row
      
      for (let frameIdx = 0; frameIdx < BONUS_FRAMES_PER_ANIMATION; frameIdx++) {
        const col = frameIdx;
        const x = col * frameWidth;
        const y = row * frameHeight;
        
        const frame = new Rectangle(x, y, frameWidth, frameHeight);
        const texture = new Texture({ source: bonusTexture.source, frame });
        frames.push(texture);
      }
      
      bonusAnimations[type] = frames;
    });

    console.log('Loaded bonus animations:', Object.keys(bonusAnimations));
  } catch (error) {
    console.warn('Failed to load bonus sprite sheet; using placeholders for bonus types.', error);
  }

  // Generate placeholders for any texture gaps (special bonuses or failed sprite load).
  const missingKeys = [...BASE_GEM_TYPES, ...SPECIAL_TYPES].filter((type) => !textures[type]);
  if (missingKeys.length) {
    const placeholderGems = createPlaceholderGems(128, missingKeys);
    missingKeys.forEach((key) => {
      textures[key] = app.renderer.generateTexture(placeholderGems[key]);
    });
  }

  return { textures, bonusAnimations };
};

const loadBaseTexture = async (src) => {
  const texture = await Assets.load({ alias: 'crystal-gems', src });
  return texture;
};

const loadBonusTexture = async (src) => {
  const texture = await Assets.load({ alias: 'bonus-sprites', src });
  return texture;
};
