<template>
  <g stroke-linejoin="round" stroke-linecap="round">
    <TownLeisureBuilding
      v-if="['horseField', 'park'].includes(kind)"
      :kind="kind"
      :level="serviceLevel"
    />
    <TownSquare v-else-if="kind === 'square'" :stage="serviceLevel" />
    <g v-else-if="kind === 'bridge'" fill="none" stroke="#638b88" stroke-width="5">
      <path d="M-155 8H155" stroke="#d9cbae" stroke-width="30" />
      <path d="M-155-12H155M-155 27H155" />
      <path v-for="x in [-140, 140]" :key="x" :d="`M${x}-12v-72m-14 0h28`" />
    </g>
    <g v-else-if="family === 'park'">
      <path d="M-116-28 0-64 117-25 0 24Z" fill="#8fa773" />
      <path d="M-105-6 5-43 104-10" stroke="#ddd1ae" stroke-width="16" fill="none" />
      <circle cx="84" cy="-85" r="25" fill="#8fa773" />
      <path d="M84-70v48" stroke="#a3825f" stroke-width="6" />
    </g>
    <g v-else>
      <path d="M-103-16 18 18 105-16 105-28-103-44Z" fill="#ddd1ae" />
      <path
        :d="`M-88-20v${-height}l116 29V9Z`"
        :fill="family === 'residence' ? '#b79078' : '#ddd1ae'"
      />
      <path :d="`M28 9V${-height + 9}l69-27v${height}Z`" fill="#a69278" />
      <path
        :d="`M-98 ${-height - 28} 29 ${-height + 2} 108 ${-height - 29} -18 ${-height - 58}Z`"
        fill="#638b88"
      />
      <g v-for="row in family === 'residence' ? 2 : 1" :key="row">
        <path
          v-for="x in [-71, -35, 1]"
          :key="x"
          :d="`M${x} ${-height + row * 38 - 28}v28l21 5v-28Z`"
          fill="#9cbbb5"
          stroke="#eee0c0"
          stroke-width="3"
        />
      </g>
      <path d="M-19-3v-47l24 6V3Z" fill="#638b88" />
      <path
        v-if="modern"
        :d="`M-80-20V${-height - 15}m6 1V-18M15 4V${-height + 7}`"
        stroke="#a3825f"
        stroke-width="4"
      />
      <path
        v-if="modern"
        :d="`M-67 ${-height - 29} 9 ${-height - 9} 66 ${-height - 29} -9 ${-height - 47}Z`"
        fill="#8fa773"
      />
      <g v-if="family === 'residence'" stroke="#ddd1ae" stroke-width="4">
        <path d="M-76-59 17-35v-17L-76-76Z" :fill="modern ? '#9cbbb5' : '#638b88'" />
      </g>
      <g v-if="family === 'water'">
        <path
          d="M40-13v-89q29-18 58 0v89q-29 19-58 0Z"
          fill="#a4b3a6"
          stroke="#ddd1ae"
          stroke-width="3"
        />
        <ellipse cx="69" cy="-102" rx="29" ry="10" fill="#638b88" />
      </g>
      <g v-if="family === 'farm'">
        <path
          d="M35-4v-95h30V8m4-10v-109h28V-14"
          :fill="modern ? '#9cbbb5' : '#ddd1ae'"
          stroke="#638b88"
          stroke-width="3"
        />
      </g>
      <path
        v-if="family === 'depot'"
        d="M-73-20v-63l78 20v63M-70-65l71 18m-71 0 71 18"
        fill="#638b88"
        stroke="#9cbbb5"
        stroke-width="3"
      />
      <g v-if="family === 'station'">
        <path d="M65-12v-148h25v142Z" fill="#b79078" />
        <circle cx="77" cy="-138" r="9" fill="#eee0c0" />
        <path d="M77-138v-6m0 6 5 3" stroke="#638b88" stroke-width="2" />
      </g>
      <path
        v-if="family === 'research'"
        d="M-42-147-32-180-13-142 0-200 25-139 41-168 56-127 0-119Z"
        fill="#84afa9"
        stroke="#c4ddd0"
        stroke-width="3"
      />
      <path v-if="kind === 'doctor'" d="M-53-115v29m-14-15h28" stroke="#b47766" stroke-width="8" />
    </g>
    <g v-if="garden || ['civic', 'retail', 'station', 'river'].includes(family)">
      <path d="M-108-47v-66m78 86v-65" stroke="#ddd1ae" stroke-width="4" />
      <path d="M-116-115-48-144 7-121-57-93Z" fill="#638b88" />
      <path v-if="modern" d="m-96-116 59 19m-47-25 59 20" stroke="#9cbbb5" stroke-width="4" />
    </g>
    <g v-if="level >= 2">
      <path
        v-if="!garden && kind !== 'bridge'"
        d="M-122-2v-89l33 9v90Z"
        fill="#b79078"
        stroke="#ddd1ae"
        stroke-width="3"
      />
      <path d="M-107 8v-11h24v17Z" fill="#ddd1ae" />
      <circle cx="-95" cy="-8" r="11" fill="#8fa773" />
    </g>
    <g v-if="level >= 3" stroke="#638b88" stroke-width="4">
      <path d="M-108 9v-52m216 49v-52" />
      <path v-if="modern" d="M-118-43h20m196-3h20" stroke="#d5c194" stroke-width="7" />
      <g v-else fill="#eddda9"
        ><circle cx="-108" cy="-47" r="7" /><circle cx="108" cy="-50" r="7"
      /></g>
    </g>
  </g>
</template>
<script setup>
import { computed } from 'vue';
import { CITY_FAMILIES } from '../../data/city';
import TownLeisureBuilding from './TownLeisureBuilding.vue';
import TownSquare from './TownSquare.vue';
const props = defineProps({
  kind: String,
  era: String,
  level: Number,
  serviceLevel: { type: Number, default: 3 },
});
const family = computed(() => CITY_FAMILIES[props.kind]);
const modern = computed(() => props.era === 'contemporary');
const garden = computed(() => ['park', 'field', 'square'].includes(family.value));
const height = computed(() => (family.value === 'residence' ? 135 : 110));
</script>
