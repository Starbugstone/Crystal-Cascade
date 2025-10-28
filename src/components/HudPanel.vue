<template>
  <section class="hud-panel">
    <div class="hud-card">
      <h2>Score</h2>
      <p>{{ gameStore.score.toLocaleString() }}</p>
    </div>
    <div class="hud-card">
      <h2>Cascade</h2>
      <p>x{{ gameStore.cascadeMultiplier }}</p>
    </div>
    <div class="hud-card objectives">
      <h2>Objectives</h2>
      <ul>
        <li v-for="objective in gameStore.objectives" :key="objective.id">
          <span>{{ objective.label }}</span>
          <span>{{ objective.progress }}/{{ objective.target }}</span>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup>
import { storeToRefs } from 'pinia';
import { useGameStore } from '../stores/gameStore';

const gameStore = useGameStore();
const { objectives } = storeToRefs(gameStore);
</script>

<style scoped>
.hud-panel {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 1rem;
}

.hud-card {
  background: rgba(15, 23, 42, 0.75);
  padding: 1rem;
  border-radius: 12px;
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.45);
}

.hud-card h2 {
  font-family: var(--font-heading);
  font-size: 1rem;
  letter-spacing: 0.08rem;
  text-transform: uppercase;
  margin: 0 0 0.5rem;
  color: var(--color-accent);
}

.hud-card p {
  font-size: 1.5rem;
  margin: 0;
}

.objectives ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0.25rem;
}

.objectives li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.95rem;
}
</style>
