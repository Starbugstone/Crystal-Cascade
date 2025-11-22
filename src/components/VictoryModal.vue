<template>
  <div class="modal-overlay">
    <div class="modal-content victory-modal">
      <div class="victory-header">
        <h2>Level Cleared!</h2>
        <div class="stars-container">
          <span
            class="star"
            v-for="i in 3"
            :key="i"
            :class="{ earned: i <= earnedStars }"
            aria-hidden="true"
          >
            ★
          </span>
        </div>
        <p class="star-rules">1★ clear · 2★ hit target · 3★ big combo or crush the target</p>
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
           <div class="stat-item" v-if="scoreTarget">
             <span class="stat-label">Score Target</span>
             <span class="stat-value">{{ formattedScoreTarget }}</span>
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
          Next Level →
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
  scoreTarget: {
    type: Number,
    default: 0,
  },
  hasNextLevel: {
    type: Boolean,
    default: false,
  }
});

defineEmits(['menu', 'replay', 'next']);

const formattedScore = computed(() => props.score.toLocaleString());
const formattedScoreTarget = computed(() => props.scoreTarget ? props.scoreTarget.toLocaleString() : '—');

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

const earnedStars = computed(() => {
  if (props.score <= 0) {
    return 0;
  }

  const targetMet = props.scoreTarget > 0 && props.score >= props.scoreTarget;
  const targetCrushed = props.scoreTarget > 0 && props.score >= props.scoreTarget * 1.35;
  const comboAchieved = props.maxCombo >= 4;

  let stars = 1; // cleared the level
  if (targetMet) stars += 1;
  if (comboAchieved || targetCrushed) stars += 1;

  return Math.min(3, stars);
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
  border-radius: 18px;
  padding: 1.75rem;
  width: min(440px, 92%);
  box-shadow: 
    0 16px 24px -6px rgba(0, 0, 0, 0.5),
    0 8px 12px -8px rgba(0, 0, 0, 0.5),
    0 0 0 1px rgba(255, 255, 255, 0.1);
  text-align: center;
  animation: slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.victory-header h2 {
  font-family: var(--font-heading, sans-serif);
  font-size: 2rem;
  margin: 0 0 0.5rem;
  background: linear-gradient(to right, #fbbf24, #f59e0b);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 2px 10px rgba(251, 191, 36, 0.2);
}

.stars-container {
  font-size: 2rem;
  margin-bottom: 0.25rem;
  display: flex;
  justify-content: center;
  gap: 0.35rem;
}

.star {
  color: #1f2937;
  text-shadow: 0 0 0 rgba(0, 0, 0, 0);
  animation: popIn 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275) backwards;
}

.star.earned {
  color: #fbbf24;
  text-shadow: 0 5px 14px rgba(251, 191, 36, 0.35);
}

.star:nth-child(1) { animation-delay: 0.15s; }
.star:nth-child(2) { animation-delay: 0.25s; }
.star:nth-child(3) { animation-delay: 0.35s; }

.star-rules {
  margin: 0 0 1rem;
  font-size: 0.8rem;
  color: #94a3b8;
}

.encouragement {
  font-size: 1.1rem;
  color: #e2e8f0;
  margin-bottom: 1.5rem;
  font-style: italic;
}

.score-display {
  background: rgba(15, 23, 42, 0.55);
  border-radius: 12px;
  padding: 1.1rem;
  margin-bottom: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.score-display .label {
  display: block;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.8rem;
  color: #94a3b8;
  margin-bottom: 0.35rem;
}

.score-display .value {
  font-size: 2.4rem;
  font-weight: 700;
  font-family: var(--font-heading, sans-serif);
  color: #fff;
  line-height: 1.05;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}

.stat-item {
  background: rgba(255, 255, 255, 0.03);
  padding: 0.85rem;
  border-radius: 10px;
}

.stat-label {
  display: block;
  font-size: 0.72rem;
  color: #94a3b8;
  text-transform: uppercase;
  margin-bottom: 0.2rem;
}

.stat-value {
  font-size: 1.1rem;
  font-weight: 600;
  color: #e2e8f0;
}

.victory-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.65rem;
}

.action-button {
  width: 100%;
  padding: 0.9rem;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.action-button.primary {
  background: linear-gradient(to right, #3b82f6, #2563eb);
  color: white;
  box-shadow: 0 4px 10px rgba(37, 99, 235, 0.28);
}

.action-button.primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 14px rgba(37, 99, 235, 0.35);
}

.action-button.secondary {
  background: rgba(255, 255, 255, 0.08);
  color: #e2e8f0;
}

.action-button.secondary:hover {
  background: rgba(255, 255, 255, 0.12);
}

.action-button.next-level {
  background: linear-gradient(to right, #10b981, #059669);
  box-shadow: 0 4px 10px rgba(5, 150, 105, 0.28);
}

.action-button.next-level:hover {
  box-shadow: 0 6px 14px rgba(5, 150, 105, 0.35);
}

@media (max-width: 640px) {
  .modal-content {
    padding: 1.1rem;
    width: calc(100% - 1.5rem);
    border-radius: 14px;
  }

  .victory-header h2 {
    font-size: 1.6rem;
  }

  .stars-container {
    font-size: 1.5rem;
    gap: 0.25rem;
  }

  .star-rules {
    font-size: 0.75rem;
    margin-bottom: 0.9rem;
  }

  .encouragement {
    font-size: 1rem;
    margin-bottom: 1.1rem;
  }

  .score-display {
    padding: 0.9rem;
    margin-bottom: 1.1rem;
  }

  .score-display .value {
    font-size: 2rem;
  }

  .stats-grid {
    grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
    gap: 0.6rem;
    margin-bottom: 1rem;
  }

  .stat-item {
    padding: 0.7rem;
  }

  .stat-value {
    font-size: 1rem;
  }

  .victory-actions {
    grid-template-columns: 1fr;
    gap: 0.55rem;
  }

  .action-button {
    padding: 0.85rem;
    font-size: 0.95rem;
  }
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
