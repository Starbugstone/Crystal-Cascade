import Phaser from 'phaser';
import { preloadSpriteAssets, loadSpriteAtlas } from './SpriteLoader';
import { createParticleFactory } from './ParticleFactory';

export class BoardScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BoardScene' });
  }
  preload() {
    preloadSpriteAssets(this);
  }
  create() {
    const boardContainer = this.add.container(0, 0);
    const backgroundLayer = this.add.container(0, 0);
    const gemLayer = this.add.container(0, 0);
    const fxLayer = this.add.container(0, 0);
    boardContainer.add([backgroundLayer, gemLayer, fxLayer]);
    const { textures } = loadSpriteAtlas(this);
    const particles = createParticleFactory(this, fxLayer);
    this.onReady?.({
      scene: this,
      boardContainer,
      backgroundLayer,
      gemLayer,
      fxLayer,
      textures,
      particles,
    });
  }
}
