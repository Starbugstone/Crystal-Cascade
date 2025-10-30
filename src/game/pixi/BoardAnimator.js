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
    console.log(`🔄 RESET: boardSize=${boardSize}, cellSize=${cellSize}, board length=${board.length}`);
    this.boardSize = boardSize;
    this.cellSize = cellSize;
    this.backgroundLayer.removeChildren().forEach((child) => child.destroy());
    this._rebuildBackgrounds();
    
    const oldSpriteCount = this.gemSprites.size;
    const gemLayerChildrenBefore = this.gemLayer.children.length;
    console.log(`  gemLayer has ${gemLayerChildrenBefore} children BEFORE destroy`);
    
    this.gemSprites.forEach((sprite) => sprite.destroy());
    this.gemSprites.clear();
    this.indexToGemId = new Array(board.length).fill(null);
    
    const gemLayerChildrenAfter = this.gemLayer.children.length;
    console.log(`  Destroyed ${oldSpriteCount} sprites from gemSprites Map`);
    console.log(`  gemLayer has ${gemLayerChildrenAfter} children AFTER destroy (should be 0!)`);
    
    if (gemLayerChildrenAfter > 0) {
      console.error(`  ❌ PROBLEM: gemLayer still has ${gemLayerChildrenAfter} orphaned children!`);
      // Force clear the layer
      this.gemLayer.removeChildren().forEach(child => child.destroy());
      console.log(`  Forced removal of ${gemLayerChildrenAfter} orphaned sprites`);
    }

    board.forEach((gem, index) => {
      if (!gem) return;
      const sprite = this._createGemSprite(gem);
      const { x, y } = this._indexToPosition(index);
      sprite.position.set(x, y);
      this.gemLayer.addChild(sprite);
      this.gemSprites.set(gem.id, sprite);
      this.indexToGemId[index] = gem.id;
      
      // Log first 3 for sanity check
      if (index < 3) {
        console.log(`  [${index}] Created ${gem.type} (${gem.id}) at (${x}, ${y}), scale=(${sprite.scale.x.toFixed(3)}, ${sprite.scale.y.toFixed(3)}), size=(${sprite.width.toFixed(1)}, ${sprite.height.toFixed(1)})`);
      }
    });
    
    console.log(`  Created ${this.gemSprites.size} new sprites`);
    console.log(`  gemLayer now has ${this.gemLayer.children.length} children`);
  }

  forceCompleteRedraw() {
    console.log('🔄 FORCE COMPLETE REDRAW - Clearing all animations and syncing visual state');
    
    // Cancel any running animations
    this.animations.clear();
    
    // Get current board state from the game store
    const currentBoard = window.__currentBoard;
    if (!currentBoard) {
      console.error('❌ Cannot redraw - no board state available');
      return;
    }
    
    console.log(`  Board has ${currentBoard.length} cells`);
    console.log(`  gemSprites Map has ${this.gemSprites.size} entries`);
    console.log(`  gemLayer has ${this.gemLayer.children.length} children`);
    console.log(`  indexToGemId has ${this.indexToGemId.filter(id => id !== null).length} non-null entries`);
    
    // Destroy all existing sprites
    this.gemSprites.forEach((sprite) => sprite.destroy());
    this.gemSprites.clear();
    this.gemLayer.removeChildren();
    this.indexToGemId = new Array(currentBoard.length).fill(null);
    
    console.log('  Cleared all sprites, rebuilding from board state...');
    
    // Recreate all sprites from current board state
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
      
      if (index < 5) {
        console.log(`  [${index}] ${gem.type} (${gem.id}) at (${x}, ${y})`);
      }
    });
    
    console.log(`✅ Redraw complete: ${this.gemSprites.size} sprites created`);
    
    // Force a render
    if (this.app && this.app.render) {
      this.app.render();
    }
  }

  syncToBoard(board) {
    console.log('⚠️ syncToBoard called (this should only happen during initialization/resize, not after animations)');
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
    console.log(`🔄 animateSwap called: [${aIndex}] ↔ [${bIndex}]`);
    
    if (aIndex == null || bIndex == null) {
      console.warn('  ⚠️ Swap aborted: null indices');
      return;
    }

    const gemA = this.indexToGemId[aIndex];
    const gemB = this.indexToGemId[bIndex];
    if (!gemA || !gemB) {
      console.warn(`  ⚠️ Swap aborted: missing gems (gemA=${gemA}, gemB=${gemB})`);
      return;
    }

    const spriteA = this.gemSprites.get(gemA);
    const spriteB = this.gemSprites.get(gemB);
    if (!spriteA || !spriteB) {
      console.warn(`  ⚠️ Swap aborted: missing sprites (spriteA=${!!spriteA}, spriteB=${!!spriteB})`);
      return;
    }

    const posA = this._indexToPosition(aIndex);
    const posB = this._indexToPosition(bIndex);
    
    console.log(`  ${gemA} at (${spriteA.x}, ${spriteA.y}) → (${posB.x}, ${posB.y})`);
    console.log(`  ${gemB} at (${spriteB.x}, ${spriteB.y}) → (${posA.x}, ${posA.y})`);

    // Instant swap
    spriteA.position.set(posB.x, posB.y);
    spriteB.position.set(posA.x, posA.y);
    this._swapIndexMapping(aIndex, bIndex);
    
    console.log(`  ✅ Swap complete`);
  }

  async animateInvalidSwap({ aIndex, bIndex }) {
    console.log(`  ⚠️ Invalid swap attempted: [${aIndex}] ↔ [${bIndex}]`);
    return Promise.resolve();
  }

  async playSteps(steps) {
    console.log('▶️ Playing steps:', steps.length);
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      console.log(`  Step ${i + 1}:`, {
        cleared: step.cleared.length,
        drops: step.drops.length,
        spawns: step.spawns.length,
        bonus: step.bonus ? 'yes' : 'no'
      });
      
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
    
    console.log('✅ All steps complete');
    
    // DEBUG: Verify final state
    console.log('📊 Final animator state:');
    console.log(`  Total sprites: ${this.gemSprites.size}`);
    console.log(`  indexToGemId entries: ${this.indexToGemId.filter(id => id != null).length}`);
    
    // Check for mismatches
    let spritesWithoutIndex = 0;
    let indicesWithoutSprite = 0;
    
    this.gemSprites.forEach((sprite, gemId) => {
      const indexFound = this.indexToGemId.indexOf(gemId);
      if (indexFound === -1) {
        spritesWithoutIndex++;
        console.warn(`  ⚠️ Sprite ${gemId} has no index mapping!`);
      }
    });
    
    this.indexToGemId.forEach((gemId, index) => {
      if (gemId && !this.gemSprites.has(gemId)) {
        indicesWithoutSprite++;
        console.warn(`  ⚠️ Index ${index} maps to ${gemId} but sprite doesn't exist!`);
      }
    });
    
    if (spritesWithoutIndex === 0 && indicesWithoutSprite === 0) {
      console.log('  ✅ All sprites and indices consistent');
    }
    
    // DEBUG: Check if all sprites are actually in the gemLayer
    console.log('📊 Checking sprite visibility and layer membership:');
    let spritesInLayer = 0;
    let invisibleSprites = 0;
    let offscreenSprites = 0;
    
    this.gemSprites.forEach((sprite, gemId) => {
      if (this.gemLayer.children.includes(sprite)) {
        spritesInLayer++;
      } else {
        console.warn(`  ⚠️ Sprite ${gemId} is NOT in gemLayer! Parent: ${sprite.parent?.label || 'null'}`);
      }
      
      if (!sprite.visible || sprite.alpha === 0) {
        invisibleSprites++;
        console.warn(`  ⚠️ Sprite ${gemId} is invisible! visible=${sprite.visible}, alpha=${sprite.alpha}`);
      }
      
      // Check if sprite is way off screen (assuming board is ~608x608)
      if (Math.abs(sprite.x) > 1000 || Math.abs(sprite.y) > 1000) {
        offscreenSprites++;
        console.warn(`  ⚠️ Sprite ${gemId} is offscreen! pos=(${sprite.x}, ${sprite.y})`);
      }
    });
    
    console.log(`  Sprites in gemLayer: ${spritesInLayer}/${this.gemSprites.size}`);
    console.log(`  Invisible sprites: ${invisibleSprites}`);
    console.log(`  Offscreen sprites: ${offscreenSprites}`);
    console.log(`  gemLayer total children: ${this.gemLayer.children.length}`);
    
    if (this.gemLayer.children.length > this.gemSprites.size) {
      console.error(`  ❌ gemLayer has MORE children (${this.gemLayer.children.length}) than tracked sprites (${this.gemSprites.size})! Orphaned sprites detected!`);
    }
    
    // CRITICAL: Check for untracked sprites (ghosts)
    const trackedSpriteSet = new Set(this.gemSprites.values());
    const untrackedSprites = this.gemLayer.children.filter(child => !trackedSpriteSet.has(child));
    if (untrackedSprites.length > 0) {
      console.error(`  ❌❌❌ FOUND ${untrackedSprites.length} UNTRACKED (GHOST) SPRITES IN gemLayer!`);
      untrackedSprites.slice(0, 5).forEach((sprite, i) => {
        console.error(`    Ghost ${i}: pos=(${sprite.x.toFixed(0)}, ${sprite.y.toFixed(0)}), visible=${sprite.visible}, alpha=${sprite.alpha}, destroyed=${sprite.destroyed || false}`);
      });
    } else {
      console.log(`  ✅ No ghost sprites detected`);
    }
    
    // SUPER DETAILED: Log ALL children in gemLayer with their exact positions
    console.log(`🔍 DETAILED gemLayer inspection (${this.gemLayer.children.length} total children):`);
    const positionGroups = new Map();
    this.gemLayer.children.forEach((child, idx) => {
      const posKey = `${child.x.toFixed(0)},${child.y.toFixed(0)}`;
      if (!positionGroups.has(posKey)) {
        positionGroups.set(posKey, []);
      }
      // Find which gem ID this sprite belongs to
      let gemId = 'UNKNOWN';
      for (const [id, sprite] of this.gemSprites.entries()) {
        if (sprite === child) {
          gemId = id;
          break;
        }
      }
      positionGroups.get(posKey).push({ idx, gemId, sprite: child });
    });
    
    // Report any positions with multiple sprites
    let multiSpritePositions = 0;
    positionGroups.forEach((sprites, posKey) => {
      if (sprites.length > 1) {
        multiSpritePositions++;
        console.error(`  ❌ Position (${posKey}) has ${sprites.length} sprites:`);
        sprites.forEach(({ idx, gemId, sprite }) => {
          console.error(`    - Child[${idx}]: gemId=${gemId}, visible=${sprite.visible}, alpha=${sprite.alpha.toFixed(2)}`);
        });
      }
    });
    if (multiSpritePositions === 0) {
      console.log(`  ✅ No multi-sprite positions found in gemLayer children`);
    }
    
    // CHECK: Are there any gem sprites in the wrong layer?
    console.log(`🔍 Checking if sprites are in correct layers:`);
    let wrongLayerCount = 0;
    this.gemSprites.forEach((sprite, gemId) => {
      if (sprite.parent !== this.gemLayer) {
        wrongLayerCount++;
        console.error(`  ❌ Sprite ${gemId} is NOT in gemLayer! Parent: ${sprite.parent?.label || 'null'}`);
      }
    });
    if (wrongLayerCount === 0) {
      console.log(`  ✅ All tracked sprites are in correct layer`);
    }
    
    // CHECK: Are there unexpected children in background or fx layers?
    const expectedBgChildren = this.boardSize * this.boardSize;
    if (this.backgroundLayer.children.length !== expectedBgChildren) {
      console.warn(`  ⚠️ backgroundLayer has ${this.backgroundLayer.children.length} children (expected ${expectedBgChildren})`);
    }
    if (this.fxLayer.children.length > 0) {
      console.warn(`  ⚠️ fxLayer has ${this.fxLayer.children.length} children (expected 0)`);
    }
    
    // CRITICAL: Check zIndex/rendering order
    console.log(`🔍 Layer rendering order check:`);
    console.log(`  boardContainer.children.length: ${this.boardContainer.children.length}`);
    this.boardContainer.children.forEach((layer, idx) => {
      let layerName = 'UNKNOWN';
      if (layer === this.backgroundLayer) layerName = 'backgroundLayer';
      else if (layer === this.gemLayer) layerName = 'gemLayer';
      else if (layer === this.fxLayer) layerName = 'fxLayer';
      else layerName = layer.label || layer.constructor.name;
      
      // Sample first 3 children to see what type they are
      const childTypes = layer.children.slice(0, 3).map(c => c.constructor.name).join(', ');
      console.log(`    [${idx}] ${layerName}: ${layer.children.length} children (${childTypes})`);
    });
    
    // CRITICAL: Check for position collisions (multiple sprites at same location)
    const positionMap = new Map(); // key: "x,y", value: [gemIds]
    this.gemSprites.forEach((sprite, gemId) => {
      const posKey = `${sprite.x.toFixed(0)},${sprite.y.toFixed(0)}`;
      if (!positionMap.has(posKey)) {
        positionMap.set(posKey, []);
      }
      positionMap.get(posKey).push(gemId);
    });
    
    const collisions = Array.from(positionMap.entries()).filter(([pos, gems]) => gems.length > 1);
    if (collisions.length > 0) {
      console.error(`  ❌❌❌ FOUND ${collisions.length} POSITION COLLISIONS!`);
      collisions.slice(0, 5).forEach(([pos, gems]) => {
        console.error(`    Collision at (${pos}): ${gems.join(', ')}`);
      });
    } else {
      console.log(`  ✅ No position collisions detected`);
    }
    
    // DEBUG: Check ALL sprite states to find blanks
    console.log('📍 Checking ALL sprite states:');
    const problematicIndices = [];
    this.indexToGemId.forEach((gemId, index) => {
      if (gemId) {
        const sprite = this.gemSprites.get(gemId);
        const expectedPos = this._indexToPosition(index);
        if (!sprite) {
          console.error(`  ❌ [${index}] ${gemId}: SPRITE MISSING!`);
          problematicIndices.push(index);
        } else if (!sprite.visible || sprite.alpha === 0) {
          console.error(`  ❌ [${index}] ${gemId}: INVISIBLE (visible=${sprite.visible}, alpha=${sprite.alpha})`);
          problematicIndices.push(index);
        } else if (!sprite.parent) {
          console.error(`  ❌ [${index}] ${gemId}: NO PARENT!`);
          problematicIndices.push(index);
        } else if (sprite.x !== expectedPos.x || sprite.y !== expectedPos.y) {
          console.error(`  ❌ [${index}] ${gemId}: WRONG POSITION pos=(${sprite.x}, ${sprite.y}) expected=(${expectedPos.x}, ${expectedPos.y})`);
          problematicIndices.push(index);
        }
      }
    });
    
    if (problematicIndices.length === 0) {
      console.log('  ✅ All sprites are visible, parented, and correctly positioned');
    } else {
      console.error(`  ❌ Found ${problematicIndices.length} problematic sprites at indices: ${problematicIndices.join(', ')}`);
    }
    
    // Animations are complete and all sprites are positioned
    // No further sync needed - state is consistent
  }

  _swapIndexMapping(aIndex, bIndex) {
    const temp = this.indexToGemId[aIndex];
    this.indexToGemId[aIndex] = this.indexToGemId[bIndex];
    this.indexToGemId[bIndex] = temp;
  }

  _animateClear(step) {
    console.log('  ❌ Processing clears:', step.cleared.length);
    const animations = step.cleared.map((index) => {
      const gemId = this.indexToGemId[index];
      if (!gemId) {
        console.warn(`    ⚠️ Clear failed: no gem at index ${index}`);
        return Promise.resolve();
      }
      const sprite = this.gemSprites.get(gemId);
      if (!sprite) {
        console.warn(`    ⚠️ Clear failed: sprite not found for ${gemId}`);
        return Promise.resolve();
      }

      const gemType = sprite.__gemType || 'unknown';
      this.indexToGemId[index] = null;
      this.gemSprites.delete(gemId);

      console.log(`    🗑️ Clearing ${gemType} (${gemId}) from [${index}]`);
      
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
    console.log('  🔽 Processing drops:', drops.length);
    const animations = drops.map(({ from, to, gem }) => {
      const sprite = this.gemSprites.get(gem.id);
      if (!sprite) {
        console.warn('    ⚠️ Drop failed: sprite not found for', gem.id);
        return Promise.resolve();
      }

      const oldPos = { x: sprite.x, y: sprite.y };
      const target = this._indexToPosition(to);
      
      // CRITICAL: Remove old sprite at target index if it exists
      const oldIdAtTarget = this.indexToGemId[to];
      if (oldIdAtTarget && oldIdAtTarget !== gem.id) {
        const oldSprite = this.gemSprites.get(oldIdAtTarget);
        if (oldSprite) {
          console.log(`      ⚠️ Removing orphaned sprite ${oldIdAtTarget} at [${to}]`);
          if (oldSprite.parent) {
            oldSprite.parent.removeChild(oldSprite);
          }
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
      
      console.log(`    📦 Dropping ${gem.type} (${gem.id}): [${from}→${to}] Y: ${startY}→${targetY}`);
      
      // Animate the drop
      return this._createAnimation({
        duration: FALL_DURATION,
        easing: easeOutQuad,
        onTick: (t) => {
          sprite.position.set(targetX, startY + (targetY - startY) * t);
        },
        onComplete: () => {
          sprite.position.set(targetX, targetY);
        },
      });
    });

    if (!animations.length) {
      return Promise.resolve();
    }

    return Promise.all(animations);
  }

  _animateSpawns(spawns) {
    console.log('  ⭐ Processing spawns:', spawns.length);
    const animations = spawns.map(({ index, gem }) => {
      const oldIdAtIndex = this.indexToGemId[index];
      
      // CRITICAL: Check if this gem.id already has a sprite (orphaned from previous operation)
      const existingSprite = this.gemSprites.get(gem.id);
      if (existingSprite) {
        console.log(`    ⚠️ Gem ${gem.id} already has a sprite! Removing orphan.`);
        if (existingSprite.parent) {
          existingSprite.parent.removeChild(existingSprite);
        }
        existingSprite.destroy();
        this.gemSprites.delete(gem.id);
      }
      
      const sprite = this._createGemSprite(gem);
      const target = this._indexToPosition(index);

      // Calculate starting position above the board
      const row = Math.floor(index / this.boardSize);
      const startY = -this.cellSize * (row + 2);
      
      // Set initial position and properties
      sprite.position.set(target.x, startY);
      sprite.alpha = 1;
      sprite.visible = true;
      
      // Track in maps
      this.gemSprites.set(gem.id, sprite);
      this.indexToGemId[index] = gem.id;
      
      // Add to layer
      this.gemLayer.addChild(sprite);

      console.log(`    ✨ Spawning ${gem.type} (${gem.id}) at [${index}] from Y=${startY} to Y=${target.y}`);
      
      // Animate falling down
      return this._createAnimation({
        duration: FALL_DURATION,
        easing: easeOutQuad,
        onTick: (t) => {
          sprite.position.set(target.x, startY + (target.y - startY) * t);
        },
        onComplete: () => {
          sprite.position.set(target.x, target.y);
        },
      });
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
    if (this.animations.size === 0) {
      return;
    }

    if (!this._loggedAnimStart) {
      console.log(`🎬 Starting ${this.animations.size} animations`);
      this._loggedAnimStart = true;
    }

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

    if (this.animations.size === 0 && this._loggedAnimStart) {
      console.log(`✅ All animations complete - final render`);
      this._loggedAnimStart = false;
    }
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
