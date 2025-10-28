import { Container, Graphics, Sprite } from 'pixi.js';

const easeOutQuad = (t) => 1 - (1 - t) * (1 - t);
const easeInOutQuad = (t) =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const easeOutBack = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

const DEFAULTS = {
  swapDuration: 0.18,
  collapseDuration: 0.22,
  spawnDuration: 0.28,
  fadeDuration: 0.16,
};

export class BoardAnimator {
  constructor({ app, boardContainer, textures, particles }) {
    this.app = app;
    this.boardContainer = boardContainer;
    this.textures = textures;
    this.particles = particles;

    this.boardSize = 0;
    this.cellSize = 0;

    this.backgroundLayer = new Container();
    this.gemLayer = new Container();
    this.fxLayer = new Container();

    this.backgroundLayer.zIndex = 0;
    this.gemLayer.zIndex = 1;
    this.fxLayer.zIndex = 2;

    this.boardContainer.removeChildren().forEach((child) => child.destroy());
    this.boardContainer.addChild(this.backgroundLayer);
    this.boardContainer.addChild(this.gemLayer);
    this.boardContainer.addChild(this.fxLayer);
    this.boardContainer.sortableChildren = true;

    this.indexToGemId = [];
    this.gemSprites = new Map();
    this.animations = new Set();
    this.cellHighlights = new Map();

    this._update = this._update.bind(this);
    this.app.ticker.add(this._update);
  }

  destroy() {
    this.app.ticker.remove(this._update);
    this.clear();
  }

  clear() {
    this._cancelAnimations();
    this.indexToGemId = [];
    this.gemSprites.forEach((sprite) => sprite.destroy());
    this.gemSprites.clear();
    this.backgroundLayer.removeChildren().forEach((child) => child.destroy());
    this.gemLayer.removeChildren().forEach((child) => child.destroy());
    this.fxLayer.removeChildren().forEach((child) => child.destroy());
  }

  setLayout({ boardSize, cellSize }) {
    const sizeChanged = boardSize !== this.boardSize;
    const cellChanged = Math.abs(cellSize - this.cellSize) > 0.001;

    this.boardSize = boardSize;
    this.cellSize = cellSize;

    if (sizeChanged || this.backgroundLayer.children.length === 0) {
      this._rebuildBackgrounds();
    } else if (cellChanged) {
      this._updateBackgroundSizing();
    }

    if (cellChanged || sizeChanged) {
      this.gemSprites.forEach((sprite, gemId) => {
        this._applyGemDimensions(sprite);
        const index = this.indexToGemId.indexOf(gemId);
        if (index >= 0) {
          const { x, y } = this._indexToPosition(index);
          sprite.position.set(x, y);
        }
      });
    }
  }

  reset(board, { boardSize = this.boardSize, cellSize = this.cellSize } = {}) {
    this.boardSize = boardSize;
    this.cellSize = cellSize;
    this._cancelAnimations();
    this.backgroundLayer.removeChildren().forEach((child) => child.destroy());
    this._rebuildBackgrounds();
    this.gemSprites.forEach((sprite) => sprite.destroy());
    this.gemSprites.clear();
    this.indexToGemId = new Array(board.length).fill(null);

    board.forEach((gem, index) => {
      if (!gem) return;
      const sprite = this._createGemSprite(gem);
      const { x, y } = this._indexToPosition(index);
      sprite.position.set(x, y);
      this.gemLayer.addChild(sprite);
      this.gemSprites.set(gem.id, sprite);
      this.indexToGemId[index] = gem.id;
    });
  }

  syncToBoard(board) {
    // Ensure every gem has an associated sprite and stale sprites are removed.
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
        this.gemLayer.addChild(sprite);
        this.gemSprites.set(gemId, sprite);
      }

      const { x, y } = this._indexToPosition(index);
      sprite.position.set(x, y);
      this._applyHighlight(sprite, gem);
      this.indexToGemId[index] = gemId;
      seen.add(gemId);
    });

    // Remove sprites that are no longer present.
    Array.from(this.gemSprites.entries()).forEach(([gemId, sprite]) => {
      if (!seen.has(gemId)) {
        this.gemSprites.delete(gemId);
        sprite.destroy();
      }
    });
  }

  async animateSwap({ aIndex, bIndex }) {
    if (aIndex == null || bIndex == null) {
      return;
    }

    const gemA = this.indexToGemId[aIndex];
    const gemB = this.indexToGemId[bIndex];
    if (!gemA || !gemB) {
      return;
    }

    const spriteA = this.gemSprites.get(gemA);
    const spriteB = this.gemSprites.get(gemB);
    if (!spriteA || !spriteB) {
      return;
    }

    const posA = this._indexToPosition(aIndex);
    const posB = this._indexToPosition(bIndex);

    const [moveA, moveB] = [
      this._animateMove(spriteA, posB.x, posB.y, DEFAULTS.swapDuration),
      this._animateMove(spriteB, posA.x, posA.y, DEFAULTS.swapDuration),
    ];

    this._swapIndexMapping(aIndex, bIndex);
    await Promise.all([moveA, moveB]);
  }

  async animateInvalidSwap({ aIndex, bIndex }) {
    if (aIndex == null || bIndex == null) {
      return;
    }

    const gemA = this.indexToGemId[aIndex];
    const gemB = this.indexToGemId[bIndex];
    if (!gemA || !gemB) {
      return;
    }

    const spriteA = this.gemSprites.get(gemA);
    const spriteB = this.gemSprites.get(gemB);
    if (!spriteA || !spriteB) {
      return;
    }

    const posA = this._indexToPosition(aIndex);
    const posB = this._indexToPosition(bIndex);

    await Promise.all([
      this._animateShake(spriteA, posB.x, posB.y),
      this._animateShake(spriteB, posA.x, posA.y),
    ]);
  }

  async playSteps(steps) {
    for (const step of steps) {
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
  }

  _swapIndexMapping(aIndex, bIndex) {
    const temp = this.indexToGemId[aIndex];
    this.indexToGemId[aIndex] = this.indexToGemId[bIndex];
    this.indexToGemId[bIndex] = temp;
  }

  _animateClear(step) {
    const animations = step.cleared.map((index) => {
      const gemId = this.indexToGemId[index];
      if (!gemId) {
        return Promise.resolve();
      }
      const sprite = this.gemSprites.get(gemId);
      if (!sprite) {
        return Promise.resolve();
      }

      this.indexToGemId[index] = null;
      this.gemSprites.delete(gemId);

      const promise = this._animateFadeOut(sprite);
      promise.then(() => sprite.destroy());

      if (this.particles) {
        const local = this._indexToPosition(index);
        const position = {
          x: this.boardContainer.x + local.x,
          y: this.boardContainer.y + local.y,
        };
        this.particles.emitBurst(position);
      }

      return promise;
    });

    return Promise.all(animations);
  }

  _animateBonus({ index, gem, type }) {
    const previousGemId = this.indexToGemId[index];
    let sprite = previousGemId ? this.gemSprites.get(previousGemId) : null;

    if (!sprite) {
      sprite = this._createGemSprite(gem);
      const { x, y } = this._indexToPosition(index);
      sprite.position.set(x, y);
      this.gemLayer.addChild(sprite);
    } else if (previousGemId !== gem.id) {
      this.gemSprites.delete(previousGemId);
    }

    this.gemSprites.set(gem.id, sprite);
    this.indexToGemId[index] = gem.id;
    this._setTexture(sprite, type);
    this._applyHighlight(sprite, gem);

    const baseScale = sprite.__baseScale || sprite.scale.x;
    sprite.scale.set(baseScale * 0.6);
    sprite.alpha = 0;

    return this._createAnimation({
      duration: 0.32,
      easing: easeOutBack,
      onTick: (t) => {
        sprite.alpha = t;
        const factor = 0.6 + 0.4 * t;
        sprite.scale.set(baseScale * factor);
      },
      onComplete: () => {
        sprite.scale.set(baseScale);
        sprite.alpha = 1;
      },
    });
  }

  _animateDrops(drops) {
    const animations = drops.map(({ from, to, gem }) => {
      const sprite = this.gemSprites.get(gem.id);
      if (!sprite) {
        return Promise.resolve();
      }

      const target = this._indexToPosition(to);
      this.indexToGemId[to] = gem.id;
      if (this.indexToGemId[from] === gem.id) {
        this.indexToGemId[from] = null;
      }

      return this._animateMove(sprite, target.x, target.y, DEFAULTS.collapseDuration);
    });

    if (!animations.length) {
      return Promise.resolve();
    }

    return Promise.all(animations);
  }

  _animateSpawns(spawns) {
    const animations = spawns.map(({ index, gem }) => {
      const sprite = this._createGemSprite(gem);
      const target = this._indexToPosition(index);

      sprite.position.set(target.x, target.y - this.cellSize);
      sprite.alpha = 0;
      sprite.scale.set((sprite.__baseScale || sprite.scale.x) * 1.2);

      this.gemLayer.addChild(sprite);
      this.gemSprites.set(gem.id, sprite);
      this.indexToGemId[index] = gem.id;

      return this._createAnimation({
        duration: DEFAULTS.spawnDuration,
        easing: easeOutBack,
        onTick: (t) => {
          sprite.alpha = t;
          sprite.y = target.y - this.cellSize * (1 - t);
          const factor = 1.2 - 0.2 * t;
          const base = sprite.__baseScale || sprite.scale.x;
          sprite.scale.set(base * factor);
        },
        onComplete: () => {
          const base = sprite.__baseScale || sprite.scale.x;
          sprite.position.set(target.x, target.y);
          sprite.scale.set(base);
          sprite.alpha = 1;
        },
      });
    });

    if (!animations.length) {
      return Promise.resolve();
    }

    return Promise.all(animations);
  }

  _animateMove(sprite, x, y, duration) {
    const startX = sprite.x;
    const startY = sprite.y;
    const deltaX = x - startX;
    const deltaY = y - startY;

    if (Math.abs(deltaX) < 0.001 && Math.abs(deltaY) < 0.001) {
      return Promise.resolve();
    }

    return this._createAnimation({
      duration,
      easing: easeInOutQuad,
      onTick: (t) => {
        sprite.x = startX + deltaX * t;
        sprite.y = startY + deltaY * t;
      },
    });
  }

  _animateFadeOut(sprite) {
    const baseScale = sprite.__baseScale || sprite.scale.x;
    const startAlpha = sprite.alpha;
    return this._createAnimation({
      duration: DEFAULTS.fadeDuration,
      easing: easeInOutQuad,
      onTick: (t) => {
        sprite.alpha = startAlpha * (1 - t);
        sprite.scale.set(baseScale * (1 + 0.3 * t));
      },
    });
  }

  _animateShake(sprite, x, y) {
    const startX = sprite.x;
    const startY = sprite.y;
    const targetX = x;
    const targetY = y;
    const offsetX = targetX - startX;
    const offsetY = targetY - startY;

    return this._createAnimation({
      duration: DEFAULTS.swapDuration * 2,
      easing: easeInOutQuad,
      onTick: (t) => {
        const forward = t <= 0.5 ? t * 2 : (1 - t) * 2;
        sprite.x = startX + offsetX * forward;
        sprite.y = startY + offsetY * forward;
      },
      onComplete: () => {
        sprite.x = startX;
        sprite.y = startY;
      },
    });
  }

  _cancelAnimations() {
    if (!this.animations.size) {
      return;
    }

    Array.from(this.animations).forEach((animation) => {
      this.animations.delete(animation);
      animation.onComplete();
    });
  }

  _createAnimation({ duration, easing, onTick, onComplete }) {
    return new Promise((resolve) => {
      const animation = {
        elapsed: 0,
        duration: Math.max(0.0001, duration),
        easing: easing || ((value) => value),
        onTick,
        onComplete: () => {
          if (onComplete) {
            onComplete();
          }
          resolve();
        },
      };

      this.animations.add(animation);
    });
  }

  _update(delta) {
    if (!this.animations.size) {
      return;
    }
    const deltaSeconds = delta / 60;

    Array.from(this.animations).forEach((animation) => {
      animation.elapsed += deltaSeconds;
      const progress = Math.min(animation.elapsed / animation.duration, 1);
      const eased = animation.easing(progress);
      if (animation.onTick) {
        animation.onTick(eased);
      }
      if (progress >= 1) {
        this.animations.delete(animation);
        animation.onComplete();
      }
    });
  }

  _createGemSprite(gem) {
    const texture = this.textures[gem.type];
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5);
    this._applyGemDimensions(sprite);
    this._applyHighlight(sprite, gem);
    return sprite;
  }

  _setTexture(sprite, type) {
    const texture = this.textures[type];
    if (texture) {
      sprite.texture = texture;
    }
  }

  _applyGemDimensions(sprite) {
    const size = this.cellSize * 0.85;
    sprite.width = size;
    sprite.height = size;
    sprite.__baseScale = sprite.scale.x;
  }

  _applyHighlight(sprite, gem) {
    if (gem.highlight) {
      sprite.tint = 0xffff00; // Bright yellow for selected gem
      // Add a subtle scale effect
      const baseScale = sprite.__baseScale || sprite.scale.x;
      sprite.scale.set(baseScale * 1.15);
    } else {
      sprite.tint = 0xffffff;
      const baseScale = sprite.__baseScale || sprite.scale.x;
      sprite.scale.set(baseScale);
    }
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

  _rebuildBackgrounds() {
    this.backgroundLayer.removeChildren().forEach((child) => child.destroy());
    this.cellHighlights.clear();
    const size = this.boardSize;
    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        const index = row * size + col;
        const cell = new Graphics();
        cell.rect(col * this.cellSize, row * this.cellSize, this.cellSize, this.cellSize);
        cell.stroke({ width: 2, color: 0x87ceeb, alpha: 0.35 });
        cell.fill({ color: 0x1e293b, alpha: 0.28 });
        this.backgroundLayer.addChild(cell);
        this.cellHighlights.set(index, cell);
      }
    }
  }

  _updateBackgroundSizing() {
    const { children } = this.backgroundLayer;
    this.cellHighlights.clear();
    children.forEach((cell, index) => {
      const row = Math.floor(index / this.boardSize);
      const col = index % this.boardSize;
      cell.clear();
      cell.rect(col * this.cellSize, row * this.cellSize, this.cellSize, this.cellSize);
      cell.stroke({ width: 2, color: 0x87ceeb, alpha: 0.35 });
      cell.fill({ color: 0x1e293b, alpha: 0.28 });
      this.cellHighlights.set(index, cell);
    });
  }

  highlightCell(index, highlight = true) {
    const cell = this.cellHighlights.get(index);
    if (!cell) return;

    const row = Math.floor(index / this.boardSize);
    const col = index % this.boardSize;
    
    cell.clear();
    cell.rect(col * this.cellSize, row * this.cellSize, this.cellSize, this.cellSize);
    
    if (highlight) {
      cell.stroke({ width: 3, color: 0xffff00, alpha: 0.8 });
      cell.fill({ color: 0xffff00, alpha: 0.15 });
    } else {
      cell.stroke({ width: 2, color: 0x87ceeb, alpha: 0.35 });
      cell.fill({ color: 0x1e293b, alpha: 0.28 });
    }
  }

  clearCellHighlights() {
    for (let i = 0; i < this.boardSize * this.boardSize; i++) {
      this.highlightCell(i, false);
    }
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
