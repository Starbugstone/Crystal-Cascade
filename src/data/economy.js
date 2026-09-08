import { CHAPTERS, LEVEL_COUNT } from './campaign';

// Coin prices share one multiplier so buildings and supplies stay in step.
export const purchasePrice = (basePrice) => Math.ceil(basePrice * 1.5);

export const miningChapter = (levelId) =>
  Number.isInteger(levelId) && levelId >= 1 && levelId <= LEVEL_COUNT
    ? 1 + Math.floor((levelId - 1) / (LEVEL_COUNT / CHAPTERS.length))
    : 1;
// Each chapter adds another full mining subtotal: 1x, 2x, 3x, ... 12x.
export const depthBonusPercent = (levelId) => (miningChapter(levelId) - 1) * 100;
export const miningDepthBonus = (baseCoins, levelId) =>
  Math.min(
    Number.MAX_SAFE_INTEGER - baseCoins,
    Math.floor((baseCoins * depthBonusPercent(levelId)) / 100),
  );

// Chest coins grow with each six-level chapter as village upgrades become dearer.
export const chestCoinReward = (levelId = 1) => 500 * miningChapter(levelId);

// Agreed per-era level prices. Mining windfalls never increase a quoted price.
export const RIVER_RAIL_LEVEL_PRICES = [800, 1200, 1400];
