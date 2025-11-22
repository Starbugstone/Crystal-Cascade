<template>
  <div class="modal-overlay">
    <div class="modal-content victory-modal">
      <div class="victory-header">
        <h2>Level Cleared!</h2>
        <div class="stars-container">
          <span class="star" v-for="i in 3" :key="i">⭐</span>
        </div>
      </div>
      
      <div class="victory-body">
        <p class="encouragement">{{ encouragementMessage }}</p>
        
        <div class="score-display">
          <span class="label">Final Score</span>
          <span class="value">{{ formattedScore }}</span>
        </div>
        
        <div class="stats-grid">
           <div class="stat-item">
             <span class="stat-label">Moves</span>
             <span class="stat-value">{{ moves }}</span>
           </div>
           <div class="stat-item">
             <span class="stat-label">Best Combo</span>
             <span class="stat-value">x{{ maxCombo }}</span>
           </div>
        </div>
      </div>

      <div class="victory-actions">
        <button class="action-button secondary" @click="$emit('menu')">
          Back to Menu
        </button>
        <button class="action-button primary" @click="$emit('replay')">
          Replay Level
        </button>
        <button class="action-button primary next-level" @click="$emit('next')" v-if="hasNextLevel">
          Next Level ➔
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  score: {
    type: Number,
    default: 0,
  },
  moves: {
    type: Number,
    default: 0,
  },
  maxCombo: {
    type: Number,
    default: 1,
  },
  hasNextLevel: {
    type: Boolean,
    default: false,
  }
});

defineEmits(['menu', 'replay', 'next']);

const formattedScore = computed(() => props.score.toLocaleString());

const messages = [
  "Spectacular!",
  "Crystal Clear!",
  "Gem-tastic!",
  "Unstoppable!",
  "Brilliant!",
  "Dazzling Performance!"
];

const encouragementMessage = computed(() => {
  return messages[Math.floor(Math.random() * messages.length)];
});
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  animation: fadeIn 0.3s ease-out;
}

.modal-content {
  background: linear-gradient(145deg, #1e293b, #0f172a);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 24px;
  padding: 2.5rem;
  width: 90%;
  max-width: 480px;
  box-shadow: 
    0 20px 25px -5px rgba(0, 0, 0, 0.5),
    0 8px 10px -6px rgba(0, 0, 0, 0.5),
    0 0 0 1px rgba(255, 255, 255, 0.1);
  text-align: center;
  animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.victory-header h2 {
  font-family: var(--font-heading, sans-serif);
  font-size: 2.5rem;
  margin: 0 0 1rem;
  background: linear-gradient(to right, #fbbf24, #f59e0b);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 2px 10px rgba(251, 191, 36, 0.2);
}

.stars-container {
  font-size: 2.5rem;
  margin-bottom: 1.5rem;
  display: flex;
  justify-content: center;
  gap: 0.5rem;
}

.star {
  animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) backwards;
}

.star:nth-child(1) { animation-delay: 0.2s; }
.star:nth-child(2) { animation-delay: 0.3s; }
.star:nth-child(3) { animation-delay: 0.4s; }

.encouragement {
  font-size: 1.25rem;
  color: #e2e8f0;
  margin-bottom: 2rem;
  font-style: italic;
}

.score-display {
  background: rgba(15, 23, 42, 0.5);
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.score-display .label {
  display: block;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 0.875rem;
  color: #94a3b8;
  margin-bottom: 0.5rem;
}

.score-display .value {
  font-size: 3rem;
  font-weight: 700;
  font-family: var(--font-heading, sans-serif);
  color: #fff;
  line-height: 1;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-item {
  background: rgba(255, 255, 255, 0.03);
  padding: 1rem;
  border-radius: 12px;
}

.stat-label {
  display: block;
  font-size: 0.75rem;
  color: #94a3b8;
  text-transform: uppercase;
  margin-bottom: 0.25rem;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 600;
  color: #e2e8f0;
}

.victory-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.action-button {
  width: 100%;
  padding: 1rem;
  border-radius: 12px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.action-button.primary {
  background: linear-gradient(to right, #3b82f6, #2563eb);
  color: white;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
}

.action-button.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(37, 99, 235, 0.4);
}

.action-button.secondary {
  background: rgba(255, 255, 255, 0.1);
  color: #e2e8f0;
}

.action-button.secondary:hover {
  background: rgba(255, 255, 255, 0.15);
}

.action-button.next-level {
  background: linear-gradient(to right, #10b981, #059669);
  box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);
}

.action-button.next-level:hover {
  box-shadow: 0 6px 16px rgba(5, 150, 105, 0.4);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes popIn {
  0% { transform: scale(0); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}
</style>
