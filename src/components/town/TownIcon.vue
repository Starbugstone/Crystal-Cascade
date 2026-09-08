<template>
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.65"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <template v-if="name === 'coin'">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="6" opacity=".5" />
      <path d="m12 8 3 4-3 4-3-4Z" />
    </template>
    <template v-else-if="name === 'bell'">
      <path d="M6 10a6 6 0 0 1 12 0c0 6 2 7 2 7H4s2-1 2-7ZM10 21h4M12 2v2" />
    </template>
    <template v-else-if="name === 'happiness'">
      <circle cx="12" cy="12" r="9" />
      <path d="M8 9h.01M16 9h.01M7.5 14a5 5 0 0 0 9 0" />
    </template>
    <template v-else-if="name === 'water'">
      <path d="M12 3C9 7 5 11 5 15a7 7 0 0 0 14 0c0-4-4-8-7-12Z" />
      <path d="M8 15a4 4 0 0 0 4 4" />
    </template>
    <template v-else-if="name === 'food'">
      <path
        d="M12 21V5m0 5C5 11 5 5 5 5s7-1 7 5Zm0 7c-7 1-7-5-7-5s7-1 7 5Zm0-10c7 1 7-5 7-5s-7-1-7 5Zm0 7c7 1 7-5 7-5s-7-1-7 5Z"
      />
    </template>
    <template v-else-if="name === 'home'">
      <path d="m3 10 9-7 9 7M5 9v11h14V9M9 20v-7h6v7" />
    </template>
    <template v-else-if="name === 'people'">
      <circle cx="9" cy="7" r="3" />
      <path d="M3 21v-4a6 6 0 0 1 12 0v4M17 4a3 3 0 0 1 0 6m1 4a5 5 0 0 1 3 5v2" />
    </template>
    <template v-else-if="name === 'mine'">
      <path d="m4 21 9-15m-7-2c6-3 12 1 14 7M5 4l-2 4 4-2m13 5-1 4-2-5" />
    </template>
    <template v-else-if="name === 'arrow'"><path d="M4 12h16m-6-6 6 6-6 6" /></template>
    <template v-else-if="name === 'check'"><path d="m5 12 4 4L19 6" /></template>
    <template v-else-if="name === 'sun'">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2" />
    </template>
    <template v-else>
      <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2-5.5-3-5.5 3 1-6.2L3 9.6l6.2-.9Z" />
    </template>
  </svg>
</template>
<script setup>
defineProps({ name: String });
</script>
