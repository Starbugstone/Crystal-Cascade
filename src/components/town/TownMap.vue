<template>
  <div
    ref="scene"
    class="town-map"
    :class="{ 'town-map-paused': paused, 'town-map-still': reducedMotion }"
    @pointermove="lookAround"
    @pointerleave="resetView"
  >
    <svg
      class="town-diorama"
      :viewBox="`0 -45 ${mapWidth} 795`"
      role="group"
      :aria-label="
        t('Prospect Hollow town map. Choose any building to restore, or enter the mine to play.')
      "
    >
      <defs>
        <clipPath :id="`${uid}-land`"><path :d="land" /></clipPath>
        <linearGradient :id="`${uid}-sky`" x2="0" y2="1">
          <stop stop-color="#e9ece0" />
          <stop offset="1" stop-color="#f6ecd2" />
        </linearGradient>
        <linearGradient :id="`${uid}-ground`" x2=".3" y2="1">
          <stop stop-color="#ead9ae" />
          <stop offset="1" stop-color="#d6c293" />
        </linearGradient>
        <pattern :id="`${uid}-grain`" width="37" height="31" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="12" r=".7" fill="#8f865e" opacity=".16" />
          <path d="m20 25 3-1" stroke="#a79b70" opacity=".18" />
        </pattern>
        <g :id="`${uid}-tree`">
          <ellipse cy="3" rx="22" ry="9" fill="#6b7550" opacity=".15" />
          <path d="M0 1v-42" stroke="#8d8057" stroke-width="5" />
          <path d="m0-25-11-9m11 14 9-12" stroke="#8d8057" stroke-width="3" />
          <ellipse cy="-42" rx="24" ry="28" fill="#93a278" />
          <ellipse cx="-9" cy="-47" rx="18" ry="23" fill="#a7b18b" />
          <ellipse cx="11" cy="-32" rx="14" ry="16" fill="#7c926a" />
        </g>
        <g
          :id="`${uid}-cactus`"
          fill="none"
          stroke="#97a077"
          stroke-width="7"
          stroke-linecap="round"
        >
          <path d="M0 0v-36m0 23h-11v-12m11 5h11v-14" />
        </g>
        <g :id="`${uid}-person`" transform="scale(.65)">
          <ellipse cy="4" rx="7" ry="3" fill="#596242" opacity=".23" />
          <path class="walker-leg leg-left" d="m-3-6-1 9" stroke="#6e6552" stroke-width="3" />
          <path class="walker-leg leg-right" d="m3-6 2 9" stroke="#6e6552" stroke-width="3" />
          <path d="M0-18v13" stroke="currentColor" stroke-width="9" />
          <circle cy="-24" r="5" fill="#d7a577" />
          <path d="M-8-28H8M-4-29v-4h8v4" stroke="#9c7b4f" stroke-width="3" />
        </g>
        <g :id="`${uid}-horse`">
          <ellipse cx="2" cy="4" rx="25" ry="6" fill="#685a3d" opacity=".2" />
          <path d="M-13-14-15 3m8-15 1 15M14-12 16 3m-7-16L8 3" stroke="#72553b" stroke-width="4" />
          <ellipse cy="-19" rx="20" ry="10" fill="#a57850" />
          <path d="M12-21 16-42 28-43 30-30 23-27 19-15" fill="#a57850" />
          <path d="m17-41-2-7 7 5m3 0 2-6 4 8" fill="#715337" />
          <path d="M-19-23q-13 6-9 18M15-40l-4 18" stroke="#715337" stroke-width="4" fill="none" />
          <path d="m-4-26 12 2-2 13-12-2Z" fill="#738d8d" />
          <circle cx="26" cy="-37" r="1.5" fill="#403e2e" />
        </g>
      </defs>
      <g aria-hidden="true" class="town-backdrop">
        <rect x="0" y="-45" :width="mapWidth" height="795" :fill="`url(#${uid}-sky)`" />
        <circle cx="781" cy="84" r="43" fill="#f6e6b5" opacity=".9" />
        <g fill="#fff9e7" opacity=".55">
          <path
            class="town-cloud cloud-one"
            d="M90 67q-18-24 12-32 10-25 35-9 26-8 33 14 30-2 27 23Z"
          />
          <path
            class="town-cloud cloud-two"
            d="M618 43q-15-17 10-22 9-24 28-11 28-6 31 16 24-3 22 17Z"
          />
        </g>
        <path
          d="M0 158 81 89 170 138 261 45 326 111 416 74 516 149 612 91 692 133 791 83 879 132 947 83 1000 131V340H0Z"
          fill="#cdd2b7"
        />
        <path d="m261 45 22 70-40-11-14 8ZM612 91l28 62-24-10-25 4Z" fill="#e1e0c7" />
        <path
          d="M0 204 80 143 191 184 318 125 451 191 551 148 634 201 770 158 864 177 940 154 1000 182V440H0Z"
          fill="#b9c3a0"
        />
      </g>
      <g aria-hidden="true">
        <ellipse cx="505" cy="698" rx="449" ry="39" fill="#59604c" opacity=".15" />
        <path d="M0 620 550 700 1000 590v30L550 735 0 653Z" fill="#ac8c5e" />
        <path d="m550 700 450-110v30L550 735Z" fill="#8e7955" />
        <path
          d="m0 633 550 81 450-111M0 646l550 79 450-114"
          fill="none"
          stroke="#d6b983"
          stroke-width="3"
          opacity=".55"
        />
        <path :d="land" :fill="`url(#${uid}-ground)`" />
      </g>
      <g aria-hidden="true" :clip-path="`url(#${uid}-land)`">
        <path :d="land" :fill="`url(#${uid}-grain)`" />
        <path :d="riverOutline(mapPoint, RIVER.bankWidth)" fill="#ab9b78" />
        <path :d="riverOutline(mapPoint)" fill="#6e9d9a" />
        <path :d="riverOutline(mapPoint, 0.35)" fill="#89b3ac" opacity=".5" />
        <g
          v-if="town.era === 'river-rail' && town.buildings.riverPort"
          :transform="`translate(${mapPoint([riverCenterX(-8), -8])})`"
        >
          <path d="M-15-31Q0-44 15-31L15 28Q0 41-15 28Z" fill="#725d45" />
          <rect x="-13" y="-25" width="26" height="49" rx="4" fill="#e3d3af" />
          <rect x="-9" y="-17" width="18" height="29" fill="#8c9f91" />
          <rect x="-12" y="24" width="24" height="8" fill="#9b6e51" />
          <circle cy="-13" r="4" fill="#565f56" />
        </g>
        <g v-if="railEdges(town).length" :transform="`translate(${mapPoint(PLOTS.railDepot)})`">
          <rect x="-50" y="-35" width="115" height="22" rx="2" fill="#b6a181" />
        </g>
        <g v-for="edge in railEdges(town)" :key="edge.id" stroke="#6b7265" fill="none">
          <path
            :d="`M${mapPoint(edge.from)} L${mapPoint(edge.to)}`"
            stroke-width="24"
            stroke-dasharray="3 8"
          />
          <path
            v-for="offset in [-0.5, 0.5]"
            :key="offset"
            :d="`M${mapPoint([edge.from[0], edge.from[1] + offset])} L${mapPoint([edge.to[0], edge.to[1] + offset])}`"
            stroke-width="3"
          />
        </g>
        <g v-if="railEdges(town).length" :transform="`translate(${mapPoint([-18, -23])})`">
          <path d="M-36 2H22" stroke="#50584f" stroke-width="9" stroke-dasharray="8 7" />
          <path d="M-38-16H-14V0H-38ZM-8-13H24V0H-8Z" fill="#a1825c" />
          <path d="M-9-20H4V0H-9ZM16-23H22V-11H16Z" fill="#5d7470" />
        </g>
        <path
          v-for="(track, index) in townTracks(town)"
          :key="`track-${index}`"
          :d="`M${mapPoint(track.from).join(' ')} L${mapPoint(track.to).join(' ')}`"
          :stroke-width="track.width * 14"
          stroke="#c8ac7f"
          stroke-linecap="round"
          fill="none"
        />
        <path
          d="M0 610q107-31 172 26t138 35m449 12q110-88 241-39"
          fill="none"
          stroke="#b6b381"
          stroke-width="45"
          opacity=".35"
        />
        <use
          v-for="(tree, i) in trees"
          :key="i"
          :href="`#${uid}-tree`"
          :transform="`translate(${tree[0]} ${tree[1]}) scale(${tree[2]})`"
        />
        <use
          v-for="(point, i) in cacti"
          :key="`c-${i}`"
          :href="`#${uid}-cactus`"
          :transform="`translate(${point[0]} ${point[1]})`"
        />
        <g stroke="#c1ac83" stroke-width="4" fill="none">
          <path
            d="m114 217 59 11m-53 6v-28m19 31v-28m20 31v-28M786 289l81-40m-77 49v-25m22 15v-28m23 16v-27m24 16v-26"
          />
        </g>
        <g fill="#bca783" opacity=".7">
          <ellipse
            v-for="n in 22"
            :key="n"
            :cx="65 + ((n * 137) % 860)"
            :cy="265 + ((n * 61) % 390)"
            :rx="2 + (n % 4)"
            ry="2"
          />
        </g>
      </g>
      <g :transform="`translate(${mapPoint(PLOTS.mine).join(' ')}) scale(.68)`">
        <TownMine :level="nextLevel" :stage="mineStage" @enter="$emit('mine')" />
      </g>
      <g
        v-for="building in orderedBuildings"
        :key="building.id"
        role="button"
        tabindex="0"
        :aria-label="
          t('Inspect {value0}: {value1}', {
            value0: t(building.name),
            value1: t(building.stages[town.buildings[building.id]]),
          })
        "
        :aria-pressed="selected === building.id"
        :transform="`translate(${building.x} ${building.y}) scale(.48)`"
        class="map-building"
        :data-town-plot="building.id"
        :class="{
          selected: selected === building.id,
          'is-repaired': town.buildings[building.id] > 0,
        }"
        @click="$emit('select', building.id)"
        @keydown.enter.prevent="$emit('select', building.id)"
        @keydown.space.prevent="$emit('select', building.id)"
      >
        <ellipse
          class="plot-ring"
          cy="3"
          rx="117"
          ry="45"
          fill="none"
          stroke="#ad8950"
          stroke-width="2"
          stroke-dasharray="5 6"
        />
        <g
          :key="`${town.buildings[building.id]}-${construction?.id === building.id ? construction.serial : 0}`"
          aria-hidden="true"
          transform="scale(.88)"
        >
          <g :class="{ 'town-site-assembling': animatedConstruction?.id === building.id }">
            <TownSite
              :id="building.id"
              :stage="town.buildings[building.id]"
              :era="town.buildingEras[building.id]"
              :wins="constructionVisual(town.projects[building.id])"
            />
          </g>
          <g v-if="animatedConstruction?.id === building.id" class="town-build-hammer">
            <image href="/art/rewards/builder-hammer.svg" x="65" y="-165" width="80" height="80" />
          </g>
        </g>
        <g
          v-if="indicators[building.id] === 'upgrade'"
          class="map-upgrade-sparkles"
          :class="indicators[building.id]"
          aria-hidden="true"
        >
          <text
            v-for="([x, y], i) in sparklePoints"
            :key="i"
            :x="x"
            :y="y"
            :style="{
              '--i': i,
              '--rise-y': `${building.kind === 'square' ? -20 : building.kind === 'well' ? -40 : -65}px`,
            }"
          >
            ✦
          </text>
        </g>
        <image
          v-if="['ready', 'coins', 'tnt'].includes(indicators[building.id])"
          class="map-action-icon"
          x="-28"
          y="-60"
          width="56"
          height="56"
          :href="
            indicators[building.id] === 'ready'
              ? '/art/rewards/builder-hammer.svg'
              : building.id === 'saloon'
                ? '/art/rewards/coins.svg'
                : '/art/powers/tnt.svg'
          "
          aria-hidden="true"
        />
        <g
          v-if="
            town.buildings[building.id] ||
            town.projects[building.id] ||
            availableIds.includes(building.id)
          "
          class="map-label"
          transform="translate(0 35)"
          aria-hidden="true"
        >
          <rect
            x="-67"
            y="-18"
            width="134"
            height="34"
            rx="17"
            :fill="
              constructionReady(town.projects[building.id]) || hasIncome(building.id)
                ? '#e1f0c0'
                : availableIds.includes(building.id)
                  ? '#d9f1fa'
                  : '#ffffff'
            "
          />
          <text
            y="5"
            text-anchor="middle"
            fill="#405b4c"
            font-size="19"
            font-family="Georgia, serif"
          >
            {{
              t(
                constructionReady(town.projects[building.id])
                  ? 'Tap to finish'
                  : hasIncome(building.id)
                    ? t('Collect {coins} coins', { coins: town.income.stored })
                    : building.id === 'blacksmith' && forgeCollectible
                      ? 'Collect 1 TNT'
                      : building.shortName,
              )
            }}
            <tspan v-if="town.buildings[building.id]" font-size="13">✓</tspan>
          </text>
        </g>
      </g>
      <g aria-hidden="true">
        <g class="tumbleweed-trail">
          <ellipse cy="5" rx="15" ry="5" fill="#77623b" opacity=".17" />
          <g class="tumbleweed-spin" fill="none" stroke="#aa8c50" stroke-width="2">
            <circle cy="-6" r="13" />
            <ellipse cy="-6" rx="7" ry="13" />
            <ellipse cy="-6" rx="13" ry="5" />
            <path d="m-10-15 20 18m-20-1 19-18M0-21V9" />
          </g>
        </g>
        <g v-if="population > 0" class="resident-walk resident-one" color="#ac7259">
          <use :href="`#${uid}-person`" />
        </g>
        <g v-if="population > 0" class="resident-walk resident-two" color="#718c87">
          <use :href="`#${uid}-person`" />
        </g>
        <g v-if="population > 2" class="resident-walk resident-three" color="#9a8b58">
          <use :href="`#${uid}-person`" />
        </g>
        <g
          v-if="population > 2"
          :transform="`translate(${mapPoint(atPlot('home', 1, 2)).join(' ')})`"
          color="#a97777"
        >
          <use :href="`#${uid}-person`" />
        </g>
        <g
          v-if="town.buildings.farm"
          :transform="`translate(${mapPoint(atPlot('farm', 1.4, 2)).join(' ')})`"
          color="#87945b"
        >
          <use :href="`#${uid}-person`" />
        </g>
        <g
          v-if="town.buildings.saloon"
          :transform="`translate(${mapPoint(atPlot('saloon', 0.8, 2)).join(' ')})`"
          color="#8c7891"
        >
          <use :href="`#${uid}-person`" />
        </g>
        <g
          v-if="town.buildings.sheriff"
          class="resident-walk sheriff-walk"
          :style="{ offsetPath: sheriffPath }"
          color="#315d83"
        >
          <g transform="scale(1.3)">
            <use :href="`#${uid}-person`" />
            <path d="m-2-15 1 2 2 .3-1.5 1.5.4 2-1.9-1-1.9 1 .4-2L-5-12.7l2-.3Z" fill="#ffd15b" />
          </g>
        </g>
        <g
          v-if="town.buildings.stable"
          :transform="`translate(${mapPoint(PLOTS.stable).join(' ')}) scale(.48) translate(-735 -455)`"
        >
          <g transform="translate(802 461)">
            <g class="horse-idle"><use :href="`#${uid}-horse`" /></g>
          </g>
          <g transform="translate(852 487) scale(.8)"><use :href="`#${uid}-horse`" /></g>
          <g transform="translate(887 446)">
            <path d="m-16-23 40 7v20l-40-7Z" fill="#a48556" />
            <path d="m24-16 12-8v20L24 4Z" fill="#7d704c" />
            <path d="m-16-23 12-8 40 7-12 8Z" fill="#d1bc8b" />
            <circle cx="-7" cy="0" r="10" fill="#625842" />
            <circle cx="21" cy="7" r="10" fill="#625842" />
            <path d="M-7-7V7m-7-7H0m21 0v14m-7-7h14" stroke="#c5ac78" stroke-width="2" />
          </g>
        </g>
        <g transform="translate(68 600)" fill="none" stroke="#9b9e77" opacity=".75">
          <circle r="24" />
          <path d="M0-32V32M-32 0H32" />
          <path d="M0-20-5 8 0 4 5 8Z" fill="#89936f" />
          <text
            y="-40"
            text-anchor="middle"
            stroke="none"
            fill="#7e8766"
            font-family="Georgia"
            font-size="13"
          >
            N
          </text>
        </g>
      </g>
    </svg>
  </div>
</template>
<script setup>
import { t } from '../../i18n';
import { computed, nextTick, ref, useId, watch } from 'vue';
import {
  constructionVisual,
  constructionReady,
  availablePurchases,
  buildingIndicators,
  plotUnlocked,
} from '../../game/town/TownRules';
import { BUILDINGS } from '../../data/town';
import {
  PLOTS,
  townTracks,
  railEdges,
  visiblePlots,
  mapPoint,
  atPlot,
  SHERIFF_PATROL,
} from '../../game/town/TownLayout';
import TownSite from './TownSite.vue';
import { RIVER, riverOutline, riverCenterX } from '../../game/town/TownRiver';
import TownMine from './TownMine.vue';
const props = defineProps({
  town: { type: Object, required: true },
  builderHammers: { type: Number, default: 0 },
  forgeCollectible: Boolean,
  selected: String,
  population: Number,
  mineStage: { type: Number, default: 0 },
  fullscreen: Boolean,
  reducedMotion: Boolean,
  paused: Boolean,
  nextLevel: { type: Number, required: true },
  construction: Object,
});
defineEmits(['select', 'mine']);
const scene = ref(null);
const animatedConstruction = ref(null);
watch(
  () => props.construction,
  (construction) => {
    animatedConstruction.value = props.reducedMotion ? null : construction;
  },
  { immediate: true },
);
watch(
  () => props.reducedMotion,
  (reduced) => {
    if (reduced) animatedConstruction.value = null;
  },
);
const sheriffPath = `path("M${SHERIFF_PATROL.map((point) => mapPoint(point).join(' ')).join(' L')} Z")`;
const mapWidth = computed(() =>
  Math.max(1370, ...visiblePlots(props.town).map(({ position }) => mapPoint(position)[0] + 120)),
);
const land = computed(() => {
  const north = Math.min(
    95,
    ...visiblePlots(props.town).map(({ position }) => mapPoint(position)[1] - 60),
  );
  return `M0 ${north}Q197 ${north - 20} 401 ${north + 5}T${mapWidth.value} ${north - 10}V650L550 730 0 650Z`;
});
function resetView() {
  scene.value?.style.removeProperty('--look-x');
  scene.value?.style.removeProperty('--look-y');
}
function lookAround(event) {
  if (event.pointerType !== 'mouse' || props.paused || props.reducedMotion || props.fullscreen)
    return;
  const bounds = event.currentTarget.getBoundingClientRect();
  scene.value.style.setProperty(
    '--look-x',
    ((event.clientX - bounds.left) / bounds.width - 0.5).toFixed(3),
  );
  scene.value.style.setProperty(
    '--look-y',
    ((event.clientY - bounds.top) / bounds.height - 0.5).toFixed(3),
  );
}
watch(() => props.paused || props.reducedMotion, resetView);
watch(
  () => props.fullscreen,
  async (open) => {
    resetView();
    await nextTick();
    if (scene.value)
      scene.value.scrollLeft = open ? (scene.value.scrollWidth - scene.value.clientWidth) / 2 : 0;
  },
);
const sparklePoints = [
  [-110, -15],
  [-105, 5],
  [-75, 23],
  [-25, 32],
  [25, 32],
  [75, 23],
  [105, 5],
  [110, -15],
];
const hasIncome = (id) => id === 'saloon' && props.town.income.stored > 0;
const indicators = computed(() => buildingIndicators(props.town, props.forgeCollectible));
const availableIds = computed(() =>
  availablePurchases(props.town, props.builderHammers).map(({ id }) => id),
);
const uid = `town-${useId().replaceAll(':', '')}`;
const orderedBuildings = computed(() =>
  BUILDINGS.filter((b) => plotUnlocked(props.town, b.id))
    .map((b) => {
      const [x, y] = mapPoint(PLOTS[b.id]);
      return { ...b, x, y };
    })
    .sort((a, b) => a.y - b.y),
);
const trees = [
  [45, 230, 0.85],
  [85, 180, 0.65],
  [944, 175, 0.9],
  [971, 260, 0.7],
  [38, 420, 0.75],
  [55, 535, 0.9],
  [850, 627, 0.8],
  [926, 585, 0.95],
  [220, 660, 0.65],
  [785, 685, 0.7],
];
const cacti = [
  [40, 330],
  [960, 380],
  [315, 670],
  [690, 681],
];
</script>
<style scoped>
.town-site-assembling {
  animation: town-assemble 1s ease-out both;
}
.town-build-hammer {
  transform-box: fill-box;
  transform-origin: bottom right;
  animation: town-hammer-tap 1s ease-in-out both;
}
@keyframes town-assemble {
  0% {
    clip-path: inset(100% 0 0);
    transform: translateY(-12px);
  }
  75%,
  100% {
    clip-path: inset(0);
    transform: translateY(0);
  }
}
@keyframes town-hammer-tap {
  0%,
  22%,
  44% {
    opacity: 1;
    transform: rotate(-35deg);
  }
  11%,
  33%,
  55% {
    opacity: 1;
    transform: rotate(15deg);
  }
  75%,
  100% {
    opacity: 0;
    transform: rotate(-35deg);
  }
}
.town-map-paused .town-site-assembling,
.town-map-paused .town-build-hammer {
  animation-play-state: paused;
}
</style>
