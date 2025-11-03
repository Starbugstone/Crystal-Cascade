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

  return {
    emitBurst,
  };
};

