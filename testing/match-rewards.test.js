import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useGameStore } from '../src/stores/gameStore';
import { useCampaignStore } from '../src/stores/campaignStore';
import { SAVE_KEY } from '../src/services/localProfile';
import { miningPayout } from '../src/game/town/TownRules';
import { createGem } from '../src/game/engine/GemFactory';
import { MatchEngine } from '../src/game/engine/MatchEngine';
import { TileManager } from '../src/game/engine/TileManager';
import { BoardAnimator } from '../src/game/phaser/BoardAnimator';
import { simultaneousMatchCount } from '../src/game/engine/MatchRewards';

const line = (indices, type = 'ruby', orientation = 'horizontal') => ({
  indices,
  type,
  orientation,
});
const step = (index, matches = [line([0, 1, 2])]) => {
  const cleared = [...new Set(matches.flatMap((match) => match.indices))];
  return {
    index,
    matches,
    cleared,
    collectedJewels: cleared.map(() => createGem('ruby')),
    drops: [],
    spawns: [],
  };
};
let saved;
beforeEach(() => {
  vi.useFakeTimers();
  saved = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (key) => saved.get(key) ?? null,
    setItem: (key, value) => saved.set(key, value),
  });
  setActivePinia(createPinia());
});
afterEach(() => {
  useGameStore().cancelHint();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('every earned combo contributes to the coin recap', () => {
  it('stacks all tiers across moves and banks the exact recap once, including after reload', () => {
    const game = useGameStore(),
      campaign = useCampaignStore();
    game.bootstrap();
    game.startLevel(1);
    game._applyScoring([step(0), step(1), step(2), step(3)]);
    game._applyScoring([step(0), step(1)]);
    game._applyScoring([step(0, [line([0, 1, 2]), line([4, 5, 6], 'sapphire')])]);
    expect(game.comboCounts).toEqual({ 2: 2, 3: 1, 4: 1 });
    expect(game.multiMatchCounts).toEqual({ 2: 1 });
    expect(game.maxCascade).toBe(4);
    expect(campaign.town.coins).toBe(0);
    game.board = [createGem('bomb')];
    game.remainingLayers = 0;
    // Keep chest rewards out of the mining coin assertion.
    game.objectives = [{ type: 'score', target: 1000000 }];
    game.completeLevel();
    // 24 gems + 10 unused bonus + (2*5 + 10 + 15) combos + 10 double match.
    expect(game.coinReward).toBe(79);
    expect(campaign.town.coins).toBe(79);
    expect(JSON.parse(saved.get(SAVE_KEY)).town.coins).toBe(79);
    game.completeLevel();
    expect(campaign.town.coins).toBe(79);
    const runId = game.runId;
    setActivePinia(createPinia());
    const reloaded = useCampaignStore();
    reloaded.recordVictory({
      id: 1,
      runId,
      score: 0,
      target: 1000000,
      combo: 4,
      comboCounts: { 4: 1 },
    });
    expect(reloaded.town.coins).toBe(79);
  });

  it('clears all pending bonuses on abandonment, replay, and the next level', () => {
    const game = useGameStore(),
      campaign = useCampaignStore();
    game.bootstrap();
    game.startLevel(1);
    const earn = () => game._applyScoring([step(0), step(1, [line([0, 1, 2]), line([4, 5, 6])])]);
    earn();
    game.exitLevel();
    expect(game.comboCounts).toEqual({});
    expect(game.multiMatchCounts).toEqual({});
    expect(campaign.town.coins).toBe(0);
    game.startLevel(1);
    earn();
    game.startLevel(1);
    expect(game.comboCounts).toEqual({});
    expect(game.multiMatchCounts).toEqual({});
    earn();
    game.remainingLayers = 0;
    game.completeLevel();
    game.startLevel(2);
    expect(game.comboCounts).toEqual({});
    expect(game.multiMatchCounts).toEqual({});
    expect(game.coinReward).toBe(0);
  });

  it('does not count relic animation steps as combos or simultaneous matches', () => {
    const game = useGameStore();
    const collection = { index: 0, matches: [], cleared: [], collectedRelics: [{ index: 7 }] };
    game._applyScoring([step(0), collection, step(1)]);
    expect(game.score).toBe(900);
    expect(game.maxCascade).toBe(2);
    expect(game.comboCounts).toEqual({ 2: 1 });
    expect(game.multiMatchCounts).toEqual({});
    game._applyScoring([step(0), collection]);
    expect(game.comboCounts).toEqual({ 2: 1 });
  });

  it('keeps continuous mode on its existing capped gem income', () => {
    const game = useGameStore(),
      campaign = useCampaignStore();
    campaign.records[1] = { score: 1000, stars: 1 };
    campaign.town.buildings.museum = 1;
    game.bootstrap();
    game.startLevel(1, 'continuous');
    game._applyScoring([step(0), step(1, [line([0, 1, 2]), line([4, 5, 6])])]);
    expect(game.comboCounts).toEqual({});
    expect(game.multiMatchCounts).toEqual({});
    game.showArcadeBanner({ kind: 'multi-match', label: 'DOUBLE MATCH!', count: 2, coins: 10 });
    expect(game.arcadeBanner.coins).toBeUndefined();
    game.completeLevel();
    expect(game.levelCleared).toBe(false);
    expect(game.coinReward).toBe(0);
  });

  it('scales higher simultaneous matches and ignores invalid reward counts', () => {
    expect(miningPayout(0, 0, {}, { 2: 1, 3: 1, 4: 1 })).toBe(60);
    expect(miningPayout(0, 0, { 1: 100, 2: -1, 3: 1.5, 4: Infinity, bad: 2 })).toBe(0);
    expect(miningPayout(10, 0, { 2: Number.MAX_SAFE_INTEGER })).toBe(Number.MAX_SAFE_INTEGER);
  });
});

describe('simultaneous alignment detection and celebration', () => {
  it.each([
    [1, 5],
    [5, 1],
  ])('rewards a real double-line swap from %i to %i', async (a, b) => {
    const game = useGameStore();
    game.bootstrap();
    game.startLevel(1);
    game.board = [
      'ruby',
      'sapphire',
      'ruby',
      'emerald',
      'sapphire',
      'ruby',
      'sapphire',
      'topaz',
      'emerald',
      'topaz',
      'amethyst',
      'moonstone',
      'topaz',
      'amethyst',
      'moonstone',
      'emerald',
    ].map((type) => createGem(type));
    game.boardCols = game.boardRows = game.boardSize = 4;
    game.tiles = game.board.map(() => ({ health: 2, maxHealth: 2 }));
    game.remainingLayers = 32;
    expect(new MatchEngine().findMatches(game.board, 4, 4)).toEqual([]);
    // Stop refills so this assertion isolates the immediate two alignments.
    vi.spyOn(TileManager.prototype, 'applyGravity').mockImplementation(() => {});
    vi.spyOn(game, 'ensurePlayableBoard').mockResolvedValue(true);
    game.animationInProgress = false;
    expect(await game.resolveSwap(a, b)).toBe(true);
    expect(game.multiMatchCounts).toEqual({ 2: 1 });
    expect(game.comboCounts).toEqual({});
    expect(game.collectedJewels).toBe(6);
  });

  it('counts crossing lines but does not split a long line or count bonus blasts', () => {
    expect(
      simultaneousMatchCount(step(0, [line([0, 1, 2]), line([1, 5, 9], 'ruby', 'vertical')])),
    ).toBe(2);
    expect(simultaneousMatchCount(step(0, [line([0, 1, 2, 3, 4])]))).toBe(1);
    expect(
      simultaneousMatchCount(
        step(0, [
          { type: 'bonus-activation', indices: [0, 1, 2, 4, 5, 6] },
          { type: 'clear_row', indices: [0, 1, 2] },
        ]),
      ),
    ).toBe(0);
  });

  it.each([false, true])(
    'announces at the clearing step with reduced motion = %s',
    async (reducedMotion) => {
      const game = useGameStore();
      game.sessionActive = true;
      game.showArcadeBanner({ kind: 'fusion', label: 'PRISM BOMB!' });
      const onBanner = vi.fn((banner) => game.showArcadeBanner(banner));
      const animator = new BoardAnimator({
        scene: { add: {} },
        settings: { reducedMotion },
        onBanner,
      });
      vi.spyOn(animator.bonuses, 'play').mockResolvedValue();
      vi.spyOn(animator, 'drawCells').mockImplementation(() => {});
      vi.spyOn(animator, 'clearGems').mockImplementation(async () => {
        expect(game.arcadeBanner).toMatchObject({ kind: 'multi-match', count: 2, coins: 10 });
      });
      await animator.playSteps([step(0, [line([0, 1, 2]), line([4, 5, 6])])]);
      expect(onBanner).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ label: 'DOUBLE MATCH!' }),
      );
      game.showArcadeBanner({ label: 'CASCADE ×2' });
      expect(game.arcadeBanner.kind).toBe('multi-match');
      vi.advanceTimersByTime(3200);
      expect(game.arcadeBanner).toBeNull();
    },
  );
});
