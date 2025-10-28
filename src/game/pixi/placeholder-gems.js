
import { Graphics } from 'pixi.js';



const gemTypes = ['ruby', 'sapphire', 'emerald', 'topaz', 'amethyst', 'moonstone', 'bomb', 'rainbow', 'cross'];
const gemColors = [
  0xff0000, // Red
  0x0000ff, // Blue
  0x00ff00, // Green
  0xffff00, // Yellow
  0xff00ff, // Purple
  0xffffff, // White
  0x000000, // Black (bomb)
  0x8A2BE2, // BlueViolet (rainbow)
  0xFFD700, // Gold (cross)
];
const gemShapes = [
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



export const createPlaceholderGems = (size) => {
  const textures = {};

  gemTypes.forEach((type, index) => {
    const g = new Graphics();
    g.fill(gemColors[index]);

    switch (gemShapes[index]) {
      case 'circle':
        g.circle(size / 2, size / 2, size / 2);
        break;
      case 'square':
        g.rect(0, 0, size, size);
        break;
      case 'triangle':
        g.moveTo(size / 2, 0);
        g.lineTo(size, size);
        g.lineTo(0, size);
        g.lineTo(size / 2, 0);
        break;
      case 'diamond':
        g.moveTo(size / 2, 0);
        g.lineTo(size, size / 2);
        g.lineTo(size / 2, size);
        g.lineTo(0, size / 2);
        g.lineTo(size / 2, 0);
        break;
      case 'pentagon':
        for (let i = 0; i < 5; i++) {
          const angle = (i / 5) * 2 * Math.PI - Math.PI / 2;
          const x = size / 2 + (size / 2) * Math.cos(angle);
          const y = size / 2 + (size / 2) * Math.sin(angle);
          if (i === 0) {
            g.moveTo(x, y);
          } else {
            g.lineTo(x, y);
          }
        }
        break;
      case 'hexagon':
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * 2 * Math.PI;
          const x = size / 2 + (size / 2) * Math.cos(angle);
          const y = size / 2 + (size / 2) * Math.sin(angle);
          if (i === 0) {
            g.moveTo(x, y);
          } else {
            g.lineTo(x, y);
          }
        }
        break;
      case 'star':
        for (let i = 0; i < 10; i++) {
          const radius = i % 2 === 0 ? size / 2 : size / 4;
          const angle = (i / 10) * 2 * Math.PI - Math.PI / 2;
          const x = size / 2 + radius * Math.cos(angle);
          const y = size / 2 + radius * Math.sin(angle);
          if (i === 0) {
            g.moveTo(x, y);
          } else {
            g.lineTo(x, y);
          }
        }
        break;
      case 'flower':
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * 2 * Math.PI;
          const cx = size / 2 + (size / 4) * Math.cos(angle);
          const cy = size / 2 + (size / 4) * Math.sin(angle);
          g.circle(cx, cy, size / 4);
        }
        break;
      case 'plus':
        g.rect(size / 4, 0, size / 2, size);
        g.rect(0, size / 4, size, size / 2);
        break;
    }
    g.fill();
    textures[type] = g;
  });

  return textures;
};
