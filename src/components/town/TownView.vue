<template>
  <main class="town-view">
    <div class="town-heading">
      <div>
        <p class="town-kicker">{{ t('YOUR TOWN. YOUR CHOICE.') }}</p>
        <h1>Prospect Hollow</h1>
      </div>
      <div class="town-wallet" :aria-label="t('Town savings')">
        <TownIcon name="coin" />
        <div>
          <strong>{{ number(town.coins) }}</strong
          ><span>{{ t('TOWN COINS') }}</span>
        </div>
      </div>
    </div>
    <div class="town-tools">
      <button :aria-label="t('Village tour')" @click="tourOpen = true">
        <GameIcon name="info" />
      </button>
      <span class="town-hammer-stock"
        ><img src="/art/rewards/builder-hammer.svg" alt="" />{{
          t('Builder hammers: {count}/{cap}', {
            count: campaign.builderHammers,
            cap: HAMMER_CAPACITY,
          })
        }}</span
      >
      <button v-if="town.buildings.saloon" @click="selectBuilding('saloon')">
        <TownIcon name="coin" />{{ t('{rate}/hour', { rate: incomeRate }) }}
      </button>
      <button @click="selectBuilding('armory')">{{ t('Supplies') }} →</button>
    </div>
    <section class="town-world" :aria-label="t('Your town')">
      <div
        ref="mapFrame"
        class="town-map-frame"
        :class="{ 'town-has-raid': activeRaid, 'town-fullscreen': fullscreen }"
      >
        <button
          ref="fullscreenButton"
          class="town-fullscreen-button"
          :aria-label="t(fullscreen ? 'Exit full screen village' : 'Full screen village')"
          :aria-pressed="fullscreen"
          @click="fullscreen = !fullscreen"
        >
          <GameIcon :name="fullscreen ? 'close' : 'expand'" />
        </button>
        <div class="town-map-caption">
          <span>{{ t('{built}/{total} built', { built: built, total: BUILDINGS.length }) }}</span>
        </div>
        <button v-if="!activeRaid" class="town-plots-button" @click="openDirectory">
          {{ t('All plots') }} <TownIcon name="arrow" />
        </button>
        <div v-if="activeRaid" class="town-raid-banner" role="status" aria-live="polite">
          <span class="town-kicker"
            >{{ t('FRONTIER ENCOUNTER') }} ·
            {{ t('{count} riders', { count: activeRaid.gangSize }) }}</span
          >
          <strong>{{ t(raidPhase) }}</strong>
          <p>
            {{
              t(
                raidPhase === 'The raid has passed'
                  ? banditStory.text
                  : 'The riders are here. Watch the story unfold in your village.',
              )
            }}
          </p>
          <button class="town-secondary" @click="finishRaid">
            {{ t(raidPhase === 'The raid has passed' ? 'Continue' : 'Skip animation') }}
          </button>
        </div>
        <TownScene
          :fullscreen="fullscreen"
          :town="town"
          :selected="selected"
          :population="people"
          :reduced-motion="settings.reducedMotion"
          :paused="paused || settings.isSettingsOpen || museumOpen || !!dialogMode || tourOpen"
          :next-level="campaign.nextLevel"
          :mine-stage="campaign.mineStage"
          :raid="activeRaid"
          :construction="construction"
          @select="selectBuilding"
          @mine="goMining"
          @raid-phase="raidPhase = $event"
          @raid-complete="finishRaid"
        />
        <div class="town-map-footnote" role="status">
          <span
            ><i></i
            >{{ t(announcement || 'Tap a building or an empty plot to see your choices.') }}</span
          >
        </div>
      </div>
      <div class="town-needs" :aria-label="t('Basic town needs')">
        <button @click="selectBuilding('well')">
          <TownIcon name="water" /><span
            >{{ t('Water')
            }}<small>{{
              t('Water for {count} people', { count: totalLevels(town, 'well') * 6 })
            }}</small></span
          >
        </button>
        <button @click="selectBuilding('farm')">
          <TownIcon name="food" /><span
            >{{ t('Food')
            }}<small>{{
              t('Food for {count} people', { count: totalLevels(town, 'farm') * 6 })
            }}</small></span
          >
        </button>
        <button @click="selectBuilding('home')">
          <TownIcon name="people" /><span
            >{{ t('{count} people', { count: people })
            }}<small>{{
              t('{residents} residents · {visitors} visitors', { residents, visitors })
            }}</small></span
          >
        </button>
      </div>
      <button class="town-happiness" @click="selectBuilding('square')">
        <TownIcon name="happiness" />
        <span
          >{{ t('Happiness') }} <strong>{{ happiness(town) }}%</strong>
          <meter :value="happiness(town)" min="0" max="100" :aria-label="t('Village happiness')" />
          <small>{{
            t('Saloon income +{bonus}% · Improve the town square', { bonus: happiness(town) })
          }}</small>
        </span>
        <TownIcon name="arrow" />
      </button>
      <p v-if="activeProjects.length" class="town-construction-summary">
        {{ t('Active construction: {count}', { count: activeProjects.length }) }} ·
        {{ t('Each completed puzzle advances every building in progress.') }}
      </p>
    </section>
    <details class="town-journal">
      <summary>
        {{ t('From your neighbors') }} <span>{{ t(moment.title) }}</span>
      </summary>
      <div class="town-journal-content">
        <p class="town-kicker">{{ t(moment.speaker) }}</p>
        <h2>{{ t(moment.title) }}</h2>
        <p>{{ t(moment.text) }}</p>
        <section v-if="residents" class="town-raid-report">
          <div>
            <h3>{{ t(event ? banditStory.title : 'Eyes on the dusty trail') }}</h3>
            <p>
              {{
                t(
                  event
                    ? banditStory.text
                    : 'As the town grows, larger gangs may ride in. Build the bank and sheriff to protect your savings.',
                )
              }}
            </p>
            <small>{{
              t('Gang: {gang} riders · Savings protected: {protection}%', {
                gang: gangSize(town),
                protection: Math.round(raidProtection(town) * 100),
              })
            }}</small>
            <p>
              {{
                t(
                  'A raid can arrive after every 5 completed puzzles. Never while you are away. Your last 50 coins are always safe.',
                )
              }}
            </p>
          </div>
          <button v-if="event" class="town-secondary" :disabled="!!activeRaid" @click="replayRaid">
            {{ t('Watch the last raid again') }}
          </button>
          <button class="town-secondary" @click="selectBuilding('sheriff')">
            {{ t('Visit the sheriff') }}
          </button>
        </section>
      </div>
    </details>
    <p
      v-if="campaign.saveWarning || campaign.inventoryNotice"
      role="status"
      class="town-save-warning"
    >
      {{ t(campaign.saveWarning || campaign.inventoryNotice) }}
    </p>
    <p class="town-bottom-note">
      {{ t(campaign.saveWarning ? 'Progress kept for this session' : 'Saved on this device') }}
    </p>
    <TownDialog
      v-if="dialogMode"
      :title="t(dialogMode === 'directory' ? 'Choose a plot' : 'Your town')"
      @close="closeDialog"
    >
      <template v-if="dialogMode === 'directory'">
        <p class="town-directory-hint">
          {{ t('Choose what to build next. Improvements unlock new plots.') }}
        </p>
        <section class="town-building-list" :aria-label="t('All town buildings')">
          <button
            v-for="place in directoryPlots"
            :key="place.id"
            :class="{ 'town-plot-locked': !plotUnlocked(town, place.id) }"
            @click="selectBuilding(place.id)"
          >
            <span class="building-list-dot" :style="{ background: place.color }"></span>
            <span
              >{{ t(place.shortName) }}<small>{{ plotStatus(place) }}</small></span
            >
            <span
              v-if="place.offer && !town.projects[place.id]"
              class="town-plot-price"
              :aria-label="
                t(town.buildings[place.id] ? 'Upgrade: {coins} coins' : 'Build: {coins} coins', {
                  coins: place.offer.cost,
                })
              "
            >
              <TownIcon v-if="place.offer.cost" name="coin" />
              {{ place.offer.cost ? number(place.offer.cost) : t('Free') }}
            </span>
            <TownIcon v-else :name="town.buildings[place.id] ? 'check' : 'arrow'" />
          </button>
        </section>
      </template>
      <TownBuildingDetails
        v-else
        :key="selected"
        :id="selected"
        :town="town"
        :hammers="campaign.builderHammers"
        :bonus-limit="campaign.bonusLimit"
        :powers="campaign.powers"
        :last-income="campaign.lastSaloonIncome"
        @build="repair"
        @hammer="useHammer"
        @select="selectBuilding"
        @museum="visitMuseum"
        @mine="goMining"
      />
    </TownDialog>
    <TownTour
      v-if="tourOpen"
      :mine-stage="campaign.mineStage"
      @close="finishTour"
      @build="
        finishTour();
        selectBuilding(goal?.id ?? 'well');
      "
    />
    <TownMuseum
      v-if="museumOpen && campaign.canReplay"
      @close="museumOpen = false"
      @replay="$emit('replay', $event)"
      @continuous="$emit('continuous', $event)"
    />
  </main>
</template>
<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { t, number } from '../../i18n';
import { BUILDINGS, BUILDING_BY_ID, BANDIT_EVENT, INITIAL_STORY } from '../../data/town';
import {
  population,
  residentPopulation,
  visitorPopulation,
  happiness,
  nextGoal,
  upgradeOffer,
  constructionRuns,
  plotUnlocked,
  saloonIncomeRate,
  totalLevels,
  gangSize,
  raidProtection,
} from '../../game/town/TownRules';
import { useCampaignStore } from '../../stores/campaignStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { HAMMER_CAPACITY } from '../../data/rewards';
import { LEVEL_COUNT } from '../../data/campaign';
import TownMuseum from './TownMuseum.vue';
import TownTour from './TownTour.vue';
import GameIcon from '../GameIcon.vue';
import { useTownAudio } from '../../composables/useTownAudio';
import TownScene from './TownScene.vue';
import TownDialog from './TownDialog.vue';
import TownBuildingDetails from './TownBuildingDetails.vue';
import TownIcon from './TownIcon.vue';

const props = defineProps({ openMuseum: Boolean });
const emit = defineEmits(['mine', 'replay', 'continuous', 'museum-change']);
const campaign = useCampaignStore(),
  settings = useSettingsStore();
const town = computed(() => campaign.town);
const tourOpen = ref(!campaign.town.tourSeen),
  fullscreen = ref(false),
  mapFrame = ref(null),
  fullscreenButton = ref(null);
let previousOverflow;
function finishTour() {
  tourOpen.value = false;
  campaign.finishTownTour();
}
watch(fullscreen, (open) => {
  if (open) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = previousOverflow ?? '';
    fullscreenButton.value?.focus({ preventScroll: true });
  }
});
function leaveFullscreen(event) {
  if (event.key === 'Escape' && !dialogMode.value && !tourOpen.value && !settings.isSettingsOpen)
    fullscreen.value = false;
}

const residents = computed(() => residentPopulation(town.value));
const visitors = computed(() => visitorPopulation(town.value));
const people = computed(() => population(town.value));
const incomeRate = computed(() => saloonIncomeRate(town.value));
const activeProjects = computed(() => Object.values(town.value.projects));
const goal = computed(() => nextGoal(town.value));
const directoryPlots = computed(() =>
  BUILDINGS.map((place) => ({ ...place, offer: upgradeOffer(town.value, place.id) })),
);
const built = computed(() => BUILDINGS.filter(({ id }) => town.value.buildings[id]).length);
const selected = ref(goal.value?.id ?? 'home');
const museumOpen = ref(props.openMuseum && campaign.canReplay),
  dialogMode = ref('');
const paused = ref(false),
  construction = ref(null),
  announcement = ref(''),
  latestMoment = ref(null);
const activeRaid = ref(null),
  raidPhase = ref('Riders on the ridge');
useTownAudio(() => ({
  population: people.value,
  construction: activeProjects.value.length > 0,
  buildCue: construction.value?.serial,
  stable: town.value.buildings.stable > 0,
  raid: activeRaid.value ? `${activeRaid.value.id}-${raidPhase.value}` : null,
  paused:
    paused.value ||
    settings.isSettingsOpen ||
    museumOpen.value ||
    !!dialogMode.value ||
    tourOpen.value,
}));
const event = computed(() => town.value.events[BANDIT_EVENT]);
const banditStory = computed(() =>
  event.value?.outcome === 'protected'
    ? {
        speaker: 'Sam · the sheriff',
        title: 'The town stood its ground.',
        text: 'The patrol sent the gang back to the prairie. Every coin is safe.',
      }
    : event.value?.outcome === 'stolen'
      ? {
          speaker: 'Ada · the caretaker',
          title: 'Trouble rode through town.',
          text: t(
            'The gang took {coins} coins. Upgrade both bank and sheriff to protect against {gang} riders.',
            { coins: event.value.loss, gang: event.value.gangSize },
          ),
        }
      : {
          speaker: 'Ada · the caretaker',
          title: 'The riders moved on.',
          text: 'The gang found no spare coins. Your last savings are safe.',
        },
);
const moment = computed(
  () =>
    latestMoment.value ??
    (built.value
      ? {
          speaker: 'Ada · the caretaker',
          title: activeProjects.value.length
            ? 'A little more with every puzzle.'
            : 'It’s good to have neighbors again.',
          text: activeProjects.value.length
            ? 'Each completed puzzle advances every building in progress. Opening day is getting closer.'
            : 'Choose what to build next. Families need a working well, a farm, and a home before they move in.',
        }
      : INITIAL_STORY),
);
watch(museumOpen, (open) => emit('museum-change', open));
watch(
  () => props.openMuseum,
  (open) => {
    closeDialog();
    museumOpen.value = open && campaign.canReplay;
    if (open && !campaign.canReplay) {
      selectBuilding('museum');
      emit('museum-change', false);
    }
  },
);
function closeDialog() {
  dialogMode.value = '';
}
function openDirectory() {
  dialogMode.value = 'directory';
}
async function selectBuilding(id) {
  if (!Object.hasOwn(BUILDING_BY_ID, id)) return;
  selected.value = id;
  dialogMode.value = 'building';
  await nextTick();
  const dialog = document.querySelector('.town-dialog');
  if (dialog) {
    dialog.scrollTop = 0;
    dialog.querySelector('.town-dialog-close')?.focus({ preventScroll: true });
  }
}
function visitMuseum() {
  closeDialog();
  if (campaign.canReplay) museumOpen.value = true;
}
function goMining() {
  closeDialog();
  if (campaign.completedCount < LEVEL_COUNT) emit('mine');
  else if (campaign.canReplay) museumOpen.value = true;
  else selectBuilding('museum');
}
function plotStatus(place) {
  const project = town.value.projects[place.id];
  if (!plotUnlocked(town.value, place.id))
    return t('Unlock at {building} level 2', { building: t(BUILDING_BY_ID[place.kind].shortName) });
  if (project)
    return t('Under construction · {wins}/{required}', {
      wins: project.wins,
      required: constructionRuns(project),
    });
  return town.value.buildings[place.id]
    ? t('Level {level} / {max}', {
        level: town.value.buildings[place.id],
        max: place.upgrades.length,
      })
    : t('Empty plot');
}
function repair(stage) {
  if (!campaign.upgradeBuilding(selected.value, stage)) return;
  showConstruction();
  const complete = !town.value.projects[selected.value];
  announcement.value = t(
    complete
      ? '{building} is ready!'
      : 'Work started at {building}. Complete one puzzle to finish.',
    {
      building: t(BUILDING_BY_ID[selected.value].shortName),
    },
  );
  latestMoment.value = {
    speaker: 'Ada · the caretaker',
    title: complete ? 'Building complete!' : 'The first step is yours.',
    text: complete
      ? BUILDING_BY_ID[selected.value].upgrades[stage].story
      : 'The materials are ready. One completed puzzle will finish this building.',
  };
}
function showConstruction() {
  closeDialog();
  construction.value = { id: selected.value, serial: (construction.value?.serial ?? 0) + 1 };
  mapFrame.value?.scrollIntoView({ behavior: 'instant', block: 'nearest' });
}
function useHammer(stage) {
  if (!campaign.useBuilderHammer(selected.value, stage)) return;
  showConstruction();
  const upgrade = BUILDING_BY_ID[selected.value].upgrades[town.value.buildings[selected.value] - 1];
  latestMoment.value = {
    speaker: upgrade.speaker,
    title: 'Building complete!',
    text: upgrade.story,
  };
  announcement.value = t('{building} is ready!', {
    building: t(BUILDING_BY_ID[selected.value].shortName),
  });
}
function finishRaid() {
  if (!activeRaid.value) return;
  campaign.markRaidSeen(activeRaid.value.id);
  activeRaid.value = null;
  latestMoment.value = banditStory.value;
  announcement.value = banditStory.value.text;
}
function replayRaid() {
  if (!event.value || activeRaid.value) return;
  activeRaid.value = { ...event.value };
  raidPhase.value = 'Riders on the ridge';
  document
    .querySelector('.town-map-frame')
    ?.scrollIntoView({ behavior: settings.reducedMotion ? 'instant' : 'smooth', block: 'start' });
}
function visibilityChanged() {
  paused.value = document.hidden;
}
onMounted(() => {
  visibilityChanged();
  document.addEventListener('visibilitychange', visibilityChanged);
  document.addEventListener('keydown', leaveFullscreen);
  const completed = campaign.lastConstruction.filter((project) => project.complete);
  if (completed.length) {
    const upgrade = BUILDING_BY_ID[completed[0].id].upgrades[completed[0].stage - 1];
    latestMoment.value = { speaker: upgrade.speaker, title: upgrade.title, text: upgrade.story };
    announcement.value = t('Completed buildings: {buildings}.', {
      buildings: completed.map((project) => t(BUILDING_BY_ID[project.id].shortName)).join(', '),
    });
  }
  campaign.lastConstruction = [];
  campaign.collectSaloonIncome();
  campaign.resolveBandits();
  if (event.value && !event.value.seen) activeRaid.value = { ...event.value };
  if (props.openMuseum && !campaign.canReplay) {
    selectBuilding('museum');
    emit('museum-change', false);
  }
});
onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', visibilityChanged);
  document.removeEventListener('keydown', leaveFullscreen);
  if (fullscreen.value) document.body.style.overflow = previousOverflow ?? '';
});
</script>
