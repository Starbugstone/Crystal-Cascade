import { EventEmitter } from 'node:events';
import { expect, it, vi } from 'vitest';
import { releaseContextOnDestroy } from '../src/game/phaser/RendererLifecycle';

it('releases each mine graphics context after Phaser finishes destroying its renderer', async () => {
  const loseContext = vi.fn();
  const context = { getExtension: () => ({ loseContext }), isContextLost: () => false };
  const game = { events: new EventEmitter(), renderer: { gl: context } };
  releaseContextOnDestroy(game);
  expect(loseContext).not.toHaveBeenCalled();
  game.events.emit('destroy');
  expect(loseContext).not.toHaveBeenCalled();
  game.renderer.gl = null;
  await Promise.resolve();
  expect(loseContext).toHaveBeenCalledOnce();
  game.events.emit('destroy');
  await Promise.resolve();
  expect(loseContext).toHaveBeenCalledOnce();
});

it('supports the canvas renderer and an already lost graphics context', async () => {
  const loseContext = vi.fn();
  for (const gl of [
    undefined,
    { getExtension: () => ({ loseContext }), isContextLost: () => true },
  ]) {
    const game = { events: new EventEmitter(), renderer: { gl } };
    releaseContextOnDestroy(game);
    game.events.emit('destroy');
  }
  await Promise.resolve();
  expect(loseContext).not.toHaveBeenCalled();
});
