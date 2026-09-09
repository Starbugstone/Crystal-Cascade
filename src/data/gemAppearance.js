// Color and silhouette remain stable; only the cut changes between chambers.
// This keeps matching and the R/S/E seal language familiar.
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
export const gemArt = (type, levelId) =>
  gemFinish(levelId) === 'classic'
    ? `/art/${type}.svg`
    : `/art/gems/${gemFinish(levelId)}/${type}.svg`;
export const gemTexture = (type, levelId) =>
  gemFinish(levelId) === 'classic' ? `gem-${type}` : `gem-${gemFinish(levelId)}-${type}`;
