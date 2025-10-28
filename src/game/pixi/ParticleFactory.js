import { Container, Graphics } from 'pixi.js';

export const createParticleFactory = (app, sprites) => {
  const layer = new Container();
  app.stage.addChild(layer);

  const emitBurst = (position, color = 0xffffff, count = 12) => {
    for (let index = 0; index < count; index += 1) {
      const particle = new Graphics();
      // PixiJS v8 API
      particle.circle(0, 0, 4);
      particle.fill(color);
      particle.x = position.x;
      particle.y = position.y;
      layer.addChild(particle);

      app.ticker.addOnce(() => {
        particle.destroy();
      });
    }
  };

  return {
    layer,
    emitBurst,
    sprites,
  };
};
