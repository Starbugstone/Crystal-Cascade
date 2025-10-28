import { createPlaceholderGems } from './placeholder-gems.js';

export const loadSpriteAtlas = async (app) => {
  const placeholderGems = createPlaceholderGems(64);
  const textures = {};

  for (const key in placeholderGems) {
    textures[key] = app.renderer.generateTexture(placeholderGems[key]);
  }

  return textures;
};
