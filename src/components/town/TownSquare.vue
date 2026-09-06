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
    <g class="town-fountain">
      <ellipse cy="-26" rx="34" ry="16" fill="#aaa58f" />
      <path d="M-30-34v9c0 18 60 18 60 0v-9" fill="#d2c9ad" stroke="#aaa58f" stroke-width="2" />
      <ellipse cy="-34" rx="30" ry="14" fill="#d2c9ad" />
      <ellipse cy="-34" rx="24" ry="10" fill="#71b8bd" />
      <path
        :d="stage >= 3 ? 'M-5-36v-60h10v60c0 4-10 4-10 0Z' : 'M-5-36v-26h10v26c0 4-10 4-10 0Z'"
        fill="#b5b09b"
      />
      <g v-if="stage >= 3" transform="translate(0 -24) scale(1.25)">
        <path d="M-17-61c0 17 34 17 34 0" fill="#d2c9ad" />
        <ellipse cy="-61" rx="17" ry="7" fill="#71b8bd" stroke="#d2c9ad" stroke-width="3" />
      </g>
      <circle :cy="stage >= 3 ? -109 : -65" r="5" fill="#c9c1a2" />
      <path
        :d="
          stage >= 3
            ? 'M0-112Q-18-142-21-35M0-112Q18-142 21-35M0-112Q-6-132-10-39M0-112Q6-132 10-30'
            : 'M0-68Q-12-95-21-35M0-68Q12-95 21-35M0-68Q-3-87-10-39M0-68Q3-87 10-30'
        "
        fill="none"
        stroke="#b8e1de"
        stroke-width="2.5"
      />
      <path d="M-22-33q4 3 8 0m28 0q4 3 8 0" fill="none" stroke="#b8e1de" stroke-width="1.5" />
    </g>
    <g v-if="stage >= 4" fill="#89a179">
      <ellipse v-for="x in [-68, 68]" :key="x" :cx="x" cy="-45" rx="13" ry="6" />
      <circle v-for="x in [-75, -61, 61, 75]" :key="x" :cx="x" cy="-50" r="4" fill="#dca385" />
    </g>
    <g v-if="stage >= 5">
      <g
        v-for="[x, y] in [
          [-112, -27],
          [112, -27],
          [-45, 9],
          [45, 9],
        ]"
        :key="x"
        :transform="`translate(${x} ${y})`"
      >
        <path d="M0 0v-70" stroke="#718b80" stroke-width="4" />
        <path d="M-7-71h14v-20H-7Z" fill="#f4d58d" stroke="#718b80" stroke-width="2" />
        <path d="m-10-92 10-10 10 10Z" fill="#718b80" />
      </g>
    </g>
    <path v-if="stage >= 5" d="m-34-59 15-7 35 15-15 7Zm3 62 15-7 35 15-15 7Z" fill="#7f9d8a" />
  </g>
</template>
<script setup>
defineProps({ stage: Number });
</script>
