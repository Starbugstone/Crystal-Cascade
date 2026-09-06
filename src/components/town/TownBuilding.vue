<template>
  <TownSquare v-if="kind === 'square'" :stage="stage" />
  <g v-else class="town-building-art" stroke-linejoin="round" stroke-linecap="round">
    <ellipse
      cx="8"
      cy="14"
      :rx="kind === 'farm' ? 125 : 109"
      ry="24"
      fill="#795a3c"
      opacity=".13"
    />
    <g v-if="kind === 'well'">
      <path d="M-64 3 5 32 86-8 16-38Z" :fill="built ? '#c2b28b' : '#bbae95'" />
      <ellipse cy="-10" rx="45" ry="21" fill="#aa9374" />
      <path d="M-45-12V13Q0 43 45 13V-12" fill="#c3ae8e" stroke="#9a8567" stroke-width="3" />
      <path
        d="M-40 3Q0 28 40 3M-23-4v20M3 4v20M28-1v18"
        fill="none"
        stroke="#9a8567"
        stroke-width="2"
      />
      <ellipse cy="-12" rx="43" ry="20" fill="#dfceb0" />
      <ellipse cy="-12" rx="31" ry="12" :fill="built ? '#6ca8aa' : '#726556'" />
      <path v-if="built" d="M-17-12q16 6 32-1" fill="none" stroke="#c6e2d6" stroke-width="3" />
      <path d="M-48 0V-105M49-17V-123" stroke="#775339" stroke-width="9" />
      <path d="M-45-85 48-102" stroke="#a5764e" stroke-width="8" />
      <path d="M-75-104-16-151 79-126 21-80Z" :fill="built ? '#6c9191' : '#898579'" />
      <path d="m-16-151 35 66 60-41" :fill="built ? '#496f72' : '#676c63'" />
      <path d="m-75-104 96 24 58-46" fill="none" stroke="#3c5b60" stroke-width="7" />
      <path
        d="m-55-110 87 23m-71-36 86 23m-70-37 81 23"
        stroke="#d2ddc4"
        stroke-width="2"
        opacity=".4"
      />
      <path d="M1-93v64" stroke="#d7c29a" stroke-width="3" />
      <path d="m-9-33 23-3-2 19-16 3Z" fill="#a06e43" stroke="#6b4b33" stroke-width="2" />
      <path
        v-if="!built"
        d="m-29-127 15 9-7 20 24-10 8 21"
        stroke="#4e6058"
        stroke-width="7"
        fill="none"
      />
      <g v-if="built" fill="#6d9464"
        ><ellipse cx="-56" cy="21" rx="15" ry="8" /><ellipse cx="55" cy="16" rx="17" ry="8"
      /></g>
    </g>
    <g v-else>
      <!-- A shared three-quarter footprint keeps every repair in the same place. -->
      <path d="M-94 0 33 25 101-10 101-22-94-25Z" fill="#a18a69" />
      <path d="M-79-102 37-81 37 8-79-14Z" :fill="built ? frontColor : '#aa967c'" />
      <path d="M37-81 91-108V-18L37 8Z" :fill="built ? sideColor : '#8b826b'" />
      <path
        v-for="line in 6"
        :key="`boards-${line}`"
        :d="`M-77 ${-96 + line * 14} 36 ${-75 + line * 14}`"
        stroke="#503b2c"
        opacity=".14"
      />
      <path
        v-for="line in 6"
        :key="`side-${line}`"
        :d="`M39 ${-76 + line * 13} 89 ${-101 + line * 13}`"
        stroke="#3c382a"
        opacity=".17"
      />
      <template v-if="kind === 'home' || kind === 'farm' || kind === 'stable'">
        <path d="M-94-103-33-158 103-119 42-73Z" :fill="built ? roofColor : '#858475'" />
        <path d="m-33-158 75 85 61-46Z" :fill="built ? roofSide : '#656f66'" />
        <path
          d="m-94-103 136 30 61-46"
          fill="none"
          :stroke="built ? '#645447' : '#61665a'"
          stroke-width="7"
        />
        <path
          v-for="line in 5"
          :key="`roof-${line}`"
          :d="`M${-81 + line * 9} ${-105 - line * 8} ${48 + line * 9} ${-77 - line * 8}`"
          stroke="#f3dfb5"
          stroke-width="2"
          opacity=".25"
        />
        <path
          v-if="kind === 'home' && built"
          d="M-54-145v-29l16 3v30"
          fill="#a96650"
          stroke="#875540"
          stroke-width="2"
        />
      </template>
      <template v-else>
        <path d="M-84-102 38-80 97-112-25-137Z" :fill="built ? '#807355' : '#7c7c69'" />
        <path
          d="M-84-103V-143L-52-137V-154L7-143V-127L40-121V-80Z"
          :fill="built ? frontColor : '#aa967c'"
          stroke="#806c4d"
          stroke-width="2"
        />
        <path d="m-83-141 32 6v-15l56 10v16l34 7" stroke="#e1c68e" stroke-width="5" fill="none" />
        <path d="M-67-123 24-107v24l-91-16Z" fill="#f1dfb7" stroke="#89643d" stroke-width="2" />
        <text
          :transform="
            kind === 'saloon' ? 'translate(-61 -106) skewY(10)' : 'translate(-51 -104) skewY(10)'
          "
          fill="#6f5135"
          font-family="Georgia, serif"
          :font-size="kind === 'saloon' ? 11 : 13"
          font-weight="bold"
          >{{
            t(
              {
                saloon: 'GOLDEN HOUR',
                sheriff: 'SHERIFF',
                museum: 'Museum',
                armory: 'Armory',
                bank: 'Bank',
                shop: 'Shop',
              }[kind],
            )
          }}</text
        >
      </template>
      <template v-if="kind === 'stable' || kind === 'farm'">
        <path
          d="M-57-74 12-61V0L-57-13Z"
          :fill="built ? '#705337' : '#696455'"
          stroke="#e0c298"
          stroke-width="5"
        />
        <path d="M-23-67v59m-31-58L9-6m-62-6L9-58" stroke="#ba9c73" stroke-width="3" />
        <path v-if="built && kind === 'stable'" d="M-24-66 11-60V0L-24-6Z" fill="#453e2f" />
        <path d="m-47-96 47 10v-18l-47-11Z" :fill="built ? '#f0d7a6' : '#bbaa89'" />
        <text
          transform="translate(-40 -99) skewY(10)"
          font-size="10"
          font-family="Georgia, serif"
          fill="#665336"
          >{{ t(kind === 'farm' ? 'CLOVER' : 'STABLES') }}</text
        >
      </template>
      <template v-else>
        <path
          d="M-26-58 2-53V2L-26-3Z"
          :fill="built ? '#736f4d' : '#625e4e'"
          stroke="#edcf9e"
          stroke-width="4"
        />
        <circle cx="-4" cy="-24" r="2" fill="#efc36d" />
        <g v-for="x in [-65, 12]" :key="x">
          <path
            :d="`M${x}-65 ${x + 23}-61v27l-23-4Z`"
            :fill="built ? '#edc782' : '#565c50'"
            :stroke="built ? '#f8e1b6' : '#776f58'"
            stroke-width="4"
          />
          <path :d="`M${x + 11}-62v25m-10-14 21 4`" stroke="#927b55" stroke-width="2" />
          <path v-if="built" :d="`M${x - 4}-34 ${x + 26}-29v9l-30-5Z`" fill="#8e7050" />
          <g v-if="built" :transform="`translate(${x + 9} -31)`" fill="#729166"
            ><ellipse rx="15" ry="5" /><circle cx="-8" cy="-4" r="3" fill="#e9ac82" /><circle
              cx="5"
              cy="-3"
              r="3"
              fill="#e9c887"
          /></g>
        </g>
      </template>
      <path
        d="M57-71 77-80v27l-20 10Z"
        :fill="built ? '#e8c181' : '#535f52'"
        stroke="#bbae84"
        stroke-width="3"
      />
      <path d="M67-75v28m-9-12 19-9" stroke="#776e4d" stroke-width="2" />
      <g v-if="kind === 'saloon' && built">
        <path d="M-89-53 35-31 48-45-76-67Z" fill="#eee0b4" />
        <path
          v-for="stripe in 5"
          :key="stripe"
          :d="`M${-80 + stripe * 22} ${-64 + stripe * 4}l10 2-13 14-10-2Z`"
          fill="#b87953"
        />
        <path d="M-88-51v49M35-29v49" stroke="#e0c290" stroke-width="5" />
        <path d="M-95-1 32 24 55 12-71-12Z" fill="#c4a171" />
        <path d="M-77 0v-16m100 35V4m-100-11L23 12" stroke="#f0d9a8" stroke-width="3" />
      </g>
      <g
        v-if="kind === 'sheriff' && built"
        transform="translate(-18 -124) scale(.6)"
        fill="#ffe4a0"
        stroke="#ac8244"
        stroke-width="2"
        ><path d="m0-18 5 11 12-2-6 11 7 10-13-1-5 12-5-12-13 1 7-10-6-11 12 2Z"
      /></g>
      <g v-if="!built" stroke="#706851" stroke-width="7">
        <path d="M-69-62-43-35M-1-46 30-55M56-58 78-72" />
        <path d="m-12-127 10 21-15 17m65-7-9 20 14 11" fill="none" stroke-width="4" />
        <path d="m-89 14 35 6m87 10 24-4m-66-2 27 14" stroke="#a08a67" stroke-width="5" />
      </g>
      <g v-if="kind === 'farm'" transform="translate(12 20)">
        <path d="m0 0 90-39 61 22-88 44Z" :fill="built ? '#8c8050' : '#b59f71'" />
        <path
          v-for="row in 4"
          :key="row"
          :d="`m${row * 12} ${row * 4} 88-40`"
          fill="none"
          stroke="#6b6947"
          stroke-width="4"
          opacity=".5"
        />
        <g v-if="built" fill="#779053" stroke="#a4b76a" stroke-width="2">
          <path
            v-for="n in 15"
            :key="n"
            :d="`M${16 + (n % 5) * 16 + Math.floor(n / 5) * 9} ${4 - (n % 5) * 7 + Math.floor(n / 5) * 5}q-10-15 0-9q12-11 3 4`"
          />
        </g>
      </g>
      <g v-if="kind === 'home' && stage >= 2" transform="translate(-107 6)">
        <path d="M-25-66 17-58 17-5-25-13Z" fill="#e4b494" /><path
          d="m17-58 28-17v54L17-5Z"
          fill="#b78b70"
        />
        <path d="M-35-65 0-100 51-78 20-51Z" fill="#8c9c8b" /><path
          d="M0-100 20-51 51-78"
          fill="#647e76"
        />
        <path d="M-13-50 5-46v22l-18-4Z" fill="#f1cf8b" stroke="#fff0d0" stroke-width="3" />
        <path
          d="m-34 1 55 12M-29 0v-14M-11 3v-13M7 7v-12M24 11v-14"
          stroke="#f4e3b8"
          stroke-width="4"
        />
        <ellipse cy="-3" rx="20" ry="7" fill="#78995e" />
        <circle cx="-10" cy="-8" r="4" fill="#e6a185" /><circle
          cx="5"
          cy="-6"
          r="3"
          fill="#e7c177"
        />
      </g>
      <g v-if="built && kind === 'bank'" transform="translate(-32 -45)">
        <rect
          x="-13"
          y="-22"
          width="29"
          height="43"
          rx="3"
          fill="#687d83"
          stroke="#d9dbb9"
          stroke-width="3"
        /><circle cy="-2" r="9" fill="none" stroke="#efd281" stroke-width="3" />
      </g>
      <g v-if="built && kind === 'shop'" transform="translate(-40 -15)">
        <path d="M-46-53h92v19h-92Z" fill="#e5d9ad" /><path
          d="M-38-53v19m24-19v19m24-19v19m24-19v19"
          stroke="#658779"
          stroke-width="12"
        />
        <rect x="-36" y="-5" width="70" height="18" fill="#9f8157" /><path
          d="m-22-22 10 12-10 9-10-9Zm35 0 10 12-10 9-10-9Z"
          fill="#b495ca"
          stroke="#ead8e2"
          stroke-width="2"
        />
      </g>
      <g v-if="built && kind === 'museum'" transform="translate(-63 -10)"
        ><path d="m-13 0 25 6v-28l-25-5Z" fill="#b7a17d" /><path
          d="m-5-29-7-13 12-14 12 18-7 14Z"
          fill="#a08ab9" /><path d="m0-56 2 21 10-3Z" fill="#cabce0"
      /></g>
      <g v-if="built && kind === 'armory'" transform="translate(-55 4)"
        ><path
          v-for="n in stage"
          :key="n"
          :transform="`translate(${(n - 1) * 30} ${(n - 1) * 5})`"
          d="m-12-3 25 6v-25l-25-5Z"
          fill="#bfa06d"
          stroke="#7f836e"
          stroke-width="3"
      /></g>
      <g v-if="built" fill="#879d62"
        ><ellipse cx="-82" cy="2" rx="13" ry="8" /><ellipse cx="88" cy="-9" rx="12" ry="7"
      /></g>
    </g>
    <g v-if="stage >= 2" fill="#d7c098" stroke="#917951" stroke-width="2">
      <path d="m-90-20 100 24 95-44v-8L10-4-90-28Z" />
      <path d="M-90-20v-25M10 4v-24M105-40v-24M-90-44 10-20 105-64" fill="none" />
    </g>
    <g v-if="stage >= 3" transform="translate(5 -128)">
      <path
        d="m-29-3 35 9 30-17v-37l-35-9-30 17Z"
        fill="#c3b18a"
        stroke="#8e7956"
        stroke-width="2"
      />
      <path d="m-36-40 40-35 41 18-18 19-28-6Z" fill="#6c8b80" />
      <path d="m-17-21 14 4v-15l-14-4Z" fill="#ecd29a" />
    </g>
    <g v-if="stage >= 4">
      <g v-for="x in [-80, 85]" :key="x" :transform="`translate(${x} 10)`">
        <path d="M-18 0h36v-19h-36Z" fill="#b69c70" />
        <ellipse cy="-21" rx="24" ry="13" fill="#81996a" />
        <circle v-for="dx in [-12, 0, 12]" :key="dx" :cx="dx" cy="-29" r="5" fill="#edbd89" />
      </g>
      <path
        d="M-100-10v-150m0 5h26v35h-26M100-26v-150m0 5H74v35h26"
        stroke="#c3a476"
        stroke-width="3"
        fill="#9fbca3"
      />
    </g>
    <g v-if="stage >= 5">
      <path d="M-105 18v-80M105 5v-80" stroke="#e1cf9e" stroke-width="7" />
      <path d="m-119-66 225-14 20 13-225 14Z" fill="#71988a" stroke="#c9d3ad" stroke-width="3" />
      <path
        d="m-95-77 18 23m20-25 18 23m20-25 18 23m20-25 18 23m20-25 18 23m20-25 18 23"
        stroke="#e1cf9e"
        stroke-width="4"
      />
    </g>
  </g>
</template>

<script setup>
import { BUILDING_BY_ID } from '../../data/town';
import TownSquare from './TownSquare.vue';
import { t } from '../../i18n';
import { computed } from 'vue';
const props = defineProps({
  id: { type: String, required: true },
  stage: { type: Number, default: 0 },
});
const kind = computed(() => BUILDING_BY_ID[props.id]?.kind ?? props.id);
const built = computed(() => props.stage > 0);
const frontColor = computed(
  () =>
    ({
      home: '#d6a08a',
      farm: '#b17b5b',
      stable: '#c09a70',
      saloon: '#d7b46c',
      sheriff: '#93aaa7',
      museum: '#c9b18a',
      armory: '#8c9e91',
      bank: '#b2af94',
      shop: '#bd977b',
    })[kind.value],
);
const sideColor = computed(
  () =>
    ({
      home: '#b5816b',
      farm: '#8e6348',
      stable: '#967650',
      saloon: '#b39455',
      sheriff: '#6f8887',
      museum: '#a58c66',
      armory: '#69877c',
      bank: '#818e89',
      shop: '#997b5d',
    })[kind.value],
);
const roofColor = computed(() => (kind.value === 'home' ? '#869b90' : '#96764f'));
const roofSide = computed(() => (kind.value === 'home' ? '#5e7e77' : '#735c3e'));
</script>
