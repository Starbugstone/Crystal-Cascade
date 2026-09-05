import { describe, it, expect, beforeEach } from 'vitest';
import { useInventoryStore } from '../src/stores/inventoryStore';
import { createPinia, setActivePinia } from 'pinia';

describe('InventoryStore awardPower', () => {
  let inventoryStore;

  beforeEach(() => {
    setActivePinia(createPinia());
    inventoryStore = useInventoryStore();
  });

  it('should increase power quantity when awarding known power', () => {
    const initialQty = inventoryStore.quickAccessSlots.find((s) => s.id === 'hammer').quantity;

    const result = inventoryStore.awardPower('hammer');

    expect(result).toBe(true);
    expect(inventoryStore.quickAccessSlots.find((s) => s.id === 'hammer').quantity).toBe(
      initialQty + 1,
    );
  });

  it('should award multiple quantities at once', () => {
    const initialQty = inventoryStore.quickAccessSlots.find((s) => s.id === 'shuffle').quantity;

    inventoryStore.awardPower('shuffle', 5);

    expect(inventoryStore.quickAccessSlots.find((s) => s.id === 'shuffle').quantity).toBe(
      initialQty + 5,
    );
  });

  it('should return false for unknown power', () => {
    const result = inventoryStore.awardPower('unknown-power');

    expect(result).toBe(false);
  });
});
