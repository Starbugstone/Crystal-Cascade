import { defineStore } from 'pinia';
import { useGameStore } from './gameStore';

const DEFAULT_SLOTS = [
  { id: 'clear-row', label: 'Clear Row', quantity: 20 },
  { id: 'hammer', label: 'Hammer', quantity: 20 },
  { id: 'color-wand', label: 'Color Wand', quantity: 20 },
  { id: 'shuffle', label: 'Shuffle', quantity: 20 },
  { id: 'tile-breaker', label: 'Tile Breaker', quantity: 20 },
];

export const useInventoryStore = defineStore('inventory', {
  state: () => ({
    quickAccessSlots: DEFAULT_SLOTS,
    inventoryOpen: false,
  }),
  actions: {
    async usePowerUp(id) {
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
      let consumeImmediately = true;

      try {
        switch (id) {
          case 'clear-row':
            powerUpExecuted = await gameStore.activateOneTimeBonus('clear_row');
            break;
          case 'shuffle':
            {
              const result = await gameStore.shuffleBoard();
              powerUpExecuted = result !== false;
            }
            break;
          case 'hammer':
          case 'color-wand':
          case 'tile-breaker':
            // Map inventory IDs to internal bonus names
            const bonusModeMap = {
              'hammer': 'hammer',
              'color-wand': 'color_wand',
              'tile-breaker': 'tile_breaker'
            };
            powerUpExecuted = gameStore.setBonusMode(bonusModeMap[id]);
            consumeImmediately = false; // Will be consumed upon successful board interaction
            break;
          default:
            console.warn(`Power-up ${id} not implemented.`);
        }
      } catch (error) {
        console.error(`Failed to execute power-up ${id}`, error);
        throw error;
      }

      if (powerUpExecuted && consumeImmediately) {
        slot.quantity -= 1;
        return true;
      }

      return powerUpExecuted;
    },
    consumeItem(id) {
      // Map internal bonus names back to inventory IDs if needed, or assume they match for now
      // The gameStore passes the internal bonus mode name (e.g., 'color_wand')
      // We need to map 'color_wand' -> 'color-wand', 'tile_breaker' -> 'tile-breaker'
      const modeToIdMap = {
        'hammer': 'hammer',
        'color_wand': 'color-wand',
        'tile_breaker': 'tile-breaker'
      };

      const inventoryId = modeToIdMap[id] || id;
      const slot = this.quickAccessSlots.find((entry) => entry.id === inventoryId);

      if (slot && slot.quantity > 0) {
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
