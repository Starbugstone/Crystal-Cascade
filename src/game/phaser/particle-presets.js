export const explosionParticles = (scene, fxLayer, origin, { color = 0xffc107, radius = 48, count = 36, duration = 380 } = {}) => {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const distance = radius * (0.5 + Math.random() * 0.5);
    const targetX = origin.x + Math.cos(angle) * distance;
    const targetY = origin.y + Math.sin(angle) * distance;
    const size = 6 + Math.random() * 6;
    const particle = scene.add.circle(origin.x, origin.y, size, color, 1);

    if (fxLayer) {
      fxLayer.add(particle);
    }

    scene.tweens.add({
      targets: particle,
      x: targetX,
      y: targetY,
      alpha: 0,
      scale: 0.2,
      duration: duration + Math.random() * 120,
      ease: 'Cubic.easeOut',
      onComplete: () => particle.destroy(),
    });
  }
};

export const sparkColumn = (scene, fxLayer, origin, { color = 0x7dd3fc, length = 5, spacing = 36, duration = 320 } = {}) => {
  for (let i = -length; i <= length; i += 1) {
    const offsetX = origin.x + spacing * i;
    const particle = scene.add.rectangle(offsetX, origin.y, 12, 32, color, 0.9);
    particle.setAngle(Math.random() * 15 - 7);

    if (fxLayer) {
      fxLayer.add(particle);
    }

    scene.tweens.add({
      targets: particle,
      alpha: 0,
      scaleY: 0.2,
      duration: duration + Math.random() * 120,
      ease: 'Quad.Out',
      onComplete: () => particle.destroy(),
    });
  }
};

export const sparkRow = (scene, fxLayer, origin, { color = 0xff80ab, length = 5, spacing = 36, duration = 320 } = {}) => {
  for (let i = -length; i <= length; i += 1) {
    const offsetY = origin.y + spacing * i;
    const particle = scene.add.rectangle(origin.x, offsetY, 32, 12, color, 0.9);
    particle.setAngle(Math.random() * 15 - 7);

    if (fxLayer) {
      fxLayer.add(particle);
    }

    scene.tweens.add({
      targets: particle,
      alpha: 0,
      scaleX: 0.2,
      duration: duration + Math.random() * 120,
      ease: 'Quad.Out',
      onComplete: () => particle.destroy(),
    });
  }
};

