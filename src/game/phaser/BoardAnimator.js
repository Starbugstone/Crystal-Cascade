import Phaser from 'phaser';

const FALL_DURATION = 400;

export class BoardAnimator {
  constructor({
    scene,
    boardContainer,
    backgroundLayer,
    gemLayer,
    fxLayer,
    textures,
    bonusAnimations,
    particles,
  }) {
    this.scene = scene;
    this.boardContainer = boardContainer;
    this.backgroundLayer = backgroundLayer;
    this.gemLayer = gemLayer;
    this.fxLayer = fxLayer;
    this.textures = textures || {};
    this.bonusAnimations = bonusAnimations || {};
    this.particles = particles;

    this.boardSize = 0;
    this.cellSize = 0;

    this.indexToGemId = [];
    this.gemSprites = new Map();
    this.cellHighlights = new Map();
    this.comboText = null;

    if (this.backgroundLayer) {
      this.backgroundLayer.removeAll(true);
    }
    if (this.gemLayer) {
      this.gemLayer.removeAll(true);
    }
    if (this.fxLayer) {
      this.fxLayer.removeAll(true);
    }
  }

  destroy() {
    if (this.scene?.tweens) {
      this.scene.tweens.killTweensOf(this.gemLayer?.list || []);
      if (this.comboText) {
        this.scene.tweens.killTweensOf(this.comboText);
      }
    }
    this.comboText?.destroy();
    this.comboText = null;
    this.clear();
  }

  clear() {
    this.indexToGemId = [];
    this.gemSprites.forEach((sprite) => sprite.destroy());
    this.gemSprites.clear();

    if (this.backgroundLayer) {
      this.backgroundLayer.removeAll(true);
    }
    if (this.gemLayer) {
      this.gemLayer.removeAll(true);
    }
    if (this.fxLayer) {
      this.fxLayer.removeAll(true);
    }

    this.cellHighlights.clear();
    this._hideComboText();
  }

  setLayout({ boardSize, cellSize }) {
    const sizeChanged = boardSize !== this.boardSize;
    const cellChanged = Math.abs(cellSize - this.cellSize) > 0.001;

    this.boardSize = boardSize;
    this.cellSize = cellSize;

    const hasBackground = this.backgroundLayer && this.backgroundLayer.list && this.backgroundLayer.list.length > 0;

    if (sizeChanged || !hasBackground) {
      this._rebuildBackgrounds();
    } else if (cellChanged) {
      this._updateBackgroundSizing();
    }

    this._positionComboText();

    if (cellChanged || sizeChanged) {
      this.gemSprites.forEach((sprite, gemId) => {
        this._applyGemDimensions(sprite);
        const index = this.indexToGemId.indexOf(gemId);
        if (index >= 0) {
          const { x, y } = this._indexToPosition(index);
          sprite.setPosition(x, y);
        }
      });
    }
  }

  reset(board, { boardSize = this.boardSize, cellSize = this.cellSize } = {}) {
    this.boardSize = boardSize;
    this.cellSize = cellSize;

    if (this.backgroundLayer) {
      this.backgroundLayer.removeAll(true);
    }
    this._rebuildBackgrounds();

    if (this.gemLayer) {
      this.gemLayer.removeAll(true);
    }
    this.gemSprites.clear();
    this.indexToGemId = new Array(board.length).fill(null);

    board.forEach((gem, index) => {
      if (!gem) return;
      const sprite = this._createGemSprite(gem);
      const { x, y } = this._indexToPosition(index);
      sprite.setPosition(x, y);
      if (this.gemLayer) {
        this.gemLayer.add(sprite);
      }
      this.gemSprites.set(gem.id, sprite);
      this.indexToGemId[index] = gem.id;
    });
  }

  forceCompleteRedraw() {
    const currentBoard = window.__currentBoard;
    if (!currentBoard) {
      console.error('Cannot redraw board: missing state snapshot');
      return;
    }

    if (this.scene?.tweens) {
      this.scene.tweens.killTweensOf(this.gemLayer?.list || []);
      if (this.comboText) {
        this.scene.tweens.killTweensOf(this.comboText);
      }
    }

    this._hideComboText();

    if (this.gemLayer) {
      this.gemLayer.removeAll(true);
    }
    this.gemSprites.clear();
    this.indexToGemId = new Array(currentBoard.length).fill(null);

    currentBoard.forEach((gem, index) => {
      if (!gem) return;
      const sprite = this._createGemSprite(gem);
      const { x, y } = this._indexToPosition(index);
      sprite.setPosition(x, y);
      if (this.gemLayer) {
        this.gemLayer.add(sprite);
      }
      this.gemSprites.set(gem.id, sprite);
      this.indexToGemId[index] = gem.id;
    });
  }

  syncToBoard(board) {
    const seen = new Set();

    board.forEach((gem, index) => {
      const gemId = gem?.id ?? null;
      if (!gemId) {
        this._removeSpriteAtIndex(index);
        return;
      }

      let sprite = this.gemSprites.get(gemId);
      if (!sprite) {
        sprite = this._createGemSprite(gem);
        const { x, y } = this._indexToPosition(index);
        sprite.setPosition(x, y);
        if (this.gemLayer) {
          this.gemLayer.add(sprite);
        }
        this.gemSprites.set(gemId, sprite);
      }

      this._applyHighlight(sprite, gem);
      this.indexToGemId[index] = gemId;
      seen.add(gemId);
    });

    Array.from(this.gemSprites.entries()).forEach(([gemId, sprite]) => {
      if (!seen.has(gemId)) {
        sprite.destroy();
        this.gemSprites.delete(gemId);
      }
    });
  }

  async animateSwap({ aIndex, bIndex }) {
    if (aIndex == null || bIndex == null) return;

    const gemA = this.indexToGemId[aIndex];
    const gemB = this.indexToGemId[bIndex];
    if (!gemA || !gemB) return;

    const spriteA = this.gemSprites.get(gemA);
    const spriteB = this.gemSprites.get(gemB);
    if (!spriteA || !spriteB) return;

    const posA = this._indexToPosition(aIndex);
    const posB = this._indexToPosition(bIndex);

    this.scene.tweens.killTweensOf(spriteA);
    this.scene.tweens.killTweensOf(spriteB);

    const animateSprite = (sprite, target) => new Promise((resolve) => {
      this.scene.tweens.add({
        targets: sprite,
        x: target.x,
        y: target.y,
        duration: 160,
        ease: 'Cubic.easeInOut',
        onComplete: resolve,
      });
    });

    await Promise.all([
      animateSprite(spriteA, posB),
      animateSprite(spriteB, posA),
    ]);

    spriteA.setPosition(posB.x, posB.y);
    spriteB.setPosition(posA.x, posA.y);
    this._swapIndexMapping(aIndex, bIndex);
  }

  async animateInvalidSwap({ aIndex, bIndex }) {
    if (aIndex == null || bIndex == null) return;
    const gemA = this.indexToGemId[aIndex];
    const gemB = this.indexToGemId[bIndex];
    if (!gemA || !gemB) return;
    const spriteA = this.gemSprites.get(gemA);
    const spriteB = this.gemSprites.get(gemB);
    if (!spriteA || !spriteB) return;

    this.scene.tweens.killTweensOf(spriteA);
    this.scene.tweens.killTweensOf(spriteB);

    const targetA = this._indexToPosition(aIndex);
    const targetB = this._indexToPosition(bIndex);

    const animation = (sprite, origin, target) => new Promise((resolve) => {
      this.scene.tweens.add({
        targets: sprite,
        x: target.x,
        y: target.y,
        yoyo: true,
        duration: 120,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          sprite.setPosition(origin.x, origin.y);
          resolve();
        },
      });
    });

    await Promise.all([
      animation(spriteA, targetA, targetB),
      animation(spriteB, targetB, targetA),
    ]);
  }

  async playSteps(steps) {
    for (let i = 0; i < steps.length; i += 1) {
      const step = steps[i];

      if (step.cleared.length) {
        await this._animateClear(step);
      }

      if (step.bonus) {
        await this._animateBonus(step.bonus);
      }

      if (step.drops.length) {
        await this._animateDrops(step.drops);
      }

      if (step.spawns.length) {
        await this._animateSpawns(step.spawns);
      }
    }

    if (steps.length >= 4) {
      this._celebrateCombo(steps.length);
    } else {
      this._hideComboText();
    }
  }

  highlightCell(index, highlight = true) {
    const cell = this.cellHighlights.get(index);
    if (!cell) return;

    if (highlight) {
      cell.setStrokeStyle(3, 0xffff00, 0.8);
      cell.setFillStyle(0xffff00, 0.15);
    } else {
      cell.setStrokeStyle(2, 0x87ceeb, 0.35);
      cell.setFillStyle(0x1e293b, 0.28);
    }
  }

  clearCellHighlights() {
    for (let i = 0; i < this.boardSize * this.boardSize; i += 1) {
      this.highlightCell(i, false);
    }
  }

  setGemHighlight(index, highlight) {
    const gemId = this.indexToGemId[index];
    if (!gemId) return;
    const sprite = this.gemSprites.get(gemId);
    if (!sprite) return;

    if (highlight) {
      sprite.setTint(0xffff00);
    } else {
      sprite.clearTint();
    }
  }

  clearGemHighlights() {
    this.gemSprites.forEach((sprite) => {
      sprite.clearTint();
    });
  }

  _celebrateCombo(comboCount) {
    if (comboCount < 4) {
      this._hideComboText();
      return;
    }

    this._ensureComboText();
    this._positionComboText();

    const label = comboCount >= 10 ? `Mega Combo x${comboCount}` : `Combo x${comboCount}`;
    this.comboText.setText(label);
    this.comboText.setVisible(true);
    this.comboText.setScale(0.55);
    this.comboText.setAlpha(0);
    this.comboText.setTint(0xfffbeb, 0xffe08a, 0xfffbeb, 0xffe08a);

    this.scene.tweens.killTweensOf(this.comboText);
    this.scene.tweens.add({
      targets: this.comboText,
      alpha: 1,
      scale: 1,
      duration: 240,
      ease: 'Back.Out',
      onUpdate: () => {
        const shimmer = 0.65 + Math.random() * 0.35;
        this.comboText.setAlpha(shimmer);
      },
      onComplete: () => {
        this.comboText.setAlpha(1);
        this.scene.time.delayedCall(700, () => {
          this.scene.tweens.add({
            targets: this.comboText,
            alpha: 0,
            duration: 220,
            ease: 'Quad.Out',
            onComplete: () => {
              this.comboText.setVisible(false);
            },
          });
        });
      },
    });

    this._emitComboParticles(comboCount);
  }

  _ensureComboText() {
    if (this.comboText) {
      return;
    }

    const fontSize = Math.round(Math.max(24, this.cellSize * 0.7));
    this.comboText = this.scene.add.text(0, 0, '', {
      fontFamily: 'Poppins, Arial, sans-serif',
      fontSize: `${fontSize}px`,
      color: '#fff5cc',
      stroke: '#fb7185',
      strokeThickness: 8,
      align: 'center',
    });
    this.comboText.setOrigin(0.5);
    this.comboText.setDepth(1000);
    this.comboText.setVisible(false);
    this.comboText.setShadow(0, 0, '#f97316', 16, true, true);
    this.comboText.setBlendMode(Phaser.BlendModes.ADD);
  }

  _positionComboText() {
    if (!this.comboText) {
      return;
    }
    const center = this._getBoardCenterWorld();
    const fontSize = Math.round(Math.max(24, this.cellSize * 0.7));
    this.comboText.setFontSize(fontSize);
    this.comboText.setPosition(center.x, center.y - this.cellSize);
  }

  _hideComboText() {
    if (!this.comboText) {
      return;
    }
    this.scene?.tweens?.killTweensOf(this.comboText);
    this.comboText.setVisible(false);
    this.comboText.setAlpha(0);
  }

  _emitBonusEffect(gemType, index) {
    if (!this.particles) {
      return;
    }
    if (!gemType || !['bomb', 'cross', 'rainbow'].includes(gemType)) {
      return;
    }

    const local = this._indexToPosition(index);
    const position = {
      x: this.boardContainer.x + local.x,
      y: this.boardContainer.y + local.y,
    };

    if (gemType === 'bomb') {
      this.particles.emitExplosion(position, {
        color: 0xffc107,
        radius: this.cellSize * 1.6,
        count: 36,
        duration: 360,
      });
      this.particles.emitBurst(position, 0xfff59d, 24);
    } else if (gemType === 'cross') {
      this.particles.emitExplosion(position, {
        color: 0x7dd3fc,
        radius: this.cellSize * 1.2,
        count: 28,
        duration: 320,
      });
      this.particles.emitCross(position, {
        column: {
          color: 0x7dd3fc,
          length: Math.ceil(this.boardSize / 2),
          spacing: this.cellSize,
          duration: 400,
        },
        row: {
          color: 0xff80ab,
          length: Math.ceil(this.boardSize / 2),
          spacing: this.cellSize,
          duration: 400,
        },
      });
    } else if (gemType === 'rainbow') {
      this.particles.emitExplosion(position, {
        color: 0xffffff,
        radius: this.cellSize * 2,
        count: 54,
        duration: 500,
      });
      this.particles.emitBurst(position, 0xff80ab, 18);
      this.particles.emitBurst(position, 0x7dd3fc, 18);
    }
  }

  _emitComboParticles(comboCount) {
    if (!this.particles) {
      return;
    }

    const center = this._getBoardCenterWorld();
    const radius = this.cellSize * (1.4 + comboCount * 0.1);

    this.particles.emitExplosion(center, {
      color: 0xfff59d,
      radius,
      count: 48 + comboCount * 6,
      duration: 420,
    });

    this.particles.emitCross(center, {
      column: {
        color: 0x7dd3fc,
        length: Math.ceil(this.boardSize / 2),
        spacing: this.cellSize * 0.75,
        duration: 420,
      },
      row: {
        color: 0xff80ab,
        length: Math.ceil(this.boardSize / 2),
        spacing: this.cellSize * 0.75,
        duration: 420,
      },
    });

    this.particles.emitBurst(center, 0xffffff, 24 + comboCount * 2);
  }

  _getBoardCenterWorld() {
    return {
      x: this.boardContainer.x + (this.boardSize * this.cellSize) / 2,
      y: this.boardContainer.y + (this.boardSize * this.cellSize) / 2,
    };
  }

  _swapIndexMapping(aIndex, bIndex) {
    const temp = this.indexToGemId[aIndex];
    this.indexToGemId[aIndex] = this.indexToGemId[bIndex];
    this.indexToGemId[bIndex] = temp;
  }

  _removeSpriteAtIndex(index) {
    const gemId = this.indexToGemId[index];
    if (!gemId) return;
    const sprite = this.gemSprites.get(gemId);
    if (sprite) {
      sprite.destroy();
    }
    this.gemSprites.delete(gemId);
    this.indexToGemId[index] = null;
  }

  _animateClear(step) {
    const animations = step.cleared.map((index) => {
      const gemId = this.indexToGemId[index];
      if (!gemId) return Promise.resolve();
      const sprite = this.gemSprites.get(gemId);
      if (!sprite) return Promise.resolve();
      const gemType = sprite.__gemType;

      this._emitBonusEffect(gemType, index);
      this.indexToGemId[index] = null;
      this.gemSprites.delete(gemId);

      if (sprite.scene) {
        this.scene.tweens.killTweensOf(sprite);
        sprite.destroy();
      }

      if (this.particles) {
        const local = this._indexToPosition(index);
        const position = {
          x: this.boardContainer.x + local.x,
          y: this.boardContainer.y + local.y,
        };
        this.particles.emitBurst(position);
      }

      return Promise.resolve();
    });

    return Promise.all(animations);
  }

  _animateBonus({ index, gem, type }) {
    const previousGemId = this.indexToGemId[index];
    let sprite = previousGemId ? this.gemSprites.get(previousGemId) : null;

    if (sprite && previousGemId !== gem.id) {
      sprite.destroy();
      this.gemSprites.delete(previousGemId);
      sprite = null;
    }

    if (!sprite) {
      sprite = this._createGemSprite(gem);
      const { x, y } = this._indexToPosition(index);
      sprite.setPosition(x, y);
      if (this.gemLayer) {
        this.gemLayer.add(sprite);
      }
    }

    this.gemSprites.set(gem.id, sprite);
    this.indexToGemId[index] = gem.id;
    this._setTexture(sprite, type);
    this._applyHighlight(sprite, gem);

    return Promise.resolve();
  }

  _animateDrops(drops) {
    const animations = drops.map(({ from, to, gem }) => {
      const sprite = this.gemSprites.get(gem.id);
      if (!sprite) {
        console.error(`Drop animation missing sprite for gem ${gem.id}`);
        return Promise.resolve();
      }

      const target = this._indexToPosition(to);
      const oldId = this.indexToGemId[to];
      if (oldId && oldId !== gem.id) {
        const oldSprite = this.gemSprites.get(oldId);
        if (oldSprite) {
          oldSprite.destroy();
        }
        this.gemSprites.delete(oldId);
      }

      this.indexToGemId[to] = gem.id;
      if (this.indexToGemId[from] === gem.id) {
        this.indexToGemId[from] = null;
      }

      return new Promise((resolve) => {
        this.scene.tweens.add({
          targets: sprite,
          x: target.x,
          y: target.y,
          duration: FALL_DURATION,
          ease: 'Cubic.easeOut',
          onComplete: resolve,
        });
      });
    });

    return animations.length ? Promise.all(animations) : Promise.resolve();
  }

  _animateSpawns(spawns) {
    const animations = spawns.map(({ index, gem }) => {
      const existingSprite = this.gemSprites.get(gem.id);
      if (existingSprite) {
        existingSprite.destroy();
        this.gemSprites.delete(gem.id);
      }

      const sprite = this._createGemSprite(gem);
      const target = this._indexToPosition(index);
      const row = Math.floor(index / this.boardSize);
      const startY = -this.cellSize * (row + 2);

      sprite.setPosition(target.x, startY);
      if (this.gemLayer) {
        this.gemLayer.add(sprite);
      }
      this.gemSprites.set(gem.id, sprite);
      this.indexToGemId[index] = gem.id;

      return new Promise((resolve) => {
        this.scene.tweens.add({
          targets: sprite,
          y: target.y,
          duration: FALL_DURATION,
          ease: 'Cubic.easeOut',
          onComplete: resolve,
        });
      });
    });

    return animations.length ? Promise.all(animations) : Promise.resolve();
  }

  _setTexture(sprite, type) {
    const bonusConfig = this.bonusAnimations[type];
    if (bonusConfig?.animationKey) {
      if (!sprite.anims || sprite.texture.key !== bonusConfig.frameKey) {
        sprite.setTexture(bonusConfig.frameKey);
      }
      sprite.anims?.play(bonusConfig.animationKey, true);
      return;
    }

    const textureInfo = this.textures[type];
    if (textureInfo) {
      sprite.setTexture(textureInfo.key);
      sprite.anims?.stop();
    }
  }

  _createGemSprite(gem) {
    const bonusConfig = this.bonusAnimations[gem.type];
    let sprite;

    if (bonusConfig?.animationKey) {
      sprite = this.scene.add.sprite(0, 0, bonusConfig.frameKey);
      sprite.play(bonusConfig.animationKey);
    } else {
      const textureInfo = this.textures[gem.type];
      const textureKey = textureInfo?.key ?? this.textures.ruby?.key;
      sprite = this.scene.add.image(0, 0, textureKey);
    }

    sprite.setOrigin(0.5);
    sprite.__gemType = gem.type;
    this._applyGemDimensions(sprite);
    this._applyHighlight(sprite, gem);
    return sprite;
  }

  _applyGemDimensions(sprite) {
    if (!this.cellSize) {
      return;
    }
    const targetSize = this.cellSize * 0.85;
    sprite.setDisplaySize(targetSize, targetSize);
  }

  _applyHighlight(sprite, gem) {
    if (gem.highlight) {
      sprite.setTint(0xffff00);
    } else {
      sprite.clearTint();
    }
  }

  _rebuildBackgrounds() {
    if (!this.backgroundLayer) {
      return;
    }
    this.backgroundLayer.removeAll(true);
    this.cellHighlights.clear();

    const { boardSize, cellSize } = this;
    for (let row = 0; row < boardSize; row += 1) {
      for (let col = 0; col < boardSize; col += 1) {
        const index = row * boardSize + col;
        const rect = this.scene.add.rectangle(
          col * cellSize + cellSize / 2,
          row * cellSize + cellSize / 2,
          cellSize,
          cellSize,
          0x1e293b,
          0.28,
        );
        rect.setStrokeStyle(2, 0x87ceeb, 0.35);
        rect.setOrigin(0.5);
        this.backgroundLayer.add(rect);
        this.cellHighlights.set(index, rect);
      }
    }
  }

  _updateBackgroundSizing() {
    if (!this.backgroundLayer) return;
    const { boardSize, cellSize } = this;
    this.cellHighlights.forEach((rect, index) => {
      const row = Math.floor(index / boardSize);
      const col = index % boardSize;
      rect.setPosition(col * cellSize + cellSize / 2, row * cellSize + cellSize / 2);
      rect.setSize(cellSize, cellSize);
      rect.setStrokeStyle(2, 0x87ceeb, 0.35);
      rect.setFillStyle(0x1e293b, 0.28);
    });
  }

  _indexToPosition(index) {
    const col = index % this.boardSize;
    const row = Math.floor(index / this.boardSize);
    return {
      x: col * this.cellSize + this.cellSize / 2,
      y: row * this.cellSize + this.cellSize / 2,
    };
  }
}
