import { defineStore } from 'pinia';

const DEFAULT_SLOTS = [
  { id: 'hammer', label: 'Hammer', quantity: 3 },
  { id: 'color-wand', label: 'Color Wand', quantity: 2 },
  { id: 'shuffle', label: 'Shuffle', quantity: 1 },
  { id: 'tile-breaker', label: 'Tile Breaker', quantity: 1 },
];

export const useInventoryStore = defineStore('inventory', {
  state: () => ({
    quickAccessSlots: DEFAULT_SLOTS,
    inventoryOpen: false,
  }),
  actions: {
    usePowerUp(id) {
      const slot = this.quickAccessSlots.find((entry) => entry.id === id);
      if (!slot || slot.quantity <= 0) {
        return;
      }
      slot.quantity -= 1;
    },
    openInventory() {
      this.inventoryOpen = true;
    },
    closeInventory() {
      this.inventoryOpen = false;
    },
  },
});
