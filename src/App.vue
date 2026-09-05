<template>
  <div
    class="app-shell"
    :class="{
      'is-playing': game.sessionActive,
      'focus-mode': focusMode,
      'reduced-motion': settings.reducedMotion,
      'high-contrast': settings.highContrastMode,
    }"
  >
    <div class="starlight" aria-hidden="true"></div>
    <header class="app-header">
      <button class="brand" aria-label="Crystal Cascade home" @click="game.exitLevel()">
        <img src="/art/amethyst.svg" alt="" />
        <span>CRYSTAL <b>CASCADE</b></span>
      </button>
      <div class="header-actions">
        <span class="edition">A LITTLE MAGIC. EVERY MATCH.</span>
        <button
          class="icon-button"
          :aria-label="muted ? 'Unmute audio' : 'Mute audio'"
          :aria-pressed="muted"
          @click="toggleMute"
        >
          <GameIcon :name="muted ? 'muted' : 'sound'" />
        </button>
        <button class="icon-button" aria-label="Settings" @click="settings.toggleSettings(true)">
          <GameIcon name="settings" />
        </button>
      </div>
    </header>

    <main v-if="!game.sessionActive" class="welcome">
      <section class="hero">
        <span class="eyebrow"><i></i> THE CRYSTAL COLLECTION</span>
        <h1>Find your<br /><em>brilliant.</em></h1>
        <p>A world of color. A spark of possibility.<br />One match can change everything.</p>
        <div class="crystal-orbit" aria-hidden="true">
          <div class="orbit orbit-one"></div>
          <div class="orbit orbit-two"></div>
          <img class="hero-gem" src="/art/amethyst.svg" alt="" />
          <img class="satellite satellite-one" src="/art/emerald.svg" alt="" />
          <img class="satellite satellite-two" src="/art/topaz.svg" alt="" />
          <img class="satellite satellite-three" src="/art/ruby.svg" alt="" />
          <span class="orbit-spark">✦</span>
        </div>
        <div class="hero-note">
          <GameIcon name="spark" /><span>Match. Shatter. <b>Be dazzled.</b></span>
        </div>
      </section>
      <LevelSelectModal @start-level="startLevel" />
    </main>

    <main v-else class="game-layout">
      <aside class="game-sidebar">
        <button class="text-button back-button" @click="game.exitLevel()">
          <GameIcon name="back" /> The collection
        </button>
        <div class="level-heading">
          <span class="eyebrow">CHAPTER {{ String(game.currentLevelId).padStart(2, '0') }}</span>
          <h1>{{ levelName }}</h1>
          <p>Let a little brilliance happen.</p>
        </div>
        <HudPanel />
        <div class="match-guide">
          <span class="eyebrow">MAKE SOME MAGIC</span>
          <div class="bonus-legend">
            <div>
              <img src="/art/bonuses/bomb.svg" alt="" /><span
                ><b>Blast bomb</b><small>Match 4 · Blast a 3 × 3 area</small></span
              >
            </div>
            <div>
              <img src="/art/bonuses/rainbow.svg" alt="" /><span
                ><b>Rainbow orb</b><small>Match 5 · Clear a color</small></span
              >
            </div>
            <div>
              <img src="/art/bonuses/cross.svg" alt="" /><span
                ><b>Cross fire</b><small>T or L · Clear row + column</small></span
              >
            </div>
          </div>
          <p>Break the ice beneath your matches.<br />Dark tiles are already cleared.</p>
          <span class="guide-footnote">No timer. Find your flow.</span>
        </div>
      </aside>
      <section class="play-area">
        <div class="board-topline">
          <span
            ><i class="live-dot"></i
            >{{ game.activeBonusMode ? 'CHOOSE A GEM' : 'FOLLOW THE CASCADE' }}</span
          ><button
            class="icon-button"
            :aria-label="focusMode ? 'Exit focus mode' : 'Enter focus mode'"
            :aria-pressed="focusMode"
            @click="focusMode = !focusMode"
          >
            <GameIcon name="expand" />
          </button>
        </div>
        <div class="board-frame" :class="{ 'power-active': game.activeBonusMode }">
          <div class="frame-corner corner-tl"></div>
          <div class="frame-corner corner-tr"></div>
          <div class="frame-corner corner-bl"></div>
          <div class="frame-corner corner-br"></div>
          <BoardCanvas />
          <transition name="notice"
            ><div v-if="game.reshuffleNotice" class="board-notice" role="status">
              {{ game.reshuffleNotice.message }}
            </div></transition
          >
        </div>
        <div class="board-caption" aria-live="polite">
          <template v-if="game.activeBonusMode"
            >Tap a gem to use {{ powerName }}
            <button class="text-button" @click="game.setBonusMode(null)">Cancel</button></template
          ><template v-else>Swipe a gem or tap two neighbors to match</template>
        </div>
        <PowerUpBar />
      </section>
    </main>
    <footer class="app-footer">
      <span>CRYSTAL CASCADE</span><span>Small matches. Endless possibilities.</span
      ><span class="footer-spark">✦</span>
    </footer>
    <VictoryModal
      v-if="game.levelCleared"
      :score="game.score"
      :moves="game.moves"
      :max-combo="game.maxCascade"
      :score-target="scoreTarget"
      :has-next-level="hasNextLevel"
      @menu="game.exitLevel()"
      @replay="startLevel(game.currentLevelId)"
      @next="startLevel(game.currentLevelId + 1)"
    />
    <SettingsDrawer :open="settings.isSettingsOpen" @close="settings.toggleSettings(false)" />
  </div>
</template>

<script setup>
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref, watch } from 'vue';
const BoardCanvas = defineAsyncComponent(() => import('./components/BoardCanvas.vue'));
import HudPanel from './components/HudPanel.vue';
import PowerUpBar from './components/PowerUpBar.vue';
import LevelSelectModal from './components/LevelSelectModal.vue';
import VictoryModal from './components/VictoryModal.vue';
import SettingsDrawer from './components/SettingsDrawer.vue';
import GameIcon from './components/GameIcon.vue';
import { useGameStore } from './stores/gameStore';
import { useSettingsStore } from './stores/settingsStore';
import { useAudio } from './composables/useAudio';
import { LEVEL_NAMES } from './data/levelNames';

const game = useGameStore();
const settings = useSettingsStore();
const audio = useAudio();
const focusMode = ref(false);
const muted = computed(() => settings.musicVolume === 0 && settings.sfxVolume === 0);
let previousVolumes = [0.6, 0.8];
const toggleMute = () => {
  if (muted.value) {
    settings.setMusicVolume(previousVolumes[0]);
    settings.setSfxVolume(previousVolumes[1]);
  } else {
    previousVolumes = [settings.musicVolume, settings.sfxVolume];
    settings.setMusicVolume(0);
    settings.setSfxVolume(0);
  }
};
const levelName = computed(() => LEVEL_NAMES[game.currentLevelId - 1]);
const powerName = computed(() => game.activeBonusMode?.replaceAll('_', ' '));
const scoreTarget = computed(() => game.objectives.find((o) => o.type === 'score')?.target ?? 0);
const hasNextLevel = computed(() =>
  game.availableLevels.some((level) => level.id === game.currentLevelId + 1),
);
const startLevel = (id) => {
  game.startLevel(id);
  audio.playAmbientLoop();
};
const visibilityChanged = () => {
  game.inputPaused = document.hidden || settings.isSettingsOpen;
  if (document.hidden) audio.stopAmbientLoop({ fadeMs: 0 });
  else if (game.sessionActive) audio.playAmbientLoop();
};
onMounted(() => {
  game.bootstrap();
  game.setAudioManager(audio);
  document.addEventListener('visibilitychange', visibilityChanged);
});
watch(
  () => game.sessionActive,
  (active) => {
    if (!active) {
      audio.stopAmbientLoop({ fadeMs: 200 });
      focusMode.value = false;
    }
  },
);
watch(
  () => settings.isSettingsOpen,
  () => {
    game.inputPaused = document.hidden || settings.isSettingsOpen;
    game.renderer?.input?.reset();
  },
);
onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', visibilityChanged);
  game.exitLevel();
  game.setAudioManager(null);
});
</script>
