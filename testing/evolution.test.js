import { describe, it, expect, beforeEach } from 'vitest';
import { EvolutionEngine } from '../src/game/engine/EvolutionEngine.js';

describe('EvolutionEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new EvolutionEngine();
  });

  it('should track matches for a gem type', () => {
    engine.trackMatch('ruby');
    engine.trackMatch('ruby');
    expect(engine.evolutionProgress.get('ruby')).toBe(2);
  });

  it('should not evolve if the threshold is not met', () => {
    const evolutionRules = { threshold: 5 };
    engine.trackMatch('ruby');
    const hasEvolved = engine.checkEvolution('ruby', evolutionRules);
    expect(hasEvolved).toBe(false);
  });

  it('should evolve if the threshold is met', () => {
    const evolutionRules = { threshold: 3 };
    engine.trackMatch('ruby');
    engine.trackMatch('ruby');
    engine.trackMatch('ruby');
    const hasEvolved = engine.checkEvolution('ruby', evolutionRules);
    expect(hasEvolved).toBe(true);
  });
});
