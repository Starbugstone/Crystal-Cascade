<template>
  <section class="hud-panel" :aria-label="t('Level progress')">
    <div class="score-card">
      <span class="eyebrow"> {{ t('YOUR BRILLIANCE') }} </span>
      <div class="score-value" :class="{ 'score-flash': game.scorePenaltyFlash }" :key="game.score">
        {{ number(game.score) }}<span> {{ t('pts') }} </span>
      </div>
      <div class="score-stars" :aria-label="t('Chest score progress')">
        <span>✧</span>
        <div class="score-track">
          <i :style="{ width: `${Math.min(100, (game.score / target) * 100)}%` }"></i>
        </div>
        <span>✦</span><small>{{ number(target) }}</small>
      </div>
      <div class="chest-progress" :class="{ qualified: tier }">
        <span>{{ t(tier ? 'Score chest earned' : 'Score chest') }}</span>
        <small>{{
          t(
            tier
              ? '1 bonus on completion'
              : t('{value0} pts · 1 bonus', { value0: number(target) }),
          )
        }}</small>
      </div>
    </div>
    <div class="stats-row">
      <div>
        <span class="eyebrow"> {{ t('SPEED RUN') }} </span
        ><strong class="run-time" :class="{ expired: game.elapsedMs > game.speedTargetMs }">{{
          formatTime(game.elapsedMs)
        }}</strong
        ><small class="speed-target">{{
          t(
            speedTier
              ? t('≤ {value0} · 1 bonus', { value0: formatTime(game.speedTargetMs) })
              : 'Finish for score',
          )
        }}</small>
      </div>
      <div>
        <span class="eyebrow"> {{ t('BEST CASCADE') }} </span
        ><strong class="cascade-value">×{{ game.maxCascade }}</strong>
      </div>
    </div>
    <div class="objective">
      <div class="objective-title">
        <span><GameIcon name="spark" /> {{ t(game.layerLabel) }}</span
        ><strong
          >{{ game.totalLayers - game.remainingLayers
          }}<small> / {{ game.totalLayers }}</small></strong
        >
      </div>
      <div
        class="objective-track"
        role="progressbar"
        :aria-label="t('{value0} layers cleared', { value0: t(game.layerLabel) })"
        :aria-valuenow="game.totalLayers - game.remainingLayers"
        :aria-valuemax="game.totalLayers"
        :aria-valuemin="0"
      >
        <i :style="{ width: `${progress}%` }"></i>
      </div>
      <div v-if="game.totalRelics" class="objective-title relic-objective">
        <span><img src="/art/relic.svg" alt="" /> {{ t('Relics collected') }} </span>
        <strong
          >{{ game.totalRelics - game.remainingRelics
          }}<small> / {{ game.totalRelics }}</small></strong
        >
      </div>
      <p>{{ t('Two ways to win: score high and finish fast. Speed pauses during cascades.') }}</p>
    </div>
  </section>
</template>
<script setup>
import { t, number } from '../i18n';
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
