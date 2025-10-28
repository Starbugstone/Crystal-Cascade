<template>
  <transition name="drawer">
    <aside v-if="open" class="settings-drawer">
      <header>
        <h2>Settings</h2>
        <button @click="$emit('close')">✕</button>
      </header>
      <section>
        <label>
          <span>Music Volume</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            :value="settingsStore.musicVolume"
            @input="settingsStore.setMusicVolume($event.target.value)"
          />
        </label>
        <label>
          <span>SFX Volume</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            :value="settingsStore.sfxVolume"
            @input="settingsStore.setSfxVolume($event.target.value)"
          />
        </label>
        <label class="toggle-row">
          <input
            type="checkbox"
            :checked="settingsStore.reducedMotion"
            @change="settingsStore.setReducedMotion($event.target.checked)"
          />
          <span>Reduced Motion</span>
        </label>
        <label class="toggle-row">
          <input
            type="checkbox"
            :checked="settingsStore.highContrastMode"
            @change="settingsStore.setHighContrast($event.target.checked)"
          />
          <span>High Contrast Mode</span>
        </label>
      </section>
    </aside>
  </transition>
</template>

<script setup>
import { defineProps } from 'vue';
import { useSettingsStore } from '../stores/settingsStore';

defineProps({
  open: {
    type: Boolean,
    default: false,
  },
});

const settingsStore = useSettingsStore();
</script>

<style scoped>
.settings-drawer {
  position: fixed;
  top: 0;
  right: 0;
  width: min(320px, 90vw);
  height: 100dvh;
  background: rgba(15, 23, 42, 0.95);
  backdrop-filter: blur(12px);
  box-shadow: -12px 0 30px rgba(2, 6, 23, 0.6);
  padding: 2rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  z-index: 40;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--color-accent);
}

header button {
  border: none;
  background: rgba(51, 65, 85, 0.6);
  color: inherit;
  border-radius: 999px;
  width: 32px;
  height: 32px;
  cursor: pointer;
}

section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  color: var(--color-foreground);
}

label {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 0.95rem;
}

.toggle-row {
  flex-direction: row;
  align-items: center;
  gap: 0.75rem;
}

.drawer-enter-active,
.drawer-leave-active {
  transition: transform 200ms ease, opacity 200ms ease;
}

.drawer-enter-from,
.drawer-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>
