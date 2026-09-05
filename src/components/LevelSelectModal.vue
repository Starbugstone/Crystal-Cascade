<template>
  <section class="collection" aria-labelledby="collection-title">
    <div class="collection-heading">
      <div>
        <span class="eyebrow">YOUR NEXT LITTLE ADVENTURE</span>
        <h2 id="collection-title">
          The journey<span>01 — {{ levels.length }}</span>
        </h2>
      </div>
      <span class="journey-stars"
        >✦ {{ campaign.totalStars }}<small> / {{ levels.length * 3 }}</small></span
      >
    </div>
    <button class="featured-level" @click="$emit('start-level', campaign.nextLevel)">
      <div class="featured-art">
        <img
          :src="`/art/${gems[Math.floor((campaign.nextLevel - 1) / 6) % gems.length]}.svg`"
          alt=""
        /><span>✦</span>
      </div>
      <div>
        <span class="eyebrow">{{
          campaign.completedCount === levels.length
            ? 'THE COLLECTION IS YOURS'
            : campaign.completedCount
              ? 'CONTINUE YOUR JOURNEY'
              : 'BEGIN THE JOURNEY'
        }}</span>
        <h3>{{ names[campaign.nextLevel - 1] }}</h3>
        <p>
          Level {{ campaign.nextLevel }} · {{ campaign.completedCount }} of
          {{ levels.length }} complete
        </p>
        <span class="featured-play"
          >{{ campaign.completedCount === levels.length ? 'Play again' : 'Let’s play' }}
          <GameIcon name="arrow"
        /></span>
      </div>
    </button>
    <div class="journey-track">
      <i :style="{ width: `${(campaign.completedCount / levels.length) * 100}%` }"></i>
    </div>
    <div v-for="(chapter, index) in chapters" :key="chapter.name" class="journey-chapter">
      <div class="chapter-heading">
        <span class="eyebrow">{{ String(index + 1).padStart(2, '0') }} / {{ chapter.name }}</span
        ><small
          >{{ chapterLevels(index).filter((level) => campaign.records[level.id]).length }} /
          6</small
        >
      </div>
      <p>{{ chapter.description }}</p>
      <div class="level-grid">
        <button
          v-for="level in chapterLevels(index)"
          :key="level.id"
          class="level-button"
          :class="{
            'is-current': level.id === campaign.nextLevel,
            'is-complete': campaign.records[level.id],
          }"
          :disabled="!campaign.isUnlocked(level.id)"
          @click="$emit('start-level', level.id)"
          :aria-label="`${campaign.isUnlocked(level.id) ? 'Play' : 'Locked'} level ${level.id}: ${names[level.id - 1]}${campaign.records[level.id] ? `, ${campaign.records[level.id].stars} stars` : ''}`"
        >
          <span class="level-number">{{ String(level.id).padStart(2, '0') }}</span>
          <img
            v-if="campaign.isUnlocked(level.id)"
            :src="`/art/${gems[index % gems.length]}.svg`"
            alt=""
          />
          <svg
            v-else
            class="level-lock"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.2"
            aria-hidden="true"
          >
            <rect x="5" y="10" width="14" height="11" rx="3" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            <circle cx="12" cy="15" r="1" />
          </svg>
          <span class="level-name">{{ names[level.id - 1] }}</span>
          <span class="level-dots" aria-hidden="true"
            ><span
              v-for="star in 3"
              :key="star"
              :class="{ earned: star <= (campaign.records[level.id]?.stars ?? 0) }"
              >{{ star <= (campaign.records[level.id]?.stars ?? 0) ? '✦' : '✧' }}
            </span></span
          >
        </button>
      </div>
    </div>
    <p class="collection-note">
      <span>✧</span> Clear a level to unlock the next. Replay to earn more stars and chests.
    </p>
  </section>
</template>
<script setup>
import { computed } from 'vue';
import { useGameStore } from '../stores/gameStore';
import { useCampaignStore } from '../stores/campaignStore';
import { LEVEL_NAMES as names } from '../data/levelNames';
import { CHAPTERS as chapters } from '../data/campaign';
import GameIcon from './GameIcon.vue';
defineEmits(['start-level']);
const game = useGameStore();
const campaign = useCampaignStore();
const levels = computed(() => game.availableLevels);
const chapterLevels = (index) => levels.value.slice(index * 6, index * 6 + 6);
const gems = ['emerald', 'sapphire', 'topaz', 'amethyst', 'ruby', 'moonstone'];
</script>
