import { expect, it } from 'vitest';
import { TownRenderQuality } from '../src/game/town/TownRenderQuality';
it('reduces fill cost for sustained slow animation, recovers cautiously, and ignores pauses', () => {
  const q = new TownRenderQuality(2);
  for (let i = 0; i < 39; i++) expect(q.sample(50)).toBeNull();
  expect(q.sample(50)).toBeCloseTo(1.2);
  for (let i = 0; i < 400; i++) q.sample(50);
  expect(q.ratio).toBe(0.6);
  for (let i = 0; i < 100; i++) q.sample(10000);
  expect(q.ratio).toBe(0.6);
  q.resetWindow();
  for (let i = 0; i < 319; i++) expect(q.sample(16.7)).toBeNull();
  expect(q.sample(16.7)).toBeCloseTo(0.75);
});
it('does not reduce quality for one isolated stall or change native-density controls', () => {
  const q = new TownRenderQuality(1);
  q.sample(100);
  for (let i = 0; i < 39; i++) q.sample(16.7);
  expect(q.ratio).toBe(1);
  expect(q.maxRatio).toBe(1);
});
