import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { MatchEngine } from '../src/game/engine/MatchEngine';
import { createGem } from '../src/game/engine/GemFactory';
import { BoardAnimator } from '../src/game/phaser/BoardAnimator';
import { describeBonusEffects } from '../src/game/phaser/BonusEffects';
import { BonusComboEffects, describeBonusCombo } from '../src/game/phaser/BonusComboEffects';
import { useGameStore } from '../src/stores/gameStore';

const pairs = [
  ['bomb', 'bomb'],
  ['bomb', 'cross'],
  ['bomb', 'rainbow'],
  ['cross', 'cross'],
  ['cross', 'rainbow'],
  ['rainbow', 'rainbow'],
];
const boardWithPair = (a, b) => {
  const types = ['ruby', 'sapphire', 'emerald', 'topaz', 'amethyst', 'moonstone'];
  const board = Array.from({ length: 64 }, (_, i) =>
    createGem(types[(i + Math.floor(i / 8) * 2) % 6]),
  );
  board[27] = createGem(a);
  board[28] = createGem(b);
  return board;
};
const stepFor = (pair) => {
  const evaluation = new MatchEngine().evaluateSwap(boardWithPair(...pair), 8, 8, 27, 28);
  const step = {
    bonusSwap: evaluation.bonusSwap,
    cleared: evaluation.matches[0].indices,
    matches: evaluation.matches,
  };
  return { step, effects: describeBonusEffects(step, (index) => evaluation.board[index]?.type) };
};
afterEach(() => vi.restoreAllMocks());

describe('two-bonus fusion', () => {
  it.each(pairs)('identifies %s + %s in either swap direction and preserves targets', (a, b) => {
    const forward = stepFor([a, b]),
      reverse = stepFor([b, a]);
    const combo = describeBonusCombo(forward.step, forward.effects);
    expect(combo.key).toBe(describeBonusCombo(reverse.step, reverse.effects).key);
    expect(combo.pair).toEqual([
      { index: 27, type: b },
      { index: 28, type: a },
    ]);
    expect(combo.targets).toEqual(forward.step.cleared);
  });

  it('does not mistake a single bonus that hits another bonus for a fusion', () => {
    const board = boardWithPair('bomb', 'ruby');
    board[20] = createGem('cross');
    const result = new MatchEngine().evaluateSwap(board, 8, 8, 27, 28);
    const step = {
      cleared: result.matches[0].indices,
      matches: result.matches,
      bonusSwap: result.bonusSwap,
    };
    const effects = describeBonusEffects(step, (index) => result.board[index]?.type);
    expect(effects).toHaveLength(2);
    expect(describeBonusCombo(step, effects)).toBeNull();
  });

  it('does not animate a pair when one bonus was protected from clearing', () => {
    const { step, effects } = stepFor(['cross', 'bomb']);
    expect(
      describeBonusCombo(
        step,
        effects.filter(({ index }) => index !== 27),
      ),
    ).toBeNull();
  });

  it('passes fusion metadata to the first rendered step of a real swap', async () => {
    setActivePinia(createPinia());
    const game = useGameStore();
    game.bootstrap();
    game.startLevel(1);
    game.board = boardWithPair('bomb', 'cross');
    game.animationInProgress = false;
    const playSteps = vi.fn();
    game.renderer = {
      animator: {
        animateSwap: vi.fn(),
        playSteps,
        clearQueuedSwapHighlight: vi.fn(),
        updateTiles: vi.fn(),
      },
    };
    try {
      expect(await game.resolveSwap(27, 28)).toBe(true);
      const steps = playSteps.mock.calls[0][0];
      expect(steps[0].bonusSwap).toEqual([
        { index: 27, type: 'cross' },
        { index: 28, type: 'bomb' },
      ]);
      expect(steps.slice(1).every((step) => !step.bonusSwap)).toBe(true);
    } finally {
      game.cancelHint(true);
    }
  });

  it.each([0, 1])(
    'cancels during anticipation phase %s without a late detonation',
    async (phase) => {
      const completions = [];
      const animator = new BoardAnimator({
        scene: {
          tweens: {
            add: (config) => {
              completions.push(config.onComplete);
              return { remove: vi.fn() };
            },
          },
        },
      });
      animator.setLayout({ boardCols: 8, boardRows: 8, cellSize: 50 });
      const fx = new BonusComboEffects(animator.bonuses);
      fx.charge = vi.fn();
      fx.star = vi.fn();
      fx.release = vi.fn();
      const { step, effects } = stepFor(['bomb', 'cross']);
      const pending = fx.play(describeBonusCombo(step, effects), effects);
      if (phase === 1) {
        completions[0]();
        await Promise.resolve();
      }
      animator.clear();
      await pending;
      expect(fx.release).not.toHaveBeenCalled();
      expect(animator.pending.size).toBe(0);
    },
  );

  it('announces the combo with sound and no animation in reduced motion', async () => {
    const audio = { playBomb: vi.fn(), playRainbowLaser: vi.fn() };
    const onBanner = vi.fn();
    const animator = new BoardAnimator({ settings: { reducedMotion: true }, audio, onBanner });
    const tween = vi.spyOn(animator, 'tween');
    const { step, effects } = stepFor(['bomb', 'rainbow']);
    await new BonusComboEffects(animator.bonuses).play(describeBonusCombo(step, effects), effects);
    expect(onBanner).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'fusion', label: 'PRISM BOMB!' }),
    );
    expect(audio.playBomb).toHaveBeenCalledOnce();
    expect(audio.playRainbowLaser).toHaveBeenCalledOnce();
    expect(tween).not.toHaveBeenCalled();
    expect(animator.effects.size).toBe(0);
  });
});
