<template>
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="paths[name] || paths.spark" />
  </svg>
</template>
<script setup>
defineProps({ name: { type: String, default: 'spark' } });
const paths = {
  book: 'M12 6v15M12 6C9 3 5 3 2 4v15c4-1 7-1 10 2 3-3 6-3 10-2V4c-3-1-7-1-10 2Z',
  pickaxe: 'm13 10-8 11-2-2 9-10M5 3c7-1 13 5 15 12-4-5-8-9-15-12Zm7 1 3-2 3 3-3 3',
  home: 'm3 11 9-8 9 8M5 9v12h5v-7h4v7h5V9',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 8v6m0-10v.5',
  hint: 'M9 18h6m-5 3h4M9 15c0-2-3-3-3-6a6 6 0 1 1 12 0c0 3-3 4-3 6ZM12 1v1M2 9H1m22 0h-1',
  spark: 'M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5Z',
  arrow: 'M5 12h14m-5-5 5 5-5 5',
  back: 'M19 12H5m5-5-5 5 5 5',
  chevron: 'm6 9 6 6 6-6',
  settings:
    'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM10 3h4l.7 2.2 2 .9 2.2-.5 2 3.4-1.5 1.7v2.6l1.5 1.7-2 3.4-2.2-.5-2 .9L14 21h-4l-.7-2.2-2-.9-2.2.5-2-3.4 1.5-1.7v-2.6L3.1 9l2-3.4 2.2.5 2-.9Z',
  expand: 'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5',
  'clear-row': 'M3 12h18M7 8l-4 4 4 4m10-8 4 4-4 4M10 4h4m-4 16h4',
  hammer: 'm14 9-9 12-3-3L12 7m-1-4 9 7 3-4-9-7Z',
  'color-wand': 'm4 21 11-11M15 2l1.5 4.5L21 8l-4.5 1.5L15 14l-1.5-4.5L9 8l4.5-1.5ZM5 4v4M3 6h4',
  shuffle: 'M3 6h3c5 0 7 12 12 12h3m-4-4 4 4-4 4M3 18h3c2 0 3-2 4-4m4-4c1-2 2-4 4-4h3m-4-4 4 4-4 4',
  'tile-breaker': 'M9 3h6v6h6v6h-6v6H9v-6H3V9h6Z',
  sound: 'M11 4 5 9H2v6h3l6 5ZM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14',
  muted: 'M11 4 5 9H2v6h3l6 5Zm5 5 6 6m0-6-6 6',
  close: 'm6 6 12 12M6 18 18 6',
};
</script>
<style scoped>
svg {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
}
</style>
