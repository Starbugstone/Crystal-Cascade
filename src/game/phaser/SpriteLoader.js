import { createPlaceholderGems } from './placeholder-gems';

const BASE_GEM_TYPES = ['ruby', 'sapphire', 'emerald', 'topaz', 'amethyst', 'moonstone'];
const SPECIAL_TYPES = ['bomb', 'rainbow', 'cross'];
const SPRITE_PATH = '/sprite/gem-sprite-1.png';
const BONUS_SPRITE_PATH = '/sprite/bonus-sprite-1.png';

const SPRITE_GRID_COLS = 3;
const SPRITE_GRID_ROWS = 3;

const BONUS_GRID_COLS = 3;
const BONUS_GRID_ROWS = 3;
const BONUS_FRAMES_PER_ANIMATION = 3;
const BONUS_FRAME_RATE = 8;

export const preloadSpriteAssets = (scene) => {
  scene.load.image('gem-sheet', SPRITE_PATH);
  scene.load.image('bonus-sheet', BONUS_SPRITE_PATH);
};

const sliceBaseGemTextures = (scene, textures) => {
  const result = { created: [], missing: [] };
  const gemSheet = scene.textures.get('gem-sheet');
  const source = gemSheet?.getSourceImage?.();

  if (!source || !source.width || !source.height) {
    result.missing.push(...BASE_GEM_TYPES);
    return result;
  }

  const tileWidth = Math.floor(source.width / SPRITE_GRID_COLS);
  const tileHeight = Math.floor(source.height / SPRITE_GRID_ROWS);

  BASE_GEM_TYPES.forEach((type, index) => {
    const col = index % SPRITE_GRID_COLS;
    const row = Math.floor(index / SPRITE_GRID_COLS);
    const sx = col * tileWidth;
    const sy = row * tileHeight;
    const textureKey = `gem-${type}`;

    if (!scene.textures.exists(textureKey)) {
      const canvasTexture = scene.textures.createCanvas(textureKey, tileWidth, tileHeight);
      const ctx = canvasTexture.context;
      ctx.drawImage(source, sx, sy, tileWidth, tileHeight, 0, 0, tileWidth, tileHeight);
      canvasTexture.refresh();
    }

    textures[type] = {
      key: textureKey,
      width: tileWidth,
      height: tileHeight,
    };
    result.created.push(type);
  });

  return result;
};

const sliceBonusAnimations = (scene, textures, bonusAnimations) => {
  const result = { created: [], missing: [] };
  const bonusSheet = scene.textures.get('bonus-sheet');
  const source = bonusSheet?.getSourceImage?.();

  if (!source || !source.width || !source.height) {
    result.missing.push(...SPECIAL_TYPES);
    return result;
  }

  const frameWidth = Math.floor(source.width / BONUS_GRID_COLS);
  const frameHeight = Math.floor(source.height / BONUS_GRID_ROWS);

  SPECIAL_TYPES.forEach((type, typeIndex) => {
    const animationKey = `bonus-${type}`;
    const frames = [];

    for (let frameIdx = 0; frameIdx < BONUS_FRAMES_PER_ANIMATION; frameIdx += 1) {
      const col = frameIdx;
      const row = typeIndex;
      const sx = col * frameWidth;
      const sy = row * frameHeight;
      const frameKey = `${animationKey}-frame-${frameIdx}`;

      if (!scene.textures.exists(frameKey)) {
        const canvasTexture = scene.textures.createCanvas(frameKey, frameWidth, frameHeight);
        const ctx = canvasTexture.context;
        ctx.drawImage(source, sx, sy, frameWidth, frameHeight, 0, 0, frameWidth, frameHeight);
        canvasTexture.refresh();
      }

      frames.push({ key: frameKey });
    }

    if (!scene.anims.exists(animationKey)) {
      scene.anims.create({
        key: animationKey,
        frames,
        frameRate: BONUS_FRAME_RATE,
        repeat: -1,
      });
    }

    bonusAnimations[type] = {
      animationKey,
      frameKey: frames[0].key,
      width: frameWidth,
      height: frameHeight,
    };

    textures[type] = {
      key: frames[0].key,
      width: frameWidth,
      height: frameHeight,
    };

    result.created.push(type);
  });

  return result;
};

export const loadSpriteAtlas = (scene) => {
  const textures = {};
  const bonusAnimations = {};

  const baseResult = sliceBaseGemTextures(scene, textures);
  const bonusResult = sliceBonusAnimations(scene, textures, bonusAnimations);

  const missingTypes = new Set([
    ...baseResult.missing,
    ...bonusResult.missing,
  ]);

  if (missingTypes.size > 0) {
    const placeholders = createPlaceholderGems(scene, 128, [...missingTypes]);
    [...missingTypes].forEach((type) => {
      textures[type] = placeholders[type];

      if (SPECIAL_TYPES.includes(type) && !bonusAnimations[type]) {
        bonusAnimations[type] = {
          animationKey: null,
          frameKey: placeholders[type].key,
          width: placeholders[type].width,
          height: placeholders[type].height,
        };
      }
    });
  }

  return { textures, bonusAnimations };
};

