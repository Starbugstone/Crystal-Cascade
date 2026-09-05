<template>
  <dialog
    ref="dialog"
    class="settings-drawer"
    @cancel.prevent="$emit('close')"
    @click="closeBackdrop"
  >
    <header>
      <div>
        <span class="eyebrow">MAKE IT YOURS</span>
        <h2>A moment of calm</h2>
      </div>
      <button class="icon-button" aria-label="Close settings" @click="$emit('close')">
        <GameIcon name="close" />
      </button>
    </header>
    <p class="settings-intro">Set the mood for your next cascade.</p>
    <label
      ><span
        >Music <small>{{ Math.round(settings.musicVolume * 100) }}%</small></span
      ><input
        type="range"
        min="0"
        max="1"
        step="0.05"
        :value="settings.musicVolume"
        @input="settings.setMusicVolume($event.target.value)"
    /></label>
    <label
      ><span
        >Sound effects <small>{{ Math.round(settings.sfxVolume * 100) }}%</small></span
      ><input
        type="range"
        min="0"
        max="1"
        step="0.05"
        :value="settings.sfxVolume"
        @input="settings.setSfxVolume($event.target.value)"
    /></label>
    <label class="toggle-row"
      ><span>Reduced motion<small>Gentler movement, without bursts or flashes.</small></span
      ><input
        type="checkbox"
        :checked="settings.reducedMotion"
        @change="settings.setReducedMotion($event.target.checked)"
    /></label>
    <label class="toggle-row"
      ><span>High contrast<small>Stronger outlines and brighter text.</small></span
      ><input
        type="checkbox"
        :checked="settings.highContrastMode"
        @change="settings.setHighContrast($event.target.checked)"
    /></label>
    <div class="keyboard-guide">
      <span class="eyebrow">PLAY YOUR WAY</span>
      <p>
        Swipe or tap neighboring gems.<br />Keyboard: arrows to explore, Enter to select.<br />Shift
        + arrow to swap. Esc to cancel.
      </p>
    </div>
  </dialog>
</template>
<script setup>
import { ref, watch } from 'vue';
import { useSettingsStore } from '../stores/settingsStore';
import GameIcon from './GameIcon.vue';
const props = defineProps({ open: Boolean });
const emit = defineEmits(['close']);
const dialog = ref(null);
const settings = useSettingsStore();
watch(
  () => props.open,
  (open) => {
    if (open) dialog.value?.showModal();
    else dialog.value?.close();
  },
  { flush: 'post' },
);
const closeBackdrop = (event) => {
  if (event.target === dialog.value) {
    const r = dialog.value.getBoundingClientRect();
    if (
      event.clientX < r.left ||
      event.clientX > r.right ||
      event.clientY < r.top ||
      event.clientY > r.bottom
    )
      emit('close');
  }
};
</script>
<style scoped>
.settings-drawer {
  position: fixed;
  inset: 0 0 0 auto;
  width: min(390px, 92vw);
  height: 100dvh;
  max-height: 100dvh;
  margin: 0;
  padding: 34px 27px;
  background: #1d1629;
  color: var(--color-foreground);
  border: 0;
  border-left: 1px solid #84619e;
  box-shadow: -20px 0 70px #09050d88;
}
.settings-drawer::backdrop {
  background: #090612ad;
  backdrop-filter: blur(4px);
}
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
h2 {
  font-family: var(--font-heading);
  font-size: 25px;
  font-weight: 400;
  margin-top: 8px;
}
.settings-intro {
  color: #b5a3c4;
  font-size: 12px;
  line-height: 1.6;
  margin: 20px 0 35px;
}
label {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 30px;
  font-size: 13px;
}
label > span {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
small {
  color: #ae9dbd;
  font-size: 11px;
}
input {
  accent-color: #c29ae8;
}
input[type='range'] {
  width: 100%;
}
.toggle-row {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid var(--line);
  padding-top: 24px;
}
.toggle-row > span {
  display: block;
}
.toggle-row small {
  display: block;
  margin-top: 9px;
  line-height: 1.6;
}
input[type='checkbox'] {
  width: 19px;
  height: 19px;
  flex-shrink: 0;
}
.keyboard-guide {
  border-top: 1px solid var(--line);
  padding-top: 24px;
}
.keyboard-guide p {
  font-size: 11px;
  line-height: 2;
  color: #ac98bc;
  margin-top: 12px;
}
</style>
