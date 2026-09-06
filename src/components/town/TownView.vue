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
      <div class="town-map-frame" :class="{ 'town-has-raid': activeRaid }">
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
          :town="town"
          :selected="selected"
          :population="residents"
          :reduced-motion="settings.reducedMotion"
          :paused="paused || settings.isSettingsOpen || museumOpen || !!dialogMode"
          :next-level="campaign.nextLevel"
          :raid="activeRaid"
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
              t('Water for {count} neighbors', { count: totalLevels(town, 'well') * 6 })
            }}</small></span
          >
        </button>
        <button @click="selectBuilding('farm')">
          <TownIcon name="food" /><span
            >{{ t('Food')
            }}<small>{{
              t('Food for {count} neighbors', { count: totalLevels(town, 'farm') * 6 })
            }}</small></span
          >
        </button>
        <button @click="selectBuilding('home')">
          <TownIcon name="people" /><span
            >{{ t('{count} neighbors', { count: residents })
            }}<small>{{
              t('Room for {count}', { count: totalLevels(town, 'home') * 2 })
            }}</small></span
          >
        </button>
      </div>
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
                    : 'As the town grows, larger gangs may ride in. A sheriff keeps your savings safe.',
                )
              }}
            </p>
            <small>{{
              t('Gang: {gang} riders · Protection: {protection} riders', {
                gang: gangSize(town),
                protection: town.buildings.sheriff * 2,
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
            v-for="place in BUILDINGS"
            :key="place.id"
            :class="{ 'town-plot-locked': !plotUnlocked(town, place.id) }"
            @click="selectBuilding(place.id)"
          >
            <span class="building-list-dot" :style="{ background: place.color }"></span>
            <span
              >{{ t(place.shortName) }}<small>{{ plotStatus(place) }}</small></span
            ><TownIcon :name="town.buildings[place.id] ? 'check' : 'arrow'" />
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
  nextGoal,
  constructionRuns,
  plotUnlocked,
  saloonIncomeRate,
  totalLevels,
  gangSize,
} from '../../game/town/TownRules';
import { useCampaignStore } from '../../stores/campaignStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { HAMMER_CAPACITY } from '../../data/rewards';
import { LEVEL_COUNT } from '../../data/campaign';
import TownMuseum from './TownMuseum.vue';
import TownScene from './TownScene.vue';
import TownDialog from './TownDialog.vue';
import TownBuildingDetails from './TownBuildingDetails.vue';
import TownIcon from './TownIcon.vue';

const props = defineProps({ openMuseum: Boolean });
const emit = defineEmits(['mine', 'replay', 'continuous', 'museum-change']);
const campaign = useCampaignStore(),
  settings = useSettingsStore();
const town = computed(() => campaign.town);
const residents = computed(() => population(town.value));
const incomeRate = computed(() => saloonIncomeRate(town.value));
const activeProjects = computed(() => Object.values(town.value.projects));
const goal = computed(() => nextGoal(town.value));
const built = computed(() => BUILDINGS.filter(({ id }) => town.value.buildings[id]).length);
const selected = ref(goal.value?.id ?? 'home');
const museumOpen = ref(props.openMuseum && campaign.canReplay),
  dialogMode = ref('');
const paused = ref(false),
  announcement = ref(''),
  latestMoment = ref(null);
const activeRaid = ref(null),
  raidPhase = ref('Riders on the ridge');
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
            'The gang took {coins} coins. Upgrade the sheriff to protect against {gang} riders.',
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
    ? t('Level {level} / 3', { level: town.value.buildings[place.id] })
    : t('Empty plot');
}
function repair(stage) {
  if (!campaign.upgradeBuilding(selected.value, stage)) return;
  closeDialog();
  announcement.value = t('Work started at {building}. Play a puzzle to build the next part.', {
    building: t(BUILDING_BY_ID[selected.value].shortName),
  });
  latestMoment.value = {
    speaker: 'Ada · the caretaker',
    title: 'The first step is yours.',
    text: 'The materials are ready. Each completed puzzle will bring this building a little closer to opening day.',
  };
}
function useHammer(project) {
  if (!campaign.useBuilderHammer(selected.value, project.stage, project.wins)) return;
  const completed = !town.value.projects[selected.value];
  const upgrade = BUILDING_BY_ID[selected.value].upgrades[project.stage - 1];
  latestMoment.value = {
    speaker: upgrade.speaker,
    title: completed ? 'Building complete!' : 'A helping hand.',
    text: completed ? upgrade.story : 'One builder hammer, one step closer to opening day.',
  };
  announcement.value = latestMoment.value.title;
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
onBeforeUnmount(() => document.removeEventListener('visibilitychange', visibilityChanged));
</script>
