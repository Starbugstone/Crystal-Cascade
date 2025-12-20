<template>
  <Teleport to="body">
    <div 
      v-if="isPlaying" 
      class="lootbox-overlay"
      :class="{ 'phase-shatter': phase >= 2, 'phase-reveal': phase >= 3 }"
    >
      <!-- Background flash on impact -->
      <div class="impact-flash" :class="{ active: phase >= 2 }"></div>
      
      <!-- Particles container -->
      <div class="particles" :class="{ active: phase >= 2 }">
        <span v-for="i in 20" :key="i" class="particle" :style="getParticleStyle(i)"></span>
      </div>
      
      <!-- Central gem -->
      <div class="gem-container" :class="{ shattered: phase >= 2 }">
        <img src="/sprite/lootbox/gem.png" alt="Loot Gem" class="gem" />
        
        <!-- Gem shards -->
        <div v-if="phase >= 2" class="shards">
          <span v-for="i in 8" :key="i" class="shard" :style="getShardStyle(i)"></span>
        </div>
      </div>
      
      <!-- Pickaxe - position controlled by PICKAXE_OFFSET constants in script -->
      <div 
        class="pickaxe-container" 
        :class="{ swing: phase >= 1, hidden: phase >= 3 }"
        :style="pickaxeStyle"
      >
        <img src="/sprite/lootbox/pickaxe.png" alt="Pickaxe" class="pickaxe" />
      </div>
      
      <!-- Power icon reveal -->
      <div 
        v-if="phase >= 3"
        class="power-reveal"
        :class="{ flying: phase >= 4 }"
        :style="flyingStyle"
      >
        <img :src="powerIconSrc" :alt="powerLabel" class="power-icon" />
        <span class="rarity-text" :style="{ color: rarityColor }">{{ rarity }}</span>
      </div>
      
      <!-- Rarity burst text -->
      <div v-if="phase >= 3 && phase < 4" class="rarity-burst" :style="{ color: rarityColor }">
        {{ rarity.toUpperCase() }}!
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue';

// =============================================================================
// PICKAXE POSITION OFFSET - Adjust these values to fine-tune pickaxe position
// =============================================================================
const PICKAXE_OFFSET = {
  // Starting position (before swing) - positioned to the LEFT of the gem
  // Sprite is 240px, so offset by 1 width left (-240) and 1/2 height up (-120)
  startX: -420,    // Horizontal offset: -180 - 240 (1 sprite width left)
  startY: -320,    // Vertical offset: -200 - 120 (1/2 sprite height up)
  startRotation: -60, // Starting rotation in degrees (raised higher for bigger swing)
  
  // End position (after swing, at impact)
  endX: -20,       // Horizontal offset at impact (swing toward center)
  endY: 0,         // Vertical offset at impact
  endRotation: 30, // Rotation at impact
};

// =============================================================================
// SOUND EFFECTS - Replace these placeholder functions with actual audio
// =============================================================================

/**
 * Play the anticipation sound when lootbox starts (mmMMMMM rising sound)
 * To use actual sound: import { Howl } from 'howler'; and create a Howl instance
 * Example:
 *   const anticipationSound = new Howl({ src: ['/sound/lootbox/anticipation.mp3'] });
 *   anticipationSound.play();
 */
const playAnticipationSound = () => {
  // TODO: Replace with actual sound file
  // File should be placed at: /public/sound/lootbox/anticipation.mp3
  console.log('[SOUND] Playing anticipation sound (mmMMMMM)');
};

/**
 * Play the shatter/smash sound when gem breaks
 * To use actual sound:
 *   const shatterSound = new Howl({ src: ['/sound/lootbox/shatter.mp3'] });
 *   shatterSound.play();
 */
const playShatterSound = () => {
  // TODO: Replace with actual sound file
  // File should be placed at: /public/sound/lootbox/shatter.mp3
  console.log('[SOUND] Playing shatter sound (CRASH!)');
};

/**
 * Play the reward/woop sound when power is revealed
 * To use actual sound:
 *   const woopSound = new Howl({ src: ['/sound/lootbox/woop.mp3'] });
 *   woopSound.play();
 */
const playWoopSound = () => {
  // TODO: Replace with actual sound file
  // File should be placed at: /public/sound/lootbox/woop.mp3
  console.log('[SOUND] Playing woop sound (WOOP!)');
};

// =============================================================================

const props = defineProps({
  active: { type: Boolean, default: false },
  powerId: { type: String, default: '' },
  powerLabel: { type: String, default: '' },
  rarity: { type: String, default: 'common' },
  rarityColor: { type: String, default: '#9ca3af' },
  targetButtonRect: { type: Object, default: null },
});

const emit = defineEmits(['complete']);

const isPlaying = ref(false);
const phase = ref(0);
const flyingStyle = ref({});

const powerIconSrc = computed(() => `/sprite/powers/${props.powerId}.png`);

// Computed style for pickaxe position (uses PICKAXE_OFFSET constants)
const pickaxeStyle = computed(() => ({
  '--pickaxe-start-x': `${PICKAXE_OFFSET.startX}px`,
  '--pickaxe-start-y': `${PICKAXE_OFFSET.startY}px`,
  '--pickaxe-start-rot': `${PICKAXE_OFFSET.startRotation}deg`,
  '--pickaxe-end-x': `${PICKAXE_OFFSET.endX}px`,
  '--pickaxe-end-y': `${PICKAXE_OFFSET.endY}px`,
  '--pickaxe-end-rot': `${PICKAXE_OFFSET.endRotation}deg`,
}));

const getParticleStyle = (index) => {
  const angle = (index / 20) * 360;
  const distance = 150 + Math.random() * 100;
  const delay = Math.random() * 0.2;
  const size = 8 + Math.random() * 12;
  const hue = Math.random() * 60 + 30; // Gold/orange range
  
  return {
    '--angle': `${angle}deg`,
    '--distance': `${distance}px`,
    '--delay': `${delay}s`,
    '--size': `${size}px`,
    '--hue': hue,
  };
};

const getShardStyle = (index) => {
  const angle = (index / 8) * 360 + Math.random() * 20;
  const distance = 80 + Math.random() * 60;
  
  return {
    '--shard-angle': `${angle}deg`,
    '--shard-distance': `${distance}px`,
    '--shard-rotation': `${Math.random() * 720 - 360}deg`,
  };
};

const playAnimation = async () => {
  isPlaying.value = true;
  phase.value = 0;
  
  // Play anticipation sound (mmMMMMM)
  playAnticipationSound();
  
  // Phase 0: Gem appears and pulses (0-300ms)
  await delay(300);
  
  // === PAUSE: Build anticipation before swing (500ms) ===
  await delay(500);
  
  // Phase 1: Pickaxe swings (after pause)
  phase.value = 1;
  await delay(200);
  
  // Phase 2: Impact! Gem shatters, particles explode
  phase.value = 2;
  playShatterSound(); // Play shatter sound on impact
  await delay(300);
  
  // Phase 3: Power icon reveals
  phase.value = 3;
  playWoopSound(); // Play woop sound when power appears
  await delay(300);
  
  // Phase 4: Icon flies to button (1100-1400ms)
  if (props.targetButtonRect) {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const targetX = props.targetButtonRect.left + props.targetButtonRect.width / 2;
    const targetY = props.targetButtonRect.top + props.targetButtonRect.height / 2;
    
    flyingStyle.value = {
      '--fly-x': `${targetX - centerX}px`,
      '--fly-y': `${targetY - centerY}px`,
    };
  }
  phase.value = 4;
  await delay(400);
  
  // Complete
  isPlaying.value = false;
  phase.value = 0;
  emit('complete');
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

watch(() => props.active, (newVal) => {
  if (newVal) {
    playAnimation();
  }
});
</script>

<style scoped>
.lootbox-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle, rgba(15, 23, 42, 0.85) 0%, rgba(0, 0, 0, 0.95) 100%);
  animation: overlay-fade-in 200ms ease-out;
}

@keyframes overlay-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Impact flash */
.impact-flash {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.8) 0%, transparent 60%);
  opacity: 0;
  pointer-events: none;
}

.impact-flash.active {
  animation: flash-burst 300ms ease-out;
}

@keyframes flash-burst {
  0% { opacity: 1; transform: scale(0.5); }
  100% { opacity: 0; transform: scale(2); }
}

/* Gem container */
.gem-container {
  position: relative;
  z-index: 10;
}

.gem {
  width: 160px;
  height: 160px;
  object-fit: contain;
  filter: drop-shadow(0 0 30px rgba(168, 85, 247, 0.8)) drop-shadow(0 0 60px rgba(59, 130, 246, 0.5));
  animation: gem-pulse 0.5s ease-in-out infinite alternate;
}

@keyframes gem-pulse {
  from { 
    transform: scale(1); 
    filter: drop-shadow(0 0 30px rgba(168, 85, 247, 0.8)) drop-shadow(0 0 60px rgba(59, 130, 246, 0.5));
  }
  to { 
    transform: scale(1.08); 
    filter: drop-shadow(0 0 50px rgba(236, 72, 153, 0.9)) drop-shadow(0 0 80px rgba(168, 85, 247, 0.7));
  }
}

.gem-container.shattered .gem {
  animation: gem-shatter 300ms ease-out forwards;
}

@keyframes gem-shatter {
  0% { transform: scale(1.1); opacity: 1; }
  50% { transform: scale(1.3); opacity: 0.5; }
  100% { transform: scale(0); opacity: 0; }
}

/* Shards */
.shards {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.shard {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 20px;
  height: 20px;
  background: linear-gradient(135deg, #a855f7, #3b82f6);
  clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
  animation: shard-fly 500ms ease-out forwards;
  --shard-angle: 0deg;
  --shard-distance: 100px;
  --shard-rotation: 360deg;
}

@keyframes shard-fly {
  0% {
    transform: translate(-50%, -50%) rotate(0deg) translateY(0);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) rotate(var(--shard-rotation)) 
               translateX(calc(cos(var(--shard-angle)) * var(--shard-distance)))
               translateY(calc(sin(var(--shard-angle)) * var(--shard-distance)));
    opacity: 0;
  }
}

/* Pickaxe - uses CSS variables for easy position adjustment */
.pickaxe-container {
  position: absolute;
  top: 50%;
  left: 50%;
  /* Default position uses CSS vars, see PICKAXE_OFFSET in script */
  transform: translate(var(--pickaxe-start-x), var(--pickaxe-start-y)) rotate(var(--pickaxe-start-rot));
  transform-origin: bottom left; /* Rotate around the handle end (bottom left of sprite) */
  z-index: 20;
  transition: opacity 200ms;
}

.pickaxe-container.hidden {
  opacity: 0;
}

.pickaxe {
  width: 240px;
  height: 240px;
  object-fit: contain;
  filter: drop-shadow(0 0 15px rgba(255, 255, 255, 0.6));
}

.pickaxe-container.swing {
  animation: pickaxe-swing 200ms ease-in forwards;
}

@keyframes pickaxe-swing {
  0% { transform: translate(var(--pickaxe-start-x), var(--pickaxe-start-y)) rotate(var(--pickaxe-start-rot)); }
  100% { transform: translate(var(--pickaxe-end-x), var(--pickaxe-end-y)) rotate(var(--pickaxe-end-rot)); }
}

/* Particles */
.particles {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.particle {
  position: absolute;
  width: var(--size, 10px);
  height: var(--size, 10px);
  background: radial-gradient(circle, 
    hsl(var(--hue, 45), 100%, 70%) 0%, 
    hsl(var(--hue, 45), 100%, 50%) 100%);
  border-radius: 50%;
  opacity: 0;
  box-shadow: 0 0 10px hsl(var(--hue, 45), 100%, 60%);
}

.particles.active .particle {
  animation: particle-burst 600ms ease-out forwards;
  animation-delay: var(--delay, 0s);
}

@keyframes particle-burst {
  0% {
    opacity: 1;
    transform: translate(0, 0) scale(1);
  }
  100% {
    opacity: 0;
    transform: 
      rotate(var(--angle)) 
      translateY(calc(-1 * var(--distance))) 
      scale(0.3);
  }
}

/* Power reveal */
.power-reveal {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  z-index: 30;
  animation: power-pop-in 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes power-pop-in {
  0% { transform: scale(0); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

.power-reveal.flying {
  animation: power-fly 400ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
  --fly-x: 0px;
  --fly-y: 0px;
}

@keyframes power-fly {
  0% { 
    transform: scale(1) translate(0, 0); 
    opacity: 1;
  }
  100% { 
    transform: scale(0.5) translate(var(--fly-x), var(--fly-y)); 
    opacity: 0.8;
  }
}

.power-icon {
  width: 80px;
  height: 80px;
  object-fit: contain;
  filter: drop-shadow(0 0 20px rgba(255, 255, 255, 0.8));
  animation: icon-glow 0.3s ease-in-out infinite alternate;
}

@keyframes icon-glow {
  from { filter: drop-shadow(0 0 20px rgba(255, 255, 255, 0.8)); }
  to { filter: drop-shadow(0 0 35px rgba(255, 255, 255, 1)); }
}

.rarity-text {
  font-weight: 700;
  font-size: 1.1rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  text-shadow: 0 0 10px currentColor;
}

/* Rarity burst text */
.rarity-burst {
  position: absolute;
  font-size: 3rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  text-shadow: 0 0 30px currentColor, 0 0 60px currentColor;
  animation: rarity-burst 400ms ease-out forwards;
  z-index: 25;
}

@keyframes rarity-burst {
  0% { 
    transform: scale(0.5); 
    opacity: 1; 
  }
  50% { 
    transform: scale(1.2); 
    opacity: 1; 
  }
  100% { 
    transform: scale(1.5) translateY(-60px); 
    opacity: 0; 
  }
}
</style>
