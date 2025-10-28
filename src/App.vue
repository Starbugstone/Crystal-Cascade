<template>
  <div class="app-shell">
    <header class="app-header">
      <h1>Crystal Cascade</h1>
      <div class="header-actions">
        <button
          v-if="gameStore.sessionActive"
          class="exit-button"
          @click="gameStore.exitLevel()"
        >
          ⟲ Levels
        </button>
        <button class="settings-button" @click="settingsStore.toggleSettings()">⚙️</button>
      </div>
    </header>

    <main class="app-main">
      <section class="board-wrapper">
        <BoardCanvas />
      </section>
      <section class="hud-wrapper">
        <HudPanel />
        <PowerUpBar />
      </section>
    </main>

    <LevelSelectModal
      v-if="!gameStore.sessionActive"
      @start-level="gameStore.startLevel"
    />
    <SettingsDrawer
      :open="settingsStore.isSettingsOpen"
      @close="settingsStore.toggleSettings(false)"
    />
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import BoardCanvas from './components/BoardCanvas.vue';
import HudPanel from './components/HudPanel.vue';
import PowerUpBar from './components/PowerUpBar.vue';
import LevelSelectModal from './components/LevelSelectModal.vue';
import SettingsDrawer from './components/SettingsDrawer.vue';
import { useGameStore } from './stores/gameStore';
import { useSettingsStore } from './stores/settingsStore';

const gameStore = useGameStore();
const settingsStore = useSettingsStore();

onMounted(() => {
  gameStore.bootstrap();
});
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--color-background);
  color: var(--color-foreground);
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  background: var(--color-header);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.app-header h1 {
  font-family: var(--font-heading);
  font-size: 1.75rem;
  margin: 0;
}

.settings-button {
  background: transparent;
  border: none;
  font-size: 1.5rem;
  color: var(--color-accent);
  cursor: pointer;
  transition: transform 150ms ease;
}

.settings-button:hover {
  transform: rotate(20deg);
}

.exit-button {
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: rgba(30, 41, 59, 0.7);
  color: var(--color-accent);
  padding: 0.35rem 0.9rem;
  border-radius: 999px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 150ms ease, background 150ms ease;
}

.exit-button:hover {
  transform: translateY(-2px);
  background: rgba(59, 130, 246, 0.35);
}

.app-main {
  flex: 1;
  display: grid;
  grid-template-columns: minmax(0, 640px) minmax(260px, 1fr);
  gap: 2rem;
  padding: 2rem;
}

.board-wrapper {
  background: rgba(15, 23, 42, 0.6);
  border-radius: 16px;
  padding: 1rem;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.4);
}

.hud-wrapper {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

@media (max-width: 1024px) {
  .app-main {
    grid-template-columns: 1fr;
    padding: 1.5rem;
  }

  .hud-wrapper {
    order: -1;
  }
}

@media (max-width: 640px) {
  .app-header {
    padding: 1rem;
  }

  .app-main {
    padding: 1rem;
  }
}
</style>
