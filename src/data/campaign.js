export const LEVEL_COUNT = 36;
export const CHAPTERS = [
  { name: 'First light', description: 'Find your rhythm. Match gems and melt the ice.' },
  { name: 'Stone gardens', description: 'Match beside stone blocks to open the way.' },
  { name: 'Deep frost', description: 'Two layers of ice. A little more persistence.' },
  { name: 'Golden vaults', description: 'Reinforced stone takes two separate hits.' },
  { name: 'Prismatic paths', description: 'Open the columns. Let the cascades flow.' },
  { name: 'Celestial summit', description: 'Bring every trick to the final ascent.' },
];
export const POWERS = [
  { id: 'clear-row', label: 'Clear Row', dropWeight: 35 },
  { id: 'hammer', label: 'Hammer', dropWeight: 10 },
  { id: 'color-wand', label: 'Color Wand', dropWeight: 10 },
  { id: 'shuffle', label: 'Shuffle', dropWeight: 35 },
  { id: 'tile-breaker', label: 'Tile Breaker', dropWeight: 10 },
];
export const rollChestPower = (random = Math.random) => {
  let roll = random() * POWERS.reduce((total, power) => total + power.dropWeight, 0);
  return POWERS.find((power) => (roll -= power.dropWeight) < 0) ?? POWERS.at(-1);
};
export const CHEST_TIERS = [
  { id: 'crystal', label: 'Crystal chest', multiplier: 1, count: 1 },
  { id: 'radiant', label: 'Radiant chest', multiplier: 1.5, count: 1 },
  { id: 'celestial', label: 'Celestial chest', multiplier: 2, count: 1 },
];
export const getChestTier = (score, target) =>
  target > 0 ? [...CHEST_TIERS].reverse().find((tier) => score >= target * tier.multiplier) : null;
export const SPEED_CHEST_TIERS = CHEST_TIERS.map((tier, index) => ({
  ...tier,
  timeMultiplier: [1, 0.75, 0.5][index],
}));
export const getSpeedChestTier = (elapsedMs, targetMs) =>
  Number.isFinite(elapsedMs) && elapsedMs > 0 && Number.isFinite(targetMs) && targetMs > 0
    ? ([...SPEED_CHEST_TIERS]
        .reverse()
        .find((tier) => elapsedMs <= targetMs * tier.timeMultiplier) ?? null)
    : null;
export const formatTime = (ms) => {
  const seconds = Math.floor(Math.max(0, ms ?? 0) / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};
export const getStars = (score, target, combo) =>
  1 +
  Number(target > 0 && score >= target) +
  Number(combo >= 4 || (target > 0 && score >= target * 1.35));
