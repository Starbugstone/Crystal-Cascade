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
  const inner = points.map(([x, y]) => [64 + (x - 64) * 0.58, 61 + (y - 64) * 0.58]);
  const facets = points
    .map((p, i) => {
      const j = (i + 1) % points.length;
      return `<polygon points="${[p, points[j], inner[j], inner[i]].map((p) => p.join(',')).join(' ')}" fill="hsl(${hue},90%,${[80, 52, 34, 26, 40, 63, 86, 67][i % 8]}%)" fill-opacity=".86" stroke="white" stroke-opacity=".16" stroke-width=".7"/>`;
    })
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><defs><linearGradient id="g" x2=".85" y2="1"><stop stop-color="hsl(${hue},95%,83%)"/><stop offset=".46" stop-color="hsl(${hue},94%,58%)"/><stop offset="1" stop-color="hsl(${hue},95%,29%)"/></linearGradient><linearGradient id="shine" x2=".5" y2="1"><stop stop-color="white" stop-opacity=".85"/><stop offset="1" stop-color="white" stop-opacity="0"/></linearGradient><filter id="shadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dy="3" stdDeviation="3" flood-color="hsl(${hue},90%,22%)" flood-opacity=".8"/></filter></defs><g filter="url(#shadow)"><polygon points="${points.map((p) => p.join(',')).join(' ')}" fill="url(#g)" stroke="hsl(${hue},85%,86%)" stroke-width="1.8" stroke-linejoin="round"/>${facets}<polygon points="${inner.map((p) => p.join(',')).join(' ')}" fill="url(#g)" stroke="white" stroke-opacity=".42" stroke-width="1"/><path d="M ${inner[0].join(' ')} L ${inner[1].join(' ')} L 62 66 L ${inner.at(-1).join(' ')} Z" fill="url(#shine)" opacity=".65"/><path d="M ${points.at(-1).join(' ')} L ${points[0].join(' ')} L ${points[1].join(' ')}" fill="none" stroke="white" stroke-opacity=".88" stroke-width="2" stroke-linecap="round"/></g><path d="M 36 23 L 38 31 L 46 33 L 38 35 L 36 43 L 34 35 L 26 33 L 34 31 Z" fill="white" opacity=".94"/></svg>`;
  writeFileSync(`${out}/${name}.svg`, svg);
  for (const finish of ['cut', 'geode']) {
    const inset = points.map(([x, y]) => [
      64 + (x - 64) * (finish === 'cut' ? 0.7 : 0.8),
      64 + (y - 64) * (finish === 'cut' ? 0.7 : 0.8),
    ]);
    const detail =
      finish === 'cut'
        ? `<polygon points="${inset.map((p) => p.join(',')).join(' ')}" fill="none" stroke="hsl(${hue},95%,90%)" stroke-width="2.5"/><path d="${inset.map((p) => `M${p.join(' ')}L64 62`).join('')}" stroke="white" stroke-opacity=".45" stroke-width="1.5"/><polygon points="45,49 77,39 88,73 58,89 39,70" fill="hsl(${hue},90%,72%)" fill-opacity=".45" stroke="white" stroke-opacity=".55"/>`
        : `<polygon points="${inset.map((p) => p.join(',')).join(' ')}" fill="hsl(${hue},65%,19%)" stroke="hsl(${hue},90%,80%)" stroke-width="3"/><g fill="url(#g)" stroke="hsl(${hue},90%,89%)" stroke-width="1.3"><path d="m41 80-8-28 14-19 13 21-7 30Z"/><path d="m62 91-9-39 13-28 13 30-4 35Z"/><path d="m78 81-4-22 17-19 7 24-10 20Z"/></g><path d="m36 43 8 9m21-16 2 34m22-18-7 15" stroke="white" stroke-width="2" stroke-linecap="round"/>`;
    mkdirSync(`${out}/gems/${finish}`, { recursive: true });
    writeFileSync(
      `${out}/gems/${finish}/${name}.svg`,
      svg.replace('</g><path d="M 36', `${detail}</g><path d="M 36`),
    );
  }
}
