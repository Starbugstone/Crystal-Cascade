<template>
  <TownMap
    v-if="fallback"
    v-bind="$props"
    @select="$emit('select', $event)"
    @mine="$emit('mine')"
  />
  <div
    v-else
    class="town-scene"
    :aria-label="t('Interactive 3D town')"
    @pointerdown="rememberPointer"
    @pointermove="movePointer"
    @pointerup="pick"
    @pointercancel="cancelPointer"
    @lostpointercapture="cancelPointer"
  >
    <canvas
      ref="canvas"
      tabindex="0"
      :aria-label="t('Town camera. Arrow keys rotate, plus and minus zoom, Home resets the view.')"
      @keydown="cameraKey"
    />
    <div class="town-scene-labels" role="group" :aria-label="t('Choose a plot or enter the mine')">
      <button
        v-for="anchor in anchors"
        :key="anchor.id"
        :data-town-plot="anchor.id"
        v-show="anchor.visible"
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
        @click="chooseLabel(anchor.id, $event)"
      >
        {{ t(anchor.id === 'mine' ? t('Mine') : t(BUILDING_BY_ID[anchor.id].shortName)) }}
        <small v-if="anchor.id === 'mine'">{{ t('Level {level}', { level: nextLevel }) }} →</small>
        <small v-else-if="town.projects[anchor.id]"
          >{{ town.projects[anchor.id].wins }}/{{
            constructionRuns(town.projects[anchor.id])
          }}</small
        >
        <span v-else-if="town.buildings[anchor.id]" aria-hidden="true">✓</span>
        <span v-else aria-hidden="true">+</span>
      </button>
    </div>
    <div class="town-camera-bar">
      <p class="town-camera-hint">
        <span class="camera-mouse-hint">{{ t('Drag to rotate · Scroll to zoom') }}</span>
        <span class="camera-touch-hint">{{ t('Drag to rotate · Pinch to zoom') }}</span>
      </p>
      <div
        class="town-camera-controls"
        role="group"
        :aria-label="t('Camera controls')"
        @pointerdown.stop
        @pointerup.stop
        @pointermove.stop
      >
        <button
          v-for="action in cameraActions"
          :key="action.id"
          :aria-label="t(action.label)"
          :title="t(action.label)"
          @click="scene?.cameraAction(action.id)"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path :d="action.path" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>
<script setup>
import { onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { BUILDING_BY_ID, BUILDINGS } from '../../data/town';
import { constructionRuns } from '../../game/town/TownRules';
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
const cameraActions = [
  { id: 'out', label: 'Zoom out', path: 'M6 12h12' },
  { id: 'in', label: 'Zoom in', path: 'M6 12h12M12 6v12' },
  { id: 'left', label: 'Rotate left', path: 'm8 7-4 4 4 4M4 11h10a5 5 0 0 1 0 10' },
  { id: 'right', label: 'Rotate right', path: 'm16 7 4 4-4 4m4-4H10a5 5 0 0 0 0 10' },
  { id: 'reset', label: 'Reset view', path: 'M4 9a8 8 0 1 1 0 6M4 4v5h5M12 9v3l2 2' },
];
let scene,
  disposed = false,
  dragged = false;
const pointers = new Map();
const choose = (id) => (id === 'mine' ? emit('mine') : emit('select', id));
const chooseLabel = (id, event) => {
  // Pointer taps are settled on pointerup; keep native keyboard/AT activation.
  if (event.detail === 0) choose(id);
};
const rememberPointer = (event) => {
  pointers.delete(event.pointerId);
  if (!pointers.size) dragged = false;
  pointers.set(event.pointerId, [
    event.clientX,
    event.clientY,
    event.target.closest('[data-town-plot]')?.dataset.townPlot,
  ]);
  if (pointers.size > 1 || event.button !== 0) dragged = true;
};
const movePointer = (event) => {
  const start = pointers.get(event.pointerId);
  if (start && Math.hypot(event.clientX - start[0], event.clientY - start[1]) > 6) dragged = true;
};
const pick = (event) => {
  movePointer(event);
  const start = pointers.get(event.pointerId);
  const tap = start && !dragged;
  pointers.delete(event.pointerId);
  if (tap) {
    if (start[2]) choose(start[2]);
    else scene?.pick(event.clientX, event.clientY);
  }
};
const cancelPointer = (event) => {
  if (!pointers.has(event.pointerId)) return;
  dragged = true;
  pointers.delete(event.pointerId);
};
const cameraKey = (event) => {
  const action = {
    ArrowLeft: 'left',
    ArrowRight: 'right',
    ArrowUp: 'up',
    ArrowDown: 'down',
    '+': 'in',
    '=': 'in',
    '-': 'out',
    Home: 'reset',
  }[event.key];
  if (!action) return;
  event.preventDefault();
  scene?.cameraAction(action);
};
function update() {
  if (!scene) return;
  const labels = Object.fromEntries(
    BUILDINGS.map((building) => [building.id, t(building.shortName)]),
  );
  scene.update(props.town, { ...labels, mine: t('Mine') });
  scene.select(props.selected);
  scene.setMotion(!props.paused && !props.reducedMotion);
  scene.setPaused(props.paused);
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
watch(
  () => props.paused,
  (paused) => scene?.setPaused(paused),
);
onBeforeUnmount(() => {
  disposed = true;
  scene?.dispose();
});
</script>
