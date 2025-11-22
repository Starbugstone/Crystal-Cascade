<template>
  <div
    class="app-shell"
    :class="{ 'board-fullscreen': isBoardFullscreen }"
    :style="isBoardFullscreen ? { '--fullscreen-header': `${Math.round(headerSize)}px`, ...fullscreenVars } : null"
  >
    <header class="app-header" ref="headerRef">
      <h1>Crystal Cascade</h1>
      <div class="header-actions">
        <button
          v-if="gameStore.sessionActive"
          class="exit-button"
          @click="gameStore.exitLevel()"
          :disabled="!gameStore.sessionActive"
        >
          ⟲ Levels
        </button>
        <button
          class="fullscreen-button"
          type="button"
          :aria-pressed="isBoardFullscreen"
          @click="toggleBoardFullscreen()"
        >
          {{ isBoardFullscreen ? '⤡ Exit Fullscreen' : '⤢ Fullscreen' }}
        </button>
        <button class="settings-button" @click="settingsStore.toggleSettings()">⚙️</button>
      </div>
    </header>

    <main class="app-main">
      <section class="board-wrapper">
        <BoardCanvas :fullscreen="isBoardFullscreen" />
        <aside class="board-rail">
          <!-- Bonus icons / slide-out trigger area -->
        </aside>
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
    <VictoryModal
      v-if="gameStore.levelCleared"
      :score="gameStore.score"
      :moves="gameStore.moves" 
      :max-combo="gameStore.cascadeMultiplier"
      :has-next-level="hasNextLevel"
      @menu="handleVictoryMenu"
      @replay="handleVictoryReplay"
      @next="handleVictoryNext"
    />
    <SettingsDrawer
      :open="settingsStore.isSettingsOpen"
      @close="settingsStore.toggleSettings(false)"
    />
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import BoardCanvas from './components/BoardCanvas.vue';
import HudPanel from './components/HudPanel.vue';
import PowerUpBar from './components/PowerUpBar.vue';
import LevelSelectModal from './components/LevelSelectModal.vue';
import VictoryModal from './components/VictoryModal.vue';
import SettingsDrawer from './components/SettingsDrawer.vue';
import { useGameStore } from './stores/gameStore';
import { useSettingsStore } from './stores/settingsStore';
import { useAudio } from './composables/useAudio';

const gameStore = useGameStore();
const settingsStore = useSettingsStore();
const isBoardFullscreen = ref(false);
const headerRef = ref(null);
const headerSize = ref(72);
const viewportHeight = ref(typeof window !== 'undefined' ? window.innerHeight : 0);
const audio = useAudio();
const { playAmbientLoop, stopAmbientLoop } = audio;
gameStore.setAudioManager(audio);

const updateHeaderMetrics = () => {
  if (headerRef.value) {
    headerSize.value = headerRef.value.offsetHeight ?? 72;
  }
};

const updateViewportSize = () => {
  if (typeof window !== 'undefined') {
    viewportHeight.value = window.innerHeight;
  }
};

const toggleBoardFullscreen = (nextState) => {
  const target =
    typeof nextState === 'boolean' ? nextState : !isBoardFullscreen.value;
  isBoardFullscreen.value = target;
};

onMounted(() => {
  gameStore.bootstrap();
  nextTick(() => {
    updateHeaderMetrics();
    updateViewportSize();
  });
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', updateHeaderMetrics);
    window.addEventListener('resize', updateViewportSize);
  }
});

onBeforeUnmount(() => {
  if (typeof document !== 'undefined') {
    document.body.style.overflow = '';
  }
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateHeaderMetrics);
    window.removeEventListener('resize', updateViewportSize);
  }
  gameStore.setAudioManager(null);
});

watch(isBoardFullscreen, (active) => {
  if (typeof document !== 'undefined') {
    document.body.style.overflow = active ? 'hidden' : '';
  }

  nextTick(() => {
    updateHeaderMetrics();
    updateViewportSize();
    if (active != null && gameStore.renderer) {
      setTimeout(() => {
        gameStore.refreshBoardVisuals(true);
      }, 60);
    }
  });
});

watch(
  () => gameStore.sessionActive,
  (active) => {
    if (active) {
      playAmbientLoop();
      return;
    }
    stopAmbientLoop({ fadeMs: 600 });
    if (isBoardFullscreen.value) {
      toggleBoardFullscreen(false);
    }
  },
);

const fullscreenVars = computed(() => ({
  '--viewport-height': viewportHeight.value ? `${viewportHeight.value}px` : null,
}));

const hasNextLevel = computed(() => {
  if (!gameStore.currentLevelId) return false;
  const nextId = gameStore.currentLevelId + 1;
  return gameStore.availableLevels.some(l => l.id === nextId);
});

const handleVictoryMenu = () => {
  gameStore.exitLevel();
};

const handleVictoryReplay = () => {
  if (gameStore.currentLevelId) {
    gameStore.startLevel(gameStore.currentLevelId);
  }
};

const handleVictoryNext = () => {
  if (hasNextLevel.value) {
    gameStore.startLevel(gameStore.currentLevelId + 1);
  }
};
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

.fullscreen-button {
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(30, 41, 59, 0.6);
  color: var(--color-accent);
  padding: 0.35rem 0.9rem;
  border-radius: 999px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 150ms ease, background 150ms ease;
}

.fullscreen-button:hover {
  transform: translateY(-2px);
  background: rgba(59, 130, 246, 0.45);
}

.fullscreen-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  transform: none;
  background: rgba(30, 41, 59, 0.45);
}

.app-main {
  flex: 1;
  display: flex;
  align-items: stretch;
  gap: 1.75rem;
  padding: clamp(1rem, 2.5vw, 2rem);
  min-height: 0;
}

.board-wrapper {
  flex: 1 1 auto;
  min-width: 0;
  min-height: clamp(420px, calc(100vh - 160px), 100vh);
  max-width: min(100%, 1680px);
  background: rgba(15, 23, 42, 0.6);
  border-radius: 16px;
  padding: clamp(0.85rem, 1.8vw, 1.5rem);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.4);
  position: relative;
  display: flex;
  gap: clamp(0.75rem, 1.25vw, 1.75rem);
}

.board-rail {
  flex: 0 0 clamp(2.5rem, 6vw, 4.5rem);
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 1rem;
}

.hud-wrapper {
  flex: 0 0 clamp(260px, 24vw, 340px);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.app-shell.board-fullscreen {
  height: 100vh;
  overflow: hidden;
}

.app-shell.board-fullscreen .app-main {
  flex: 1;
  flex-direction: column;
  gap: clamp(0.75rem, 2vw, 1.5rem);
  padding: clamp(0.5rem, 2vw, 1.5rem);
  height: calc(100vh - var(--fullscreen-header, 72px));
}

.app-shell.board-fullscreen .board-wrapper {
  max-width: none;
  width: 100%;
  height: 100%;
  min-height: 0;
  border-radius: clamp(0.75rem, 2vw, 1.5rem);
  padding: clamp(0.75rem, 2vw, 1.5rem);
  background: rgba(15, 23, 42, 0.7);
  display: flex;
  gap: clamp(0.75rem, 1.25vw, 1.75rem);
  justify-content: center;
  align-items: center;
}

.app-shell.board-fullscreen .board-rail,
.app-shell.board-fullscreen .hud-wrapper {
  display: none;
}

@media (max-width: 1200px) {
  .board-rail {
    flex-basis: clamp(2rem, 8vw, 3.5rem);
  }

  .hud-wrapper {
    flex-basis: clamp(240px, 30vw, 320px);
  }
}

@media (max-width: 1024px) {
  .app-main {
    flex-direction: column;
    padding: clamp(1rem, 3vw, 1.75rem);
  }

  .board-wrapper {
    display: block;
    max-width: 100%;
    padding: clamp(0.75rem, 3vw, 1.25rem);
    min-height: auto;
    height: auto;
  }

  .board-rail {
    display: none;
  }

  .hud-wrapper {
    order: -1;
    flex: 1 1 auto;
  }
}

@media (max-width: 640px) {
  .app-header {
    padding: 1rem;
  }

  .app-main {
    padding: 0.75rem;
    gap: 1.25rem;
  }

  .board-wrapper {
    border-radius: 12px;
    padding: 0.75rem;
    min-height: auto;
  }
}
</style>
