const GEM_TYPES = ['ruby', 'sapphire', 'emerald', 'topaz', 'amethyst', 'moonstone'];

let gemIdCounter = 0;

class EvolvingElement {
  constructor(type, { highlight = false } = {}) {
    this.id = this.nextGemId();
    this.type = type;
    this.highlight = highlight;
    this.currentTier = 1;
    this.evolutionRules = {
      trigger: 'MATCH_COUNT',
      threshold: 5,
    };
    this.evolvedProperties = {
      scoreMultiplier: 2,
      effect: 'line_clear',
    };
  }

  nextGemId() {
    const id = `gem-${gemIdCounter.toString(36)}`;
    gemIdCounter += 1;
    return id;
  }
}

export const createGem = (type, { highlight = false } = {}) => {
  return new EvolvingElement(type, { highlight });
};

export const cloneGem = (gem, overrides = {}) => ({
  ...gem,
  ...overrides,
});

export const randomGemType = () => GEM_TYPES[Math.floor(Math.random() * GEM_TYPES.length)];

export const createRandomGem = (options = {}) => createGem(randomGemType(), options);

export const resetGemFactory = () => {
  gemIdCounter = 0;
};

export { GEM_TYPES };

