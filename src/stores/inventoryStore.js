import { defineStore } from 'pinia';
import { useGameStore } from './gameStore';

const DEFAULT_SLOTS = [
  { id: 'swap-extra', label: 'Swap Bonus', quantity: 10 },
  { id: 'hammer', label: 'Hammer', quantity: 0, disabled: true },
  { id: 'color-wand', label: 'Color Wand', quantity: 2 },
  { id: 'shuffle', label: 'Shuffle', quantity: 20 },
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
        return false;
      }

      if (slot.disabled) {
        console.warn(`Power-up ${slot.label} is currently disabled.`);
        return false;
      }

      const gameStore = useGameStore();
      let powerUpExecuted = false;

        try {
          switch (id) {
            case 'swap-extra':
              powerUpExecuted = gameStore.armSwapBonus();
              break;
            case 'shuffle':
              {
                const result = gameStore.shuffleBoard();
                if (result !== false) {
                  powerUpExecuted = true;
                }
              }
              break;
            case 'hammer':
              console.warn('Hammer power-up is disabled for now.');
              powerUpExecuted = false;
              break;
          default:
            console.warn(`Power-up ${id} not implemented.`);
        }
      } catch (error) {
        console.error(`Failed to execute power-up ${id}`, error);
        throw error;
      }

      if (powerUpExecuted) {
        slot.quantity -= 1;
        return true;
      }

      return false;
    },
    openInventory() {
      this.inventoryOpen = true;
    },
    closeInventory() {
      this.inventoryOpen = false;
    },
  },
});
