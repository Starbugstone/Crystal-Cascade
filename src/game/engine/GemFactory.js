export const GEM_TYPES = ['ruby', 'sapphire', 'emerald', 'topaz', 'amethyst', 'moonstone'];
let gemIdCounter = 0;

export const createGem = (type, { highlight = false } = {}) => ({
  id: `gem-${(gemIdCounter++).toString(36)}`,
  type,
  highlight,
});

export const randomGemType = (types = GEM_TYPES) => types[Math.floor(Math.random() * types.length)];
