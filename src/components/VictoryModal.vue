<template>
  <dialog ref="dialog" class="victory-modal" @cancel.prevent="$emit('menu')">
    <div class="victory-confetti" aria-hidden="true">
      <i
        v-for="i in 24"
        :key="i"
        :style="{
          '--i': i,
          left: `${(i * 37) % 100}%`,
          background: ['#eaca96', '#bf8ff0', '#88dfcd'][i % 3],
        }"
      ></i>
    </div>
    <span class="eyebrow">A LITTLE MOMENT OF BRILLIANCE</span>
    <div class="victory-stars" :aria-label="`${earnedStars} of 3 stars`">
      <span
        v-for="i in 3"
        :key="i"
        :class="{ earned: i <= earnedStars }"
        :style="{ animationDelay: `${i * 100}ms` }"
        >✦</span
      >
    </div>
    <h2>Beautifully done.</h2>
    <p class="victory-subtitle">Every crystal cleared. Every match a little magic.</p>
    <div class="victory-score">
      <span class="eyebrow">FINAL SCORE</span><strong>{{ score.toLocaleString() }}</strong>
    </div>
    <div class="victory-stats">
      <div>
        <span class="eyebrow">MOVES</span><strong>{{ moves }}</strong>
      </div>
      <div>
        <span class="eyebrow">BEST CASCADE</span><strong>×{{ maxCombo }}</strong>
      </div>
    </div>
    <p class="star-rules">
      Clear the board · Reach {{ scoreTarget.toLocaleString() }} pts · Cascade ×4 or score 135% of
      target
    </p>
    <button v-if="hasNextLevel" class="victory-next" @click="$emit('next')">
      One more little adventure <GameIcon name="arrow" />
    </button>
    <div class="victory-actions">
      <button class="text-button" @click="$emit('menu')">The collection</button
      ><button class="text-button" @click="$emit('replay')">Play again</button>
    </div>
  </dialog>
</template>
<script setup>
import { computed, onMounted, ref } from 'vue';
import GameIcon from './GameIcon.vue';
const props = defineProps({
  score: { type: Number, default: 0 },
  moves: { type: Number, default: 0 },
  maxCombo: { type: Number, default: 1 },
  scoreTarget: { type: Number, default: 0 },
  hasNextLevel: Boolean,
});
defineEmits(['menu', 'replay', 'next']);
const dialog = ref(null);
onMounted(() => dialog.value.showModal());
const earnedStars = computed(() =>
  Math.min(
    3,
    1 +
      Number(props.scoreTarget > 0 && props.score >= props.scoreTarget) +
      Number(
        props.maxCombo >= 4 || (props.scoreTarget > 0 && props.score >= props.scoreTarget * 1.35),
      ),
  ),
);
</script>
<style scoped>
.victory-modal {
  width: min(460px, calc(100vw - 32px));
  padding: 36px;
  max-height: calc(100dvh - 32px);
  border: 1px solid #9870b5;
  border-radius: 22px;
  background: radial-gradient(circle at 50% 15%, #65418066, transparent 60%), #21172e;
  color: #f3e7ff;
  text-align: center;
  box-shadow: 0 24px 100px #09050f;
  overflow-x: hidden;
}
.victory-modal::backdrop {
  background: #0d081bcc;
  backdrop-filter: blur(5px);
}
.victory-modal > :not(.victory-confetti) {
  position: relative;
}
.victory-stars {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  margin: 22px 0 18px;
  font-size: 50px;
  color: #57445f;
}
.victory-stars .earned {
  color: #f5d79b;
  text-shadow: 0 0 24px #dea85655;
  animation: star-in 400ms ease-out both;
}
.victory-stars > :nth-child(2) {
  font-size: 66px;
}
h2 {
  font-family: var(--font-heading);
  font-size: 37px;
  font-weight: 400;
}
.victory-subtitle {
  color: #bba5cb;
  font-size: 11px;
  line-height: 1.8;
  margin-top: 13px;
}
.victory-score {
  margin: 26px 0 17px;
}
.victory-score strong {
  display: block;
  font-size: 49px;
  font-family: var(--font-heading);
  font-weight: 400;
  margin-top: 8px;
}
.victory-stats {
  display: flex;
  justify-content: space-around;
  padding: 19px 0;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}
.victory-stats strong {
  display: block;
  font-weight: 400;
  font-size: 26px;
  font-family: var(--font-heading);
  margin-top: 8px;
}
.star-rules {
  font-size: 9px;
  line-height: 1.8;
  color: #a995bb;
  margin: 16px 0 24px;
}
.victory-next {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  background: linear-gradient(120deg, #e6c69a, #f3dcba);
  border: 0;
  border-radius: 9px;
  padding: 14px 17px;
  color: #33223f;
  font-size: 12px;
}
.victory-actions {
  display: flex;
  justify-content: center;
  gap: 35px;
  margin-top: 24px;
}
.victory-confetti {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}
.victory-confetti i {
  position: absolute;
  top: -20px;
  width: 5px;
  height: 9px;
  animation: confetti 1.6s calc(var(--i) * 35ms) ease-out both;
}
@keyframes star-in {
  from {
    opacity: 0;
    transform: scale(0.6) rotate(-15deg);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
@keyframes confetti {
  from {
    transform: translateY(-20px) rotate(0);
    opacity: 1;
  }
  to {
    transform: translateY(500px) rotate(400deg);
    opacity: 0;
  }
}
@media (max-width: 420px) {
  .victory-modal {
    padding: 28px 23px;
  }
  h2 {
    font-size: 31px;
  }
}
</style>
