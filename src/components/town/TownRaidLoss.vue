<template>
  <aside
    class="town-raid-loss"
    :class="{ 'still-loss': reducedMotion }"
    role="status"
    aria-live="polite"
    aria-atomic="true"
  >
    <button
      class="raid-loss-close"
      :aria-label="t('Close coin loss notice')"
      @click="$emit('close')"
    >
      ×
    </button>
    <div class="raid-loss-coins" aria-hidden="true">
      <TownIcon
        v-for="i in 10"
        :key="i"
        name="coin"
        :style="{ '--drift': `${(i - 5.5) * 25}px`, '--delay': `${(i % 4) * 70}ms` }"
      />
    </div>
    <strong class="raid-loss-amount" aria-hidden="true"
      ><TownIcon name="coin" />−{{ number(coins) }}</strong
    >
    <h2>{{ t('Bandits stole {coins} coins!', { coins: number(coins) }) }}</h2>
    <p>{{ t('Build and upgrade the sheriff’s department and bank to protect your savings.') }}</p>
  </aside>
</template>
<script setup>
import { onMounted, onBeforeUnmount } from 'vue';
import { t, number } from '../../i18n';
import TownIcon from './TownIcon.vue';
defineProps({ coins: { type: Number, required: true }, reducedMotion: Boolean });
const emit = defineEmits(['close']);
let timeout;
onMounted(() => {
  timeout = setTimeout(() => emit('close'), 7000);
});
onBeforeUnmount(() => clearTimeout(timeout));
</script>
<style scoped>
.town-raid-loss {
  position: absolute;
  z-index: 7;
  left: 50%;
  top: 42%;
  transform: translate(-50%, -50%);
  width: min(360px, calc(100% - 32px));
  padding: 20px 24px;
  border: 2px solid #edb965;
  border-radius: 18px;
  background: #542e29f5;
  color: #fff0cf;
  text-align: center;
  box-shadow: 0 8px 30px #382b3544;
}
.raid-loss-close {
  position: absolute;
  right: 2px;
  top: 2px;
  width: 40px;
  height: 40px;
  border: 0;
  background: transparent;
  color: #fff0cf;
  font-size: 24px;
}
.raid-loss-amount {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  color: #ffce74;
  font:
    900 52px/1.15 'Outfit',
    sans-serif;
  text-shadow: 0 3px #8a392b;
  animation: loss-impact 500ms ease-out both;
}
.raid-loss-amount svg {
  width: 34px;
  height: 34px;
}
.town-raid-loss h2 {
  margin: 10px 0 8px;
  font-size: 18px;
  color: #ffe7c0;
}
.town-raid-loss p {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
}
.raid-loss-coins {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: inherit;
  pointer-events: none;
}
.raid-loss-coins svg {
  position: absolute;
  top: 30px;
  left: calc(50% - 10px);
  width: 20px;
  height: 20px;
  color: #ffd05c;
  opacity: 0;
  animation: loss-coins 1100ms var(--delay) ease-in both;
}
.still-loss .raid-loss-coins {
  display: none;
}
.still-loss .raid-loss-amount {
  animation: none;
}
@keyframes loss-impact {
  from {
    transform: scale(1.4);
    opacity: 0;
  }
  45% {
    transform: scale(0.94);
    opacity: 1;
  }
  to {
    transform: scale(1);
  }
}
@keyframes loss-coins {
  15% {
    opacity: 1;
  }
  to {
    opacity: 0;
    transform: translate(var(--drift), 150px) rotate(160deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .raid-loss-coins {
    display: none;
  }
  .raid-loss-amount {
    animation: none;
  }
}
</style>
