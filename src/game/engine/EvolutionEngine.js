// src/game/engine/EvolutionEngine.js

export class EvolutionEngine {
  constructor() {
    this.evolutionProgress = new Map();
  }

  trackMatch(gemType) {
    if (!this.evolutionProgress.has(gemType)) {
      this.evolutionProgress.set(gemType, 0);
    }
    const currentCount = this.evolutionProgress.get(gemType);
    this.evolutionProgress.set(gemType, currentCount + 1);
  }

  checkEvolution(gemType, evolutionRules) {
    const progress = this.evolutionProgress.get(gemType);
    if (progress !== undefined && progress >= evolutionRules.threshold) {
      return true;
    }
    return false;
  }
}
