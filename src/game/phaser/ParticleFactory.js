import { explosionParticles, sparkColumn, sparkRow } from './particle-presets.js';

export const createParticleFactory = (scene, fxLayer) => {
  const emitBurst = (position, color = 0xffffff, count = 12) => {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 30;
      const targetX = position.x + Math.cos(angle) * speed;
      const targetY = position.y + Math.sin(angle) * speed;
      const particle = scene.add.circle(position.x, position.y, 4, color, 1);

      if (fxLayer) {
        fxLayer.add(particle);
      }

      scene.tweens.add({
        targets: particle,
        x: targetX,
        y: targetY,
        alpha: 0,
        duration: 300,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          particle.destroy();
        },
      });
    }
  };

  const emitExplosion = (position, options) => {
    explosionParticles(scene, fxLayer, position, options);
  };

  const emitCross = (position, options = {}) => {
    sparkColumn(scene, fxLayer, position, options.column || {});
    sparkRow(scene, fxLayer, position, options.row || {});
  };

  return {
    emitBurst,
    emitExplosion,
    emitCross,
  };
};
