<template>
  <div ref="canvasRoot" class="board-canvas"></div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import Phaser from 'phaser';
import { useGameStore } from '../stores/gameStore';
import { BoardScene } from '../game/phaser/BoardScene';

const canvasRoot = ref(null);
const phaserGame = ref(null);
const gameStore = useGameStore();
const resizeObserver = ref(null);

const handleResize = () => {
  if (!phaserGame.value || !canvasRoot.value) {
    return;
  }

  const { clientWidth, clientHeight } = canvasRoot.value;
  if (!clientWidth || !clientHeight) {
    return;
  }

  phaserGame.value.scale.resize(clientWidth, clientHeight);
  gameStore.refreshBoardVisuals(true);
};

const setupPhaser = () => {
  if (!canvasRoot.value) {
    return;
  }

  const initialWidth = canvasRoot.value.clientWidth || 800;
  const initialHeight = canvasRoot.value.clientHeight || 800;

  const boardScene = new BoardScene();
  boardScene.onReady = (payload) => {
    const {
      scene,
      boardContainer,
      backgroundLayer,
      tileLayer,
      gemLayer,
      fxLayer,
      textures,
      bonusAnimations,
      tileTextures,
      particles,
    } = payload;
    gameStore.attachRenderer({
      game: phaserGame.value,
      scene,
      boardContainer,
      backgroundLayer,
      tileLayer,
      gemLayer,
      fxLayer,
      textures,
      bonusAnimations,
      tileTextures,
      particles,
    });

    setTimeout(() => {
      handleResize();
    }, 50);
  };

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    backgroundColor: '#0F172A',
    parent: canvasRoot.value,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: initialWidth,
      height: initialHeight,
    },
    scene: boardScene,
    banner: false,
    pixelArt: true,
  });

  phaserGame.value = game;

  if (game.canvas) {
    const canvas = game.canvas;
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
  }

  if (typeof window !== 'undefined' && 'ResizeObserver' in window) {
    resizeObserver.value = new ResizeObserver(handleResize);
    resizeObserver.value.observe(canvasRoot.value);
  }
};

onMounted(() => {
  setupPhaser();
});

onBeforeUnmount(() => {
  if (resizeObserver.value) {
    resizeObserver.value.disconnect();
    resizeObserver.value = null;
  }
  if (gameStore.renderer?.animator) {
    gameStore.renderer.animator.destroy();
  }
  if (gameStore.renderer?.input) {
    gameStore.renderer.input.destroy();
  }
  if (phaserGame.value) {
    phaserGame.value.destroy(true);
    phaserGame.value = null;
  }
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
