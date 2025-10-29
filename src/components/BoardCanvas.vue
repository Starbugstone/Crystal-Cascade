<template>
  <div ref="canvasRoot" class="board-canvas"></div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { Application, Container, Graphics } from 'pixi.js';
import { useGameStore } from '../stores/gameStore';
import { useInputHandlers } from '../composables/useInputHandlers';
import { createParticleFactory } from '../game/pixi/ParticleFactory';
import { loadSpriteAtlas } from '../game/pixi/SpriteLoader';

const canvasRoot = ref(null);
const pixiApp = ref(null);
const boardLayer = ref(null);
const gameStore = useGameStore();
const { bindBoardInput, unbindBoardInput } = useInputHandlers(gameStore);
const resizeObserver = ref(null);

const handleResize = () => {
  if (!pixiApp.value || !canvasRoot.value) {
    return;
  }

  const { clientWidth, clientHeight } = canvasRoot.value;
  if (!clientWidth || !clientHeight) {
    return;
  }

  const resolution = window.devicePixelRatio || 1;

  // PixiJS v8 resize method
  pixiApp.value.renderer.resize(clientWidth, clientHeight);
  
  console.log('Resized to:', { clientWidth, clientHeight, screenWidth: pixiApp.value.screen.width, screenHeight: pixiApp.value.screen.height });
  drawGrid();
  gameStore.refreshBoardVisuals(true);
};

const drawGrid = () => {
  if (!pixiApp.value) return;

  const gridLayer = pixiApp.value.stage.getChildByLabel('grid') || new Graphics();
  gridLayer.label = 'grid';
  gridLayer.clear();

  const { screen } = pixiApp.value;
  const gridSize = gameStore.boardSize;
  const cellSize = Math.min(screen.width, screen.height) / gridSize;

  // PixiJS v8: Use stroke() method instead of lineStyle
  for (let i = 1; i < gridSize; i++) {
    gridLayer.moveTo(i * cellSize, 0);
    gridLayer.lineTo(i * cellSize, screen.height);
    gridLayer.moveTo(0, i * cellSize);
    gridLayer.lineTo(screen.width, i * cellSize);
  }
  gridLayer.stroke({ width: 2, color: 0x87CEEB, alpha: 0.5 });

  pixiApp.value.stage.addChild(gridLayer);
  pixiApp.value.stage.setChildIndex(gridLayer, 0); // Ensure grid is behind gems
};

const setupPixi = async () => {
  if (!canvasRoot.value) {
    return;
  }

  // Get dimensions from container
  const { clientWidth, clientHeight } = canvasRoot.value;
  console.log('Canvas root dimensions:', { clientWidth, clientHeight });

  const app = new Application();
  await app.init({
    background: '#0F172A', // Dark blue background
    backgroundAlpha: 1,
    antialias: true,
    powerPreference: 'high-performance',
    width: clientWidth || 800,
    height: clientHeight || 800,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
    autoStart: false, // We'll manually control rendering
  });

  // Start the ticker manually
  app.ticker.start();
  
  // Add explicit render call to ticker - this is critical in PixiJS v8
  // The ticker won't auto-render without this
  app.ticker.add(() => {
    app.render();
  });
  
  // Ensure PixiJS doesn't intercept pointer events (we handle them via DOM)
  app.stage.eventMode = 'none';

  // Ensure canvas is styled properly
  app.canvas.style.position = 'absolute';
  app.canvas.style.top = '0';
  app.canvas.style.left = '0';
  app.canvas.style.width = '100%';
  app.canvas.style.height = '100%';
  app.canvas.style.display = 'block';
  app.canvas.style.pointerEvents = 'none';

  canvasRoot.value.appendChild(app.canvas);
  pixiApp.value = app;

  const { textures, bonusAnimations } = await loadSpriteAtlas(app);
  const particles = createParticleFactory(app, textures);

  const boardContainer = new Container();
  boardContainer.sortableChildren = true;
  boardContainer.eventMode = 'none'; // Don't intercept pointer events
  app.stage.addChild(boardContainer);
  boardLayer.value = boardContainer;

  drawGrid();

  gameStore.attachRenderer({
    app,
    boardContainer,
    textures,
    bonusAnimations,
    particles,
  });

  bindBoardInput(canvasRoot.value);
  requestAnimationFrame(() => handleResize());

  if (typeof window !== 'undefined' && 'ResizeObserver' in window) {
    resizeObserver.value = new ResizeObserver(handleResize);
    resizeObserver.value.observe(canvasRoot.value);
  }
};

onMounted(() => {
  setupPixi();
});

onBeforeUnmount(() => {
  unbindBoardInput(canvasRoot.value);
  if (resizeObserver.value) {
    resizeObserver.value.disconnect();
    resizeObserver.value = null;
  }
  if (gameStore.renderer?.animator) {
    gameStore.renderer.animator.destroy();
  }
  if (pixiApp.value) {
    const { canvas } = pixiApp.value;
    if (canvas && canvasRoot.value?.contains(canvas)) {
      canvasRoot.value.removeChild(canvas);
    }
    pixiApp.value.destroy(true);
    pixiApp.value = null;
  }
  boardLayer.value = null;
  gameStore.renderer = null;
});


</script>

<style scoped>
.board-canvas {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 12px;
  overflow: hidden;
  background: radial-gradient(circle at 20% 20%, rgba(59, 130, 246, 0.45), transparent 60%),
    radial-gradient(circle at 80% 80%, rgba(236, 72, 153, 0.3), transparent 55%),
    rgba(15, 23, 42, 0.85);
  box-shadow: inset 0 0 32px rgba(8, 47, 73, 0.75);
}

.board-canvas canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
</style>
