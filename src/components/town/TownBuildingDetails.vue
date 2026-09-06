<template>
  <section class="town-building-details" aria-labelledby="building-title">
    <div class="town-detail-title">
      <div>
        <p class="town-kicker">{{ t(building.purpose) }}</p>
        <h2 id="building-title">{{ t(building.name) }}</h2>
      </div>
      <span class="town-level-badge">{{ t('Level {level} / 3', { level: stage }) }}</span>
    </div>
    <div class="town-building-preview" :style="{ '--building-tint': building.color }">
      <svg viewBox="-160 -200 320 245" aria-hidden="true">
        <ellipse cy="9" rx="133" ry="26" fill="#a79d7040" />
        <TownSite v-if="project" :id="id" :stage="stage" :wins="constructionVisual(project)" />
        <TownBuilding v-else :id="id" :stage="offer ? stage + 1 : stage" />
      </svg>
      <small>{{
        t(project ? 'Under construction' : offer ? 'WHEN THE WORK IS DONE' : building.stages[stage])
      }}</small>
    </div>
    <div v-if="project" class="town-project-progress">
      <h3>{{ t('Your building is taking shape') }}</h3>
      <p>
        {{
          t('{wins}/{required} puzzles completed', {
            wins: project.wins,
            required: constructionRuns(project),
          })
        }}
      </p>
      <progress
        :value="project.wins"
        :max="constructionRuns(project)"
        :aria-label="t('Construction progress')"
      />
      <p>
        {{
          t(
            stage
              ? 'The building stays open during improvements. The new benefits arrive when the scaffolding comes down.'
              : 'Every completed puzzle adds the next part. Benefits arrive when the building is finished.',
          )
        }}
      </p>
      <button
        class="town-secondary builder-hammer-action"
        :disabled="!hammers"
        @click="$emit('hammer', project)"
      >
        <img src="/art/rewards/builder-hammer.svg" alt="" />{{
          t('Use a builder hammer · +1 step')
        }}
      </button>
      <small>{{ t('{count} builder hammers available', { count: hammers }) }}</small>
    </div>
    <div v-else-if="offer" class="town-detail-offer">
      <h3>{{ t(offer.title) }}</h3>
      <p>{{ t(offer.benefit) }}</p>
      <button
        class="town-primary town-purchase"
        :disabled="!!offer.reason"
        @click="$emit('build', offer.stage)"
      >
        <span>{{ t(stage ? 'Start improvement' : 'Start building') }}</span>
        <span><TownIcon v-if="offer.cost" name="coin" />{{ t(offer.cost || 'Free') }}</span>
      </button>
      <p class="town-purchase-hint">
        {{ t(offer.reason || '{count} puzzles to finish', { count: offer.runs }) }}
      </p>
      <button
        v-if="!plotUnlocked(town, id)"
        class="town-secondary"
        @click="$emit('select', building.kind)"
      >
        {{ t('Go to {building}', { building: t(BUILDING_BY_ID[building.kind].shortName) }) }} →
      </button>
    </div>
    <p v-else class="town-restored-note">
      <TownIcon name="check" />{{ t(building.upgrades.at(-1).benefit) }}
    </p>
    <section v-if="id === 'saloon' && stage" class="town-service">
      <h3>{{ t('Saloon · {rate} coins/hour', { rate: saloonIncomeRate(town) }) }}</h3>
      <p>
        {{
          t('With {count} completed houses · Up to 8 hours saved while away', {
            count: completedHouses(town),
          })
        }}
      </p>
      <small v-if="lastIncome">{{
        t('Last earnings: +{coins} coins', { coins: lastIncome })
      }}</small>
    </section>
    <section v-if="id === 'sheriff'" class="town-service">
      <h3>{{ t('Keep pace with the town') }}</h3>
      <p>
        {{
          t('Gang: {gang} riders · Protection: {protection} riders', {
            gang: gangSize(town),
            protection: stage * 2,
          })
        }}
      </p>
      <small>{{
        t(
          'Each completed sheriff level protects against two riders. Existing protection stays active during upgrades.',
        )
      }}</small>
    </section>
    <section v-if="id === 'museum' && stage" class="town-service">
      <button class="town-primary" @click="$emit('museum')">
        {{ t('Visit the museum') }} <TownIcon name="arrow" />
      </button>
    </section>
    <details v-if="id === 'armory'" class="town-service" open>
      <summary>{{ t('Capacity: {count} of each puzzle bonus', { count: bonusLimit }) }}</summary>
      <ul class="armory-inventory">
        <li v-for="power in powers" :key="power.id">
          <img :src="`/art/powers/${power.id}.svg`" alt="" /><span>{{ t(power.label) }}</span
          ><strong>{{ power.quantity }}/{{ bonusLimit }}</strong>
        </li>
      </ul>
    </details>
    <button
      v-if="project || (offer?.reason && plotUnlocked(town, id))"
      class="town-secondary town-detail-mine"
      @click="$emit('mine')"
    >
      <TownIcon name="mine" />{{ t('Go mining') }} →
    </button>
  </section>
</template>
<script setup>
import { computed } from 'vue';
import { t } from '../../i18n';
import { BUILDING_BY_ID } from '../../data/town';
import {
  upgradeOffer,
  constructionRuns,
  constructionVisual,
  plotUnlocked,
  saloonIncomeRate,
  completedHouses,
  gangSize,
} from '../../game/town/TownRules';
import TownBuilding from './TownBuilding.vue';
import TownSite from './TownSite.vue';
import TownIcon from './TownIcon.vue';
const props = defineProps({
  id: String,
  town: Object,
  hammers: Number,
  bonusLimit: Number,
  powers: Array,
  lastIncome: Number,
});
defineEmits(['build', 'hammer', 'select', 'museum', 'mine']);
const building = computed(() => BUILDING_BY_ID[props.id]);
const stage = computed(() => props.town.buildings[props.id]);
const project = computed(() => props.town.projects[props.id]);
const offer = computed(() => upgradeOffer(props.town, props.id));
</script>
