// Phaser deletes renderer resources but leaves its WebGL context alive until GC.
// Repeated mine visits must release it promptly so the village is not evicted.
export function releaseContextOnDestroy(game) {
  game.events.once('destroy', () => {
    const context = game.renderer?.gl;
    const extension = context?.getExtension('WEBGL_lose_context');
    // Phaser emits destroy before renderer.destroy(); let that cleanup finish first.
    queueMicrotask(() => {
      if (context && !context.isContextLost()) extension?.loseContext();
    });
  });
}
