// Preserve the original color, silhouette and faceting style. Each chapter
// varies the cut and shine of just two gems; the others use the original art.
export const GEM_FINISHES = ['classic', 'cut', 'geode'];
const chapterFinishes = [
  'classic',
  'classic',
  'cut',
  'cut',
  'geode',
  'geode',
  'classic',
  'cut',
  'cut',
  'geode',
  'cut',
  'geode',
  'cut',
  'geode',
  'classic',
  'cut',
  'geode',
  'cut',
  'classic',
  'geode',
  'cut',
  'geode',
  'cut',
  'classic',
];
export const gemFinish = (levelId) => chapterFinishes[Math.floor((levelId - 1) / 6)] ?? 'classic';
const variedGems = { cut: ['ruby', 'emerald'], geode: ['sapphire', 'amethyst'] };
const finishForGem = (type, levelId) => {
  const finish = gemFinish(levelId);
  return variedGems[finish]?.includes(type) ? finish : 'classic';
};
export const gemArt = (type, levelId) =>
  finishForGem(type, levelId) === 'classic'
    ? `/art/${type}.svg`
    : `/art/gems/${finishForGem(type, levelId)}/${type}.svg`;
export const gemTexture = (type, levelId) =>
  finishForGem(type, levelId) === 'classic'
    ? `gem-${type}`
    : `gem-${finishForGem(type, levelId)}-${type}`;
