<template>
  <TownBuilding v-if="stage" :id="id" :stage="stage" />
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
    <g v-if="wins >= 1">
      <path d="M-80-8 23 15 83-16v-18L-80-27Z" fill="#94816a" />
      <path d="M-80-27 23-4 83-34-19-56Z" fill="#c3b093" />
      <path d="m-69-25 88 19 48-25-87-17Z" fill="#8f7b58" />
    </g>
    <g v-if="wins >= 2" fill="none" stroke="#ad8958" stroke-width="6">
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
defineProps({ id: String, stage: Number, wins: { type: Number, default: null } });
</script>
