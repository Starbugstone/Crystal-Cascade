<template>
  <div
    class="app-shell"
    :class="{
      'is-playing': game.sessionActive,
      'is-town': view === 'town' && !game.sessionActive,
      'focus-mode': focusMode,
      'reduced-motion': settings.reducedMotion,
      'high-contrast': settings.highContrastMode,
    }"
  >
    <div
      v-if="
        game.arcadeImpact && game.sessionActive && !game.levelCleared && !settings.reducedMotion
      "
      :key="game.arcadeImpact.id"
      class="arcade-screen-impact"
      :style="{ '--impact-color': game.arcadeImpact.color }"
      aria-hidden="true"
    >
      <i></i><i></i>
    </div>
    <div class="starlight" aria-hidden="true"></div>
    <header class="app-header">
      <button class="brand" :aria-label="t('Crystal Cascade home')" @click="showTown">
        <img src="/art/amethyst.svg" alt="" />
        <span>CRYSTAL <b>CASCADE</b></span>
      </button>
      <nav v-if="!game.sessionActive" class="world-nav" :aria-label="t('Choose your adventure')">
        <button :aria-current="view === 'town' ? 'page' : undefined" @click="showTown">
          {{ t('Town') }}
        </button>
        <button :aria-current="view === 'mine' ? 'page' : undefined" @click="view = 'mine'">
          {{ t('Mine') }}
        </button>
      </nav>
      <div class="header-actions">
        <span class="edition"> {{ t('BIG MATCHES. BIGGER REWARDS.') }} </span>
        <button
          class="icon-button"
          :aria-label="t(muted ? 'Unmute audio' : 'Mute audio')"
          :aria-pressed="muted"
          @click="toggleMute"
        >
          <GameIcon :name="muted ? 'muted' : 'sound'" />
        </button>
        <button
          class="icon-button"
          :aria-label="t('Settings')"
          @click="settings.toggleSettings(true)"
        >
          <GameIcon name="settings" />
        </button>
      </div>
    </header>
    <MobileGameHeader
      v-if="game.sessionActive"
      v-model:open="mobileDetailsOpen"
      :muted="muted"
      :level-name="levelName"
      @toggle-mute="toggleMute"
    />

    <TownView
      v-if="!game.sessionActive && view === 'town'"
      @mine="startLevel(campaign.nextLevel)"
    />
    <main v-else-if="!game.sessionActive" class="welcome">
      <section class="hero">
        <span class="eyebrow"><i></i> {{ t('THE CRYSTAL ARCADE') }} </span>
        <h1>
          {{ t('MATCH.') }} <br /><em> {{ t('GO MEGA.') }} </em>
        </h1>
        <p>
          {{ t('Chase the combo. Beat the clock.') }} <br />
          {{ t('Two chests. One brilliant run.') }}
        </p>
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
          <GameIcon name="spark" /><span>
            {{ t('Match. Blast.') }} <b> {{ t('Hit the jackpot.') }} </b></span
          >
        </div>
      </section>
      <LevelSelectModal @start-level="startLevel" />
    </main>

    <main v-else class="game-layout">
      <aside class="game-sidebar">
        <button class="text-button back-button" @click="game.exitLevel()">
          <GameIcon name="back" /> {{ t('The collection') }}
        </button>
        <div class="level-heading">
          <span class="eyebrow">
            {{ t('LEVEL') }} {{ String(game.currentLevelId).padStart(2, '0') }}</span
          >
          <h1>{{ t(levelName) }}</h1>
          <p>{{ t(currentConfig?.chapterName) }}</p>
        </div>
        <HudPanel />
        <div class="match-guide">
          <span class="eyebrow"> {{ t('MAKE SOME MAGIC') }} </span>
          <div class="bonus-legend">
            <div>
              <img src="/art/bonuses/bomb.svg" alt="" /><span
                ><b> {{ t('Blast bomb') }} </b
                ><small> {{ t('Match 4 · Blast a 3 × 3 area') }} </small></span
              >
            </div>
            <div>
              <img src="/art/bonuses/rainbow.svg" alt="" /><span
                ><b> {{ t('Rainbow orb') }} </b
                ><small> {{ t('Match 5 · Clear a color') }} </small></span
              >
            </div>
            <div>
              <img src="/art/bonuses/cross.svg" alt="" /><span
                ><b> {{ t('Cross fire') }} </b
                ><small> {{ t('T or L · Clear row + column') }} </small></span
              >
            </div>
          </div>
          <p>
            {{
              t(
                'Break the ice beneath your matches. Match beside stone to release the gems above. Gold bands take two hits.',
              )
            }}
          </p>
          <p v-if="game.currentLevelId >= 43">{{ t(currentConfig?.tip) }}</p>
          <span class="guide-footnote">
            {{ t('Beat the score. Beat the clock. Win both chests.') }}
          </span>
        </div>
      </aside>
      <section
        class="play-area"
        :class="{ 'expanded-board': game.boardRows > 8 }"
        :style="{ '--board-ratio': game.boardCols / game.boardRows }"
      >
        <ArcadeBanner :banner="game.arcadeBanner" />
        <div class="board-topline">
          <span
            ><i class="live-dot"></i
            >{{
              t(
                game.activeBonusMode
                  ? 'CHOOSE A TILE'
                  : t('LEVEL {value0} · {value1}', {
                      value0: String(game.currentLevelId).padStart(2, '0'),
                      value1: t(currentConfig?.chapterName ?? 'FOLLOW THE CASCADE'),
                    }),
              )
            }}</span
          ><button
            class="icon-button"
            :aria-label="t(focusMode ? 'Exit focus mode' : 'Enter focus mode')"
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
              {{ t(game.reshuffleNotice.message) }}
            </div></transition
          >
        </div>
        <div class="board-caption" aria-live="polite">
          <template v-if="game.activeBonusMode">
            {{ t('Tap a tile to use') }} {{ t(powerName) }}
            <button class="text-button" @click="game.setBonusMode(null)">
              {{ t('Cancel') }}
            </button></template
          ><template v-else
            ><span
              ><strong v-if="game.totalRelics" class="relic-caption">
                {{ t('Relics') }} {{ game.totalRelics - game.remainingRelics }}/{{
                  game.totalRelics
                }}
                · </strong
              >{{ t(currentConfig?.tip) }}</span
            ></template
          >
        </div>
        <PowerUpBar />
      </section>
    </main>
    <footer class="app-footer">
      <span>CRYSTAL CASCADE</span><span> {{ t('Big combos. Double chests. One more run.') }} </span
      ><span class="footer-spark">✦</span>
    </footer>
    <VictoryModal
      v-if="game.levelCleared"
      :rewards="game.levelRewards"
      :coins="game.coinReward"
      :jewels="game.collectedJewels"
      :construction="game.constructionReward"
      :elapsed-ms="game.elapsedMs"
      :speed-target-ms="game.speedTargetMs"
      :score="game.score"
      :moves="game.moves"
      :max-combo="game.maxCascade"
      :score-target="scoreTarget"
      :has-next-level="hasNextLevel"
      @menu="showCollection"
      @town="showTown"
      @replay="startLevel(game.currentLevelId)"
      @next="startLevel(game.currentLevelId + 1)"
    />
    <SettingsDrawer
      :open="settings.isSettingsOpen"
      @close="settings.toggleSettings(false)"
      @reset-progress="resetProgress"
    />
  </div>
</template>

<script setup>
import { t } from './i18n';
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref, watch } from 'vue';
const TownView = defineAsyncComponent(() => import('./components/town/TownView.vue'));
const BoardCanvas = defineAsyncComponent(() => import('./components/BoardCanvas.vue'));
import HudPanel from './components/HudPanel.vue';
import ArcadeBanner from './components/ArcadeBanner.vue';
import MobileGameHeader from './components/MobileGameHeader.vue';
import PowerUpBar from './components/PowerUpBar.vue';
import LevelSelectModal from './components/LevelSelectModal.vue';
import VictoryModal from './components/VictoryModal.vue';
import SettingsDrawer from './components/SettingsDrawer.vue';
import GameIcon from './components/GameIcon.vue';
import { useGameStore } from './stores/gameStore';
import { useCampaignStore } from './stores/campaignStore';
import { useSettingsStore } from './stores/settingsStore';
import { useAudio } from './composables/useAudio';
import { LEVEL_NAMES } from './data/levelNames';

const game = useGameStore();
const campaign = useCampaignStore();
const view = ref('town');
const showTown = () => {
  game.exitLevel();
  view.value = 'town';
};
const showCollection = () => {
  game.exitLevel();
  view.value = 'mine';
};
const resetProgress = () => {
  game.exitLevel();
  campaign.resetProgress();
  view.value = 'town';
};
const settings = useSettingsStore();
const audio = useAudio();
const focusMode = ref(false);
const mobileDetailsOpen = ref(false);
let clockInterval;
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
const currentConfig = computed(
  () => game.availableLevels.find((level) => level.id === game.currentLevelId)?.config,
);
const levelName = computed(() => LEVEL_NAMES[game.currentLevelId - 1]);
const powerName = computed(() => game.activeBonusMode?.replaceAll('_', ' '));
const scoreTarget = computed(() => game.objectives.find((o) => o.type === 'score')?.target ?? 0);
const hasNextLevel = computed(() =>
  game.availableLevels.some((level) => level.id === game.currentLevelId + 1),
);
const startLevel = (id) => {
  view.value = 'mine';
  mobileDetailsOpen.value = false;
  game.startLevel(id);
  audio.playAmbientLoop();
};
watch(
  () => [
    game.sessionActive,
    game.levelCleared,
    game.animationInProgress,
    game.inputPaused,
    !!game.renderer,
  ],
  () => game.syncRunClock(),
  { flush: 'sync' },
);
const updateInputPause = () => {
  game.inputPaused = document.hidden || settings.isSettingsOpen || mobileDetailsOpen.value;
  game.renderer?.input?.reset();
};
const visibilityChanged = () => {
  updateInputPause();
  if (document.hidden) audio.stopAmbientLoop({ fadeMs: 0 });
  else if (game.sessionActive) audio.playAmbientLoop();
};
onMounted(() => {
  game.bootstrap();
  clockInterval = setInterval(() => game.syncRunClock(), 100);
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
watch([() => settings.isSettingsOpen, mobileDetailsOpen], updateInputPause, { flush: 'sync' });
onBeforeUnmount(() => {
  clearInterval(clockInterval);
  document.removeEventListener('visibilitychange', visibilityChanged);
  game.exitLevel();
  game.setAudioManager(null);
});
</script>
