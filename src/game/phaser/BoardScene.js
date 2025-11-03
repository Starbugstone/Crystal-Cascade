import Phaser from 'phaser';
import { preloadSpriteAssets, loadSpriteAtlas } from './SpriteLoader';
import { createParticleFactory } from './ParticleFactory';

export class BoardScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BoardScene' });
    this.boardContainer = null;
    this.backgroundLayer = null;
    this.gemLayer = null;
    this.fxLayer = null;
    this.onReady = null;
  }

  preload() {
    preloadSpriteAssets(this);
  }

  create() {
    this.boardContainer = this.add.container(0, 0);
    this.backgroundLayer = this.add.container(0, 0);
    this.gemLayer = this.add.container(0, 0);
    this.fxLayer = this.add.container(0, 0);

    this.boardContainer.add([this.backgroundLayer, this.gemLayer, this.fxLayer]);

    const { textures, bonusAnimations } = loadSpriteAtlas(this);
    const particles = createParticleFactory(this, this.fxLayer);

    const payload = {
      scene: this,
      boardContainer: this.boardContainer,
      backgroundLayer: this.backgroundLayer,
      gemLayer: this.gemLayer,
      fxLayer: this.fxLayer,
      textures,
      bonusAnimations,
      particles,
    };

    if (typeof this.onReady === 'function') {
      this.onReady(payload);
    } else {
      this.events.emit('scene-ready', payload);
    }
  }
}
