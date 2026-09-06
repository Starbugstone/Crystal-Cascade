<template>
  <section class="town-building-details" aria-labelledby="building-title">
    <div class="town-detail-title">
      <div>
        <p class="town-kicker">{{ t(building.purpose) }}</p>
        <h2 id="building-title">{{ t(building.name) }}</h2>
      </div>
      <span class="town-level-badge">{{
        t('Level {level} / {max}', { level: stage, max: building.upgrades.length })
      }}</span>
    </div>
    <div class="town-building-preview" :style="{ '--building-tint': building.color }">
      <svg viewBox="-160 -200 320 245" aria-hidden="true">
        <ellipse cy="9" rx="133" ry="26" fill="#a79d7040" />
        <TownSite
          v-if="project"
          :id="id"
          :stage="stage"
          :wins="constructionVisual(project)"
          :era="town.buildingEras[id]"
        />
        <TownBuilding
          v-else
          :id="id"
          :stage="offer && offer.type !== 'modernization' ? stage + 1 : stage"
          :era="offer?.targetEra ?? town.buildingEras[id]"
        />
      </svg>
      <small>{{
        t(project ? 'Under construction' : offer ? 'WHEN THE WORK IS DONE' : building.stages[stage])
      }}</small>
    </div>
    <div v-if="project" class="town-project-progress">
      <h3>
        {{ t(constructionReady(project) ? 'Ready to finish' : 'Your building is taking shape') }}
      </h3>
      <p>
        {{
          t('{wins}/{required} puzzles completed', {
            wins: project.wins,
            required: constructionRuns(project),
          })
        }}
      </p>
      <button v-if="constructionReady(project)" class="town-primary" @click="$emit('finish')">
        {{ t('Finish construction') }}
      </button>
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
    </div>
    <div v-else-if="offer" class="town-detail-offer">
      <h3>{{ t(offer.title, { building: t(building.name), name: t(offer.name) }) }}</h3>
      <p>{{ t(offer.benefit) }}</p>
      <p v-if="offer.description">{{ t(offer.description) }}</p>
      <button
        class="town-primary town-purchase"
        :disabled="!!offer.reason"
        @click="$emit('build', offer.stage)"
      >
        <span>{{
          t(
            offer.type === 'modernization'
              ? 'Start modernization'
              : stage
                ? 'Start improvement'
                : 'Start building',
          )
        }}</span>
        <span><TownIcon v-if="offer.cost" name="coin" />{{ t(offer.cost || 'Free') }}</span>
      </button>
      <p class="town-purchase-hint">
        {{
          t(
            offer.reason ||
              (offer.runs === 0
                ? 'Ready immediately'
                : t('Ready after {count} normal puzzles', { count: offer.runs })),
          )
        }}
      </p>
      <template v-if="plotUnlocked(town, id)">
        <button
          class="town-secondary builder-hammer-action"
          :disabled="!hammers || !offer.available"
          @click="$emit('hammer', offer.stage)"
        >
          <img src="/art/rewards/builder-hammer.svg" alt="" />
          {{ t('Build instantly for free · 1 builder hammer') }}
        </button>
        <small>{{ t('{count} builder hammers available', { count: hammers }) }}</small>
      </template>
      <button v-if="requirement" class="town-secondary" @click="$emit('select', requirement.id)">
        {{ t('Go to {building}', { building: t(BUILDING_BY_ID[requirement.id].shortName) }) }} →
      </button>
    </div>
    <p v-else class="town-restored-note">
      <TownIcon name="check" />{{ t(building.upgrades.at(-1).benefit) }}
    </p>
    <section v-if="id === 'blacksmith' && stage" class="town-service">
      <h3>{{ t('Forge Charge: {count}/1', { count: town.forge.charge }) }}</h3>
      <p>
        {{
          t('Normal puzzles: {count}/{required}', {
            count: town.forge.progress,
            required: FORGE_COMPLETIONS,
          })
        }}
      </p>
      <p>
        {{
          t(
            'Choose whether to spend your charge before entering a normal mine run. This is a mine bonus, separate from builder hammers.',
          )
        }}
      </p>
    </section>
    <section v-if="id === 'saloon' && stage" class="town-service">
      <button v-if="town.income.stored" class="town-primary" @click="$emit('collect-income')">
        <TownIcon name="coin" />{{ t('Collect {coins} coins', { coins: town.income.stored }) }}
      </button>
      <p>
        {{
          t(
            'Earnings stay in the saloon until you tap it to collect. Storage holds up to eight hours of income.',
          )
        }}
      </p>
      <h3>{{ t('Saloon · {rate} coins/hour', { rate: saloonIncomeRate(town) }) }}</h3>
      <p>
        {{
          t('{residents} residents + {visitors} visitors · Happiness bonus: {bonus}%', {
            residents: residentPopulation(town),
            visitors: visitorPopulation(town),
            bonus: happiness(town),
          })
        }}
      </p>
      <small>{{ t('Up to 8 hours of income saved while away.') }}</small>
      <small v-if="lastIncome">{{
        t('Last earnings: +{coins} coins', { coins: lastIncome })
      }}</small>
    </section>
    <section v-if="id === 'stable' || id === 'museum'" class="town-service">
      <h3>{{ t('{count} visitors in town', { count: visitorPopulation(town) }) }}</h3>
      <p>
        {{
          t(
            'Stables and museum galleries attract visitors. Spare food and water let them stay, and they spend coins at the saloon.',
          )
        }}
      </p>
      <small>{{ t('Visitor capacity: {count}', { count: visitorCapacity(town) }) }}</small>
    </section>
    <section v-if="id === 'square'" class="town-service">
      <h3>{{ t('Happiness: {value}%', { value: happiness(town) }) }}</h3>
      <p>
        {{
          t(
            'Food and water contribute up to 40 points. Each square level adds 8, and each museum and saloon level adds 2. The school adds up to 5 points. Happiness boosts saloon income by the same percentage.',
          )
        }}
      </p>
    </section>
    <section v-if="id === 'sheriff' || id === 'bank'" class="town-service">
      <h3>{{ t('Keep pace with the town') }}</h3>
      <p>
        {{
          t('Gang: {gang} riders · Savings protected: {protection}%', {
            gang: gangSize(town),
            protection: Math.round(raidProtection(town) * 100),
          })
        }}
      </p>
      <small>{{
        t(
          'The bank and sheriff each protect up to half the coins at risk. Upgrade both as gangs grow for full protection. Your last 50 coins are always safe.',
        )
      }}</small>
    </section>
    <TownShop v-if="id === 'shop' && stage" />
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
import { FORGE_COMPLETIONS } from '../../data/eras';
import {
  upgradeOffer,
  constructionRuns,
  constructionReady,
  constructionVisual,
  plotUnlocked,
  plotRequirement,
  saloonIncomeRate,
  residentPopulation,
  visitorPopulation,
  visitorCapacity,
  happiness,
  gangSize,
  raidProtection,
} from '../../game/town/TownRules';
import TownBuilding from './TownBuilding.vue';
import TownShop from './TownShop.vue';
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
defineEmits(['build', 'hammer', 'finish', 'collect-income', 'select', 'museum', 'mine']);
const building = computed(() => BUILDING_BY_ID[props.id]);
const requirement = computed(() => plotRequirement(props.town, props.id));
const stage = computed(() => props.town.buildings[props.id]);
const project = computed(() => props.town.projects[props.id]);
const offer = computed(() => upgradeOffer(props.town, props.id));
</script>
