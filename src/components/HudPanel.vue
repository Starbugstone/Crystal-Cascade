<template>
  <section class="hud-panel" aria-label="Level progress">
    <div class="score-card">
      <span class="eyebrow">YOUR BRILLIANCE</span>
      <div class="score-value" :class="{ 'score-flash': game.scorePenaltyFlash }" :key="game.score">
        {{ game.score.toLocaleString() }}<span>pts</span>
      </div>
      <div class="score-stars" aria-label="Chest score progress">
        <span>✧</span>
        <div class="score-track">
          <i :style="{ width: `${Math.min(100, (game.score / target) * 100)}%` }"></i>
        </div>
        <span>✦</span><small>{{ target.toLocaleString() }}</small>
      </div>
      <div class="chest-progress" :class="{ qualified: tier }">
        <span>{{ tier ? 'Score chest earned' : 'Score chest' }}</span>
        <small>{{
          tier ? '1 bonus on completion' : `${target.toLocaleString()} pts · 1 bonus`
        }}</small>
      </div>
    </div>
    <div class="stats-row">
      <div>
        <span class="eyebrow">SPEED RUN</span
        ><strong class="run-time" :class="{ expired: game.elapsedMs > game.speedTargetMs }">{{
          formatTime(game.elapsedMs)
        }}</strong
        ><small class="speed-target">{{
          speedTier ? `≤ ${formatTime(game.speedTargetMs)} · 1 bonus` : 'Finish for score'
        }}</small>
      </div>
      <div>
        <span class="eyebrow">BEST CASCADE</span
        ><strong class="cascade-value">×{{ game.maxCascade }}</strong>
      </div>
    </div>
    <div class="objective">
      <div class="objective-title">
        <span><GameIcon name="spark" /> {{ game.layerLabel }}</span
        ><strong
          >{{ game.totalLayers - game.remainingLayers
          }}<small> / {{ game.totalLayers }}</small></strong
        >
      </div>
      <div
        class="objective-track"
        role="progressbar"
        :aria-label="`${game.layerLabel} layers cleared`"
        :aria-valuenow="game.totalLayers - game.remainingLayers"
        :aria-valuemax="game.totalLayers"
        :aria-valuemin="0"
      >
        <i :style="{ width: `${progress}%` }"></i>
      </div>
      <div v-if="game.totalRelics" class="objective-title relic-objective">
        <span><img src="/art/relic.svg" alt="" /> Relics collected</span>
        <strong
          >{{ game.totalRelics - game.remainingRelics
          }}<small> / {{ game.totalRelics }}</small></strong
        >
      </div>
      <p>Two ways to win: score high and finish fast. Speed pauses during cascades.</p>
    </div>
  </section>
</template>
<script setup>
import { computed } from 'vue';
import { useGameStore } from '../stores/gameStore';
import GameIcon from './GameIcon.vue';
import { getChestTier, getSpeedChestTier, formatTime } from '../data/campaign';
const game = useGameStore();
const target = computed(() => game.objectives.find((o) => o.type === 'score')?.target ?? 1);
const tier = computed(() => getChestTier(game.score, target.value));
const speedTier = computed(() =>
  getSpeedChestTier(Math.max(1, game.elapsedMs), game.speedTargetMs),
);
const progress = computed(() =>
  game.totalLayers ? ((game.totalLayers - game.remainingLayers) / game.totalLayers) * 100 : 0,
);
</script>
<style scoped>
.relic-objective {
  margin-top: 14px;
}
.relic-objective img {
  width: 22px;
  height: 22px;
}
</style>
