<template>
  <dialog
    ref="dialog"
    class="community-dialog"
    :aria-label="t('Leaderboard and village visits')"
    @cancel.prevent="$emit('close')"
    @click="dismissBackdrop"
  >
    <header class="community-heading">
      <div>
        <p>{{ t('PROSPECT HOLLOW COMMUNITY') }}</p>
        <h1>{{ t(village ? 'Village visit' : 'Leaderboard') }}</h1>
      </div>
      <button ref="closeButton" :aria-label="t('Close leaderboard')" @click="$emit('close')">
        ×
      </button>
    </header>
    <div class="community-content">
      <template v-if="village">
        <button class="community-back" @click="village = null">
          ← {{ t('Back to leaderboard') }}
        </button>
        <div class="community-visit-heading">
          <div>
            <h2>{{ village.name }}</h2>
            <p>{{ t(ERA_BY_ID[village.era]?.label ?? village.era) }}</p>
          </div>
          <span class="community-readonly">{{ t('View only') }}</span>
        </div>
        <p>
          {{
            t(
              'Look around and move the camera. Building, collecting and mining are only available in your own village.',
            )
          }}
        </p>
        <div class="community-world town-map-frame">
          <TownScene
            :key="village.villageId"
            :town="town"
            :read-only="true"
            :population="village.population"
            :next-level="village.minesCleared + 1"
            :mine-stage="Math.floor(village.minesCleared / 6)"
            :reduced-motion="settings.reducedMotion"
          />
        </div>
        <dl class="community-stats">
          <div>
            <dt>{{ t('Building progress') }}</dt>
            <dd>{{ number(village.buildingProgress) }}</dd>
          </div>
          <div>
            <dt>{{ t('Mines completed') }}</dt>
            <dd>{{ number(village.minesCleared) }}</dd>
          </div>
          <div>
            <dt>{{ t('Population') }}</dt>
            <dd>{{ number(village.population) }}</dd>
          </div>
        </dl>
      </template>
      <template v-else>
        <p class="community-intro">
          {{ t('Explore the villages our players have chosen to share.') }}
        </p>
        <p class="community-ranking">
          {{
            t('Ranked by era, completed building and modernization stages, then mines completed.')
          }}
        </p>
        <div class="community-own">
          <span>{{
            t(cloud.community.listed ? 'Your village is listed.' : 'Your village is private.')
          }}</span
          ><button @click="$emit('settings')">{{ t('Manage my public village') }}</button>
        </div>
        <p v-if="loading" role="status">{{ t('Loading villages…') }}</p>
        <p v-else-if="error" role="alert">
          {{ error }} <button @click="load(page)">{{ t('Try again') }}</button>
        </p>
        <p v-else-if="!entries.length" class="community-empty">
          {{ t('No villages here yet. Be the first to share yours!') }}
        </p>
        <ol
          v-else
          class="community-list"
          :start="(page - 1) * 20 + 1"
          :aria-label="t('Village leaderboard')"
        >
          <li
            v-for="entry in entries"
            :key="entry.villageId"
            :class="{ 'is-own': entry.villageId === ownVillageId }"
          >
            <span class="community-rank">{{ entry.rank }}</span>
            <div class="community-entry">
              <strong
                >{{ entry.name }}
                <small v-if="entry.villageId === ownVillageId">{{ t('You') }}</small></strong
              ><span>{{ t(ERA_BY_ID[entry.era]?.label ?? entry.era) }}</span
              ><small>{{
                t('{buildings} building progress · {mines} mines', {
                  buildings: number(entry.buildingProgress),
                  mines: number(entry.minesCleared),
                })
              }}</small>
            </div>
            <button
              :disabled="visiting"
              :aria-label="t('Visit {village}', { village: entry.name })"
              @click="visit(entry.villageId)"
            >
              {{ t('Visit village') }} →
            </button>
          </li>
        </ol>
        <p v-if="visitError" role="alert">{{ visitError }}</p>
        <p v-if="visiting" role="status">{{ t('Opening village…') }}</p>
        <nav class="community-pages" :aria-label="t('Leaderboard pages')">
          <button :disabled="page === 1 || loading || visiting" @click="load(page - 1)">
            {{ t('Previous') }}</button
          ><span>{{ t('Page {page}', { page }) }}</span
          ><button :disabled="!hasNext || loading || visiting" @click="load(page + 1)">
            {{ t('Next') }}
          </button>
        </nav>
      </template>
    </div>
  </dialog>
</template>
<script setup>
import { computed, ref, onBeforeUnmount } from 'vue';
import { cloud, request } from '../../services/cloudProfile';
import { villageAppearance } from '../../services/publicVillage';
import { useNativeDialog } from '../../composables/useNativeDialog';
import { useSettingsStore } from '../../stores/settingsStore';
import { ERA_BY_ID } from '../../data/eras';
import { t, number } from '../../i18n';
import TownScene from '../town/TownScene.vue';
import '../../styles/town.css';
const emit = defineEmits(['close', 'settings']);
const { dialog, closeButton, dismissBackdrop } = useNativeDialog(() => emit('close'));
const settings = useSettingsStore();
const entries = ref([]),
  page = ref(1),
  hasNext = ref(false),
  ownVillageId = ref(null),
  loading = ref(false),
  error = ref(''),
  village = ref(null),
  visiting = ref(false),
  visitError = ref('');
const town = computed(() => (village.value ? villageAppearance(village.value) : null));
let generation = 0;
onBeforeUnmount(() => {
  generation++;
});
async function load(next) {
  const current = ++generation;
  loading.value = true;
  error.value = '';
  visitError.value = '';
  try {
    const result = await request(`leaderboard?page=${next}`);
    if (current !== generation) return;
    entries.value = result.entries;
    page.value = result.page;
    hasNext.value = result.hasNext;
    ownVillageId.value = result.ownVillageId;
  } catch (e) {
    if (current === generation) error.value = e.message;
  } finally {
    if (current === generation) loading.value = false;
  }
}
async function visit(id) {
  const current = ++generation;
  visiting.value = true;
  visitError.value = '';
  try {
    const result = await request(`villages/${id}`);
    if (current === generation) village.value = result;
  } catch (e) {
    if (current === generation) visitError.value = e.message;
  } finally {
    if (current === generation) visiting.value = false;
  }
}
load(1);
</script>
<style>
.community-dialog {
  width: min(1100px, calc(100vw - 24px));
  max-height: 94dvh;
  padding: 0;
  border: 1px solid #ded5bd;
  border-radius: 20px;
  background: #fbf8ef;
  color: #294139;
  box-shadow: 0 24px 100px #10292380;
  overflow: auto;
  font-family: system-ui, sans-serif;
}
.community-dialog::backdrop {
  background: #102923bb;
}
.community-heading {
  position: sticky;
  top: 0;
  z-index: 4;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: #183832;
  color: #fff7df;
}
.community-heading p {
  font-size: 0.7rem;
  letter-spacing: 0.15em;
  margin: 0 0 0.35rem;
  color: #dcc899;
}
.community-heading h1 {
  margin: 0;
  font:
    1.65rem Georgia,
    serif;
}
.community-dialog button {
  font: inherit;
  cursor: pointer;
  border: 1px solid #c4bea9;
  background: #fff6dc;
  color: #294139;
  border-radius: 9px;
  padding: 0.65rem 0.9rem;
}
.community-dialog button:disabled {
  opacity: 0.5;
  cursor: default;
}
.community-heading button {
  font-size: 1.4rem;
  line-height: 1;
}
.community-content {
  padding: 1.5rem;
}
.community-intro {
  font:
    1.2rem Georgia,
    serif;
}
.community-ranking {
  font-size: 0.88rem;
  color: #53665d;
}
.community-own {
  display: flex;
  gap: 1rem;
  justify-content: space-between;
  align-items: center;
  border-block: 1px solid #e0d7c1;
  padding: 1rem 0;
  margin: 1.2rem 0;
}
.community-list {
  list-style: none;
  padding: 0;
  margin: 1rem 0;
}
.community-list li {
  display: flex;
  gap: 1rem;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #e3dbc7;
}
.community-list .is-own {
  background: #e9efdf;
}
.community-rank {
  width: 2rem;
  text-align: center;
  font:
    1.6rem Georgia,
    serif;
  color: #866837;
  flex-shrink: 0;
}
.community-entry {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: 0.3rem;
  overflow-wrap: anywhere;
}
.community-entry strong {
  font-size: 1.05rem;
}
.community-entry strong small {
  margin-left: 0.5rem;
  color: #507250;
}
.community-entry span,
.community-entry small {
  color: #64756a;
}
.community-pages,
.community-visit-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-top: 1rem;
}
.community-visit-heading h2 {
  margin: 1rem 0 0.35rem;
  font:
    1.8rem Georgia,
    serif;
  overflow-wrap: anywhere;
}
.community-readonly {
  background: #e6ecdc;
  padding: 0.4rem 0.8rem;
  border-radius: 20px;
  white-space: nowrap;
}
.community-world {
  height: min(62dvh, 600px);
  min-height: 330px;
  border-radius: 16px;
  overflow: hidden;
  position: relative;
}
.community-world .town-scene {
  height: 100%;
}
.community-world .town-scene-labels button:disabled {
  opacity: 1;
  pointer-events: none;
}
.community-world .town-map-read-only .map-building,
.community-world .town-map-read-only .town-mine-entrance {
  cursor: default;
}
.community-stats {
  display: flex;
  gap: 2rem;
  flex-wrap: wrap;
}
.community-stats dd {
  font-size: 1.4rem;
  margin: 0.3rem 0;
}
@media (max-width: 600px) {
  .community-content {
    padding: 1rem;
  }
  .community-heading {
    padding: 1rem;
  }
  .community-own {
    align-items: flex-start;
    flex-direction: column;
  }
  .community-list li {
    gap: 0.6rem;
    padding: 0.85rem 0.25rem;
    flex-wrap: wrap;
  }
  .community-list li > button {
    margin-left: 2.6rem;
  }
  .community-entry {
    flex-basis: calc(100% - 3rem);
  }
  .community-stats {
    gap: 1rem;
    font-size: 0.85rem;
  }
  .community-world {
    min-height: 330px;
  }
  .community-visit-heading h2 {
    font-size: 1.4rem;
  }
}
</style>
