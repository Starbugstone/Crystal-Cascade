<template>
  <g v-if="stage">
    <TownBuilding :id="id" :stage="stage" :era="era" :era-level="eraLevel" />
    <path
      v-if="wins !== null && id === 'square'"
      d="M-125-25 0-83 125-25 0 32Z"
      fill="none"
      stroke="#ab895b"
      stroke-width="5"
      stroke-dasharray="12 8"
    />
    <g v-else-if="wins !== null" fill="none" stroke-linejoin="round" stroke-linecap="round">
      <path
        d="M-124 8v-168M-89 19v-168M103-12v-168M134-30v-168"
        stroke="#9c784d"
        stroke-width="5"
      />
      <path
        d="m-130-54 49 13m-49-65 49 13m15-61 188-13M96-80l43-22m-43-30 43-22"
        stroke="#c4a372"
        stroke-width="9"
      />
      <path
        d="m-124 8 35-116m-35-52 35 179M103-12l31-138m-31-28 31 148"
        stroke="#9c784d"
        stroke-width="3"
      />
      <path d="m99 6 31-16m-31-3 31-16m-31-3 31-16m-31-3 31-16" stroke="#c4a372" stroke-width="4" />
    </g>
  </g>
  <g v-else stroke-linejoin="round" stroke-linecap="round">
    <path d="M-110-4 5 28 113-29-4-62Z" fill="#bea57a" />
    <path
      d="m-98-8 102 28 97-48-104-27Z"
      fill="none"
      stroke="#dbc69a"
      stroke-width="2"
      stroke-dasharray="6 7"
    />
    <path d="M-98 0v-23M4 30V7M101-17v-23M-3-46v-23" stroke="#9d8052" stroke-width="6" />
    <g v-if="wins !== null">
      <path d="M-80-8 23 15 83-16v-18L-80-27Z" fill="#94816a" />
      <path d="M-80-27 23-4 83-34-19-56Z" fill="#c3b093" />
      <path d="m-69-25 88 19 48-25-87-17Z" fill="#8f7b58" />
    </g>
    <g v-if="wins !== null" fill="none" stroke="#ad8958" stroke-width="6">
      <path d="M-75-15v-78M25 5v-77M78-26v-77M-22-48v-77M-75-93 25-72 78-103-22-125Z" />
      <path d="m-75-93 54-63 99 53M25-72-21-156M-75-93 25 5m53-108L25 5" />
    </g>
    <g v-if="wins !== null" stroke="#80653e" stroke-width="2" fill="#bb9a64">
      <path d="m65 14 53-27 8 5-52 28Zm0-8 53-27 8 5-52 28Zm0-8 53-27 8 5-52 28Z" />
    </g>
  </g>
</template>
<script setup>
import TownBuilding from './TownBuilding.vue';
defineProps({
  id: String,
  era: String,
  eraLevel: Number,
  stage: Number,
  wins: { type: Number, default: null },
});
</script>
