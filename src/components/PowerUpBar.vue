<template>
  <section class="powerup-bar" :class="{ 'powerup-bar--compact': compact }">
    <button
      v-for="item in quickAccess"
      :key="item.id"
      :class="['powerup-button', { 
        'powerup-button--glow': glowingId === item.id, 
        'powerup-button--disabled': item.disabled,
        'powerup-button--compact': compact
      }]"
      :disabled="!item.quantity || item.disabled"
      :title="item.label"
      @click="handleUse(item.id)"
    >
      <span v-if="compact" class="powerup-icon">{{ iconMap[item.id] || '⚡' }}</span>
      <span v-else class="powerup-name">{{ item.label }}</span>
      <span class="powerup-qty">{{ item.quantity }}</span>
    </button>
    <button 
      class="inventory-button" 
      :class="{ 'inventory-button--compact': compact }"
      @click="inventoryStore.openInventory"
      :title="compact ? 'Inventory' : ''"
    >
      {{ compact ? '🎒' : 'Inventory' }}
    </button>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue';
import { useInventoryStore } from '../stores/inventoryStore';

const props = defineProps({
  compact: {
    type: Boolean,
    default: false,
  },
});

const inventoryStore = useInventoryStore();
const glowingId = ref(null);
const glowTimer = ref(null);

const iconMap = {
  'swap-extra': '⇄',
  'hammer': '🔨',
  'color-wand': '🪄',
  'shuffle': '🔀',
  'tile-breaker': '⛏️',
};

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

.powerup-bar--compact {
  flex-direction: column;
  gap: 0.5rem;
}

.powerup-button--compact,
.inventory-button--compact {
  min-width: 0;
  width: 48px;
  height: 48px;
  padding: 0;
  justify-content: center;
  border-radius: 12px;
}

.powerup-button--compact .powerup-qty {
  position: absolute;
  bottom: -4px;
  right: -4px;
  background: var(--color-accent, #3b82f6);
  color: white;
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 999px;
  border: 2px solid rgba(30, 41, 59, 1);
}

.powerup-icon {
  font-size: 1.25rem;
}

.inventory-button--compact {
  flex: 0 0 auto;
}
</style>
