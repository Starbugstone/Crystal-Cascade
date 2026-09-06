// Coin prices share one multiplier so buildings and supplies stay in step.
export const purchasePrice = (basePrice) => Math.ceil(basePrice * 1.5);
