<template>
  <section class="powerup-bar" :class="{ 'powerup-bar--compact': compact }">
    <button
      v-for="item in quickAccess"
      :key="item.id"
      :class="['powerup-button', { 
        'powerup-button--glow': glowingId === item.id || activeBonusId === item.id, 
        'powerup-button--disabled': item.disabled || !item.quantity,
        'powerup-button--compact': compact
      }]"
      :disabled="!item.quantity || item.disabled"
      :title="item.label"
      @click="handleUse(item.id)"
    >
      <img 
        v-if="compact" 
        :src="iconMap[item.id]" 
        :alt="item.label" 
        class="powerup-icon"
      />
      <template v-else>
        <img :src="iconMap[item.id]" :alt="item.label" class="powerup-icon-inline" />
        <span class="powerup-name">{{ item.label }}</span>
      </template>
      <span class="powerup-qty">{{ item.quantity }}</span>
    </button>

  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useGameStore } from '../stores/gameStore';
import { useInventoryStore } from '../stores/inventoryStore';

const props = defineProps({
  compact: {
    type: Boolean,
    default: false,
  },
});

const inventoryStore = useInventoryStore();
const gameStore = useGameStore();
const { activeBonusMode } = storeToRefs(gameStore);
const glowingId = ref(null);
const glowTimer = ref(null);

const iconMap = {
  'clear-row': '/sprite/powers/clear-row.png',
  'hammer': '/sprite/powers/hammer.png',
  'color-wand': '/sprite/powers/color-wand.png',
  'shuffle': '/sprite/powers/shuffle.png',
  'tile-breaker': '/sprite/powers/tile-breaker.png',
};

const quickAccess = computed(() => inventoryStore.quickAccessSlots);
const activeBonusId = computed(() => {
  const modeToIdMap = {
    hammer: 'hammer',
    color_wand: 'color-wand',
    tile_breaker: 'tile-breaker',
  };
  return modeToIdMap[activeBonusMode.value] ?? null;
});

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

const handleUse = async (id) => {
  const executed = await inventoryStore.usePowerUp(id);
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

.powerup-button {
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

.powerup-button:hover:not(:disabled) {
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



.powerup-bar--compact {
  flex-direction: column;
  gap: 0.5rem;
}

.powerup-button--compact {
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
  width: 28px;
  height: 28px;
  object-fit: contain;
}

.powerup-icon-inline {
  width: 24px;
  height: 24px;
  object-fit: contain;
  flex-shrink: 0;
}


</style>
