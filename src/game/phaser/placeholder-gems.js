const GEM_TYPES = ['ruby', 'sapphire', 'emerald', 'topaz', 'amethyst', 'moonstone', 'bomb', 'rainbow', 'cross'];
const GEM_COLORS = [
  '#ff0000',
  '#0047ff',
  '#00c853',
  '#ffd600',
  '#aa00ff',
  '#f5f5f5',
  '#1f2933',
  '#8a2be2',
  '#ffd700',
];
const GEM_SHAPES = [
  'circle',
  'square',
  'triangle',
  'diamond',
  'pentagon',
  'hexagon',
  'star',
  'flower',
  'plus',
];

const drawShape = (ctx, shape, size) => {
  ctx.beginPath();
  switch (shape) {
    case 'circle':
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      break;
    case 'square':
      ctx.rect(0, 0, size, size);
      break;
    case 'triangle':
      ctx.moveTo(size / 2, 0);
      ctx.lineTo(size, size);
      ctx.lineTo(0, size);
      ctx.closePath();
      break;
    case 'diamond':
      ctx.moveTo(size / 2, 0);
      ctx.lineTo(size, size / 2);
      ctx.lineTo(size / 2, size);
      ctx.lineTo(0, size / 2);
      ctx.closePath();
      break;
    case 'pentagon':
      for (let i = 0; i < 5; i += 1) {
        const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
        const x = size / 2 + (size / 2) * Math.cos(angle);
        const y = size / 2 + (size / 2) * Math.sin(angle);
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      break;
    case 'hexagon':
      for (let i = 0; i < 6; i += 1) {
        const angle = (i / 6) * Math.PI * 2;
        const x = size / 2 + (size / 2) * Math.cos(angle);
        const y = size / 2 + (size / 2) * Math.sin(angle);
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      break;
    case 'star':
      for (let i = 0; i < 10; i += 1) {
        const radius = i % 2 === 0 ? size / 2 : size / 4;
        const angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
        const x = size / 2 + radius * Math.cos(angle);
        const y = size / 2 + radius * Math.sin(angle);
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      break;
    case 'flower':
      for (let i = 0; i < 6; i += 1) {
        const angle = (i / 6) * Math.PI * 2;
        const cx = size / 2 + (size / 4) * Math.cos(angle);
        const cy = size / 2 + (size / 4) * Math.sin(angle);
        ctx.moveTo(cx + size / 4, cy);
        ctx.arc(cx, cy, size / 4, 0, Math.PI * 2);
      }
      break;
    case 'plus':
      ctx.rect(size / 4, 0, size / 2, size);
      ctx.rect(0, size / 4, size, size / 2);
      break;
    default:
      ctx.rect(0, 0, size, size);
      break;
  }
  ctx.closePath();
  ctx.fill();
};

export const createPlaceholderGems = (scene, size, includeTypes = GEM_TYPES) => {
  const textures = {};

  includeTypes.forEach((type) => {
    const index = GEM_TYPES.indexOf(type);
    if (index === -1) {
      return;
    }

    const textureKey = `placeholder-${type}`;
    if (!scene.textures.exists(textureKey)) {
      const canvasTexture = scene.textures.createCanvas(textureKey, size, size);
      const ctx = canvasTexture.context;
      ctx.clearRect(0, 0, size, size);
      ctx.fillStyle = GEM_COLORS[index];
      drawShape(ctx, GEM_SHAPES[index], size);
      canvasTexture.refresh();
    }

    textures[type] = {
      key: textureKey,
      width: size,
      height: size,
    };
  });

  return textures;
};

