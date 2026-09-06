<template>
  <dialog
    ref="dialog"
    class="settings-drawer"
    @cancel.prevent="$emit('close')"
    @click="closeBackdrop"
  >
    <header>
      <div>
        <span class="eyebrow"> {{ t('MAKE IT YOURS') }} </span>
        <h2>{{ t('A moment of calm') }}</h2>
      </div>
      <button class="icon-button" :aria-label="t('Close settings')" @click="$emit('close')">
        <GameIcon name="close" />
      </button>
    </header>
    <p class="settings-intro">{{ t('Set the mood for your next cascade.') }}</p>
    <label
      ><span>
        {{ t('Music') }} <small>{{ t(Math.round(settings.musicVolume * 100)) }}%</small></span
      ><input
        type="range"
        min="0"
        max="1"
        step="0.05"
        :value="settings.musicVolume"
        @input="settings.setMusicVolume($event.target.value)"
    /></label>
    <label
      ><span>
        {{ t('Sound effects') }} <small>{{ t(Math.round(settings.sfxVolume * 100)) }}%</small></span
      ><input
        type="range"
        min="0"
        max="1"
        step="0.05"
        :value="settings.sfxVolume"
        @input="settings.setSfxVolume($event.target.value)"
    /></label>
    <label class="toggle-row"
      ><span>
        {{ t('Reduced motion') }}
        <small> {{ t('Gentler movement, without bursts or flashes.') }} </small></span
      ><input
        type="checkbox"
        :checked="settings.reducedMotion"
        @change="settings.setReducedMotion($event.target.checked)"
    /></label>
    <label class="toggle-row"
      ><span>
        {{ t('High contrast') }}
        <small> {{ t('Stronger outlines and brighter text.') }} </small></span
      ><input
        type="checkbox"
        :checked="settings.highContrastMode"
        @change="settings.setHighContrast($event.target.checked)"
    /></label>
    <p class="audio-credits">
      <a :href="audioCreditsUrl" target="_blank" rel="noopener">{{ t('Audio credits') }}</a>
    </p>
    <div class="keyboard-guide">
      <span class="eyebrow"> {{ t('PLAY YOUR WAY') }} </span>
      <p>
        {{ t('Swipe or tap neighboring gems.') }} <br />
        {{ t('Keyboard: arrows to explore, Enter to select.') }} <br />
        {{ t('Shift + arrow to swap. Esc to cancel.') }}
      </p>
    </div>
    <div class="testing-reset">
      <button v-if="!confirmReset" class="text-button" @click="confirmReset = true">
        {{ t('Reset progress for testing') }}
      </button>
      <template v-else>
        <p>
          {{
            t(
              'Reset all progress on this device? Your town, completed levels, and power-ups will start over.',
            )
          }}
        </p>
        <div>
          <button @click="resetProgress">{{ t('Reset all progress') }}</button
          ><button @click="confirmReset = false">{{ t('Cancel') }}</button>
        </div>
      </template>
    </div>
  </dialog>
</template>
<script setup>
import { t } from '../i18n';
import { ref, watch } from 'vue';
import { useSettingsStore } from '../stores/settingsStore';
import GameIcon from './GameIcon.vue';
const props = defineProps({ open: Boolean });
const emit = defineEmits(['close', 'reset-progress']);
const confirmReset = ref(false);
function resetProgress() {
  emit('reset-progress');
  confirmReset.value = false;
  emit('close');
}
const dialog = ref(null);
const settings = useSettingsStore();
const audioCreditsUrl = `${import.meta.env.BASE_URL}sound/village/credits.html`;
watch(
  () => props.open,
  (open) => {
    confirmReset.value = false;
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
.audio-credits a {
  color: inherit;
  font-size: 12px;
  text-underline-offset: 3px;
}
.testing-reset {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #84619e55;
}
.testing-reset p {
  color: #d6c4db;
  font-size: 12px;
  line-height: 1.7;
}
.testing-reset > div {
  display: flex;
  gap: 10px;
  margin-top: 14px;
}
.testing-reset button {
  padding: 10px;
  border: 1px solid #93789c;
  border-radius: 6px;
  background: transparent;
  color: #ead3e4;
  font-size: 12px;
}
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
