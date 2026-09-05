<template>
  <section class="collection" aria-labelledby="collection-title">
    <div class="collection-heading">
      <div>
        <span class="eyebrow">YOUR NEXT LITTLE ADVENTURE</span>
        <h2 id="collection-title">The collection<span>01 — 12</span></h2>
      </div>
      <GameIcon name="spark" />
    </div>
    <button class="featured-level" @click="$emit('start-level', 1)">
      <div class="featured-art"><img src="/art/emerald.svg" alt="" /><span>✦</span></div>
      <div>
        <span class="eyebrow">BEGIN THE JOURNEY</span>
        <h3>First light</h3>
        <p>Every cascade starts with a spark.</p>
        <span class="featured-play">Let's play <GameIcon name="arrow" /></span>
      </div>
    </button>
    <div class="level-grid">
      <button
        v-for="level in levels"
        :key="level.id"
        class="level-button"
        @click="$emit('start-level', level.id)"
        :aria-label="`Play level ${level.id}: ${names[level.id - 1]}`"
      >
        <span class="level-number">{{ String(level.id).padStart(2, '0') }}</span
        ><img :src="`/art/${gems[(level.id - 1) % gems.length]}.svg`" alt="" /><span
          class="level-name"
          >{{ names[level.id - 1] }}</span
        ><span class="level-dots" aria-hidden="true">✧ ✧ ✧</span>
      </button>
    </div>
    <p class="collection-note">
      <span>✧</span> Twelve chapters of color. Play any chapter, any time.
    </p>
  </section>
</template>
<script setup>
import { computed } from 'vue';
import { useGameStore } from '../stores/gameStore';
import { LEVEL_NAMES as names } from '../data/levelNames';
import GameIcon from './GameIcon.vue';
defineEmits(['start-level']);
const game = useGameStore();
const levels = computed(() => game.availableLevels);
const gems = ['emerald', 'sapphire', 'topaz', 'amethyst', 'ruby', 'moonstone'];
</script>
