<template>
  <main class="town-view">
    <div class="town-heading">
      <div>
        <p class="town-kicker"><span></span> {{ t('CHAPTER 01 · A FRESH START') }}</p>
        <h1>
          Prospect Hollow<span> {{ t('Est. one good deed at a time.') }} </span>
        </h1>
      </div>
      <div class="town-wallet" :aria-label="t('Town savings')">
        <TownIcon name="coin" />
        <div>
          <strong>{{ number(town.coins) }}</strong
          ><span> {{ t('MINING COINS') }} </span>
        </div>
      </div>
    </div>

    <div class="town-layout">
      <section class="town-world" :aria-label="t('Your town')">
        <div class="town-map-frame">
          <div class="town-map-caption">
            <span><TownIcon name="sun" /> {{ t('A LITTLE HOPE ON THE HORIZON') }} </span
            ><span>{{ repaired }} {{ t('/ 6 built') }} </span>
          </div>
          <TownScene
            :town="town"
            :selected="selected"
            :population="residents"
            :reduced-motion="settings.reducedMotion"
            :paused="paused || settings.isSettingsOpen"
            :revealing="revealing"
            :next-level="campaign.nextLevel"
            @select="selectBuilding"
            @mine="$emit('mine')"
          />
          <div class="town-map-footnote">
            <span><i></i> {{ t(townStatus) }}</span
            ><span> {{ t('Choose a plot · Play puzzles to build it') }} </span>
          </div>
        </div>
        <div class="town-needs" :aria-label="t('Basic town needs')">
          <div>
            <TownIcon name="water" /><span>
              {{ t('Water') }}
              <small>{{
                t(town.buildings.well ? 'Fresh & flowing' : 'A well to build')
              }}</small></span
            ><TownIcon v-if="town.buildings.well" name="check" class="need-ready" />
          </div>
          <div>
            <TownIcon name="food" /><span>
              {{ t('Food') }}
              <small>{{
                t(town.buildings.farm ? 'Good things growing' : 'The fields are waiting')
              }}</small></span
            ><TownIcon v-if="town.buildings.farm" name="check" class="need-ready" />
          </div>
          <div>
            <TownIcon name="people" /><span
              >{{ residents }} {{ t('neighbors') }}
              <small>{{
                t(residents ? 'A little more like home' : 'Room for a fresh start')
              }}</small></span
            >
          </div>
        </div>
        <p v-if="activeProjects.length" class="town-construction-summary">
          {{ t('Active construction: {count}', { count: activeProjects.length }) }} ·
          {{ t('Each completed puzzle advances every building in progress.') }}
          {{ t('Choose another plot whenever you have the coins.') }}
        </p>
        <section
          class="town-story"
          :aria-label="t('A word from your neighbors')"
          aria-live="polite"
          aria-atomic="true"
        >
          <div class="caretaker-portrait" aria-hidden="true">
            <svg viewBox="0 0 70 80">
              <path d="M8 80V63q27-22 54 0v17" fill="#6d8580" />
              <path d="m23 58 12 14 12-14" fill="#ddb992" />
              <ellipse cx="35" cy="34" rx="20" ry="26" fill="#e1b98b" />
              <path d="M15 38q-6-19 8-26l24 3q13 10 7 26l-5-20-27 3Z" fill="#d3c5a5" />
              <path d="M24 38h5m14 0h5" stroke="#695c48" stroke-width="2" stroke-linecap="round" />
              <path d="M31 49q5 4 10-1" fill="none" stroke="#ab7f5d" stroke-width="2" />
              <ellipse cx="34" cy="19" rx="32" ry="8" fill="#a68961" />
              <path d="m15 19 5-18h28l6 18" fill="#bfa579" />
              <path d="M17 12h34v7H17Z" fill="#637d72" />
            </svg>
          </div>
          <div>
            <span class="town-kicker">{{ t(moment.speaker) }}</span>
            <h2>{{ t(moment.title) }}</h2>
            <p>{{ t(moment.text) }}</p>
          </div>
          <button v-if="revealing" class="story-skip" @click="finishReveal">
            {{ t('Skip reveal') }}
          </button>
        </section>
      </section>

      <aside ref="panel" class="town-building-panel" aria-labelledby="building-title">
        <div class="town-panel-top">
          <span class="town-kicker">{{
            t(offer ? 'YOUR TOWN. YOUR CHOICE.' : 'ANOTHER PIECE OF HOME.')
          }}</span
          ><span class="town-stage">{{
            t(
              selectedProject
                ? 'Under construction'
                : town.buildings[selected]
                  ? 'Built'
                  : 'Empty plot',
            )
          }}</span>
        </div>
        <div class="town-building-preview" :style="{ '--building-tint': building.color }">
          <svg viewBox="-160 -200 320 245" aria-hidden="true">
            <ellipse cy="9" rx="133" ry="26" fill="#a79d7040" />
            <TownSite
              :id="selected"
              :stage="town.buildings[selected]"
              :wins="selectedProject?.wins ?? null"
            />
          </svg>
        </div>
        <p class="town-kicker">{{ t(building.purpose) }}</p>
        <h2 id="building-title" ref="panelTitle" tabindex="-1">{{ t(building.name) }}</h2>
        <p class="town-stage-description">
          {{
            t(
              town.buildings[selected]
                ? building.stages[town.buildings[selected]]
                : 'A place for your next beginning',
            )
          }}
        </p>
        <div v-if="selectedProject" class="town-project-progress">
          <h3>{{ t('Your building is taking shape') }}</h3>
          <p>
            {{ selectedProject.wins }} / {{ t(projectRuns(selectedProject.stage)) }}
            {{ t('puzzles completed') }}
          </p>
          <progress
            :value="selectedProject.wins"
            :max="projectRuns(selectedProject.stage)"
            :aria-label="t('Construction progress')"
          ></progress>
          <p>
            {{
              t(
                'Every completed puzzle adds the next part. Benefits arrive when the building is finished.',
              )
            }}
          </p>
        </div>
        <template v-else-if="offer">
          <div class="town-upgrade-description">
            <h3>{{ t(offer.title) }}</h3>
            <p>{{ t(offer.benefit) }}</p>
          </div>
          <div class="town-after">
            <svg viewBox="-160 -190 320 240" aria-hidden="true">
              <TownBuilding :id="selected" :stage="town.buildings[selected] + 1" />
            </svg>
            <div>
              <span class="town-kicker"> {{ t('WHEN THE WORK IS DONE') }} </span
              ><span>{{ t(building.stages[town.buildings[selected] + 1]) }}</span>
            </div>
          </div>
          <button
            class="town-primary town-purchase"
            :disabled="!!offer.reason || !!revealing"
            @click="repair"
          >
            <span>{{ t(town.buildings[selected] ? 'Start improvement' : 'Start building') }}</span
            ><span><TownIcon v-if="offer.cost" name="coin" />{{ t(offer.cost || 'Free') }}</span>
          </button>
          <p class="town-purchase-hint">
            {{ t(offer.reason || 'Materials ready. Complete puzzles to finish the work.') }}
          </p>
          <p class="town-purchase-hint">
            {{ offer.runs }} {{ t('completed puzzles · Benefits on completion') }}
          </p>
        </template>
        <template v-else>
          <div class="town-restored-note">
            <TownIcon name="check" />
            <p>{{ t(building.upgrades.at(-1).benefit) }}</p>
          </div>
          <button v-if="goal" class="town-secondary" @click="selectBuilding(goal.id)">
            {{ t('Next:') }} {{ t(goal.title) }}<TownIcon name="arrow" />
          </button>
          <p v-else class="town-finished">
            {{
              t(
                'You’ve brought Prospect Hollow back to life. Stay for a while. There are always more jewels in the hills.',
              )
            }}
          </p>
        </template>
        <div class="town-mine-action">
          <button class="town-primary" @click="$emit('mine')">
            <TownIcon name="mine" /> {{ t('Go mining') }} <TownIcon name="arrow" /></button
          ><small> {{ t('A few jewels can change a whole town.') }} </small>
        </div>
      </aside>
    </div>

    <section class="town-building-list" :aria-label="t('All town buildings')">
      <button
        v-for="place in BUILDINGS"
        :key="place.id"
        :aria-pressed="selected === place.id"
        @click="selectBuilding(place.id)"
      >
        <span class="building-list-dot" :style="{ background: place.color }"></span
        ><span
          >{{ t(place.shortName)
          }}<small>{{
            t(
              town.projects[place.id]
                ? t('Under construction · {wins}/{required}', {
                    wins: town.projects[place.id].wins,
                    required: projectRuns(town.projects[place.id].stage),
                  })
                : town.buildings[place.id]
                  ? place.stages[town.buildings[place.id]]
                  : 'Ready for a new beginning',
            )
          }}</small></span
        ><TownIcon :name="town.buildings[place.id] ? 'check' : 'arrow'" />
      </button>
    </section>

    <details v-if="residents" class="town-trail-story">
      <summary>
        <TownIcon name="star" /><span>
          {{ t('Stories from the trail') }}
          <small> {{ t('A little frontier adventure · optional') }} </small></span
        ><span>+</span>
      </summary>
      <div v-if="!event">
        <h3>{{ t('Strangers on the dusty trail') }}</h3>
        <p>
          {{
            t(
              'Ada has spotted bandits beyond the ridge. A sheriff can send them on their way. Without one, they might take a few coins—but never your last savings.',
            )
          }}
        </p>
        <button class="town-secondary" @click="meetBandits">
          {{ t('See who’s coming') }} <TownIcon name="arrow" />
        </button>
      </div>
      <div v-else>
        <h3>{{ t(banditStory.title) }}</h3>
        <p>{{ t(banditStory.text) }}</p>
        <small> {{ t('This chapter of the story is complete.') }} </small>
      </div>
    </details>
    <p v-if="campaign.saveWarning" role="status" class="town-save-warning">
      {{ t(campaign.saveWarning) }}
    </p>
    <div class="town-bottom-note">
      <span> {{ t('One town. One little adventure at a time.') }} </span
      ><span
        >{{ t(campaign.saveWarning ? 'Progress kept for this session' : 'Saved on this device') }}
        {{ t('· More chapters to come') }}
      </span>
    </div>
    <div class="town-mobile-mining">
      <div>
        <span class="town-kicker"> {{ t('A FEW JEWELS. A FRESH START.') }} </span
        ><span>{{ t(goal ? goal.title : 'The hills are full of possibility.') }}</span>
      </div>
      <button class="town-primary" @click="$emit('mine')">
        <TownIcon name="mine" /> {{ t('Go mining') }}
      </button>
    </div>
    <span class="town-sr-only" role="status">{{ t(announcement) }}</span>
  </main>
</template>
<script setup>
import { t, number } from '../../i18n';
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { BUILDINGS, BUILDING_BY_ID, BANDIT_EVENT, INITIAL_STORY } from '../../data/town';
import { population, nextGoal, upgradeOffer, projectRuns } from '../../game/town/TownRules';
import { useCampaignStore } from '../../stores/campaignStore';
import { useSettingsStore } from '../../stores/settingsStore';
import TownScene from './TownScene.vue';
import TownBuilding from './TownBuilding.vue';
import TownSite from './TownSite.vue';
import TownIcon from './TownIcon.vue';
import '../../styles/town.css';

defineEmits(['mine']);
const campaign = useCampaignStore(),
  settings = useSettingsStore();
const town = computed(() => campaign.town);
const residents = computed(() => population(town.value));
const activeProjects = computed(() => Object.values(town.value.projects));
const goal = computed(() =>
  activeProjects.value.length
    ? { id: activeProjects.value[0].id, title: 'Continue the work' }
    : nextGoal(town.value),
);
const selected = ref(goal.value?.id ?? 'home');
const selectedProject = computed(() => town.value.projects[selected.value]);
const building = computed(() => BUILDING_BY_ID[selected.value]);
const offer = computed(() => upgradeOffer(town.value, selected.value));
const repaired = computed(() => BUILDINGS.filter(({ id }) => town.value.buildings[id]).length);
const townStatus = computed(() =>
  repaired.value === 6
    ? 'A town full of possibilities'
    : residents.value
      ? 'Our little town is coming to life'
      : 'A fresh start in the foothills',
);
const latestMoment = ref(null);
const moment = computed(
  () =>
    latestMoment.value ??
    (activeProjects.value.length
      ? {
          speaker: 'Ada · the caretaker',
          title: 'A little more with every puzzle.',
          text: 'Each completed puzzle advances every building in progress. Opening day is getting closer.',
        }
      : residents.value
        ? {
            speaker: 'Ada · the caretaker',
            title:
              repaired.value === 6
                ? 'Look what we built together.'
                : 'It’s good to have neighbors again.',
            text: goal.value
              ? `${t(goal.value.title)}. ${t(goal.value.benefit)}`
              : 'The lights are on, the horses are home, and there’s music down the street. Those jewels made quite a difference.',
          }
        : repaired.value
          ? {
              speaker: 'Ada · the caretaker',
              title: 'One good deed leads to another.',
              text: 'Choose what to build next. Families need a working well, a farm, and a home before they move in.',
            }
          : INITIAL_STORY),
);
const panel = ref(null),
  panelTitle = ref(null),
  revealing = ref(''),
  announcement = ref(''),
  paused = ref(false);
let revealTimer;
const finishReveal = () => {
  clearTimeout(revealTimer);
  revealing.value = '';
};
const visibilityChanged = () => {
  paused.value = document.hidden;
};
onMounted(() => {
  visibilityChanged();
  document.addEventListener('visibilitychange', visibilityChanged);
  const completed = campaign.lastConstruction.filter((project) => project.complete);
  if (completed.length) {
    const upgrade = BUILDING_BY_ID[completed[0].id].upgrades[completed[0].stage - 1];
    latestMoment.value = { speaker: upgrade.speaker, title: upgrade.title, text: upgrade.story };
    if (completed.length > 1)
      latestMoment.value = {
        speaker: 'Ada · the caretaker',
        title: 'Several doors are opening!',
        text: t('Completed buildings: {buildings}.', {
          buildings: completed.map((project) => t(BUILDING_BY_ID[project.id].shortName)).join(', '),
        }),
      };
    if (
      residents.value &&
      completed.some(
        (project) => project.stage === 1 && ['well', 'farm', 'home'].includes(project.id),
      )
    )
      latestMoment.value = {
        speaker: 'Ada · the caretaker',
        title: 'Welcome home.',
        text: 'Fresh water, food, and a home. The Bell family has decided to stay!',
      };
  }
  campaign.lastConstruction = [];
});
onBeforeUnmount(() => {
  clearTimeout(revealTimer);
  document.removeEventListener('visibilitychange', visibilityChanged);
});
async function selectBuilding(id) {
  selected.value = id;
  await nextTick();
  panelTitle.value?.focus({ preventScroll: true });
  if (window.matchMedia('(max-width: 850px)').matches)
    panel.value?.scrollIntoView({
      behavior: settings.reducedMotion ? 'instant' : 'smooth',
      block: 'nearest',
    });
}
function repair() {
  if (revealing.value) return;
  const current = offer.value;
  if (!current || !campaign.upgradeBuilding(selected.value, current.stage)) return;
  latestMoment.value = {
    speaker: 'Ada · the caretaker',
    title: 'The first step is yours.',
    text: 'The materials are ready. Each completed puzzle will bring this building a little closer to opening day.',
  };
  announcement.value = 'Construction started. Head to the mine to make progress.';
}
const event = computed(() => town.value.events[BANDIT_EVENT]);
const banditStory = computed(() =>
  event.value?.outcome === 'protected'
    ? {
        speaker: 'Sam · the sheriff',
        title: 'Not in our town.',
        text: 'Sam meets the riders at the edge of town. A tip of the hat, a few quiet words, and the bandits ride on. Every coin is safe.',
      }
    : event.value?.outcome === 'stolen'
      ? {
          speaker: 'Ada · the caretaker',
          title: 'A little trouble on the trail.',
          text: t(
            'The bandits slipped away with {value0} coins. Our homes and savings are safe. Perhaps it’s time to pin up that sheriff’s badge.',
            { value0: t(event.value.loss) },
          ),
        }
      : {
          speaker: 'Ada · the caretaker',
          title: 'Nothing for you here, strangers.',
          text: 'The riders find nothing to take and move on. Your savings are safe. A sheriff would help keep things that way.',
        },
);
function meetBandits() {
  if (campaign.resolveBandits()) {
    latestMoment.value = banditStory.value;
    announcement.value = banditStory.value.text;
  }
}
</script>
