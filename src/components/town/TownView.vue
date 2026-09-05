<template>
  <main class="town-view">
    <div class="town-heading">
      <div>
        <p class="town-kicker"><span></span> CHAPTER 01 · A FRESH START</p>
        <h1>Prospect Hollow<span>Est. one good deed at a time.</span></h1>
      </div>
      <div class="town-wallet" aria-label="Town savings">
        <TownIcon name="coin" />
        <div>
          <strong>{{ town.coins.toLocaleString() }}</strong
          ><span>MINING COINS</span>
        </div>
      </div>
    </div>

    <div class="town-layout">
      <section class="town-world" aria-label="Your town">
        <div class="town-map-frame">
          <div class="town-map-caption">
            <span><TownIcon name="sun" /> A LITTLE HOPE ON THE HORIZON</span
            ><span>{{ repaired }} / 6 restored</span>
          </div>
          <TownMap
            :town="town"
            :selected="selected"
            :population="residents"
            :reduced-motion="settings.reducedMotion"
            :paused="paused || settings.isSettingsOpen"
            :revealing="revealing"
            @select="selectBuilding"
          />
          <div class="town-map-footnote">
            <span><i></i> {{ townStatus }}</span
            ><span>Choose a place to make a difference</span>
          </div>
        </div>
        <div class="town-needs" aria-label="Basic town needs">
          <div>
            <TownIcon name="water" /><span
              >Water<small>{{
                town.buildings.well ? 'Fresh & flowing' : 'A well worth fixing'
              }}</small></span
            ><TownIcon v-if="town.buildings.well" name="check" class="need-ready" />
          </div>
          <div>
            <TownIcon name="food" /><span
              >Food<small>{{
                town.buildings.farm ? 'Good things growing' : 'The fields are waiting'
              }}</small></span
            ><TownIcon v-if="town.buildings.farm" name="check" class="need-ready" />
          </div>
          <div>
            <TownIcon name="people" /><span
              >{{ residents }} neighbors<small>{{
                residents ? 'A little more like home' : 'Room for a fresh start'
              }}</small></span
            >
          </div>
        </div>
        <section
          class="town-story"
          aria-label="A word from your neighbors"
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
            <span class="town-kicker">{{ moment.speaker }}</span>
            <h2>{{ moment.title }}</h2>
            <p>{{ moment.text }}</p>
          </div>
          <button v-if="revealing" class="story-skip" @click="finishReveal">Skip reveal</button>
        </section>
      </section>

      <aside ref="panel" class="town-building-panel" aria-labelledby="building-title">
        <div class="town-panel-top">
          <span class="town-kicker">{{
            offer ? 'A LITTLE WORK. A BIG DIFFERENCE.' : 'ANOTHER PIECE OF HOME.'
          }}</span
          ><span class="town-stage">{{
            town.buildings[selected] ? 'Restored' : 'Waiting for you'
          }}</span>
        </div>
        <div class="town-building-preview" :style="{ '--building-tint': building.color }">
          <svg viewBox="-160 -200 320 245" aria-hidden="true">
            <ellipse cy="9" rx="133" ry="26" fill="#a79d7040" />
            <TownBuilding :id="selected" :stage="town.buildings[selected]" />
          </svg>
        </div>
        <p class="town-kicker">{{ building.purpose }}</p>
        <h2 id="building-title" ref="panelTitle" tabindex="-1">{{ building.name }}</h2>
        <p class="town-stage-description">{{ building.stages[town.buildings[selected]] }}</p>
        <template v-if="offer">
          <div class="town-upgrade-description">
            <h3>{{ offer.title }}</h3>
            <p>{{ offer.benefit }}</p>
          </div>
          <div class="town-after">
            <svg viewBox="-160 -190 320 240" aria-hidden="true">
              <TownBuilding :id="selected" :stage="town.buildings[selected] + 1" />
            </svg>
            <div>
              <span class="town-kicker">AFTER A LITTLE LOVE</span
              ><span>{{ building.stages[town.buildings[selected] + 1] }}</span>
            </div>
          </div>
          <button
            class="town-primary town-purchase"
            :disabled="!!offer.reason || !!revealing"
            @click="repair"
          >
            <span
              >{{ town.buildings[selected] ? 'Improve' : 'Restore' }}
              {{ building.shortName.toLowerCase() }}</span
            ><span><TownIcon name="coin" />{{ offer.cost }}</span>
          </button>
          <p class="town-purchase-hint">
            {{ offer.reason || 'One small change. A lasting difference.' }}
          </p>
        </template>
        <template v-else>
          <div class="town-restored-note">
            <TownIcon name="check" />
            <p>{{ building.upgrades.at(-1).benefit }}</p>
          </div>
          <button v-if="goal" class="town-secondary" @click="selectBuilding(goal.id)">
            Next: {{ goal.title }}<TownIcon name="arrow" />
          </button>
          <p v-else class="town-finished">
            You’ve brought Prospect Hollow back to life. Stay for a while. There are always more
            jewels in the hills.
          </p>
        </template>
        <div class="town-mine-action">
          <button class="town-primary" @click="$emit('mine')">
            <TownIcon name="mine" /> Go mining <TownIcon name="arrow" /></button
          ><small>A few jewels can change a whole town.</small>
        </div>
      </aside>
    </div>

    <section class="town-building-list" aria-label="All town buildings">
      <button
        v-for="place in BUILDINGS"
        :key="place.id"
        :aria-pressed="selected === place.id"
        @click="selectBuilding(place.id)"
      >
        <span class="building-list-dot" :style="{ background: place.color }"></span
        ><span
          >{{ place.shortName
          }}<small>{{
            town.buildings[place.id]
              ? place.stages[town.buildings[place.id]]
              : 'Ready for a new beginning'
          }}</small></span
        ><TownIcon :name="town.buildings[place.id] ? 'check' : 'arrow'" />
      </button>
    </section>

    <details v-if="residents" class="town-trail-story">
      <summary>
        <TownIcon name="star" /><span
          >Stories from the trail<small>A little frontier adventure · optional</small></span
        ><span>+</span>
      </summary>
      <div v-if="!event">
        <h3>Strangers on the dusty trail</h3>
        <p>
          Ada has spotted bandits beyond the ridge. A sheriff can send them on their way. Without
          one, they might take a few coins—but never your last savings.
        </p>
        <button class="town-secondary" @click="meetBandits">
          See who’s coming <TownIcon name="arrow" />
        </button>
      </div>
      <div v-else>
        <h3>{{ banditStory.title }}</h3>
        <p>{{ banditStory.text }}</p>
        <small>This chapter of the story is complete.</small>
      </div>
    </details>
    <p v-if="campaign.saveWarning" role="status" class="town-save-warning">
      {{ campaign.saveWarning }}
    </p>
    <div class="town-bottom-note">
      <span>One town. One little adventure at a time.</span
      ><span
        >{{ campaign.saveWarning ? 'Progress kept for this session' : 'Saved on this device' }} ·
        More chapters to come</span
      >
    </div>
    <div class="town-mobile-mining">
      <div>
        <span class="town-kicker">A FEW JEWELS. A FRESH START.</span
        ><span>{{ goal ? goal.title : 'The hills are full of possibility.' }}</span>
      </div>
      <button class="town-primary" @click="$emit('mine')">
        <TownIcon name="mine" /> Go mining
      </button>
    </div>
    <span class="town-sr-only" role="status">{{ announcement }}</span>
  </main>
</template>
<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { BUILDINGS, BUILDING_BY_ID, BANDIT_EVENT, INITIAL_STORY } from '../../data/town';
import { population, nextGoal, upgradeOffer } from '../../game/town/TownRules';
import { useCampaignStore } from '../../stores/campaignStore';
import { useSettingsStore } from '../../stores/settingsStore';
import TownMap from './TownMap.vue';
import TownBuilding from './TownBuilding.vue';
import TownIcon from './TownIcon.vue';
import '../../styles/town.css';

defineEmits(['mine']);
const campaign = useCampaignStore(),
  settings = useSettingsStore();
const town = computed(() => campaign.town);
const residents = computed(() => population(town.value));
const goal = computed(() => nextGoal(town.value));
const selected = ref(goal.value?.id ?? 'home');
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
    (residents.value
      ? {
          speaker: 'Ada · the caretaker',
          title:
            repaired.value === 6
              ? 'Look what we built together.'
              : 'It’s good to have neighbors again.',
          text: goal.value
            ? `${goal.value.title}. ${goal.value.benefit}`
            : 'The lights are on, the horses are home, and there’s music down the street. Those jewels made quite a difference.',
        }
      : repaired.value
        ? {
            speaker: 'Ada · the caretaker',
            title: 'One good deed leads to another.',
            text: `${town.value.buildings.farm ? 'Water’s flowing and the fields are planted.' : 'Fresh water is flowing again.'} ${goal.value?.benefit ?? 'This place is beginning to feel like home.'}`,
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
  latestMoment.value = { speaker: current.speaker, title: current.title, text: current.story };
  announcement.value = `${building.value.name} improved. ${town.value.coins} coins remaining. ${residents.value} neighbors.`;
  revealing.value = selected.value;
  revealTimer = setTimeout(finishReveal, settings.reducedMotion ? 350 : 800);
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
          text: `The bandits slipped away with ${event.value.loss} coins. Our homes and savings are safe. Perhaps it’s time to pin up that sheriff’s badge.`,
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
