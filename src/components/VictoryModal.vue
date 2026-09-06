<template>
  <dialog
    ref="dialog"
    class="arcade-victory"
    :class="{ 'showing-chest': showingChest }"
    :aria-label="t(showingChest ? 'Bonus chest reward' : 'Level results')"
    @cancel.prevent="showingChest ? showResults() : $emit('menu')"
  >
    <RewardChest
      v-if="showingChest"
      :key="chestIndex"
      :reward="rewards[chestIndex]"
      :chest-index="chestIndex"
      :total-chests="rewards.length"
      @claimed="claimReward(chestIndex, $event)"
      @continue="nextChest"
      @skip="showResults"
    />
    <section v-else class="arcade-results" aria-labelledby="victory-title">
      <span class="arcade-kicker">
        {{ t('RUN COMPLETE ·') }}
        {{
          t(
            rewards.length
              ? t('{value0} {value1} EARNED', {
                  value0: rewards.length,
                  value1: t(rewards.length === 1 ? 'CHEST' : 'CHESTS'),
                })
              : 'KEEP THE CASCADE GOING',
          )
        }}</span
      >
      <div class="victory-stars" :aria-label="t('{value0} of 3 stars', { value0: t(earnedStars) })">
        <span v-for="i in 3" :key="i" :class="{ earned: i <= earnedStars }">✦</span>
      </div>
      <h2 id="victory-title" tabindex="-1" autofocus>{{ t('LEVEL CLEAR!') }}</h2>
      <div class="result-score">
        {{ number(score) }}<small> {{ t('POINTS') }} </small>
      </div>
      <CoinReward
        :coins="coins"
        :jewels="jewels"
        :bonus-gems="bonusGems"
        :combo-counts="comboCounts"
        :multi-match-counts="multiMatchCounts"
      />
      <div
        v-for="project in construction"
        :key="project.id"
        class="town-construction-reward"
        role="status"
      >
        <strong>{{
          t(
            project.ready
              ? 'Ready · Tap the building in your village to finish'
              : 'Your building is taking shape',
          )
        }}</strong>
        <span
          >{{ t(BUILDING_BY_ID[project.id].shortName) }} · {{ project.wins }}/{{
            project.required
          }}</span
        >
      </div>
      <div class="result-stats">
        <div>
          <span> {{ t('ACTIVE TIME') }} </span><strong>{{ formatTime(elapsedMs) }}</strong>
        </div>
        <div>
          <span> {{ t('MOVES') }} </span><strong>{{ moves }}</strong>
        </div>
        <div>
          <span> {{ t('BEST CASCADE') }} </span><strong>×{{ maxCombo }}</strong>
        </div>
      </div>
      <div class="result-goals">
        <div
          v-for="source in ['score', 'speed']"
          :key="source"
          :class="{ earned: rewards.some((r) => r.source === source) }"
        >
          <b>{{ t(source === 'score' ? '✦' : 'ϟ') }}</b
          ><span
            ><strong>{{ t(source === 'score' ? 'SCORE CHEST' : 'SPEED CHEST') }}</strong
            ><small>{{ t(goalText(source)) }}</small></span
          ><span class="goal-check">{{
            t(rewards.some((r) => r.source === source) ? '✓' : '—')
          }}</span>
        </div>
      </div>
      <p class="result-note">
        {{
          t(
            rewards.length
              ? 'Your rewards are saved. Return to the village to see what’s new.'
              : 'Visit the museum to replay completed levels and improve your score.',
          )
        }}
      </p>
      <div class="result-destinations">
        <button v-if="canContinue" class="result-next" @click="$emit('next')">
          <GameIcon name="pickaxe" /> <span>{{ t('Continue mining') }}</span>
        </button>
        <button class="result-next result-village" @click="$emit('town')">
          <GameIcon name="home" /> <span>{{ t('Back to village') }}</span>
        </button>
      </div>
      <div class="victory-actions">
        <button v-if="canReplay" @click="$emit('replay')">{{ t('Play again') }}</button>
      </div>
    </section>
  </dialog>
</template>
<script setup>
import { t, number } from '../i18n';
import { BUILDING_BY_ID } from '../data/town';
import { computed, nextTick, onMounted, ref } from 'vue';
import GameIcon from './GameIcon.vue';
import RewardChest from './RewardChest.vue';
import CoinReward from './CoinReward.vue';
import { getStars, formatTime } from '../data/campaign';
const props = defineProps({
  score: { type: Number, default: 0 },
  moves: { type: Number, default: 0 },
  maxCombo: { type: Number, default: 1 },
  scoreTarget: { type: Number, default: 0 },
  elapsedMs: { type: Number, default: 0 },
  speedTargetMs: { type: Number, default: 0 },
  coins: { type: Number, default: 0 },
  jewels: { type: Number, default: 0 },
  bonusGems: { type: Number, default: 0 },
  comboCounts: { type: Object, default: () => ({}) },
  multiMatchCounts: { type: Object, default: () => ({}) },
  construction: { type: Array, default: () => [] },
  canReplay: Boolean,
  canContinue: Boolean,
  rewards: { type: Array, default: () => [] },
});
const emit = defineEmits(['menu', 'replay', 'next', 'town', 'claimed']);
import { useCampaignStore } from '../stores/campaignStore';
const campaign = useCampaignStore();
const claimReward = (index, reward) => emit('claimed', { index, reward });
const dialog = ref(null),
  chestIndex = ref(0),
  showingChest = ref(props.rewards.length > 0);
onMounted(() => {
  dialog.value.showModal();
  focusAction();
});
const focusAction = async () => {
  await nextTick();
  dialog.value
    .querySelector(
      '#victory-title, .chest-trigger, .arcade-button, .result-next, .victory-actions button',
    )
    ?.focus({ preventScroll: true });
  dialog.value.scrollTop = 0;
};
const showResults = () => {
  for (const settled of campaign.settlePendingChests()) {
    const index = props.rewards.findIndex((chest) => chest.id === settled.id);
    if (index >= 0 && settled.reward) claimReward(index, settled.reward);
  }
  showingChest.value = false;
  focusAction();
};
const nextChest = () => {
  if (chestIndex.value + 1 < props.rewards.length) {
    chestIndex.value++;
    focusAction();
  } else showResults();
};
const earnedStars = computed(() => getStars(props.score, props.scoreTarget, props.maxCombo));
const goalText = (source) => {
  const reward = props.rewards.find((r) => r.source === source);
  if (reward)
    return t('{chest} · +{quantity} {item}', {
      chest: t(reward.label),
      quantity: reward.items[0].quantity,
      item: t(reward.items[0].label),
    });
  return source === 'score'
    ? t('Target: {value0} points', { value0: number(props.scoreTarget) })
    : t('Target: {value0} active play', { value0: formatTime(props.speedTargetMs) });
};
</script>
<style scoped>
.result-destinations {
  display: grid;
  gap: 14px;
}
.town-construction-reward {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 10px;
  padding: 12px;
  border-radius: 8px;
  background: #6e927c25;
  color: #c2dac7;
  font-size: 12px;
  text-align: left;
}
.arcade-victory {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100dvh;
  max-width: none;
  max-height: none;
  margin: 0;
  padding: 0;
  border: 0;
  color: #fff2dc;
  background: radial-gradient(ellipse at 50% 25%, #6c2b7866, transparent 60%), #170b2b;
  overflow-y: auto;
  overscroll-behavior: contain;
}
.arcade-victory.showing-chest {
  overflow: hidden;
}
.arcade-victory::backdrop {
  background: #11081ef5;
}
.arcade-results {
  width: min(540px, 100%);
  min-height: 100%;
  margin: auto;
  padding: max(30px, env(safe-area-inset-top)) 24px max(24px, env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  justify-content: center;
  text-align: center;
}
.arcade-kicker {
  font-size: 10px;
  letter-spacing: 2px;
  color: #d1abd9;
  font-weight: 800;
}
.victory-stars {
  display: flex;
  justify-content: center;
  gap: 18px;
  font-size: 44px;
  color: #5b3b69;
  margin: 15px 0 10px;
}
.victory-stars .earned {
  color: #ffdc7d;
  text-shadow: 0 0 24px #ffbd6544;
}
.arcade-results h2 {
  font:
    italic 900 clamp(38px, 8vw, 64px)/1.1 Impact,
    'Arial Black',
    sans-serif;
  letter-spacing: 1px;
  text-shadow:
    3px 4px #a645b0,
    5px 7px #30113e;
}
.result-score {
  font:
    italic 900 64px/1 Impact,
    'Arial Black',
    sans-serif;
  color: #ffdf80;
  margin: 25px 0;
}
.result-score small {
  display: block;
  font:
    800 9px 'Trebuchet MS',
    sans-serif;
  color: #b393c7;
  letter-spacing: 3px;
  margin-top: 10px;
}
.result-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  padding: 19px 0;
  border-block: 1px solid #ac69c33b;
}
.result-stats span {
  font-size: 8px;
  letter-spacing: 1px;
  color: #bc9ed0;
}
.result-stats strong {
  display: block;
  font-size: 27px;
  margin-top: 8px;
}
.result-goals {
  display: grid;
  gap: 9px;
  margin-top: 20px;
  text-align: left;
}
.result-goals > div {
  display: flex;
  align-items: center;
  gap: 14px;
  border: 1px solid #725189;
  border-radius: 10px;
  padding: 15px;
  background: #281438;
}
.result-goals > .earned {
  border-color: #caa755;
  background: linear-gradient(100deg, #68502e44, #281438);
}
.result-goals b {
  font-size: 28px;
  color: #ffd87b;
}
.result-goals strong {
  display: block;
  font-size: 11px;
  letter-spacing: 1px;
}
.result-goals small {
  display: block;
  margin-top: 5px;
  font-size: 11px;
  color: #bfa4d0;
}
.goal-check {
  margin-left: auto;
  color: #ffdf87;
  font-size: 22px;
}
.result-note {
  font-size: 11px;
  line-height: 1.6;
  color: #b89cc9;
  margin: 18px 0;
}
.result-next {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 16px 20px;
  min-height: 52px;
  border: 1px solid #ffeaa1;
  border-radius: 8px;
  background: linear-gradient(#ffe89c, #ffc458);
  color: #321144;
  font-weight: 900;
  letter-spacing: 1px;
  box-shadow: 0 4px #926239;
}
.result-next.result-village {
  background: linear-gradient(#4d345f, #34213f);
  border-color: #9a79b2;
  color: #f1e4fa;
  box-shadow: 0 4px #24152f;
}
.result-next:hover {
  filter: brightness(1.08);
}
.result-next:active {
  transform: translateY(2px);
  box-shadow: 0 2px #24152f;
}
.result-next:focus-visible {
  outline: 3px solid #fff2bc;
  outline-offset: 4px;
}
.victory-actions {
  display: flex;
  justify-content: center;
  gap: 30px;
  margin-top: 18px;
}
.victory-actions button {
  background: transparent;
  border: 0;
  color: #d0b6e0;
  min-height: 44px;
  padding: 10px;
  font-size: 12px;
}
@media (max-height: 700px) {
  .arcade-results {
    padding-block: 20px;
  }
  .victory-stars {
    font-size: 30px;
    margin: 8px 0;
  }
  .arcade-results h2 {
    font-size: 38px;
  }
  .result-score {
    font-size: 44px;
    margin: 15px 0;
  }
  .result-stats {
    padding: 10px 0;
  }
  .result-stats strong {
    font-size: 22px;
    margin-top: 4px;
  }
  .result-goals {
    margin-top: 12px;
  }
  .result-goals > div {
    padding: 10px 12px;
  }
  .result-note {
    margin: 12px 0;
  }
  .victory-actions {
    margin-top: 10px;
  }
}
</style>
