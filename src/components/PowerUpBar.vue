<template>
  <section class="powerup-section" aria-label="Power-ups">
    <div class="powerup-heading">
      <span class="eyebrow">A LITTLE EXTRA MAGIC</span><span>POWER-UPS</span>
    </div>
    <div class="powerup-bar">
      <button
        v-for="item in inventory.quickAccessSlots"
        :key="item.id"
        :data-power-id="item.id"
        class="powerup-button"
        :class="{ active: activeId === item.id }"
        :disabled="
          !item.quantity ||
          !game.sessionActive ||
          game.levelCleared ||
          game.inputPaused ||
          (game.animationInProgress && ['shuffle', 'clear-row'].includes(item.id))
        "
        :aria-pressed="activeId === item.id"
        :aria-label="`${item.label}, ${item.quantity} remaining. ${descriptions[item.id]}`"
        :title="descriptions[item.id]"
        @click="inventory.usePowerUp(item.id)"
      >
        <span class="powerup-art"
          ><img :src="`/art/powers/${item.id}.svg`" alt="" /><span class="powerup-qty">{{
            item.quantity
          }}</span></span
        ><span class="powerup-name">{{ item.label }}</span>
      </button>
    </div>
  </section>
</template>
<script setup>
import { computed } from 'vue';
import { useGameStore } from '../stores/gameStore';
import { useInventoryStore } from '../stores/inventoryStore';
const inventory = useInventoryStore();
const game = useGameStore();
const activeId = computed(() => game.activeBonusMode?.replaceAll('_', '-'));
const descriptions = {
  'clear-row': 'Clear a random row.',
  hammer: 'Shatter a 3 by 3 area around the chosen gem.',
  'color-wand': 'Clear every gem of the chosen color.',
  shuffle: 'Mix the board for new possibilities.',
  'tile-breaker': 'Clear a row and column through your chosen gem.',
};
</script>
