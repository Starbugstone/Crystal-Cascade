<template>
  <div class="arcade-announcer" role="status" aria-live="polite" aria-atomic="true">
    <svg
      v-if="banner"
      :key="banner.id"
      class="arcade-banner-art"
      :class="{
        'fusion-banner': banner.kind === 'fusion',
        'multi-match-banner': banner.kind === 'multi-match',
      }"
      viewBox="0 0 520 72"
      role="img"
      :aria-label="
        banner.kind === 'multi-match' ? `${t(banner.label)} ${multiMatchDetail}` : t(banner.label)
      "
      :style="{ '--banner-color': banner.color }"
    >
      <g class="banner-streaks" fill="var(--banner-color)">
        <path
          d="M0 21H60L56 26H12ZM14 42H53L49 47H0ZM463 18H520L506 23H460ZM465 43H516L503 48H462Z"
        />
        <path
          d="M42 8L46 16L55 17L47 22L45 31L41 23L32 21L40 17ZM483 45L487 52L496 54L488 58L486 67L482 59L473 57L481 53Z"
        />
      </g>
      <g class="banner-punch">
        <path d="M56 19L475 6L459 61L71 71Z" fill="#15091f" />
        <path d="M61 8L473 5L458 58L48 64Z" fill="var(--banner-color)" />
        <path d="M76 12L462 10L446 54L58 59Z" fill="#361343" stroke="#fff6dc" stroke-width="1.5" />
        <path d="M78 13L461 11L452 30L70 37Z" fill="var(--banner-color)" opacity=".2" />
        <path
          d="M69 49L59 58L117 57ZM411 12L460 11L454 24Z"
          fill="var(--banner-color)"
          opacity=".65"
        />
        <g transform="rotate(-2 260 36)" aria-hidden="true">
          <template v-if="banner.kind === 'fusion'">
            <image
              :href="`/art/bonuses/${banner.types[0]}.svg`"
              x="79"
              y="13"
              width="43"
              height="43"
            />
            <image
              :href="`/art/bonuses/${banner.types[1]}.svg`"
              x="399"
              y="5"
              width="43"
              height="43"
            />
            <text class="fusion-kicker" x="260" y="55" fill="var(--banner-color)">
              {{
                banner.clearedCount != null
                  ? t('{count} GEMS · 2× DAMAGE', { count: banner.clearedCount })
                  : `✦ ${t('BONUS FUSION')} ✦`
              }}
            </text>
          </template>
          <text
            v-if="banner.kind === 'multi-match'"
            class="multi-match-kicker"
            x="260"
            y="55"
            fill="var(--banner-color)"
          >
            {{ multiMatchDetail }}
          </text>
          <text
            x="263"
            :y="hasDetail ? 40 : 53"
            :font-size="fontSize"
            :textLength="textLength"
            lengthAdjust="spacingAndGlyphs"
            fill="var(--banner-color)"
            stroke="#16091e"
            stroke-width="7"
          >
            {{ t(banner.label) }}
          </text>
          <text
            x="260"
            :y="hasDetail ? 37 : 49"
            :font-size="fontSize"
            :textLength="textLength"
            lengthAdjust="spacingAndGlyphs"
            fill="#fff7dc"
            stroke="#24102f"
            stroke-width="5"
          >
            {{ t(banner.label) }}
          </text>
        </g>
        <path class="banner-glint" d="M119 12L139 12L110 58L90 58Z" fill="#ffffff" opacity=".12" />
      </g>
    </svg>
    <span v-else class="announcer-ready" aria-hidden="true">
      {{ t('✦ MATCH. BLAST. GO MEGA. ✦') }}
    </span>
  </div>
</template>
<script setup>
import { t, number } from '../i18n';
import { computed } from 'vue';
const props = defineProps({ banner: Object });
const hasDetail = computed(() => ['fusion', 'multi-match'].includes(props.banner?.kind));
const multiMatchDetail = computed(() =>
  t(props.banner?.coins != null ? '{count} LINES · +{coins} COINS' : '{count} LINES AT ONCE', {
    count: number(props.banner?.count ?? 0),
    coins: number(props.banner?.coins ?? 0),
  }),
);
const fontSize = computed(() =>
  hasDetail.value ? 30 : t(props.banner?.label)?.length > 15 ? 32 : 38,
);
const textLength = computed(() =>
  props.banner?.kind === 'fusion' ? 270 : t(props.banner?.label)?.length > 15 ? 358 : undefined,
);
</script>
<style scoped>
.arcade-announcer {
  height: 52px;
  margin-bottom: 8px;
  display: grid;
  place-items: center;
  overflow: hidden;
  pointer-events: none;
}
.arcade-banner-art {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.arcade-banner-art text {
  font-family: Impact, 'Arial Black', sans-serif;
  font-style: italic;
  font-weight: 900;
  text-anchor: middle;
  paint-order: stroke fill;
  stroke-linejoin: round;
}
.banner-punch {
  transform-origin: center;
  animation: banner-punch 360ms cubic-bezier(0.16, 1, 0.3, 1) both;
}
.arcade-banner-art .fusion-kicker,
.arcade-banner-art .multi-match-kicker {
  font-family: 'Arial Black', sans-serif;
  font-size: 10px;
  font-style: normal;
  letter-spacing: 3px;
}
.fusion-banner .banner-punch {
  animation-duration: 550ms;
}
.fusion-banner image {
  filter: drop-shadow(0 0 5px var(--banner-color));
}
.banner-streaks {
  animation: banner-streak 450ms ease-out both;
}
.banner-glint {
  animation: banner-glint 700ms 100ms ease-out both;
}
.announcer-ready {
  font-size: 9px;
  letter-spacing: 2px;
  color: #b09abf;
}
@keyframes banner-punch {
  0% {
    transform: translateX(-30px) scale(0.65) rotate(-5deg);
    opacity: 0;
  }
  60% {
    transform: scale(1.04);
    opacity: 1;
  }
  100% {
    transform: scale(1);
  }
}
@keyframes banner-streak {
  from {
    transform: translateX(22px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
@keyframes banner-glint {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(290px);
    opacity: 0;
  }
}
@media (max-width: 640px) {
  .arcade-announcer {
    height: 40px;
  }
}
@media (max-height: 500px) and (min-width: 641px) {
  .arcade-announcer {
    height: 32px;
    margin-bottom: 4px;
  }
}
</style>
