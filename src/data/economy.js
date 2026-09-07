import { CHAPTERS, LEVEL_COUNT } from './campaign';

// Coin prices share one multiplier so buildings and supplies stay in step.
export const purchasePrice = (basePrice) => Math.ceil(basePrice * 1.5);

// Depth adds five percentage points per chapter, rather than compounding rewards.
export const depthBonusPercent = (levelId) =>
  Number.isInteger(levelId) && levelId >= 1 && levelId <= LEVEL_COUNT
    ? Math.floor((levelId - 1) / (LEVEL_COUNT / CHAPTERS.length)) * 5
    : 0;
export const miningDepthBonus = (baseCoins, levelId) =>
  Math.min(
    Number.MAX_SAFE_INTEGER - baseCoins,
    Math.floor((baseCoins * depthBonusPercent(levelId)) / 100),
  );

// Chest coins grow with each six-level chapter as village upgrades become dearer.
export const chestCoinReward = (levelId = 1) => 25 * (1 + depthBonusPercent(levelId) / 5);
