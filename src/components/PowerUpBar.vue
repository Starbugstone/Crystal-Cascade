<template>
  <section class="powerup-bar">
    <button
      v-for="item in quickAccess"
      :key="item.id"
      :class="['powerup-button', { 'powerup-button--glow': glowingId === item.id, 'powerup-button--disabled': item.disabled }]"
      :disabled="!item.quantity || item.disabled"
      @click="handleUse(item.id)"
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
import { computed, onBeforeUnmount, ref } from 'vue';
import { useInventoryStore } from '../stores/inventoryStore';

const inventoryStore = useInventoryStore();
const glowingId = ref(null);
const glowTimer = ref(null);

const quickAccess = computed(() => inventoryStore.quickAccessSlots);

const triggerGlow = (id) => {
  glowingId.value = id;
  if (glowTimer.value) {
    clearTimeout(glowTimer.value);
  }
  glowTimer.value = setTimeout(() => {
    glowingId.value = null;
    glowTimer.value = null;
  }, 500);
};

const handleUse = (id) => {
  const executed = inventoryStore.usePowerUp(id);
  if (executed && id === 'swap-extra') {
    triggerGlow(id);
  }
};

onBeforeUnmount(() => {
  if (glowTimer.value) {
    clearTimeout(glowTimer.value);
  }
});
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
  position: relative;
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

.powerup-button--disabled {
  border-style: dashed;
}

.powerup-button--glow {
  box-shadow: 0 0 0.8rem 0.15rem rgba(96, 165, 250, 0.8), 0 0 18px rgba(59, 130, 246, 0.45);
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.9), rgba(236, 72, 153, 0.7));
  color: #fff;
}

.inventory-button {
  flex: 1;
  justify-content: center;
  border-style: dashed;
}
</style>
