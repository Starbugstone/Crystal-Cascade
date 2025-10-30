import { Container, Graphics, Sprite, AnimatedSprite } from 'pixi.js';

// Simple easing function for smooth falling
const easeOutQuad = (t) => 1 - (1 - t) * (1 - t);

const FALL_DURATION = 0.4; // 400ms for falling animations (increased for visibility)

export class BoardAnimator {
  constructor({ app, boardContainer, textures, bonusAnimations, particles }) {
    this.app = app;
    this.boardContainer = boardContainer;
    this.textures = textures;
    this.bonusAnimations = bonusAnimations || {};
    this.particles = particles;

    this.boardSize = 0;
    this.cellSize = 0;

    this.backgroundLayer = new Container();
    this.gemLayer = new Container();
    this.fxLayer = new Container();

    this.backgroundLayer.zIndex = 0;
    this.gemLayer.zIndex = 1;
    this.fxLayer.zIndex = 2;

    // Ensure layers don't intercept pointer events
    this.backgroundLayer.eventMode = 'none';
    this.gemLayer.eventMode = 'none';
    this.fxLayer.eventMode = 'none';

    this.boardContainer.removeChildren().forEach((child) => child.destroy());
    this.boardContainer.addChild(this.backgroundLayer);
    this.boardContainer.addChild(this.gemLayer);
    this.boardContainer.addChild(this.fxLayer);
    this.boardContainer.sortableChildren = true;

    this.indexToGemId = [];
    this.gemSprites = new Map();
    this.cellHighlights = new Map();
    this.animations = new Set();

    // Bind and add ticker for animations
    this._update = this._update.bind(this);
    this.app.ticker.add(this._update);
  }

  destroy() {
    this.app.ticker.remove(this._update);
    this.clear();
  }

  clear() {
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

  forceCompleteRedraw() {
    console.log('🔄 FORCE REDRAW');
    
    this.animations.clear();
    const currentBoard = window.__currentBoard;
    if (!currentBoard) {
      console.error('❌ No board state available');
      return;
    }
    
    this.gemSprites.forEach((sprite) => sprite.destroy());
    this.gemSprites.clear();
    this.gemLayer.removeChildren();
    this.indexToGemId = new Array(currentBoard.length).fill(null);
    
    currentBoard.forEach((gem, index) => {
      if (!gem) return;
      const sprite = this._createGemSprite(gem);
      const { x, y } = this._indexToPosition(index);
      sprite.position.set(x, y);
      sprite.alpha = 1;
      sprite.visible = true;
      this.gemLayer.addChild(sprite);
      this.gemSprites.set(gem.id, sprite);
      this.indexToGemId[index] = gem.id;
    });
    
    console.log(`✅ Redrawn ${this.gemSprites.size} sprites`);
    if (this.app && this.app.render) {
      this.app.render();
    }
  }

  syncToBoard(board) {
    // Ensure every gem has an associated sprite and stale sprites are removed.
    const seen = new Set();
    let newSpritesCreated = 0;
    let spritesRemoved = 0;
    
    board.forEach((gem, index) => {
      const gemId = gem?.id ?? null;
      if (!gemId) {
        this._removeSpriteAtIndex(index);
        return;
      }

      let sprite = this.gemSprites.get(gemId);
      const isNewSprite = !sprite;
      
      if (isNewSprite) {
        newSpritesCreated++;
        console.log(`  🆕 Creating sprite for ${gem.type} (${gemId}) at [${index}]`);
        sprite = this._createGemSprite(gem);
        this.gemLayer.addChild(sprite);
        this.gemSprites.set(gemId, sprite);
        const { x, y } = this._indexToPosition(index);
        sprite.position.set(x, y);
      }

      // Only apply highlight, don't reposition (animations handle positioning)
      // Only update tint, don't recalculate scale
      sprite.tint = gem.highlight ? 0xffff00 : 0xffffff;
      
      this.indexToGemId[index] = gemId;
      seen.add(gemId);
    });

    // Remove sprites that are no longer present.
    Array.from(this.gemSprites.entries()).forEach(([gemId, sprite]) => {
      if (!seen.has(gemId)) {
        spritesRemoved++;
        console.log(`  🗑️ Removing orphaned sprite (${gemId})`);
        this.gemSprites.delete(gemId);
        sprite.destroy();
      }
    });
    
    if (newSpritesCreated > 0 || spritesRemoved > 0) {
      console.log(`  syncToBoard summary: ${newSpritesCreated} created, ${spritesRemoved} removed`);
    }
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

    // Instant swap
    spriteA.position.set(posB.x, posB.y);
    spriteB.position.set(posA.x, posA.y);
    this._swapIndexMapping(aIndex, bIndex);
  }

  async animateInvalidSwap({ aIndex, bIndex }) {
    return Promise.resolve();
  }

  async playSteps(steps) {
    console.log(`▶️ Playing ${steps.length} steps`);
    
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      
      if (step.cleared.length) {
        await this._animateClear(step);
      }

      if (step.bonus) {
        await this._animateBonus(step.bonus);
      }

      if (step.drops.length) {
        console.log(`📦 DROP ANIM: ${step.drops.length} gems`);
        await this._animateDrops(step.drops);
        console.log(`✅ DROP COMPLETE`);
      }

      if (step.spawns.length) {
        console.log(`✨ SPAWN: ${step.spawns.length} gems (instant)`);
        await this._animateSpawns(step.spawns);
      }
    }
    
    console.log('✅ ALL STEPS COMPLETE');
    
    // Check for sprites at (0,0) - the "big sprite in corner" bug
    let spritesAtZero = 0;
    this.gemSprites.forEach((sprite, gemId) => {
      if (sprite.x === 0 || sprite.y === 0) {
        spritesAtZero++;
        const expectedIndex = this.indexToGemId.indexOf(gemId);
        const expectedPos = this._indexToPosition(expectedIndex);
        console.error(`❌ Sprite ${gemId} at (${sprite.x}, ${sprite.y})! Should be at (${expectedPos.x}, ${expectedPos.y})`);
      }
    });
    
    if (spritesAtZero > 0) {
      console.error(`❌❌❌ FOUND ${spritesAtZero} SPRITES AT (0,0) - THIS IS THE BUG!`);
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
      if (!gemId) return Promise.resolve();
      
      const sprite = this.gemSprites.get(gemId);
      if (!sprite) return Promise.resolve();

      this.indexToGemId[index] = null;
      this.gemSprites.delete(gemId);
      
      // Remove sprite immediately
      if (sprite.parent) {
        sprite.parent.removeChild(sprite);
      }
      sprite.destroy();
      const promise = Promise.resolve();

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
    console.log(`    🌟 Creating bonus ${type} at [${index}] for gem ${gem.id}`);
    
    const previousGemId = this.indexToGemId[index];
    let sprite = previousGemId ? this.gemSprites.get(previousGemId) : null;

    // If there's an old sprite at this position, remove it
    if (sprite && previousGemId !== gem.id) {
      console.log(`    ⚠️ Removing old sprite ${previousGemId} to make room for bonus`);
      if (sprite.parent) {
        sprite.parent.removeChild(sprite);
      }
      sprite.destroy();
      this.gemSprites.delete(previousGemId);
      sprite = null;
    }

    // Create new sprite for the bonus
    if (!sprite) {
      sprite = this._createGemSprite(gem);
      const { x, y } = this._indexToPosition(index);
      sprite.position.set(x, y);
      this.gemLayer.addChild(sprite);
    }

    this.gemSprites.set(gem.id, sprite);
    this.indexToGemId[index] = gem.id;
    this._setTexture(sprite, type);
    this._applyHighlight(sprite, gem);

    // Display bonus immediately
    sprite.alpha = 1;
    sprite.visible = true;
    
    console.log(`    ✅ Bonus created at (${sprite.x}, ${sprite.y})`);
    
    return Promise.resolve();
  }

  _animateDrops(drops) {
    const animations = drops.map(({ from, to, gem }) => {
      const sprite = this.gemSprites.get(gem.id);
      if (!sprite) {
        console.error(`❌ DROP: Missing sprite for ${gem.id}`);
        return Promise.resolve();
      }

      const startPos = { x: sprite.x, y: sprite.y };
      const target = this._indexToPosition(to);
      
      // Clean up any orphaned sprite at target
      const oldIdAtTarget = this.indexToGemId[to];
      if (oldIdAtTarget && oldIdAtTarget !== gem.id) {
        const oldSprite = this.gemSprites.get(oldIdAtTarget);
        if (oldSprite) {
          if (oldSprite.parent) oldSprite.parent.removeChild(oldSprite);
          oldSprite.destroy();
          this.gemSprites.delete(oldIdAtTarget);
        }
      }
      
      // Update index mapping
      this.indexToGemId[to] = gem.id;
      if (this.indexToGemId[from] === gem.id) {
        this.indexToGemId[from] = null;
      }

      const startY = sprite.y;
      const targetY = target.y;
      const targetX = target.x;
      
      console.log(`  📦 Animating drop: ${gem.id} [${from}→${to}] (${startY.toFixed(0)}→${targetY.toFixed(0)})`);
      
      // Animate the drop
      return this._createAnimation({
        duration: FALL_DURATION,
        easing: easeOutQuad,
        onTick: (t) => {
          const newY = startY + (targetY - startY) * t;
          sprite.position.set(targetX, newY);
        },
        onComplete: () => {
          sprite.position.set(targetX, targetY);
          // Check if sprite ended up at correct position
          if (sprite.x !== targetX || sprite.y !== targetY) {
            console.error(`❌ DROP MISMATCH: ${gem.id} ended at (${sprite.x}, ${sprite.y}) instead of (${targetX}, ${targetY})`);
          }
        },
      });
    });

    if (!animations.length) {
      return Promise.resolve();
    }

    return Promise.all(animations);
  }

  _animateSpawns(spawns) {
    const animations = spawns.map(({ index, gem }) => {
      // Check for orphaned sprite with this gem.id
      const existingSprite = this.gemSprites.get(gem.id);
      if (existingSprite) {
        if (existingSprite.parent) existingSprite.parent.removeChild(existingSprite);
        existingSprite.destroy();
        this.gemSprites.delete(gem.id);
      }
      
      const sprite = this._createGemSprite(gem);
      const target = this._indexToPosition(index);

      // INSTANT MODE: Position immediately at final location
      sprite.position.set(target.x, target.y);
      sprite.alpha = 1;
      sprite.visible = true;
      
      // Track in maps
      this.gemSprites.set(gem.id, sprite);
      this.indexToGemId[index] = gem.id;
      
      // Add to layer
      this.gemLayer.addChild(sprite);
      
      // Check if sprite is actually at correct position
      if (sprite.x !== target.x || sprite.y !== target.y) {
        console.error(`❌ SPAWN MISMATCH: ${gem.id} at (${sprite.x}, ${sprite.y}) instead of (${target.x}, ${target.y})`);
      }
      
      return Promise.resolve();
    });

    if (!animations.length) {
      return Promise.resolve();
    }

    return Promise.all(animations);
  }

  _createAnimation({ duration, easing, onTick, onComplete }) {
    return new Promise((resolve) => {
      const animation = {
        elapsed: 0,
        duration: Math.max(0.001, duration),
        easing: easing || ((t) => t),
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

  _update(ticker) {
    if (this.animations.size === 0) return;

    // Convert deltaMS to seconds
    const deltaSeconds = ticker.deltaMS / 1000;

    // Process all active animations
    Array.from(this.animations).forEach((animation) => {
      animation.elapsed += deltaSeconds;
      const progress = Math.min(animation.elapsed / animation.duration, 1);
      const eased = animation.easing(progress);
      
      if (animation.onTick) {
        animation.onTick(eased);
      }
      
      if (progress >= 1) {
        this.animations.delete(animation);
        // Ensure we're at EXACTLY the final state
        if (animation.onTick) {
          animation.onTick(1.0);
        }
        animation.onComplete();
      }
    });
  }

  _createGemSprite(gem) {
    const bonusTypes = ['bomb', 'rainbow', 'cross'];
    let sprite;
    
    // Create animated sprite for bonus types
    if (bonusTypes.includes(gem.type) && this.bonusAnimations[gem.type]) {
      sprite = new AnimatedSprite(this.bonusAnimations[gem.type]);
      sprite.animationSpeed = 0.1;
      sprite.loop = true;
      sprite.play();
    } else {
      // Create static sprite for regular gems
      const texture = this.textures[gem.type];
      sprite = new Sprite(texture);
    }
    
    sprite.anchor.set(0.5);
    sprite.__gemType = gem.type; // Store for logging
    this._applyGemDimensions(sprite);
    this._applyHighlight(sprite, gem);
    return sprite;
  }

  _setTexture(sprite, type) {
    const bonusTypes = ['bomb', 'rainbow', 'cross'];
    
    // If it's a bonus type and we have animations for it
    if (bonusTypes.includes(type) && this.bonusAnimations[type]) {
      // If the sprite is already an AnimatedSprite, update its textures
      if (sprite instanceof AnimatedSprite) {
        sprite.textures = this.bonusAnimations[type];
        sprite.animationSpeed = 0.1;
        sprite.loop = true;
        sprite.play();
      }
      // Otherwise, we'd need to replace the sprite (handled by caller)
    } else {
      // Set static texture for regular gems
      const texture = this.textures[type];
      if (texture && sprite.texture) {
        sprite.texture = texture;
      }
    }
  }

  _applyGemDimensions(sprite) {
    const targetSize = this.cellSize * 0.85;
    
    // For AnimatedSprite, we need to get texture dimensions from the first frame
    let textureWidth, textureHeight;
    let isAnimated = sprite instanceof AnimatedSprite;
    
    if (isAnimated && sprite.textures && sprite.textures.length > 0) {
      const firstFrame = sprite.textures[0];
      textureWidth = firstFrame.width;
      textureHeight = firstFrame.height;
      
      if (textureWidth === 0 || textureHeight === 0) {
        console.warn(`⚠️ AnimatedSprite has 0 dimensions! textures.length=${sprite.textures.length}, frame width=${textureWidth}, height=${textureHeight}`);
        // Try using the original size of the texture
        if (firstFrame.orig) {
          textureWidth = firstFrame.orig.width;
          textureHeight = firstFrame.orig.height;
          console.log(`  Using orig dimensions: ${textureWidth}x${textureHeight}`);
        }
      }
    } else if (sprite.texture) {
      textureWidth = sprite.texture.width;
      textureHeight = sprite.texture.height;
    } else {
      console.warn(`⚠️ Sprite has no texture!`);
      // Fallback: just set width/height
      sprite.width = targetSize;
      sprite.height = targetSize;
      return;
    }
    
    // Calculate the scale needed to reach target size
    if (textureWidth > 0 && textureHeight > 0) {
      const scale = targetSize / Math.max(textureWidth, textureHeight);
      sprite.scale.set(scale, scale);
    } else {
      console.warn(`⚠️ Invalid texture dimensions: ${textureWidth}x${textureHeight}, falling back to width/height`);
      // Fallback
      sprite.width = targetSize;
      sprite.height = targetSize;
    }
  }

  _applyHighlight(sprite, gem) {
    // Only set tint - scale is already set by _applyGemDimensions
    sprite.tint = gem.highlight ? 0xffff00 : 0xffffff;
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
