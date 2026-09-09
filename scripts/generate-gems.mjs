import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const out = fileURLToPath(new URL('../public/art', import.meta.url));
mkdirSync(out, { recursive: true });
const gems = {
  ruby: {
    hue: 343,
    points: [
      [36, 16],
      [91, 16],
      [112, 39],
      [106, 91],
      [64, 115],
      [20, 93],
      [14, 40],
    ],
  },
  sapphire: {
    hue: 220,
    points: [
      [64, 9],
      [112, 57],
      [64, 117],
      [16, 57],
    ],
  },
  emerald: {
    hue: 156,
    points: [
      [36, 14],
      [91, 14],
      [109, 35],
      [109, 92],
      [90, 112],
      [36, 112],
      [18, 92],
      [18, 35],
    ],
  },
  topaz: {
    hue: 40,
    points: [
      [64, 12],
      [116, 96],
      [99, 113],
      [29, 113],
      [12, 96],
    ],
  },
  amethyst: {
    hue: 277,
    points: [
      [64, 9],
      [103, 32],
      [108, 91],
      [64, 117],
      [20, 91],
      [25, 32],
    ],
  },
  moonstone: {
    hue: 183,
    points: [
      [45, 13],
      [84, 13],
      [112, 43],
      [112, 82],
      [84, 111],
      [45, 111],
      [16, 82],
      [16, 43],
    ],
  },
};
for (const [name, { hue, points }] of Object.entries(gems)) {
  const renderGem = (cut = 0.58, shine = '.65') => {
    const inner = points.map(([x, y]) => [64 + (x - 64) * cut, 61 + (y - 64) * cut]);
    const facets = points
      .map((p, i) => {
        const j = (i + 1) % points.length;
        return `<polygon points="${[p, points[j], inner[j], inner[i]].map((p) => p.join(',')).join(' ')}" fill="hsl(${hue},90%,${[80, 52, 34, 26, 40, 63, 86, 67][i % 8]}%)" fill-opacity=".86" stroke="white" stroke-opacity=".16" stroke-width=".7"/>`;
      })
      .join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><defs><linearGradient id="g" x2=".85" y2="1"><stop stop-color="hsl(${hue},95%,83%)"/><stop offset=".46" stop-color="hsl(${hue},94%,58%)"/><stop offset="1" stop-color="hsl(${hue},95%,29%)"/></linearGradient><linearGradient id="shine" x2=".5" y2="1"><stop stop-color="white" stop-opacity=".85"/><stop offset="1" stop-color="white" stop-opacity="0"/></linearGradient><filter id="shadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dy="3" stdDeviation="3" flood-color="hsl(${hue},90%,22%)" flood-opacity=".8"/></filter></defs><g filter="url(#shadow)"><polygon points="${points.map((p) => p.join(',')).join(' ')}" fill="url(#g)" stroke="hsl(${hue},85%,86%)" stroke-width="1.8" stroke-linejoin="round"/>${facets}<polygon points="${inner.map((p) => p.join(',')).join(' ')}" fill="url(#g)" stroke="white" stroke-opacity=".42" stroke-width="1"/><path d="M ${inner[0].join(' ')} L ${inner[1].join(' ')} L 62 66 L ${inner.at(-1).join(' ')} Z" fill="url(#shine)" opacity="${shine}"/><path d="M ${points.at(-1).join(' ')} L ${points[0].join(' ')} L ${points[1].join(' ')}" fill="none" stroke="white" stroke-opacity=".88" stroke-width="2" stroke-linecap="round"/></g><path d="M 36 23 L 38 31 L 46 33 L 38 35 L 36 43 L 34 35 L 26 33 L 34 31 Z" fill="white" opacity=".94"/></svg>`;
  };
  writeFileSync(`${out}/${name}.svg`, renderGem());
  // Keep the original silhouette, hue and clean facets. Only the central cut
  // and its highlight vary; legacy asset paths stay compatible with the loader.
  for (const [finish, cut, shine] of [
    ['cut', 0.54, '.57'],
    ['geode', 0.62, '.72'],
  ]) {
    mkdirSync(`${out}/gems/${finish}`, { recursive: true });
    writeFileSync(`${out}/gems/${finish}/${name}.svg`, renderGem(cut, shine));
  }
  const seal = {
    ruby: { color: '#ff567b', mark: 'R' },
    sapphire: { color: '#529bff', mark: 'S' },
    emerald: { color: '#48e5a9', mark: 'E' },
  }[name];
  if (seal) {
    // Use exactly the gem's outline so the required match is visible by shape
    // as well as color. The tile renderer displays this frame around the gem.
    const outline = points.map((point) => point.join(',')).join(' ');
    mkdirSync(`${out}/obstacles`, { recursive: true });
    writeFileSync(
      `${out}/obstacles/seal-${name}.svg`,
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><polygon points="${outline}" fill="${seal.color}" fill-opacity=".18" stroke="#171728" stroke-width="10" stroke-linejoin="round"/><polygon points="${outline}" fill="none" stroke="${seal.color}" stroke-width="5" stroke-linejoin="round"/><rect x="5" y="4" width="30" height="30" rx="7" fill="#191426" stroke="${seal.color}" stroke-width="2.4"/><text x="20" y="26" text-anchor="middle" font-family="Arial,sans-serif" font-weight="bold" font-size="23" fill="white">${seal.mark}</text></svg>`,
    );
  }
}
