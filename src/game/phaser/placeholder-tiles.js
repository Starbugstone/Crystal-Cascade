const DEFAULT_TILE_STATES = [1, 2, 3, 4];

const TILE_BASE_COLORS = {
  4: '#6ee7b7',
  3: '#22d3ee',
  2: '#60a5fa',
  1: '#f97316',
};

const TILE_BORDER_COLOR = '#0f172a';
const TILE_CRACK_COLOR = 'rgba(15, 23, 42, 0.7)';

const ensureCanvasTexture = (scene, key, size, draw) => {
  if (!scene.textures.exists(key)) {
    const canvasTexture = scene.textures.createCanvas(key, size, size);
    const ctx = canvasTexture.context;
    ctx.clearRect(0, 0, size, size);
    draw(ctx, size);
    canvasTexture.refresh();
  }
};

const drawRoundedRect = (ctx, size, radius) => {
  const r = Math.max(4, radius);
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(size - r, 0);
  ctx.quadraticCurveTo(size, 0, size, r);
  ctx.lineTo(size, size - r);
  ctx.quadraticCurveTo(size, size, size - r, size);
  ctx.lineTo(r, size);
  ctx.quadraticCurveTo(0, size, 0, size - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
};

const drawCracks = (ctx, size, severity) => {
  const baseWidth = Math.max(2, Math.round(size * 0.03));
  ctx.strokeStyle = TILE_CRACK_COLOR;
  ctx.lineWidth = baseWidth;
  ctx.lineCap = 'round';

  const drawSegment = (points) => {
    ctx.beginPath();
    points.forEach(([x, y], index) => {
      const px = x * size;
      const py = y * size;
      if (index === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    });
    ctx.stroke();
  };

  if (severity >= 1) {
    drawSegment([
      [0.2, 0.15],
      [0.35, 0.25],
      [0.45, 0.4],
      [0.52, 0.65],
      [0.65, 0.82],
    ]);
  }

  if (severity >= 2) {
    drawSegment([
      [0.75, 0.18],
      [0.62, 0.32],
      [0.48, 0.45],
      [0.33, 0.72],
    ]);
  }

  if (severity >= 3) {
    drawSegment([
      [0.15, 0.75],
      [0.28, 0.6],
      [0.44, 0.55],
      [0.58, 0.48],
      [0.78, 0.45],
    ]);
  }
};

const drawTileTexture = (ctx, size, { baseColor, accentColor, severity }) => {
  const padding = Math.round(size * 0.08);
  const radius = Math.round(size * 0.14);
  const innerSize = size - padding * 2;
  const offset = padding;

  ctx.save();
  ctx.translate(offset, offset);

  // Base plate
  ctx.fillStyle = TILE_BORDER_COLOR;
  drawRoundedRect(ctx, innerSize, radius);
  ctx.fill();

  ctx.fillStyle = baseColor;
  drawRoundedRect(ctx, innerSize, radius - Math.round(innerSize * 0.08));
  ctx.fill();

  // Accent overlay
  const accentInset = Math.round(innerSize * 0.08);
  ctx.fillStyle = accentColor;
  drawRoundedRect(ctx, innerSize - accentInset * 2, radius - accentInset);
  ctx.translate(accentInset, accentInset);
  ctx.fill();
  ctx.translate(-accentInset, -accentInset);

  // Cracks
  if (severity > 0) {
    ctx.translate(-offset, -offset);
    drawCracks(ctx, size, severity);
  }

  ctx.restore();
};

export const createPlaceholderTiles = (scene, size = 256, states = DEFAULT_TILE_STATES) => {
  const textures = { layers: {} };

  const sortedStates = [...states].sort((a, b) => a - b);

  sortedStates.forEach((state, index) => {
    const baseColor = TILE_BASE_COLORS[state] || '#64748b';
    const accentColor = '#e2e8f0';
    const severity = Math.max(0, sortedStates.length - index - 1);
    const key = `placeholder-tile-layer-${state}`;

    ensureCanvasTexture(scene, key, size, (ctx, drawSize) => {
      drawTileTexture(ctx, drawSize, { baseColor, accentColor, severity });
    });

    textures.layers[state] = {
      key,
      width: size,
      height: size,
    };
  });

  return textures;
};

