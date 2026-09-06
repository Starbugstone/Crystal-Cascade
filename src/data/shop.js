import { POWERS } from './campaign';
import { bonusCapacity, HAMMER_CAPACITY } from './rewards';

export const SHOP_ITEMS = [
  ...POWERS.map((power) => ({
    id: power.id,
    label: power.label,
    kind: 'power',
    quantity: 1,
    price: ['shuffle', 'clear-row'].includes(power.id) ? 40 : 60,
  })),
  { id: 'builder-hammer', label: 'Builder hammer', kind: 'builder-hammer', quantity: 1, price: 75 },
];
export const shopSlots = (level) => (level > 0 ? Math.min(SHOP_ITEMS.length, level + 1) : 0);
export function rollShopStock(level, random = Math.random, existing = []) {
  const stock = [...existing].slice(0, shopSlots(level));
  const pool = SHOP_ITEMS.filter((item) => !stock.some((offer) => offer.id === item.id));
  while (stock.length < shopSlots(level) && pool.length) {
    const index = Math.min(pool.length - 1, Math.max(0, Math.floor(random() * pool.length)));
    stock.push({ id: pool.splice(index, 1)[0].id, sold: false });
  }
  return stock;
}
export function shopSpace(state, item) {
  return item.kind === 'builder-hammer'
    ? HAMMER_CAPACITY - state.builderHammers
    : bonusCapacity(state.town) -
        (state.powers.find((power) => power.id === item.id)?.quantity ?? 0);
}
