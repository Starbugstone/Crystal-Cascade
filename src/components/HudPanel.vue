<template>
  <section class="hud-panel" aria-label="Level progress">
    <div class="score-card">
      <span class="eyebrow">YOUR BRILLIANCE</span>
      <div class="score-value" :class="{ 'score-flash': game.scorePenaltyFlash }" :key="game.score">
        {{ game.score.toLocaleString() }}<span>pts</span>
      </div>
      <div class="score-stars" aria-label="Score star target">
        <span>✦</span>
        <div class="score-track">
          <i :style="{ width: `${Math.min(100, (game.score / target) * 100)}%` }"></i>
        </div>
        <span>✦</span><small>{{ target.toLocaleString() }}</small>
      </div>
    </div>
    <div class="stats-row">
      <div>
        <span class="eyebrow">MOVES</span
        ><strong>{{ game.moves.toString().padStart(2, '0') }}</strong>
      </div>
      <div>
        <span class="eyebrow">BEST CASCADE</span
        ><strong class="cascade-value">×{{ game.maxCascade }}</strong>
      </div>
    </div>
    <div class="objective">
      <div class="objective-title">
        <span><GameIcon name="spark" /> Break the ice</span
        ><strong
          >{{ game.totalLayers - game.remainingLayers
          }}<small> / {{ game.totalLayers }}</small></strong
        >
      </div>
      <div
        class="objective-track"
        role="progressbar"
        aria-label="Ice layers cleared"
        :aria-valuenow="game.totalLayers - game.remainingLayers"
        :aria-valuemax="game.totalLayers"
        :aria-valuemin="0"
      >
        <i :style="{ width: `${progress}%` }"></i>
      </div>
      <p>Shatter every ice layer to complete the chapter.</p>
    </div>
  </section>
</template>
<script setup>
import { computed } from 'vue';
import { useGameStore } from '../stores/gameStore';
import GameIcon from './GameIcon.vue';
const game = useGameStore();
const target = computed(() => game.objectives.find((o) => o.type === 'score')?.target ?? 1);
const progress = computed(() =>
  game.totalLayers ? ((game.totalLayers - game.remainingLayers) / game.totalLayers) * 100 : 0,
);
</script>
