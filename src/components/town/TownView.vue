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
        :class="{
          'town-has-raid': activeRaid,
          'town-fullscreen': fullscreen,
          'town-labels-hidden': !settings.showVillageLabels,
        }"
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
        <button
          class="town-fullscreen-button town-story-button"
          :aria-label="t('Read village story')"
          :title="t('Read village story')"
          @click="dialogMode = 'story'"
        >
          <GameIcon name="book" />
        </button>
        <button
          class="town-fullscreen-button town-labels-button"
          :aria-label="t('Building labels')"
          :title="t(settings.showVillageLabels ? 'Hide building labels' : 'Show building labels')"
          :aria-pressed="settings.showVillageLabels"
          @click="settings.setVillageLabels(!settings.showVillageLabels)"
        >
          <GameIcon :name="settings.showVillageLabels ? 'eye' : 'eye-off'" />
        </button>
        <div
          v-if="fullscreen && !activeRaid"
          class="town-map-wallet"
          :aria-label="t('Town savings')"
        >
          <TownIcon name="coin" /><strong>{{ number(town.coins) }}</strong>
        </div>
        <div class="town-map-caption">
          <span>{{ t('{built}/{total} built', { built: built, total: BUILDINGS.length }) }}</span>
          <span
            class="town-map-hammers"
            :aria-label="
              t('Builder hammers: {count}/{cap}', {
                count: campaign.builderHammers,
                cap: HAMMER_CAPACITY,
              })
            "
          >
            <img src="/art/rewards/builder-hammer.svg" alt="" />{{ campaign.builderHammers }}
          </span>
        </div>
        <button v-if="!activeRaid" class="town-plots-button" @click="openDirectory">
          {{ t('Available plots') }} <TownIcon name="arrow" />
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
          <div class="town-raid-actions">
            <div v-if="fullscreen" class="town-map-wallet" :aria-label="t('Town savings')">
              <TownIcon name="coin" /><strong>{{ number(town.coins) }}</strong>
            </div>
            <button class="town-secondary" @click="finishRaid">
              {{ t(raidPhase === 'The raid has passed' ? 'Continue' : 'Skip animation') }}
            </button>
          </div>
        </div>
        <TownScene
          :active="active"
          :fullscreen="fullscreen"
          :town="town"
          :builder-hammers="campaign.builderHammers"
          :selected="selected"
          :population="people"
          :reduced-motion="settings.reducedMotion"
          :paused="
            !active || paused || settings.isSettingsOpen || museumOpen || !!dialogMode || tourOpen
          "
          :next-level="campaign.nextLevel"
          :mine-stage="campaign.mineStage"
          :raid="activeRaid"
          :construction="construction"
          @select="selectBuilding"
          @mine="goMining"
          @raid-phase="raidPhase = $event"
          @raid-complete="finishRaid"
          @camera-distance="cameraDistance = $event"
        />
        <TownCoinCollection
          v-if="collection"
          :key="collection.serial"
          :coins="collection.coins"
          :reduced-motion="settings.reducedMotion"
          @coin="game.audioManager?.playArcadeCue?.('coin', $event)"
          @close="collection = null"
        />
        <TownRaidLoss
          v-if="raidLoss"
          :coins="raidLoss.loss"
          :reduced-motion="settings.reducedMotion"
          @close="raidLoss = null"
        />
        <p v-if="showConstructionTip" class="town-construction-tip" role="status">
          <GameIcon name="info" />
          {{
            t(
              'Your first building is ready! Tap its scaffolding to finish construction and open it.',
            )
          }}
        </p>
        <span class="town-sr-only" role="status">{{ t(announcement) }}</span>
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
      v-if="active && dialogMode"
      :title="
        t(
          dialogMode === 'story'
            ? 'Village story'
            : dialogMode === 'directory'
              ? 'Choose a plot'
              : 'Your town',
        )
      "
      @close="closeDialog"
    >
      <template v-if="dialogMode === 'story'">
        <section class="town-story-stats" :aria-label="t('Village overview')">
          <h2>{{ t('Village overview') }}</h2>
          <dl>
            <div v-for="stat in villageStats" :key="stat.id" :data-town-stat="stat.id">
              <dt>
                <img
                  v-if="stat.id === 'hammers'"
                  src="/art/rewards/builder-hammer.svg"
                  alt=""
                /><TownIcon v-else :name="stat.icon" />{{ stat.label }}
              </dt>
              <dd>
                <strong>{{ stat.value }}</strong
                ><small v-if="stat.detail">{{ stat.detail }}</small>
                <meter
                  v-if="stat.id === 'happiness'"
                  :value="happiness(town)"
                  min="0"
                  max="100"
                  :aria-label="t('Village happiness')"
                />
              </dd>
            </div>
          </dl>
        </section>
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
            <button
              v-if="event"
              class="town-secondary"
              :disabled="!!activeRaid"
              @click="replayRaid"
            >
              {{ t('Watch the last raid again') }}
            </button>
            <button class="town-secondary" @click="selectBuilding('sheriff')">
              {{ t('Visit the sheriff') }}
            </button>
          </section>
        </div>
      </template>
      <template v-else-if="dialogMode === 'directory'">
        <p class="town-directory-hint">
          {{
            t(
              'Only purchases you can afford are listed. A builder hammer also reveals unlocked purchases you can build for free.',
            )
          }}
        </p>
        <p class="town-directory-hint">
          {{
            t(
              'Finish upgrading the original well, farm or house to level 2 to unlock its second plot. Build Farm II before Farm III, and build each extra house before the next. Other buildings have one plot each.',
            )
          }}
        </p>
        <p v-if="!directoryPlots.length" role="status">
          {{
            t('No purchases available. Earn coins in the mine or finish your current construction.')
          }}
        </p>
        <section class="town-building-list" :aria-label="t('Available buildings')">
          <button v-for="place in directoryPlots" :key="place.id" @click="selectBuilding(place.id)">
            <span class="building-list-dot" :style="{ background: place.color }"></span>
            <span
              >{{ t(place.shortName) }}<small>{{ plotStatus(place) }}</small></span
            >
            <span
              v-if="town.coins < place.offer.cost"
              class="town-plot-price"
              :aria-label="t('1 builder hammer')"
            >
              <img src="/art/rewards/builder-hammer.svg" alt="" /> 1
            </span>
            <span
              v-else
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
        @finish="finishBuilding(selected)"
        @collect-income="collectIncome"
        @select="selectBuilding"
        @museum="visitMuseum"
        @mine="goMining"
      />
    </TownDialog>
    <TownTour
      v-if="active && tourOpen"
      :mine-stage="campaign.mineStage"
      @close="finishTour"
      @build="
        finishTour();
        selectBuilding(goal?.id ?? 'well');
      "
    />
    <TownMuseum
      v-if="active && museumOpen && campaign.canReplay"
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
  visitorCapacity,
  happiness,
  nextGoal,
  availablePurchases,
  constructionReady,
  saloonIncomeRate,
  totalLevels,
  gangSize,
  raidProtection,
} from '../../game/town/TownRules';
import { useGameStore } from '../../stores/gameStore';
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
import TownRaidLoss from './TownRaidLoss.vue';
import TownCoinCollection from './TownCoinCollection.vue';

const props = defineProps({ openMuseum: Boolean, active: { type: Boolean, default: true } });
const emit = defineEmits(['mine', 'replay', 'continuous', 'museum-change']);
const campaign = useCampaignStore(),
  settings = useSettingsStore();
const game = useGameStore();
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
    if (props.active) fullscreenButton.value?.focus({ preventScroll: true });
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
const showConstructionTip = computed(
  () =>
    props.active && !town.value.constructionTipSeen && activeProjects.value.some(constructionReady),
);
const goal = computed(() => nextGoal(town.value));
const directoryPlots = computed(() => availablePurchases(town.value, campaign.builderHammers));
const built = computed(() => BUILDINGS.filter(({ id }) => town.value.buildings[id]).length);
const villageStats = computed(() => {
  const demand = totalLevels(town.value, 'home') * 2 + visitorCapacity(town.value);
  return [
    {
      id: 'people',
      icon: 'people',
      label: t('Population'),
      value: number(people.value),
      detail: t('{residents} residents · {visitors} visitors', {
        residents: residents.value,
        visitors: visitors.value,
      }),
    },
    { id: 'coins', icon: 'coin', label: t('Town savings'), value: number(town.value.coins) },
    {
      id: 'water',
      icon: 'water',
      label: t('Water'),
      value: number(totalLevels(town.value, 'well') * 6),
      detail: t('Capacity in people · Demand: {count}', { count: demand }),
    },
    {
      id: 'food',
      icon: 'food',
      label: t('Food'),
      value: number(totalLevels(town.value, 'farm') * 6),
      detail: t('Capacity in people · Demand: {count}', { count: demand }),
    },
    {
      id: 'happiness',
      icon: 'happiness',
      label: t('Happiness'),
      value: `${happiness(town.value)}%`,
    },
    {
      id: 'saloon',
      icon: 'coin',
      label: t('Saloon'),
      value: t('{rate}/hour', { rate: incomeRate.value }),
      detail: t('Stored: {coins} coins', { coins: number(town.value.income.stored ?? 0) }),
    },
    {
      id: 'buildings',
      icon: 'home',
      label: t('Buildings'),
      value: `${built.value}/${BUILDINGS.length}`,
      detail: t('Active construction: {count}', { count: activeProjects.value.length }),
    },
    {
      id: 'hammers',
      label: t('Builder hammers'),
      value: `${campaign.builderHammers}/${HAMMER_CAPACITY}`,
    },
  ];
});
const selected = ref(goal.value?.id ?? 'home');
const museumOpen = ref(props.openMuseum && campaign.canReplay),
  dialogMode = ref('');
const paused = ref(false),
  construction = ref(null),
  announcement = ref(''),
  latestMoment = ref(null);
const raidLoss = ref(null);
const collection = ref(null);
let collectionSerial = 0;
const activeRaid = ref(null),
  raidPhase = ref('Riders on the ridge');
const cameraDistance = ref(55);
useTownAudio(() => ({
  active: props.active,
  cameraDistance: cameraDistance.value,
  population: people.value,
  construction: activeProjects.value.length > 0,
  buildCue: construction.value?.serial,
  stable: town.value.buildings.stable > 0,
  raid: activeRaid.value ? `${activeRaid.value.id}-${raidPhase.value}` : null,
  paused:
    !props.active ||
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
            ? 'Each completed puzzle prepares every building in progress. Tap a ready building to open it.'
            : 'Choose what to build next. Families need a working well, a farm, and a home before they move in.',
        }
      : INITIAL_STORY),
);
watch(museumOpen, (open) => {
  if (props.active) emit('museum-change', open);
});
watch(
  () => props.openMuseum,
  (open) => {
    if (!props.active) return;
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
function collectIncome() {
  const coins = campaign.collectSaloonIncome();
  if (!coins) return false;
  closeDialog();
  collection.value = { coins, serial: ++collectionSerial };
  return true;
}
async function selectBuilding(id) {
  if (!Object.hasOwn(BUILDING_BY_ID, id)) return;
  selected.value = id;
  if (constructionReady(town.value.projects[id])) {
    finishBuilding(id);
    return;
  }
  if (id === 'saloon' && collectIncome()) return;
  collection.value = null;
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
  collection.value = null;
  closeDialog();
  if (campaign.completedCount < LEVEL_COUNT) emit('mine');
  else if (campaign.canReplay) museumOpen.value = true;
  else selectBuilding('museum');
}
function plotStatus(place) {
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
      : 'Work started at {building}. Complete one puzzle, then tap the building to finish.',
    {
      building: t(BUILDING_BY_ID[selected.value].shortName),
    },
  );
  latestMoment.value = {
    speaker: 'Ada · the caretaker',
    title: complete ? 'Building complete!' : 'The first step is yours.',
    text: complete
      ? BUILDING_BY_ID[selected.value].upgrades[stage].story
      : 'The materials are ready. Complete one puzzle, then tap the scaffolding to open this building.',
  };
}
function showConstruction() {
  closeDialog();
  construction.value = { id: selected.value, serial: (construction.value?.serial ?? 0) + 1 };
  mapFrame.value?.scrollIntoView({ behavior: 'instant', block: 'nearest' });
}
function finishBuilding(id) {
  const stage = town.value.projects[id]?.stage;
  if (!campaign.finishConstruction(id, stage)) return;
  selected.value = id;
  showConstruction();
  celebrateBuilding();
}
function celebrateBuilding() {
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
function useHammer(stage) {
  if (!campaign.useBuilderHammer(selected.value, stage)) return;
  showConstruction();
  celebrateBuilding();
}

function finishRaid() {
  if (!activeRaid.value) return;
  const receipt = activeRaid.value;
  // The wallet was settled before the raid. This only presents its saved loss once.
  if (campaign.markRaidSeen(receipt.id) && receipt.loss > 0) raidLoss.value = receipt;
  activeRaid.value = null;
  latestMoment.value = banditStory.value;
  announcement.value = banditStory.value.text;
}
function replayRaid() {
  closeDialog();
  raidLoss.value = null;
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
function enterVillage() {
  fullscreen.value = true;
  tourOpen.value = !campaign.town.tourSeen;
  museumOpen.value = props.openMuseum && campaign.canReplay;
  campaign.lastConstruction = [];
  campaign.accrueSaloonIncome();
  campaign.resolveBandits();
  if (event.value && !event.value.seen) activeRaid.value = { ...event.value };
  if (props.openMuseum && !campaign.canReplay) {
    selectBuilding('museum');
    emit('museum-change', false);
  }
}
watch(
  () => props.active,
  (active) => {
    if (active) enterVillage();
    else {
      closeDialog();
      museumOpen.value = false;
      fullscreen.value = false;
      activeRaid.value = null;
      raidLoss.value = null;
      collection.value = null;
    }
  },
  { flush: 'sync' },
);
onMounted(() => {
  visibilityChanged();
  document.addEventListener('visibilitychange', visibilityChanged);
  document.addEventListener('keydown', leaveFullscreen);
  if (props.active) enterVillage();
});
onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', visibilityChanged);
  document.removeEventListener('keydown', leaveFullscreen);
  if (fullscreen.value) document.body.style.overflow = previousOverflow ?? '';
});
</script>
