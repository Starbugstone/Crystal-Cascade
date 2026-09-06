<template>
  <g
    class="town-mine-entrance"
    :role="decorative ? undefined : 'button'"
    :tabindex="decorative ? undefined : 0"
    :aria-label="t('Enter the mine: play level {value0}', { value0: level })"
    @click="$emit('enter')"
    @keydown.enter.prevent="$emit('enter')"
    @keydown.space.prevent="$emit('enter')"
  >
    <rect
      class="mine-hit-area"
      x="-96"
      y="-54"
      width="192"
      height="172"
      rx="25"
      fill="transparent"
    />
    <g aria-hidden="true">
      <ellipse cy="68" rx="101" ry="20" fill="#625037" opacity=".22" />
      <path d="M-105 57-87 1-56-38-7-53 49-32 78 8 106 58 27 78Z" fill="#aa9c77" />
      <path d="m-105 57 49-95 16 44-15 51Zm98-110 33 55 52 6-29-40Z" fill="#c7b58c" />
      <path d="m27 78 21-77 30 7 28 50Z" fill="#807d5e" />
      <path d="M-43 61V-6l42-20 48 24v68Z" fill="#4b4939" />
      <path d="M-30 60V1L1-13 34 4v59Z" fill="#262e2a" />
      <path
        d="M-47 61V-9M46 64V-5M-50-9 1-31 50-6"
        fill="none"
        stroke="#735137"
        stroke-width="12"
      />
      <path
        d="M-50 58V-10M43 60V-5M-49-13 1-34 48-10"
        fill="none"
        stroke="#b8945f"
        stroke-width="4"
      />
      <path d="m-42 8 18-21M39 11 24-14" stroke="#97774b" stroke-width="6" />
      <path d="M-13 29-28 86M13 31 33 90" stroke="#6b6655" stroke-width="4" />
      <path d="m-19 48 40 3m-43 11 47 3m-51 11 56 4" stroke="#9b7d50" stroke-width="5" />
      <g class="mine-cart">
        <path d="m-16 36 30 3 8-5-29-4Z" fill="#b0a686" />
        <path d="m-16 36 30 3-2 21-26-3Z" fill="#65777a" />
        <path d="m14 39 8-5-2 20-8 6Z" fill="#42585a" />
        <path d="m-9 34 4-9 8 4 6-7 9 9-5 6Z" fill="#ae83b4" />
        <path d="m-5 25 3 10 5-6m6-7 1 13 7-4" fill="#dabbe2" />
        <circle cx="-8" cy="59" r="5" fill="#3d4339" /><circle
          cx="9"
          cy="62"
          r="5"
          fill="#3d4339"
        />
      </g>
      <g transform="translate(-58 12)">
        <ellipse class="mine-lantern-glow" cy="5" rx="22" ry="25" fill="#ffcf70" opacity=".22" />
        <path d="M-6-4H6V12H-6Z" fill="#efc575" stroke="#69593b" stroke-width="3" />
        <path d="M-4-5v-6h8v6" fill="none" stroke="#69593b" stroke-width="2" />
      </g>
      <g v-if="!decorative" class="mine-label" transform="translate(0 103)">
        <rect
          x="-93"
          y="-17"
          width="186"
          height="35"
          rx="17"
          fill="#506e5c"
          stroke="#e7d1a0"
          stroke-width="2"
        />
        <text y="6" text-anchor="middle" fill="#fff5d9" font-family="Georgia, serif" font-size="18">
          {{ t('Mine · Level') }} {{ level }} →</text
        >
      </g>
    </g>
  </g>
</template>
<script setup>
import { t } from '../../i18n';
defineProps({ level: { type: Number, default: 1 }, decorative: Boolean });
defineEmits(['enter']);
</script>
