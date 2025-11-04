<template>
  <div class="modal-scrim">
    <div class="modal-card">
      <h2>Select Level</h2>
      <div class="level-grid">
        <button
          v-for="level in levels"
          :key="level.id"
          class="level-button"
          @click="$emit('start-level', level.id)"
        >
          <span>{{ level.label }}</span>
          <small>{{ level.summary }}</small>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useGameStore } from '../stores/gameStore';

const gameStore = useGameStore();

const levels = computed(() => gameStore.availableLevels);
</script>

<style scoped>
.modal-scrim {
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 23, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  z-index: 30;
}

.modal-card {
  width: min(720px, 100%);
  background: rgba(15, 23, 42, 0.95);
  border-radius: 18px;
  padding: 2rem;
  box-shadow: 0 12px 48px rgba(15, 23, 42, 0.6);
  display: flex;
  flex-direction: column;
  max-height: min(90vh, 720px);
  overflow: hidden;
}

.modal-card h2 {
  margin: 0 0 1.5rem;
  font-family: var(--font-heading);
  text-align: center;
  color: var(--color-accent);
}

.level-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  flex: 1;
  overflow-y: auto;
  padding-right: 0.25rem;
}

.level-button {
  border: none;
  border-radius: 12px;
  padding: 1rem;
  background: rgba(30, 41, 59, 0.85);
  color: var(--color-foreground);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: flex-start;
  transition: transform 150ms ease, background 150ms ease;
}

.level-button span {
  font-size: 1.1rem;
  font-weight: 600;
}

.level-button small {
  opacity: 0.75;
}

.level-button:hover {
  transform: translateY(-4px);
  background: rgba(59, 130, 246, 0.6);
}

@media (max-width: 640px) {
  .modal-scrim {
    padding: 1.5rem;
  }

  .modal-card {
    padding: 1.25rem;
    max-height: calc(100vh - 2rem);
  }

  .level-grid {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    row-gap: 0.75rem;
  }
}

@media (max-width: 400px) {
  .modal-card {
    padding: 1rem;
  }

  .level-grid {
    grid-template-columns: 1fr;
  }
}
</style>
