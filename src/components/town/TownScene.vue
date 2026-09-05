<template>
  <TownMap
    v-if="fallback"
    v-bind="$props"
    @select="$emit('select', $event)"
    @mine="$emit('mine')"
  />
  <div v-else class="town-scene" :aria-label="t('Interactive 3D town')">
    <canvas ref="canvas" aria-hidden="true" @pointerdown="rememberPointer" @pointerup="pick" />
    <div class="town-scene-labels" role="group" :aria-label="t('Choose a plot or enter the mine')">
      <button
        v-for="anchor in anchors"
        :key="anchor.id"
        :style="{ left: `${anchor.x}%`, top: `${anchor.y}%` }"
        :class="{ 'scene-mine-button': anchor.id === 'mine', selected: anchor.id === selected }"
        :aria-label="
          t(
            anchor.id === 'mine'
              ? t('Enter the mine: play level {level}', { level: nextLevel })
              : t('Choose {building}', { building: t(BUILDING_BY_ID[anchor.id].name) }),
          )
        "
        :aria-pressed="anchor.id === 'mine' ? undefined : anchor.id === selected"
        @click="choose(anchor.id)"
      >
        {{ t(anchor.id === 'mine' ? t('Mine') : t(BUILDING_BY_ID[anchor.id].shortName)) }}
        <small v-if="anchor.id === 'mine'">{{ t('Level {level}', { level: nextLevel }) }} →</small>
        <small v-else-if="town.projects[anchor.id]"
          >{{ town.projects[anchor.id].wins }}/{{
            projectRuns(town.projects[anchor.id].stage)
          }}</small
        >
        <span v-else-if="town.buildings[anchor.id]" aria-hidden="true">✓</span>
        <span v-else aria-hidden="true">+</span>
      </button>
    </div>
  </div>
</template>
<script setup>
import { onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { BUILDING_BY_ID, BUILDINGS } from '../../data/town';
import { projectRuns } from '../../game/town/TownRules';
import { t, locale } from '../../i18n';
import TownMap from './TownMap.vue';
const props = defineProps({
  town: Object,
  selected: String,
  population: Number,
  reducedMotion: Boolean,
  paused: Boolean,
  revealing: String,
  nextLevel: Number,
});
const emit = defineEmits(['select', 'mine']);
const canvas = ref(null),
  anchors = ref([]),
  fallback = ref(false);
let scene,
  disposed = false,
  pointer;
const choose = (id) => (id === 'mine' ? emit('mine') : emit('select', id));
const rememberPointer = (event) => {
  pointer = [event.clientX, event.clientY];
};
const pick = (event) => {
  if (pointer && Math.hypot(event.clientX - pointer[0], event.clientY - pointer[1]) < 8)
    scene?.pick(event.clientX, event.clientY);
  pointer = null;
};
function update() {
  if (!scene) return;
  const labels = Object.fromEntries(
    BUILDINGS.map((building) => [building.id, t(building.shortName)]),
  );
  scene.update(props.town, { ...labels, mine: t('Mine') });
  scene.select(props.selected);
  scene.setMotion(!props.paused && !props.reducedMotion);
}
onMounted(async () => {
  try {
    const { TownDiorama } = await import('../../game/town/TownDiorama');
    if (disposed) return;
    scene = new TownDiorama(canvas.value, choose, (positions) => {
      anchors.value = positions;
    });
    update();
  } catch (error) {
    scene?.dispose();
    scene = null;
    if (!disposed) fallback.value = true;
    console.warn('3D town unavailable; using the accessible SVG scene.', error);
  }
});
watch(
  () => [JSON.stringify(props.town.buildings), JSON.stringify(props.town.projects), locale.value],
  update,
);
watch(
  () => props.selected,
  (id) => scene?.select(id),
);
watch(
  () => props.paused || props.reducedMotion,
  (paused) => scene?.setMotion(!paused),
);
onBeforeUnmount(() => {
  disposed = true;
  scene?.dispose();
});
</script>
