<template>
  <aside
    class="town-coin-collection"
    :class="{ still: reducedMotion }"
    role="status"
    aria-live="polite"
  >
    <div class="collection-coins" aria-hidden="true">
      <TownIcon
        v-for="i in 10"
        :key="i"
        name="coin"
        :style="{ '--drift': `${(i - 5.5) * 22}px`, '--delay': `${(i % 5) * 100}ms` }"
      />
    </div>
    <strong aria-hidden="true"><TownIcon name="coin" />+{{ number(coins) }}</strong>
    <span>{{ t('Collected {coins} coins from the saloon!', { coins: number(coins) }) }}</span>
    <small>{{ t('Tap the saloon again to view or upgrade it.') }}</small>
  </aside>
</template>
<script setup>
import { onMounted, onBeforeUnmount } from 'vue';
import { t, number } from '../../i18n';
import TownIcon from './TownIcon.vue';
const props = defineProps({ coins: { type: Number, required: true }, reducedMotion: Boolean });
const emit = defineEmits(['coin', 'close']);
const timers = [];
onMounted(() => {
  emit('coin', 0);
  for (let i = 1; i < Math.min(5, props.coins); i++)
    timers.push(setTimeout(() => emit('coin', i), i * 110));
  timers.push(setTimeout(() => emit('close'), 2600));
});
onBeforeUnmount(() => timers.forEach(clearTimeout));
</script>
<style scoped>
.town-coin-collection {
  position: absolute;
  z-index: 7;
  left: 50%;
  top: 42%;
  transform: translate(-50%, -50%);
  width: min(330px, calc(100% - 32px));
  padding: 20px;
  border: 2px solid #d6ae4e;
  border-radius: 18px;
  background: #fff4d7f5;
  color: #65502b;
  text-align: center;
  box-shadow: 0 8px 30px #382b3533;
  pointer-events: none;
}
strong {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #ad7818;
  font:
    900 52px/1.2 'Outfit',
    sans-serif;
  animation: coin-pop 450ms ease-out both;
}
strong svg {
  width: 34px;
  height: 34px;
}
span,
small {
  display: block;
  margin-top: 8px;
}
small {
  font-size: 12px;
}
.collection-coins {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: inherit;
}
.collection-coins svg {
  position: absolute;
  left: calc(50% - 10px);
  bottom: 20px;
  width: 20px;
  height: 20px;
  color: #daa92b;
  opacity: 0;
  animation: coins-rise 1100ms var(--delay) ease-out both;
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
    transform: scale(0.6);
  }
  65% {
    transform: scale(1.15);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
@keyframes coins-rise {
  20% {
    opacity: 1;
  }
  to {
    opacity: 0;
    transform: translate(var(--drift), -160px) rotate(180deg);
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
