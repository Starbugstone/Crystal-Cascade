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
      <section
        class="board-wrapper"
        :class="{
          'cursor-hammer': gameStore.activeBonusMode === 'hammer',
      'cursor-color-wand': gameStore.activeBonusMode === 'color_wand',
      'cursor-tile-breaker': gameStore.activeBonusMode === 'tile_breaker'
    }"
  >
        <transition name="reshuffle-banner">
          <div
            v-if="gameStore.reshuffleNotice"
            class="reshuffle-banner"
            role="status"
            aria-live="polite"
          >
            {{ gameStore.reshuffleNotice?.message }}
          </div>
        </transition>        <BoardCanvas :fullscreen="isBoardFullscreen" />
        <div v-if="isBoardFullscreen" class="fullscreen-hud">
          <PowerUpBar :compact="true" class="fullscreen-powerups" />
        </div>
        <aside class="board-rail">
          <!-- Bonus icons / slide-out trigger area -->
        </aside>
      </section>
      <section class="hud-wrapper">
        <HudPanel />
        <PowerUpBar ref="powerUpBarRef" @button-flash="flashPowerButton" />
        <!-- Dev Section (temporary for testing) -->
        <div class="dev-section">
          <h4>🔧 Dev Tools</h4>
          <button @click="rollLootbox" class="dev-button">
            🎁 Obtain Lootbox Power
          </button>
          <transition name="loot-result">
            <p v-if="lastLootResult" class="loot-result" :style="{ color: lastLootResult.color }">
              +1 {{ lastLootResult.label }} ({{ lastLootResult.rarity }})
            </p>
          </transition>
        </div>
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
      :max-combo="gameStore.maxCascade"
      :score-target="scoreTarget"
      :has-next-level="hasNextLevel"
      @menu="handleVictoryMenu"
      @replay="handleVictoryReplay"
      @next="handleVictoryNext"
    />
    <SettingsDrawer
      :open="settingsStore.isSettingsOpen"
      @close="settingsStore.toggleSettings(false)"
    />
    
    <!-- Lootbox Animation Overlay -->
    <LootboxAnimation
      :active="lootboxAnimating"
      :power-id="pendingLootResult?.powerId"
      :power-label="pendingLootResult?.label"
      :rarity="pendingLootResult?.rarity"
      :rarity-color="pendingLootResult?.color"
      :target-button-rect="targetButtonRect"
      @complete="onLootboxAnimationComplete"
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
import LootboxAnimation from './components/LootboxAnimation.vue';
import { useGameStore } from './stores/gameStore';
import { useInventoryStore } from './stores/inventoryStore';
import { useSettingsStore } from './stores/settingsStore';
import { useAudio } from './composables/useAudio';
import { lootboxService } from './game/engine/LootboxService';

const gameStore = useGameStore();
const inventoryStore = useInventoryStore();
const settingsStore = useSettingsStore();
const isBoardFullscreen = ref(false);
const headerRef = ref(null);
const headerSize = ref(72);

// Dev lootbox testing
const lastLootResult = ref(null);
const lootboxAnimating = ref(false);
const pendingLootResult = ref(null);
const targetButtonRect = ref(null);
const powerUpBarRef = ref(null);
let lootResultTimer = null;

const rollLootbox = () => {
  if (lootboxAnimating.value) return; // Prevent double-click
  
  const result = lootboxService.roll();
  
  pendingLootResult.value = {
    ...result,
    label: lootboxService.getPowerLabel(result.powerId),
    color: lootboxService.getRarityColor(result.rarity),
  };
  
  // Get target button position for flight animation
  const buttonEl = document.querySelector(`[data-power-id="${result.powerId}"]`);
  if (buttonEl) {
    targetButtonRect.value = buttonEl.getBoundingClientRect();
  }
  
  // Start animation
  lootboxAnimating.value = true;
};

const onLootboxAnimationComplete = () => {
  lootboxAnimating.value = false;
  
  if (pendingLootResult.value) {
    // Award the power
    inventoryStore.awardPower(pendingLootResult.value.powerId);
    
    // Show result text
    lastLootResult.value = pendingLootResult.value;
    
    // Flash the target button
    flashPowerButton(pendingLootResult.value.powerId);
    
    // Clear after 2 seconds
    if (lootResultTimer) clearTimeout(lootResultTimer);
    lootResultTimer = setTimeout(() => {
      lastLootResult.value = null;
    }, 2000);
    
    pendingLootResult.value = null;
  }
};

const flashPowerButton = (powerId) => {
  const buttonEl = document.querySelector(`[data-power-id="${powerId}"]`);
  if (buttonEl) {
    buttonEl.classList.add('flash-effect');
    setTimeout(() => buttonEl.classList.remove('flash-effect'), 500);
  }
};
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
    
    // Trigger a real window resize event to ensure all listeners (including Phaser) update
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('resize'));
    }

    if (gameStore.renderer) {
      // Force multiple refreshes to catch layout settlement
      const refresh = () => {
        if (typeof window !== 'undefined') {
           window.dispatchEvent(new Event('resize'));
        }
        gameStore.refreshBoardVisuals(true);
      };
      setTimeout(refresh, 50);
      setTimeout(refresh, 150);
      setTimeout(refresh, 300);
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

const scoreTarget = computed(() => {
  const objective = gameStore.objectives.find((entry) => entry.type === 'score');
  return objective?.target ?? 0;
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

.reshuffle-banner {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  padding: 0.65rem 1.2rem;
  background: linear-gradient(120deg, rgba(248, 113, 113, 0.95), rgba(248, 180, 80, 0.95));
  color: #0f172a;
  border-radius: 999px;
  font-weight: 700;
  letter-spacing: 0.02em;
  box-shadow: 0 10px 30px rgba(248, 113, 113, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.5);
  text-align: center;
  pointer-events: none;
  animation: banner-pop 220ms ease, banner-pulse 1.2s ease-in-out infinite;
  z-index: 20;
}

.reshuffle-banner-enter-active,
.reshuffle-banner-leave-active {
  transition: opacity 220ms ease, transform 220ms ease;
}

.reshuffle-banner-enter-from,
.reshuffle-banner-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-8px);
}

@keyframes banner-pop {
  0% {
    transform: translateX(-50%) scale(0.95);
  }
  100% {
    transform: translateX(-50%) scale(1);
  }
}

@keyframes banner-pulse {
  0% {
    box-shadow: 0 10px 30px rgba(248, 113, 113, 0.35);
  }
  50% {
    box-shadow: 0 14px 38px rgba(248, 180, 80, 0.45);
  }
  100% {
    box-shadow: 0 10px 30px rgba(248, 113, 113, 0.35);
  }
}

/* Custom cursors for interactive powers - using inline SVG for browser compatibility */
.board-wrapper.cursor-hammer {
  /* Hammer cursor: 32x32 SVG */
  cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Crect x='4' y='2' width='14' height='8' rx='2' fill='%23718096' stroke='%23374151' stroke-width='1'/%3E%3Crect x='9' y='10' width='4' height='16' rx='1' fill='%238B5A2B' stroke='%23654321' stroke-width='1'/%3E%3Crect x='5' y='3' width='12' height='3' fill='%239CA3AF'/%3E%3C/svg%3E") 16 16, crosshair;
}

.board-wrapper.cursor-color-wand {
  /* Magic wand cursor: 32x32 SVG with star and sparkles */
  cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Cline x1='6' y1='26' x2='22' y2='10' stroke='%238B5CF6' stroke-width='3' stroke-linecap='round'/%3E%3Cpolygon points='24,8 26,4 28,8 32,10 28,12 26,16 24,12 20,10' fill='%23FBBF24'/%3E%3Ccircle cx='10' cy='22' r='2' fill='%23F472B6'/%3E%3Ccircle cx='18' cy='14' r='1.5' fill='%2360A5FA'/%3E%3C/svg%3E") 6 26, crosshair;
}

.board-wrapper.cursor-tile-breaker {
  /* Cross/plus cursor: 32x32 SVG */
  cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Crect x='12' y='2' width='8' height='28' rx='2' fill='%2306B6D4' stroke='%230E7490' stroke-width='1'/%3E%3Crect x='2' y='12' width='28' height='8' rx='2' fill='%2306B6D4' stroke='%230E7490' stroke-width='1'/%3E%3Crect x='13' y='3' width='6' height='26' fill='%2322D3EE'/%3E%3Crect x='3' y='13' width='26' height='6' fill='%2322D3EE'/%3E%3C/svg%3E") 16 16, crosshair;
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
  gap: 0;
  padding: 0;
  height: calc(100vh - var(--fullscreen-header, 72px));
}

.app-shell.board-fullscreen .board-wrapper {
  max-width: none;
  width: 100%;
  height: 100%;
  min-height: 0;
  border-radius: 0;
  padding: 0.5rem;
  background: rgba(15, 23, 42, 0.85);
  display: flex;
  flex-direction: row; /* Changed to row to put HUD on side */
  gap: 1rem;
  justify-content: center;
  align-items: center;
}

.app-shell.board-fullscreen .board-rail,
.app-shell.board-fullscreen .hud-wrapper {
  display: none;
}

.fullscreen-hud {
  position: static; /* Remove absolute positioning */
  transform: none;
  z-index: 10;
  width: auto;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  pointer-events: none; /* Let clicks pass through container if needed, but children need pointer-events: auto */
}

.fullscreen-powerups {
  pointer-events: auto;
  background: rgba(15, 23, 42, 0.9);
  padding: 0.75rem;
  border-radius: 1rem;
  border: 1px solid rgba(148, 163, 184, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column; /* Stack icons vertically */
  gap: 0.5rem;
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

/* Dev Section Styles */
.dev-section {
  margin-top: 1.5rem;
  padding: 1rem;
  background: rgba(30, 41, 59, 0.6);
  border-radius: 12px;
  border: 1px dashed rgba(148, 163, 184, 0.3);
}

.dev-section h4 {
  margin: 0 0 0.75rem 0;
  font-size: 0.9rem;
  color: rgba(148, 163, 184, 0.8);
}

.dev-button {
  width: 100%;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  border: none;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.8), rgba(236, 72, 153, 0.8));
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: transform 150ms ease, box-shadow 150ms ease;
}

.dev-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(139, 92, 246, 0.4);
}

.dev-button:active {
  transform: scale(0.98);
}

.loot-result {
  margin: 0.75rem 0 0 0;
  padding: 0.5rem;
  text-align: center;
  font-weight: 700;
  font-size: 0.95rem;
  background: rgba(15, 23, 42, 0.6);
  border-radius: 6px;
}

.loot-result-enter-active,
.loot-result-leave-active {
  transition: opacity 200ms ease, transform 200ms ease;
}

.loot-result-enter-from,
.loot-result-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* Flash effect for power buttons when receiving lootbox reward */
:deep(.powerup-button.flash-effect) {
  animation: button-flash 500ms ease-out;
}

@keyframes button-flash {
  0% {
    box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.9);
    background: rgba(255, 255, 255, 0.4);
  }
  50% {
    box-shadow: 0 0 30px 15px rgba(168, 85, 247, 0.6), 0 0 60px 30px rgba(59, 130, 246, 0.3);
    background: linear-gradient(135deg, rgba(168, 85, 247, 0.8), rgba(59, 130, 246, 0.8));
  }
  100% {
    box-shadow: 0 0 0 0 transparent;
    background: rgba(30, 41, 59, 0.8);
  }
}
</style>
