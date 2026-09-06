import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const out = fileURLToPath(new URL('../public/art', import.meta.url));
const colors = [
  '#ff586c',
  '#ffba4f',
  '#fcf074',
  '#54edac',
  '#4bdbff',
  '#7a80ff',
  '#de70ff',
  '#ff7fbb',
];
const svg = (body, width = 128, height = 128) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`;
const star = (x, y, size, color = '#fff8c5') =>
  `<path d="M ${x} ${y - size} L ${x + size * 0.25} ${y - size * 0.25} L ${x + size} ${y} L ${x + size * 0.25} ${y + size * 0.25} L ${x} ${y + size} L ${x - size * 0.25} ${y + size * 0.25} L ${x - size} ${y} L ${x - size * 0.25} ${y - size * 0.25} Z" fill="${color}"/>`;

function bomb(frame = 0, id = 'b') {
  const pulse = Math.sin((frame * Math.PI) / 4);
  return `<defs><radialGradient id="${id}-body" cx=".32" cy=".23" r=".8"><stop stop-color="#8595b8"/><stop offset=".36" stop-color="#34435d"/><stop offset=".8" stop-color="#141829"/><stop offset="1" stop-color="#070a17"/></radialGradient><linearGradient id="${id}-gold" x2=".7" y2="1"><stop stop-color="#ffed9d"/><stop offset=".4" stop-color="#eaa83f"/><stop offset="1" stop-color="#9b4820"/></linearGradient><radialGradient id="${id}-glow"><stop stop-color="#ff9b28" stop-opacity=".65"/><stop offset="1" stop-color="#ff6611" stop-opacity="0"/></radialGradient></defs>
  <circle cx="64" cy="75" r="53" fill="url(#${id}-glow)" opacity="${0.7 + pulse * 0.2}"/>
  <path d="M70 33Q63 15 80 13Q90 11 94 21" fill="none" stroke="#4d2412" stroke-width="8" stroke-linecap="round"/><path d="M70 32Q67 17 80 15Q87 13 94 21" fill="none" stroke="#f4bd68" stroke-width="4" stroke-linecap="round"/>
  <g transform="rotate(-12 64 76)"><rect x="51" y="29" width="27" height="19" rx="5" fill="url(#${id}-gold)" stroke="#fff2ba" stroke-width="1.5"/><circle cx="64" cy="76" r="38" fill="url(#${id}-body)" stroke="#a8b8da" stroke-width="2"/>
  <path d="M35 67Q38 44 59 44" fill="none" stroke="#e4edff" stroke-opacity=".6" stroke-width="5" stroke-linecap="round"/><path d="M40 98Q67 119 92 87" fill="none" stroke="#f29b33" stroke-width="3" opacity=".7"/>
  <path d="m68 51-17 27h13l-5 21 22-32H67Z" fill="url(#${id}-gold)" stroke="#ffe8a2" stroke-width="1"/></g>
  <circle cx="95" cy="21" r="${10 + pulse * 3}" fill="#ff8d27" opacity=".28"/>${star(95, 21, 9 + pulse * 3)}${star(107, 11 + (frame % 3) * 3, 3, '#ffe693')}<path d="m96 5 2 6m12 14 7 2m-28-16-4-4" stroke="#ffb849" stroke-width="2" stroke-linecap="round"/>`;
}

function rainbow(frame = 0, id = 'r') {
  const sectors = colors
    .map((color, i) => {
      const a = ((i * 45 + frame * 9) * Math.PI) / 180;
      const b = a + Math.PI / 4;
      return `<path d="M64 65L${64 + 42 * Math.cos(a)} ${65 + 42 * Math.sin(a)}A42 42 0 0 1 ${64 + 42 * Math.cos(b)} ${65 + 42 * Math.sin(b)}Z" fill="${color}"/>`;
    })
    .join('');
  return `<defs><radialGradient id="${id}-glass" cx=".32" cy=".22"><stop stop-color="white" stop-opacity=".8"/><stop offset=".35" stop-color="white" stop-opacity=".05"/><stop offset=".72" stop-color="#160e64" stop-opacity=".08"/><stop offset="1" stop-color="#120b4d" stop-opacity=".85"/></radialGradient><radialGradient id="${id}-glow"><stop stop-color="#c16fff" stop-opacity=".55"/><stop offset="1" stop-color="#bc65ff" stop-opacity="0"/></radialGradient></defs>
  <circle cx="64" cy="65" r="61" fill="url(#${id}-glow)"/><circle cx="64" cy="65" r="47" fill="#211a53" stroke="#d2b8ff" stroke-width="2"/>${sectors}<circle cx="64" cy="65" r="43" fill="url(#${id}-glass)" stroke="#d8eaff" stroke-width="1.6"/>
  <ellipse cx="48" cy="40" rx="20" ry="9" transform="rotate(-27 48 40)" fill="white" opacity=".55"/>
  <g transform="rotate(${frame * 15} 64 65)"><ellipse cx="64" cy="65" rx="58" ry="18" transform="rotate(-28 64 65)" stroke="#9cffff" stroke-width="2" fill="none" opacity=".8"/>${star(13, 90, 5, '#92fbff')}</g>
  ${star(90, 35, 7 + Math.sin((frame * Math.PI) / 4) * 3)}${star(41, 101, 4, '#fbd9ff')}`;
}

function cross(frame = 0, id = 'c') {
  const alpha = 0.35 + (Math.sin((frame * Math.PI) / 4) + 1) * 0.3;
  return `<defs><linearGradient id="${id}-metal" x2=".8" y2="1"><stop stop-color="#d5faff"/><stop offset=".24" stop-color="#56ccec"/><stop offset=".55" stop-color="#1d6ba6"/><stop offset="1" stop-color="#083b69"/></linearGradient><radialGradient id="${id}-core"><stop stop-color="white"/><stop offset=".3" stop-color="#e0ffff"/><stop offset="1" stop-color="#46eaff"/></radialGradient></defs>
  <circle cx="64" cy="64" r="37" fill="#0b315b" stroke="#5fdcff" stroke-width="2"/>
  ${[0, 90, 180, 270].map((angle) => `<g transform="rotate(${angle} 64 64)"><path d="M53 48V29H43L64 6l21 23H75v19Z" fill="url(#${id}-metal)" stroke="#d2fbff" stroke-width="1.8" stroke-linejoin="round"/><path d="M64 39V21m-7 7 7-7 7 7" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" opacity="${alpha}"/></g>`).join('')}
  <circle cx="64" cy="64" r="21" fill="#103755" stroke="#86f5ff" stroke-width="2"/>
  <path d="M58 46h12v12h12v12H70v12H58V70H46V58h12Z" fill="url(#${id}-core)"/>
  <circle cx="64" cy="64" r="29" fill="none" stroke="#c6ffff" stroke-width="1.6" stroke-dasharray="8 15" transform="rotate(${frame * 11} 64 64)"/>${star(91, 43, 3 + alpha * 2, '#fff')}`;
}

function tnt() {
  return `<defs><linearGradient id="tnt-red" x2="1" y2=".3"><stop stop-color="#ff9270"/><stop offset=".35" stop-color="#e74635"/><stop offset="1" stop-color="#8c1f2c"/></linearGradient></defs>
  <path d="M65 32C57 14 94 30 91 10" fill="none" stroke="#513629" stroke-width="6"/>
  <path d="M65 32C57 14 94 30 91 10" fill="none" stroke="#ffdb91" stroke-width="3"/>
  ${[28, 48, 68].map((x) => `<rect x="${x}" y="31" width="28" height="82" rx="12" fill="url(#tnt-red)" stroke="#69252b" stroke-width="3"/><path d="M${x + 7} 45v52" stroke="#ffb392" stroke-width="3" opacity=".7"/>`).join('')}
  <path d="M26 48h72v10H26zm0 39h72v10H26z" fill="#513c36" stroke="#c59465" stroke-width="2"/>
  <rect x="34" y="59" width="56" height="27" rx="4" fill="#fff0c0" stroke="#792b2a" stroke-width="2"/>
  <text x="62" y="79" text-anchor="middle" font-family="Arial,sans-serif" font-size="22" font-weight="900" fill="#a52b2c">TNT</text>
  ${star(92, 12, 10, '#ffda65')}${star(105, 27, 4, '#fff2af')}`;
}
function wand() {
  return `<defs><linearGradient id="wand" x2="1" y2="1"><stop stop-color="#ffe8ff"/><stop offset=".5" stop-color="#e197fa"/><stop offset="1" stop-color="#724acd"/></linearGradient></defs><path d="m26 110 64-72" stroke="#261741" stroke-width="14" stroke-linecap="round"/><path d="m26 110 64-72" stroke="url(#wand)" stroke-width="9" stroke-linecap="round"/><path d="m30 103 10 3m3-19 10 3m3-19 10 3" stroke="#f7ddfa" stroke-width="3"/><path d="m87 9 8 18 21 2-15 14 4 21-18-11-19 11 4-21-15-14 21-2Z" fill="#ffe4a1" stroke="#fffcde" stroke-width="2.5"/><path d="m87 19 3 14 15 1-12 9 1 11-7-8-11 6 4-13-10-7 14-1Z" fill="#fff6d5"/>${star(43, 24, 8, '#df94ff')}${star(110, 78, 6, '#89f4ff')}${star(29, 62, 5, '#ffd487')}`;
}
function row() {
  return `<defs><linearGradient id="row" x2=".2" y2="1"><stop stop-color="#f2feff"/><stop offset=".35" stop-color="#97ebff"/><stop offset="1" stop-color="#2c78c2"/></linearGradient></defs><path d="M10 64h108" stroke="#3389bf" stroke-width="25" stroke-linecap="round"/><path d="M10 64h108" stroke="#aef5ff" stroke-width="10"/><path d="M47 48H30V32L5 64l25 32V80h17Zm34 0h17V32l25 32-25 32V80H81Z" fill="url(#row)" stroke="#e0feff" stroke-width="2"/><circle cx="64" cy="64" r="20" fill="#234e77" stroke="#b9f9ff" stroke-width="2"/><path d="m66 45-13 21h11l-3 17 14-25H65Z" fill="#fff4c1"/>${star(70, 19, 6, '#92ebff')}`;
}
function shuffle() {
  return `<defs><linearGradient id="shuffle" x2=".5" y2="1"><stop stop-color="#d9fff2"/><stop offset=".5" stop-color="#65eccc"/><stop offset="1" stop-color="#198d92"/></linearGradient></defs><path d="M14 34h20c28 0 29 59 57 59h10" fill="none" stroke="#114650" stroke-width="17" stroke-linecap="round"/><path d="M14 34h20c28 0 29 59 57 59h10" fill="none" stroke="url(#shuffle)" stroke-width="12" stroke-linecap="round"/><path d="M14 94h19c28 0 29-60 57-60h11" fill="none" stroke="#164750" stroke-width="18" stroke-linecap="round"/><path d="M14 94h19c28 0 29-60 57-60h11" fill="none" stroke="url(#shuffle)" stroke-width="12" stroke-linecap="round"/><path d="m95 16 23 18-23 18Zm0 59 23 18-23 18Z" fill="url(#shuffle)" stroke="#c9fff1" stroke-width="2"/>${star(34, 62, 7, '#f4e29e')}`;
}

for (const directory of ['bonuses', 'powers', 'ice'])
  mkdirSync(`${out}/${directory}`, { recursive: true });
const types = { bomb, rainbow, cross };
let atlas = '';
Object.entries(types).forEach(([name, draw], row) => {
  writeFileSync(`${out}/bonuses/${name}.svg`, svg(draw(0, name)));
  for (let frame = 0; frame < 8; frame++)
    atlas += `<svg x="${frame * 128}" y="${row * 128}" width="128" height="128" viewBox="0 0 128 128">${draw(frame, `${name}${frame}`)}</svg>`;
});
writeFileSync(`${out}/bonuses/atlas.svg`, svg(atlas, 1024, 384));
for (const [name, art] of Object.entries({
  tnt: tnt(),
  'color-wand': wand(),
  'clear-row': row(),
  shuffle: shuffle(),
  'tile-breaker': cross(),
}))
  writeFileSync(`${out}/powers/${name}.svg`, svg(art));

// Muted fracture edges keep damage readable while the gems remain the visual focus.
const fracture =
  'M19 3 32 25 23 37 51 61 36 79 42 124M51 61 71 54 88 73 123 62M88 73 81 94 98 124M32 25 59 17 78 3M36 79 18 88 4 84';
const fractureBranches =
  'M23 37 10 30 3 33M18 88 14 108 3 116M59 17 54 6M98 124 105 108 122 101M111 66 116 46 124 38M42 112 27 119';
for (const [name, thick] of [
  ['frost', true],
  ['cracked', false],
]) {
  const body = `<defs>
 <linearGradient id="ice" x2=".6" y2="1"><stop stop-color="#b9d0df" stop-opacity="${thick ? 0.2 : 0.13}"/><stop offset=".5" stop-color="#8bafc0" stop-opacity=".06"/><stop offset="1" stop-color="#bbd4e5" stop-opacity=".11"/></linearGradient>
 <linearGradient id="edge" x2=".8" y2="1"><stop stop-color="#d5e5ed" stop-opacity=".3"/><stop offset=".5" stop-color="#9bb8c8" stop-opacity=".12"/><stop offset="1" stop-color="#acc5d3" stop-opacity=".2"/></linearGradient>
 <radialGradient id="mist" cx=".2" cy=".1" r="1"><stop stop-color="#d8ecf3" stop-opacity=".1"/><stop offset=".65" stop-color="#c9e0e9" stop-opacity=".025"/><stop offset="1" stop-color="#c9e0e9" stop-opacity="0"/></radialGradient>
 </defs>
 <rect x="2" y="2" width="124" height="124" rx="9" fill="url(#ice)" stroke="url(#edge)" stroke-width="1.4"/>
 <rect x="4" y="4" width="120" height="120" rx="8" fill="url(#mist)"/>
 <path d="M8 34V14q0-6 6-6h69" fill="none" stroke="#dfedf2" stroke-width="1.2" stroke-linecap="round" opacity=".16"/>
 <path d="M120 94v20q0 6-6 6H78" fill="none" stroke="#c7dce7" stroke-width="1" stroke-linecap="round" opacity=".1"/>
 ${thick ? '' : `<g fill="none" stroke-linejoin="round" stroke-linecap="round"><path d="${fracture}" transform="translate(1 1)" stroke="#101a27" stroke-width="3.6" opacity=".45"/><path d="${fracture}" stroke="#b9cfdc" stroke-width="2.4" opacity=".56"/><path d="${fractureBranches}" stroke="#a9c2cf" stroke-width="1.6" opacity=".36"/></g>`}
 ${Array.from({ length: 32 }, (_, i) => `<circle cx="${7 + ((i * 37) % 114)}" cy="${6 + ((i * 19) % 115)}" r="${i % 3 === 0 ? 0.65 : 0.4}" fill="#d5e4ec" opacity="${thick ? 0.12 : 0.08}"/>`).join('')}`;
  writeFileSync(`${out}/ice/${name}.svg`, svg(body));
}
