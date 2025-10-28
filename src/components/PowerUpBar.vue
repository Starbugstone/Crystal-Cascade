<template>
  <section class="powerup-bar">
    <button
      v-for="item in quickAccess"
      :key="item.id"
      class="powerup-button"
      :disabled="!item.quantity"
      @click="inventoryStore.usePowerUp(item.id)"
    >
      <span class="powerup-name">{{ item.label }}</span>
      <span class="powerup-qty">{{ item.quantity }}</span>
    </button>
    <button class="inventory-button" @click="inventoryStore.openInventory">
      Inventory
    </button>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import { useInventoryStore } from '../stores/inventoryStore';

const inventoryStore = useInventoryStore();

const quickAccess = computed(() => inventoryStore.quickAccessSlots);
</script>

<style scoped>
.powerup-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.powerup-button,
.inventory-button {
  min-width: 120px;
  padding: 0.75rem 1rem;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: rgba(30, 41, 59, 0.8);
  color: var(--color-foreground);
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  transition: transform 150ms ease, background 150ms ease;
}

.powerup-button:hover:not(:disabled),
.inventory-button:hover {
  transform: translateY(-2px);
  background: rgba(79, 70, 229, 0.7);
}

.powerup-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.inventory-button {
  flex: 1;
  justify-content: center;
  border-style: dashed;
}
</style>
