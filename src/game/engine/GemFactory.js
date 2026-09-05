export const GEM_TYPES = ['ruby', 'sapphire', 'emerald', 'topaz', 'amethyst', 'moonstone'];
let gemIdCounter = 0;

export const createGem = (type, { highlight = false } = {}) => ({
  id: `gem-${(gemIdCounter++).toString(36)}`,
  type,
  highlight,
});

export const randomGemType = () => GEM_TYPES[Math.floor(Math.random() * GEM_TYPES.length)];
