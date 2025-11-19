import Phaser from 'phaser';

const FALL_DURATION = 400;
const TILE_OVERLAY_ALPHA = 0.20;

export class BoardAnimator {
  constructor({
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
    audio,
    boardLayout,
  }) {
    this.scene = scene;
    this.boardContainer = boardContainer;
    this.backgroundLayer = backgroundLayer;
    this.tileLayer = tileLayer;
    this.gemLayer = gemLayer;
    this.fxLayer = fxLayer;
    this.textures = textures || {};
    this.bonusAnimations = bonusAnimations || {};
    this.tileTextures = tileTextures || { layers: {} };
    this.particles = particles;
    this.audio = audio ?? null;
    this.boardLayout = boardLayout;

    this.boardSize = 0;
    this.boardRows = 0;
    this.cellSize = 0;

    this.indexToGemId = [];
    this.gemSprites = new Map();
    this.tileSprites = new Map();
    this.cellHighlights = new Map();
    this.comboText = null;
    this.tiles = [];
    this.queuedSwapIndices = null;
    this.queuedSwapRects = [];
    this.hintIndices = null;
    this.hintRects = [];
    this.hintTween = null;
    this.hintGemIds = new Set();

    if (this.backgroundLayer) {
      this.backgroundLayer.removeAll(true);
    }
    if (this.gemLayer) {
      this.gemLayer.removeAll(true);
    }
    if (this.tileLayer) {
      this.tileLayer.removeAll(true);
    }
    if (this.fxLayer) {
      this.fxLayer.removeAll(true);
    }
  }

  setAudioManager(audio) {
    this.audio = audio ?? null;
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
    this.tileSprites.forEach((sprite) => sprite.destroy());
    this.tileSprites.clear();

    if (this.backgroundLayer) {
      this.backgroundLayer.removeAll(true);
    }
    if (this.tileLayer) {
      this.tileLayer.removeAll(true);
    }
    if (this.gemLayer) {
      this.gemLayer.removeAll(true);
    }
    if (this.fxLayer) {
      this.fxLayer.removeAll(true);
    }

    this.cellHighlights.clear();
    this.clearHintMove();
    this._hideComboText();
    this.clearQueuedSwapHighlight();
  }

  setLayout({ boardCols, boardRows, cellSize }) {
    const cols = boardCols ?? this.boardSize;
    const rows = boardRows ?? this.boardRows;
    const sizeChanged = cols !== this.boardSize || rows !== this.boardRows;
    const cellChanged = Math.abs(cellSize - this.cellSize) > 0.001;

    this.boardSize = cols;
    this.boardRows = rows;
    this.cellSize = cellSize;

    const hasBackground = this.backgroundLayer && this.backgroundLayer.list && this.backgroundLayer.list.length > 0;

    if (sizeChanged || !hasBackground) {
      this._rebuildBackgrounds();
    } else if (cellChanged) {
      this._updateBackgroundSizing();
    }

    this._positionComboText();
    this._applyTileLayers();

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

    this._renderQueuedSwapHighlight();
    this._refreshHintEffects();
  }

  reset(
    board,
    { boardCols = this.boardSize, boardRows = this.boardRows, cellSize = this.cellSize } = {},
  ) {
    this.boardSize = boardCols;
    this.boardRows = boardRows;
    this.cellSize = cellSize;

    if (this.backgroundLayer) {
      this.backgroundLayer.removeAll(true);
    }
    if (this.tileLayer) {
      this.tileLayer.removeAll(true);
    }
    this.tileSprites.clear();
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

    this._applyTileLayers();
    this.clearQueuedSwapHighlight();
    this._refreshHintEffects();
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

    this._applyTileLayers();
    this._renderQueuedSwapHighlight();
    this._refreshHintEffects();
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
    this._refreshHintEffects();
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
        this._playMatchSound(i + 1);
      }

      if (step.tileUpdates?.length) {
        this._applyTileLayerUpdates(step.tileUpdates);
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

    this._applyTileLayers();

    if (steps.length >= 4) {
      this._celebrateCombo(steps.length);
    } else {
      this._hideComboText();
    }
  }

  highlightCell(index, highlight = true) {
    const cell = this.cellHighlights.get(index);
    if (!cell) return;

    cell.__highlighted = highlight;

    if (highlight) {
      cell.setStrokeStyle(3, 0xffff00, 0.8);
      cell.setFillStyle(0xffff00, 0.12);
    } else {
      cell.setStrokeStyle(0, 0x000000, 0);
      cell.setFillStyle(0x000000, 0);
    }
  }

  clearCellHighlights() {
    for (let i = 0; i < this.boardSize * this.boardRows; i += 1) {
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

  showQueuedSwap(aIndex, bIndex) {
    this.queuedSwapIndices = [aIndex, bIndex];
    this._renderQueuedSwapHighlight();
  }

  clearQueuedSwapHighlight() {
    if (this.queuedSwapRects?.length) {
      this.queuedSwapRects.forEach((rect) => rect?.destroy?.());
    }
    this.queuedSwapRects = [];
    this.queuedSwapIndices = null;
  }

  _renderQueuedSwapHighlight() {
    if (!this.queuedSwapIndices || this.queuedSwapIndices.length !== 2 || !this.cellSize) {
      if (this.queuedSwapRects?.length) {
        this.queuedSwapRects.forEach((rect) => rect?.destroy?.());
      }
      this.queuedSwapRects = [];
      return;
    }

    const layer = this.fxLayer ?? this.backgroundLayer ?? this.boardContainer;
    if (!layer) {
      return;
    }

    const strokeWidth = Math.max(3, Math.round(this.cellSize * 0.08));
    const targetSize = this.cellSize * 0.92;

    if (!Array.isArray(this.queuedSwapRects)) {
      this.queuedSwapRects = [];
    }

    while (this.queuedSwapRects.length > 2) {
      const extra = this.queuedSwapRects.pop();
      extra?.destroy?.();
    }

    this.queuedSwapIndices.forEach((index, slot) => {
      const { x, y } = this._indexToPosition(index);
      let rect = this.queuedSwapRects[slot];

      if (!rect || !rect.scene) {
        rect?.destroy?.();
        rect = this.scene.add.rectangle(x, y, targetSize, targetSize, 0xffffff, 0.08);
        rect.setOrigin(0.5);
        rect.setStrokeStyle(strokeWidth, 0xffffff, 1);
        rect.setDepth(9000);
        if (typeof layer.add === 'function') {
          layer.add(rect);
        }
        this.queuedSwapRects[slot] = rect;
      } else {
        rect.setPosition(x, y);
        rect.setSize(targetSize, targetSize);
        rect.setStrokeStyle(strokeWidth, 0xffffff, 1);
        rect.setFillStyle(0xffffff, 0.08);
      }
    });
  }

  showHintMove(indices) {
    if (!Array.isArray(indices) || !indices.length) {
      this.clearHintMove();
      return;
    }

    const filtered = indices
      .filter((index) => typeof index === 'number' && index >= 0)
      .slice(0, 2);

    if (!filtered.length) {
      this.clearHintMove();
      return;
    }

    const unique = [...new Set(filtered)];
    this.hintIndices = unique;
    this._refreshHintEffects();
  }

  clearHintMove() {
    if (this.scene?.tweens && this.hintTween) {
      this.scene.tweens.remove(this.hintTween);
    }
    this.hintTween = null;

    if (Array.isArray(this.hintRects)) {
      this.hintRects.forEach((rect) => rect?.destroy?.());
    }
    this.hintRects = [];
    this.hintIndices = null;
    this._clearHintGemTint();
  }

  _refreshHintEffects() {
    this._renderHintHighlight();
    this._applyHintGemTint();
  }

  _renderHintHighlight() {
    if (!Array.isArray(this.hintIndices) || !this.hintIndices.length || !this.cellSize) {
      if (Array.isArray(this.hintRects) && this.hintRects.length) {
        this.hintRects.forEach((rect) => rect?.destroy?.());
      }
      this.hintRects = [];
      if (this.scene?.tweens && this.hintTween) {
        this.scene.tweens.remove(this.hintTween);
      }
      this.hintTween = null;
      return;
    }

    const layer = this.fxLayer ?? this.backgroundLayer ?? this.boardContainer;
    if (!layer || !this.scene) {
      return;
    }

    if (!Array.isArray(this.hintRects)) {
      this.hintRects = [];
    }

    const targetSize = this.cellSize * 0.96;
    const strokeWidth = Math.max(3, Math.round(this.cellSize * 0.1));

    this.hintIndices.forEach((index, slot) => {
      const { x, y } = this._indexToPosition(index);
      let rect = this.hintRects[slot];

      if (!rect || !rect.scene) {
        rect?.destroy?.();
        rect = this.scene.add.rectangle(x, y, targetSize, targetSize, 0x34d399, 0.2);
        rect.setOrigin(0.5);
        rect.setStrokeStyle(strokeWidth, 0x22c55e, 0.95);
        rect.setDepth(9600);
        rect.setBlendMode(Phaser.BlendModes.ADD);
        if (typeof layer.add === 'function') {
          layer.add(rect);
        }
        this.hintRects[slot] = rect;
      } else {
        rect.setPosition(x, y);
        rect.setSize(targetSize, targetSize);
        rect.setStrokeStyle(strokeWidth, 0x22c55e, 0.95);
        rect.setFillStyle(0x34d399, 0.2);
        rect.setVisible(true);
      }
    });

    if (this.hintRects.length > this.hintIndices.length) {
      for (let i = this.hintIndices.length; i < this.hintRects.length; i += 1) {
        this.hintRects[i]?.destroy?.();
      }
      this.hintRects.length = this.hintIndices.length;
    }

    this._ensureHintTween();
  }

  _ensureHintTween() {
    if (!this.scene?.tweens) {
      return;
    }

    if (!this.hintRects?.length) {
      if (this.hintTween) {
        this.scene.tweens.remove(this.hintTween);
        this.hintTween = null;
      }
      return;
    }

    if (this.hintTween) {
      this.scene.tweens.remove(this.hintTween);
      this.hintTween = null;
    }

    this.hintTween = this.scene.tweens.add({
      targets: this.hintRects,
      alpha: { from: 0.35, to: 0.85 },
      scale: { from: 0.98, to: 1.02 },
      duration: 640,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  }

  _clearHintGemTint() {
    if (!this.hintGemIds) {
      this.hintGemIds = new Set();
      return;
    }
    this.hintGemIds.forEach((gemId) => {
      const sprite = this.gemSprites.get(gemId);
      if (sprite) {
        sprite.clearTint();
      }
    });
    this.hintGemIds.clear();
  }

  _applyHintGemTint() {
    this._clearHintGemTint();

    if (!Array.isArray(this.hintIndices) || !this.hintIndices.length) {
      return;
    }

    if (!this.hintGemIds) {
      this.hintGemIds = new Set();
    }

    this.hintIndices.forEach((index) => {
      const gemId = this.indexToGemId[index];
      if (!gemId) {
        return;
      }
      const sprite = this.gemSprites.get(gemId);
      if (!sprite) {
        return;
      }
      sprite.setTint(0x86efac);
      this.hintGemIds.add(gemId);
    });
  }

  _playMatchSound(comboCount) {
    if (!this.audio?.playMatch) {
      return;
    }
    this.audio.playMatch({ comboCount });
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
    if (gemType !== 'bomb') {
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
        length: Math.ceil(this.boardRows / 2),
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

  updateTiles(tiles = []) {
    this.tiles = tiles;
    this._applyTileLayers();
  }

  _getBoardCenterWorld() {
    return {
      x: this.boardContainer.x + (this.boardSize * this.cellSize) / 2,
      y: this.boardContainer.y + (this.boardRows * this.cellSize) / 2,
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
    if (!step?.cleared?.length) {
      return Promise.resolve();
    }

    const clearedSet = new Set(step.cleared);
    const timer = this.scene?.time ?? null;

    const entries = step.cleared.map((index) => {
      const gemId = this.indexToGemId[index];
      const sprite = gemId ? this.gemSprites.get(gemId) : null;
      return {
        index,
        gemId,
        sprite,
        gemType: sprite?.__gemType ?? null,
      };
    });

    const removalDelays = new Map();
    const customFxIndices = new Set();

    entries
      .filter((entry) => entry.sprite && entry.gemType === 'cross')
      .forEach((entry) => {
        const indices = this._playCrossFireLine(entry.index, clearedSet, removalDelays);
        indices.forEach((idx) => customFxIndices.add(idx));
      });

    entries
      .filter((entry) => entry.sprite && entry.gemType === 'rainbow')
      .forEach((entry) => {
        const targets = step.cleared.filter((idx) => idx !== entry.index);
        const indices = this._playRainbowLaser(entry.index, targets, removalDelays);
        indices.forEach((idx) => customFxIndices.add(idx));
      });

    const animations = entries.map((entry) => {
      const { index, gemId, sprite, gemType } = entry;

      if (!gemId || !sprite) {
        this.indexToGemId[index] = null;
        this.gemSprites.delete(gemId);
        return Promise.resolve();
      }

      const delay = removalDelays.get(index) ?? 0;

      return new Promise((resolve) => {
        const handleRemoval = () => {
          if (sprite.scene) {
            this.scene.tweens.killTweensOf(sprite);
          }
          sprite.destroy();

          this.gemSprites.delete(gemId);
          this.indexToGemId[index] = null;

          if (gemType === 'bomb') {
            if (this.audio?.playBomb) {
              this.audio.playBomb();
            }
            this._emitBonusEffect(gemType, index);
          }

          const useCustomBurst = customFxIndices.has(index);
          const skipDefaultBurst = useCustomBurst || gemType === 'bomb';

          if (this.particles && !skipDefaultBurst) {
            const local = this._indexToPosition(index);
            const position = {
              x: this.boardContainer.x + local.x,
              y: this.boardContainer.y + local.y,
            };
            this.particles.emitBurst(position);
          }

          resolve();
        };

        if (timer) {
          timer.delayedCall(delay, handleRemoval);
        } else {
          setTimeout(handleRemoval, delay);
        }
      });
    });

    return animations.length ? Promise.all(animations) : Promise.resolve();
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

    if (this.audio?.playBonusAppears) {
      this.audio.playBonusAppears();
    }

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

  async animateEvolution(index) {
    const gemId = this.indexToGemId[index];
    if (!gemId) return;

    const sprite = this.gemSprites.get(gemId);
    if (!sprite) return;

    const { x, y } = this._indexToPosition(index);
    if (this.particles) {
      this.particles.emitExplosion({ x: this.boardContainer.x + x, y: this.boardContainer.y + y }, {
        color: 0xffffff,
        radius: this.cellSize * 1.2,
        count: 30,
        duration: 300,
      });
    }

    const newType = `${sprite.__gemType}-evolved`;
    this._setTexture(sprite, newType);
    sprite.__gemType = newType;
  }

  _playCrossFireLine(centerIndex, validTargets, removalDelays) {
    const indices = new Set();
    const baseDelay = 80;
    const centerLocal = this._indexToPosition(centerIndex);
    const worldCenter = {
      x: this.boardContainer.x + centerLocal.x,
      y: this.boardContainer.y + centerLocal.y,
    };

    if (this.audio?.playCrossFire) {
      this.audio.playCrossFire();
    }

    if (this.particles) {
      this.particles.emitExplosion(worldCenter, {
        color: 0xffa94d,
        radius: this.cellSize * 0.9,
        count: 24,
        duration: 280,
      });
    }

    const applyDelay = (index, stepsFromCenter = 0) => {
      const delay = Math.max(0, stepsFromCenter * baseDelay);
      const current = removalDelays.get(index) ?? 0;
      removalDelays.set(index, Math.max(current, delay));
      indices.add(index);
      return delay;
    };

    applyDelay(centerIndex, 0);

    const col = centerIndex % this.boardSize;
    const row = Math.floor(centerIndex / this.boardSize);
    const directions = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
    ];

    directions.forEach(({ dx, dy }) => {
      let step = 1;
      while (true) {
        const targetCol = col + dx * step;
        const targetRow = row + dy * step;
        if (targetCol < 0 || targetCol >= this.boardSize || targetRow < 0 || targetRow >= this.boardRows) {
          break;
        }

        const targetIndex = targetRow * this.boardSize + targetCol;
        if (!validTargets.has(targetIndex)) {
          break;
        }

        const localTarget = this._indexToPosition(targetIndex);
        const delay = applyDelay(targetIndex, step);

        const flame = this.scene.add.rectangle(
          centerLocal.x,
          centerLocal.y,
          this.cellSize * 0.22,
          this.cellSize * 0.22,
          0xff922b,
          0.95,
        );
        flame.setOrigin(0.5);
        flame.setBlendMode(Phaser.BlendModes.ADD);
        if (this.fxLayer) {
          this.fxLayer.add(flame);
        }

        const duration = Math.max(60, baseDelay * 0.85);
        this.scene.tweens.add({
          targets: flame,
          x: localTarget.x,
          y: localTarget.y,
          scaleX: 1.3,
          scaleY: 1.3,
          alpha: { from: 1, to: 0.3 },
          delay,
          duration,
          ease: 'Cubic.easeOut',
          onComplete: () => {
            flame.destroy();
            if (this.particles) {
              const worldTarget = {
                x: this.boardContainer.x + localTarget.x,
                y: this.boardContainer.y + localTarget.y,
              };
              this.particles.emitBurst(worldTarget, 0xffc266, 12);
            }
          },
        });

        step += 1;
      }
    });

    return indices;
  }

  _playRainbowLaser(sourceIndex, targetIndices, removalDelays) {
    const indices = new Set();
    indices.add(sourceIndex);

    const baseDelay = 90;
    const beamDuration = 130;

    const sourceLocal = this._indexToPosition(sourceIndex);
    const worldSource = {
      x: this.boardContainer.x + sourceLocal.x,
      y: this.boardContainer.y + sourceLocal.y,
    };
    const timer = this.scene?.time ?? null;

    const applyDelay = (index, delay) => {
      const current = removalDelays.get(index) ?? 0;
      removalDelays.set(index, Math.max(current, delay));
      indices.add(index);
    };

    targetIndices.forEach((targetIndex, order) => {

      const localTarget = this._indexToPosition(targetIndex);
      const length = Math.max(
        10,
        Phaser.Math.Distance.Between(sourceLocal.x, sourceLocal.y, localTarget.x, localTarget.y),
      );
      const angle = Phaser.Math.Angle.Between(sourceLocal.x, sourceLocal.y, localTarget.x, localTarget.y);
      const beam = this.scene.add.rectangle(
        sourceLocal.x,
        sourceLocal.y,
        this.cellSize * 0.18,
        length,
        0x9fdaff,
        0.95,
      );
      beam.setOrigin(0.5, 0);
      beam.setRotation(angle - Math.PI / 2);
      beam.setScale(1, 0);
      beam.setBlendMode(Phaser.BlendModes.ADD);
      if (this.fxLayer) {
        this.fxLayer.add(beam);
      }

      const delay = (order + 1) * baseDelay;

      if (this.audio?.playRainbowLaser) {
        const playLaserSound = () => {
          this.audio?.playRainbowLaser();
        };
        if (timer) {
          timer.delayedCall(delay, playLaserSound);
        } else {
          setTimeout(playLaserSound, delay);
        }
      }

      this.scene.tweens.add({
        targets: beam,
        scaleY: 1,
        alpha: { from: 1, to: 0.4 },
        delay,
        duration: beamDuration,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          beam.destroy();
        },
      });

      const impactDelay = delay + beamDuration;
      const runImpact = () => {
        if (this.particles) {
          const worldTarget = {
            x: this.boardContainer.x + localTarget.x,
            y: this.boardContainer.y + localTarget.y,
          };
          this.particles.emitExplosion(worldTarget, {
            color: 0xc4f1ff,
            radius: this.cellSize * 0.7,
            count: 20,
            duration: 260,
          });
        }
      };

      if (timer) {
        timer.delayedCall(impactDelay, runImpact);
      } else {
        setTimeout(runImpact, impactDelay);
      }

      applyDelay(targetIndex, delay + beamDuration + 40);
    });

    applyDelay(sourceIndex, targetIndices.length * baseDelay + beamDuration + 60);

    if (this.particles) {
      const triggerSourceExplosion = () => {
        this.particles.emitExplosion(worldSource, {
          color: 0xffffff,
          radius: this.cellSize * 1.3,
          count: 36,
          duration: 320,
        });
      };
      if (timer) {
        timer.delayedCall(0, triggerSourceExplosion);
      } else {
        triggerSourceExplosion();
      }
    }

    return indices;
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

    const cols = this.boardLayout.dimensions.cols;
    const rows = this.boardLayout.dimensions.rows;
    const { cellSize } = this;

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const index = row * cols + col;
        const isBlocked = this.boardLayout.blockedCells.some(
          (blocked) => blocked.x === col && blocked.y === row,
        );

        if (isBlocked) {
          // No highlight for blocked cells, potentially add a visual indicator later
          continue;
        }

        const rect = this.scene.add.rectangle(
          col * cellSize + cellSize / 2,
          row * cellSize + cellSize / 2,
          cellSize,
          cellSize,
          0x000000,
          0,
        );
        rect.setStrokeStyle(0, 0x000000, 0);
        rect.setOrigin(0.5);
        rect.__highlighted = false;
        this.backgroundLayer.add(rect);
        this.cellHighlights.set(index, rect);
        this._updateCellLayer(index, this.tiles?.[index]);
      }
    }
  }

  _updateBackgroundSizing() {
    if (!this.backgroundLayer) return;
    const cols = this.boardLayout.dimensions.cols;
    const { cellSize } = this;
    this.cellHighlights.forEach((rect, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      rect.setPosition(col * cellSize + cellSize / 2, row * cellSize + cellSize / 2);
      rect.setSize(cellSize, cellSize);
      rect.setStrokeStyle(0, 0x000000, 0);
      this._updateCellLayer(index, this.tiles?.[index]);
    });
  }

  _indexToPosition(index) {
    const col = index % this.boardLayout.dimensions.cols;
    const row = Math.floor(index / this.boardLayout.dimensions.cols);
    return {
      x: col * this.cellSize + this.cellSize / 2,
      y: row * this.cellSize + this.cellSize / 2,
    };
  }

  _applyTileLayers() {
    const totalCells = this.boardSize * this.boardRows;
    const hasTiles = Array.isArray(this.tiles) && this.tiles.length;
    const trackTiles = !!this.tileLayer;
    const seen = trackTiles ? new Set() : null;

    for (let index = 0; index < totalCells; index += 1) {
      const tile = hasTiles ? this.tiles[index] : null;
      this._updateCellLayer(index, tile);
      if (trackTiles) {
        this._updateTileSprite(index, tile);
        seen.add(index);
      }
    }

    if (trackTiles && seen) {
      Array.from(this.tileSprites.entries()).forEach(([index, sprite]) => {
        if (!seen.has(index)) {
          sprite.destroy();
          this.tileSprites.delete(index);
        }
      });
    }
  }

  _applyTileLayerUpdates(updates) {
    if (!updates) {
      return;
    }
    updates.forEach(({ index, health, maxHealth }) => {
      if (typeof index !== 'number') {
        return;
      }
      const currentTile = this.tiles?.[index];
      let tileReference = currentTile;
      if (tileReference) {
        tileReference.health = health;
        tileReference.cleared = health <= 0;
        if (maxHealth != null) {
          tileReference.maxHealth = maxHealth;
        }
      } else if (Array.isArray(this.tiles)) {
        tileReference = { health, maxHealth };
        this.tiles[index] = tileReference;
      }
      this._updateCellLayer(index, tileReference);
      this._updateTileSprite(index, tileReference);
    });
  }

  _updateCellLayer(index, tile) {
    const rect = this.cellHighlights.get(index);
    if (!rect || rect.__highlighted) {
      return;
    }

    if (tile && tile.state === 'FROZEN') {
      rect.setFillStyle(0xADD8E6, 0.4); // Light blue
      rect.setStrokeStyle(3, 0x00BFFF, 0.8); // Deep sky blue border
    } else {
      const { color, alpha, stroke, strokeAlpha, strokeWidth } = this._resolveLayerStyle(tile);
      rect.setFillStyle(color, alpha);
      const width = strokeWidth ?? (strokeAlpha > 0 ? 1 : 0);
      rect.setStrokeStyle(width, stroke ?? 0x000000, strokeAlpha ?? 0);
    }
  }

  _updateTileSprite(index, tile) {
    if (!this.tileLayer || !this.scene) {
      return;
    }

    let sprite = this.tileSprites.get(index);
    const textureInfo = this._resolveTileTexture(tile);

    if (!textureInfo) {
      if (sprite) {
        sprite.setVisible(false);
      }
      return;
    }

    if (!sprite) {
      sprite = this.scene.add.image(0, 0, textureInfo.key);
      sprite.setOrigin(0.5);
      this.tileLayer.add(sprite);
      this.tileSprites.set(index, sprite);
    } else if (sprite.texture?.key !== textureInfo.key) {
      sprite.setTexture(textureInfo.key);
    }

    const { x, y } = this._indexToPosition(index);
    sprite.setPosition(x, y);
    this._applyTileDimensions(sprite);
    sprite.setAlpha(TILE_OVERLAY_ALPHA);
    sprite.setVisible(true);
  }

  _resolveLayerStyle(tile) {
    return {
      color: 0x000000,
      alpha: 0,
      stroke: 0x000000,
      strokeAlpha: 0,
      strokeWidth: 0,
    };
  }

  _resolveTileTexture(tile) {
    if (!tile || tile.health == null || tile.health <= 0) {
      return null;
    }
    const layers = this.tileTextures?.layers || {};
    const layerEntries = Object.entries(layers)
      .map(([key, value]) => ({ key: Number(key), texture: value }))
      .filter((entry) => !Number.isNaN(entry.key))
      .sort((a, b) => a.key - b.key);

    if (!layerEntries.length) {
      return null;
    }

    const maxHealth = Math.max(0, tile.maxHealth ?? tile.health ?? 0);
    const health = Math.max(0, Math.min(tile.health, maxHealth));
    if (health <= 0 || maxHealth <= 0) {
      return null;
    }

    const directMatch = layerEntries.find((entry) => entry.key === health);
    if (directMatch) {
      return directMatch.texture;
    }

    const maxLayerValue = layerEntries[layerEntries.length - 1].key;
    const ratio = maxHealth > 0 ? Math.min(1, Math.max(0, health / maxHealth)) : 0;
    const scaledTarget = Math.max(1, Math.round(ratio * maxLayerValue));

    let closest = layerEntries[0];
    let smallestDelta = Math.abs(closest.key - scaledTarget);
    for (let i = 1; i < layerEntries.length; i += 1) {
      const candidate = layerEntries[i];
      const delta = Math.abs(candidate.key - scaledTarget);
      if (delta < smallestDelta) {
        closest = candidate;
        smallestDelta = delta;
      }
    }

    return closest.texture;
  }

  _applyTileDimensions(sprite) {
    if (!this.cellSize || !sprite) {
      return;
    }
    const targetSize = this.cellSize * 0.92;
    sprite.setDisplaySize(targetSize, targetSize);
  }

  _lerpColor(from, to, t) {
    const clampT = Math.min(1, Math.max(0, t));
    const fr = (from >> 16) & 0xff;
    const fg = (from >> 8) & 0xff;
    const fb = from & 0xff;
    const tr = (to >> 16) & 0xff;
    const tg = (to >> 8) & 0xff;
    const tb = to & 0xff;
    const r = Math.round(fr + (tr - fr) * clampT);
    const g = Math.round(fg + (tg - fg) * clampT);
    const b = Math.round(fb + (tb - fb) * clampT);
    return (r << 16) | (g << 8) | b;
  }
}
