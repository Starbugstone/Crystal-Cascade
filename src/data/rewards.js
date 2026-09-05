import { POWERS } from './campaign';

export const BONUS_CAPACITIES = [3, 5, 8, 12];
export const CONTINUOUS_COIN_CAP = 25;
export const HAMMER_CAPACITY = 5;
export const OVERFLOW_COINS = 10;
export const bonusCapacity = (town) => BONUS_CAPACITIES[town.buildings.armory] ?? 3;
export const CHEST_DROPS = [
  ...POWERS.map((power) => ({
    ...power,
    kind: 'power',
    quantity: 1,
    weight: power.dropWeight * 0.7,
  })),
  { id: 'coins', label: 'Coins', kind: 'coins', quantity: 25, weight: 20 },
  {
    id: 'builder-hammer',
    label: 'Builder hammer',
    kind: 'builder-hammer',
    quantity: 1,
    weight: 10,
  },
];
export function rollChestReward(random = Math.random) {
  let roll = random() * 100;
  const drop = CHEST_DROPS.find((item) => (roll -= item.weight) < 0) ?? CHEST_DROPS.at(-1);
  return { id: drop.id, label: drop.label, kind: drop.kind, quantity: drop.quantity };
}
export const rewardArt = (item) =>
  item.kind === 'power' || !item.kind
    ? `/art/powers/${item.id}.svg`
    : `/art/rewards/${item.id}.svg`;

// Used by chest settlement and inventory grants so no route can exceed storage.
export function grantReward(state, reward) {
  if (!Number.isSafeInteger(reward.quantity) || reward.quantity <= 0) return null;
  let overflow = 0;
  let accepted = reward.quantity;
  if (reward.kind === 'power') {
    const slot = state.powers.find((power) => power.id === reward.id);
    if (!slot) return null;
    accepted = Math.min(reward.quantity, Math.max(0, bonusCapacity(state.town) - slot.quantity));
    slot.quantity += accepted;
    overflow = reward.quantity - accepted;
  } else if (reward.kind === 'builder-hammer') {
    accepted = Math.min(reward.quantity, Math.max(0, HAMMER_CAPACITY - state.builderHammers));
    state.builderHammers += accepted;
    overflow = reward.quantity - accepted;
  } else if (reward.kind === 'coins') {
    state.town.coins = Math.min(Number.MAX_SAFE_INTEGER, state.town.coins + reward.quantity);
  } else return null;
  if (overflow) {
    state.town.coins = Math.min(
      Number.MAX_SAFE_INTEGER,
      state.town.coins + overflow * OVERFLOW_COINS,
    );
    if (!accepted)
      return {
        id: 'coins',
        kind: 'coins',
        label: 'Coins',
        quantity: overflow * OVERFLOW_COINS,
        convertedFrom: reward.label,
      };
  }
  return { ...reward, quantity: accepted, overflowCoins: overflow * OVERFLOW_COINS };
}
