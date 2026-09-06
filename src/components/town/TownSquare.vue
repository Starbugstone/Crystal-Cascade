<template>
  <g stroke-linejoin="round" stroke-linecap="round">
    <path d="M-130-25 0-85 130-25 0 35Z" fill="#b2a180" />
    <path d="M-122-29 0-80 122-29 0 24Z" fill="#dfceaa" stroke="#b9aa87" stroke-width="4" />
    <path
      d="M-92-42 32 9M-60-56 65-6M-30-68 97-20M-92-16 30-68M-60-2 60-55M-30 12 92-42"
      stroke="#c9bb9c"
      stroke-width="2"
    />
    <g v-if="stage >= 2" fill="#ac885d" stroke="#7e7357" stroke-width="3">
      <path d="m-102-30 30-13v8l-30 13Zm175-13 30 13v8L73-35Z" />
      <path d="m-100-22 1 9m26-20 1 9m3-9-1 9m27 2-1 9" fill="none" />
    </g>
    <g v-if="stage >= 3">
      <ellipse cy="-29" rx="29" ry="14" fill="#b6a47b" />
      <path d="m0-42 21 13L0-16-21-29Z" fill="#799b90" />
    </g>
    <g v-if="stage >= 4" fill="#89a179">
      <ellipse v-for="x in [-68, 68]" :key="x" :cx="x" cy="-45" rx="13" ry="6" />
      <circle v-for="x in [-75, -61, 61, 75]" :key="x" :cx="x" cy="-50" r="4" fill="#dca385" />
    </g>
    <path v-if="stage >= 5" d="m-34-59 15-7 35 15-15 7Zm3 62 15-7 35 15-15 7Z" fill="#7f9d8a" />
  </g>
</template>
<script setup>
defineProps({ stage: Number });
</script>
