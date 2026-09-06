<template>
  <aside
    class="town-coin-collection"
    :class="{ still: reducedMotion }"
    :style="{ left: `${origin.x}%`, top: `${origin.y}%` }"
    role="status"
    aria-live="polite"
  >
    <div class="collection-coins" aria-hidden="true">
      <TownIcon
        v-for="i in 10"
        :key="i"
        name="coin"
        :style="{ '--drift': `${(i - 5.5) * 9}px`, '--delay': `${(i % 5) * 45}ms` }"
      />
    </div>
    <strong aria-hidden="true"><TownIcon name="coin" />+{{ number(coins) }}</strong>
    <span class="town-sr-only">{{
      t('Collected {coins} coins from the saloon!', { coins: number(coins) })
    }}</span>
  </aside>
</template>
<script setup>
import { onMounted, onBeforeUnmount } from 'vue';
import { t, number } from '../../i18n';
import TownIcon from './TownIcon.vue';
const props = defineProps({
  coins: { type: Number, required: true },
  reducedMotion: Boolean,
  origin: { type: Object, default: () => ({ x: 50, y: 50 }) },
});
const emit = defineEmits(['coin', 'close']);
const timers = [];
onMounted(() => {
  emit('coin', 0);
  for (let i = 1; i < Math.min(5, props.coins); i++)
    timers.push(setTimeout(() => emit('coin', i), i * 110));
  timers.push(setTimeout(() => emit('close'), 1100));
});
onBeforeUnmount(() => timers.forEach(clearTimeout));
</script>
<style scoped>
.town-coin-collection {
  position: absolute;
  z-index: 7;
  transform: translate(-50%, -100%);
  color: #ffe28a;
  pointer-events: none;
}
strong {
  display: flex;
  align-items: center;
  gap: 4px;
  font:
    900 24px/1.2 'Outfit',
    sans-serif;
  text-shadow:
    0 2px 3px #533812,
    0 0 5px #533812;
  animation: coin-pop 1100ms ease-out both;
}
strong svg {
  width: 22px;
  height: 22px;
}
.collection-coins {
  position: absolute;
  inset: 0;
}
.collection-coins svg {
  position: absolute;
  left: calc(50% - 9px);
  bottom: 0;
  width: 18px;
  height: 18px;
  color: #ffd04e;
  filter: drop-shadow(0 1px 1px #735019);
  opacity: 0;
  animation: coins-rise 850ms var(--delay) ease-out both;
}
.still strong {
  animation: none;
}
.still .collection-coins {
  display: none;
}
@keyframes coin-pop {
  from {
    opacity: 0;
    transform: translateY(0) scale(0.8);
  }
  20% {
    opacity: 1;
  }
  70% {
    opacity: 1;
  }
  to {
    opacity: 0;
    transform: translateY(-55px);
  }
}
@keyframes coins-rise {
  20% {
    opacity: 1;
  }
  to {
    opacity: 0;
    transform: translate(var(--drift), -100px) rotate(140deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  strong {
    animation: none;
  }
  .collection-coins {
    display: none;
  }
}
</style>
