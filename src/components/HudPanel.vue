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
    <div class="hud-card debug-card">
      <button @click="forceRedraw" class="redraw-btn">
        🔄 Force Redraw
      </button>
    </div>
  </section>
</template>

<script setup>
import { storeToRefs } from 'pinia';
import { useGameStore } from '../stores/gameStore';

const gameStore = useGameStore();
const { objectives } = storeToRefs(gameStore);

const forceRedraw = () => {
  console.log('🔄 Manual redraw requested');
  
  // Clear the animation lock first
  gameStore.animationInProgress = false;
  
  if (gameStore.renderer?.animator) {
    gameStore.renderer.animator.forceCompleteRedraw();
  } else {
    console.error('❌ No animator available');
  }
};
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

.debug-card {
  display: flex;
  align-items: center;
  justify-content: center;
}

.redraw-btn {
  background: var(--color-accent);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.redraw-btn:hover {
  background: var(--color-accent-dark, #e11d48);
  transform: scale(1.05);
}

.redraw-btn:active {
  transform: scale(0.95);
}
</style>
