import { defineStore } from 'pinia';
import { generateLevelConfigs } from '../game/engine/LevelGenerator';
import { MatchEngine } from '../game/engine/MatchEngine';
import { TileManager } from '../game/engine/TileManager';
import { BonusActivator } from '../game/engine/BonusActivator';
import { HintEngine } from '../game/engine/HintEngine';
import { detectBonusFromMatches } from '../game/engine/MatchPatterns';
import { BoardAnimator } from '../game/phaser/BoardAnimator';
import { BoardInput } from '../game/phaser/BoardInput';

const matchEngine = new MatchEngine();
const tileManager = new TileManager();
const bonusActivator = new BonusActivator();
const hintEngine = new HintEngine();
const HINT_DELAY_MS = 15000;
let hintTimerId = null;

const getBoardCenterIndex = (cols, rows) => {
  const totalCells = Math.max(1, (cols || 0) * (rows || 0));
  const center = Math.floor(totalCells / 2);
  return Math.min(center, totalCells - 1);
};

const cloneBoardState = (board = []) => {
  if (!Array.isArray(board)) {
    return [];
  }
  return board.map((gem) => {
    if (!gem) {
      return null;
    }
    return { ...gem };
  });
};

const cloneTileLayers = (tiles = []) => {
  if (!Array.isArray(tiles)) {
    return [];
  }
  return tiles.map((tile) => {
    if (!tile) {
      return null;
    }
    const maxHealth = tile.maxHealth ?? tile.health ?? 0;
    return {
      ...tile,
      maxHealth,
      health: maxHealth,
      cleared: false,
    };
  });
};

export const useGameStore = defineStore('game', {
  state: () => ({
    sessionActive: false,
    board: [],
    tiles: [],
    boardSize: 8,
    boardCols: 8,
    boardRows: 8,
    cellSize: 72,
    score: 0,
    maxCascade: 1,
    cascadeMultiplier: 1,
    objectives: [],
    boardVersion: 0,
    renderer: null,
    availableLevels: [],
    shuffleAllowance: 3,
    reshufflesUsed: 0,
    moves: 0,
    animationInProgress: false,
    pendingBoardState: null,
    queuedSwap: null,
    swapBonusArmed: false,
    bonusPreview: {
      indices: [],
      swap: null,
      key: null,
    },
    totalLayers: 0,
    remainingLayers: 0,
    levelCleared: false,
    audioManager: null,
    hintMove: null,
    currentBoardLayout: null,
    currentLevelId: null,
  }),
  getters: {
    activeBoard(state) {
      return state.pendingBoardState ?? state.board;
    },
  },
  actions: {
    setAudioManager(manager) {
      this.audioManager = manager ?? null;
      const animator = this.renderer?.animator;
      if (animator?.setAudioManager) {
        animator.setAudioManager(this.audioManager);
      }
    },
    clearHint() {
      this.hintMove = null;
      this.renderer?.animator?.clearHintMove?.();
    },
    cancelHint(clearVisual = false) {
      if (hintTimerId) {
        clearTimeout(hintTimerId);
        hintTimerId = null;
      }
      if (clearVisual) {
        this.clearHint();
      }
    },
    scheduleHint(delay = HINT_DELAY_MS) {
      if (!this.sessionActive) {
        return;
      }

      if (hintTimerId) {
        clearTimeout(hintTimerId);
      }

      hintTimerId = setTimeout(() => {
        hintTimerId = null;
        this.computeHintMove();
      }, delay);
    },
    armSwapBonus() {
      if (!this.sessionActive || this.animationInProgress || this.levelCleared) {
        return false;
      }
      this.cancelHint(true);
      this.swapBonusArmed = true;
      return true;
    },
    previewBonusSwap(aIndex, bIndex) {
      if (!this.sessionActive || this.animationInProgress || this.levelCleared) {
        this.clearBonusPreview();
        return;
      }

      const cols = this.boardCols ?? this.boardSize ?? 8;
      const rows = this.boardRows ?? this.boardSize ?? 8;

      if (
        aIndex == null ||
        bIndex == null ||
        !Number.isInteger(aIndex) ||
        !Number.isInteger(bIndex) ||
        !matchEngine.areAdjacent(aIndex, bIndex, cols)
      ) {
        this.clearBonusPreview();
        return;
      }

      const board = this.activeBoard;
      if (!Array.isArray(board) || !board.length) {
        this.clearBonusPreview();
        return;
      }

      const gemA = board[aIndex];
      const gemB = board[bIndex];

      if (!bonusActivator.isBonus(gemA?.type) && !bonusActivator.isBonus(gemB?.type)) {
        this.clearBonusPreview();
        return;
      }

      const indices = bonusActivator.previewSwap(board, cols, rows, { aIndex, bIndex }) ?? [];
      if (!indices.length) {
        this.clearBonusPreview();
        return;
      }

      const cacheKey = `${aIndex}-${bIndex}-${indices.join(',')}`;
      if (this.bonusPreview?.key === cacheKey) {
        return;
      }

      this.bonusPreview = {
        indices,
        swap: { aIndex, bIndex },
        key: cacheKey,
      };
      this.renderer?.animator?.showBonusPreview?.(indices);
    },
    clearBonusPreview(force = false) {
      if (!force && !this.bonusPreview?.indices?.length && !this.bonusPreview?.swap) {
        return;
      }
      this.bonusPreview = { indices: [], swap: null, key: null };
      this.renderer?.animator?.clearBonusPreview?.();
    },
    async activateOneTimeBonus(bonusName) {
      if (!this.sessionActive || this.animationInProgress || this.levelCleared) {
        console.warn('Cannot activate bonus: session not active, animation in progress, or level cleared.');
        return false;
      }
      this.clearBonusPreview(true);

      const cols = this.boardCols ?? this.boardSize ?? 8;
      const rows = this.boardRows ?? this.boardSize ?? 8;
      const animator = this.renderer?.animator;
      const bonusOriginIndex = getBoardCenterIndex(cols, rows);

      this.animationInProgress = true;
      try {
        // Use the board center as a neutral origin so bonus math always receives a safe index.
        const clearedIndices = bonusActivator.activateBonus(
          bonusName,
          this.board,
          cols,
          rows,
          bonusOriginIndex,
        );

        if (clearedIndices.length === 0) {
          console.log(`Bonus ${bonusName} had no effect.`);
          return false;
        }

        const matches = [{ type: bonusName, indices: clearedIndices }];

      const resolution = tileManager.getResolution({
        board: this.board,
        tiles: this.tiles,
        matches: matches,
        cols,
        rows,
      });

      const layersCleared = resolution.layersCleared ?? 0;
      this._applyScoring(resolution.steps);

        this.pendingBoardState = resolution.board;
        window.__currentBoard = this.pendingBoardState;

      if (animator && resolution.steps.length) {
        await animator.playSteps(resolution.steps);
      }

      this.board = resolution.board;
      this.pendingBoardState = null;
      this.boardVersion += 1;

      if (layersCleared > 0) {
        this.remainingLayers = Math.max(0, this.remainingLayers - layersCleared);
        this.updateObjectives({ layersCleared });
      }

      animator?.updateTiles(this.tiles);
      window.__currentBoard = this.board;

      if (this.remainingLayers === 0 && this.sessionActive) {
        this.completeLevel();
      }
      return true;

      } catch (error) {
        console.error('Error activating bonus:', error);
        return false;
      } finally {
        this.pendingBoardState = null;
        this.animationInProgress = false;
        if (this.sessionActive) {
          this.scheduleHint();
        }
      }
    },
    notifyPlayerActivity() {
      this.cancelHint(true);
      if (this.sessionActive) {
        this.scheduleHint();
      }
    },
    computeHintMove() {
      if (!this.sessionActive) {
        return;
      }

      if (this.animationInProgress) {
        this.scheduleHint();
        return;
      }

      const cols = this.boardCols ?? this.boardSize ?? 8;
      const rows = this.boardRows ?? this.boardSize ?? 8;
      const board = this.activeBoard;

      if (!Array.isArray(board) || !board.length) {
        return;
      }

      const hint = hintEngine.findBestMove(board, this.tiles ?? [], cols, rows);
      this.hintMove = hint;

      if (!hint) {
        this.renderer?.animator?.clearHintMove?.();
        return;
      }

      this.renderer?.animator?.showHintMove?.(hint.indices);
    },
    bootstrap() {
      if (this.availableLevels.length) {
        return;
      }

      this.availableLevels = generateLevelConfigs(12).map((level, index) => ({
        id: level.id ?? index + 1,
        label: `Level ${level.id ?? index + 1}`,
        summary: level.summary,
        config: level,
      }));

      // Initialize with a default empty board
      this.board = Array(64).fill(null);
      this.currentBoardLayout = {
        name: 'default',
        shape: 'RECTANGLE',
        dimensions: { cols: 8, rows: 8 },
        blockedCells: [],
        initialTilePlacements: [],
      };
    },
    startLevel(levelId) {
      const selected = this.availableLevels.find((entry) => entry.id === levelId);
      if (!selected) {
        console.warn('No level config found for id', levelId);
        return;
      }

      const { config } = selected;
      this.currentLevelId = levelId;
      const freshBoard = cloneBoardState(config.board);
      const freshTiles = cloneTileLayers(config.tiles);
      this.sessionActive = true;
      this.levelCleared = false;
      this.boardCols = config.boardCols ?? config.boardSize ?? 8;
      this.boardRows = config.boardRows ?? config.boardCols ?? config.boardSize ?? 8;
      this.boardSize = this.boardCols;
      this.board = freshBoard;
      this.clearBonusPreview(true);
      window.__currentBoard = this.board;
      this.tiles = freshTiles;
      this.currentBoardLayout = config.boardLayout || this.currentBoardLayout;
      if (this.renderer?.animator) {
        this.renderer.animator.boardLayout = this.currentBoardLayout;
      }
      this.objectives = config.objectives.map((objective) => ({ ...objective, progress: 0 }));
      this.shuffleAllowance = config.shuffleAllowance;
      this.reshufflesUsed = 0;
      this.moves = 0;
      this.score = 0;
      this.maxCascade = 1;
      this.cascadeMultiplier = 1;
      this.animationInProgress = true;
      this.pendingBoardState = null;
      this.queuedSwap = null;
      this.swapBonusArmed = false;
      this.clearBonusPreview(true);
      this.renderer?.animator?.clearQueuedSwapHighlight?.();
      this.totalLayers = this.tiles.reduce(
        (sum, tile) => sum + (tile?.maxHealth ?? tile?.health ?? 0),
        0,
      );
      this.remainingLayers = this.totalLayers;
      this.updateObjectives({ reset: true });
      this.boardVersion += 1;
      this.refreshBoardVisuals(true);
      this.cancelHint(true);

      const introPromise = this.renderer?.animator?.playIntroCascade?.();
      const finalizeIntro = () => {
        this.animationInProgress = false;
        if (this.sessionActive) {
          this.scheduleHint();
        }
      };

      if (introPromise?.then) {
        introPromise
          .then(() => {
            this.renderer?.animator?.updateTiles?.(this.tiles);
          })
          .catch((error) => {
            console.warn('Intro cascade animation failed:', error);
          })
          .finally(finalizeIntro);
      } else {
        finalizeIntro();
      }
    },
    attachRenderer(renderer) {
      if (this.renderer?.animator) {
        this.renderer.animator.destroy();
      }
      if (this.renderer?.input) {
        this.renderer.input.destroy();
      }

      const animator = new BoardAnimator({
        scene: renderer.scene,
        boardContainer: renderer.boardContainer,
        backgroundLayer: renderer.backgroundLayer,
        tileLayer: renderer.tileLayer,
        gemLayer: renderer.gemLayer,
        fxLayer: renderer.fxLayer,
        textures: renderer.textures,
        bonusAnimations: renderer.bonusAnimations,
        tileTextures: renderer.tileTextures,
        particles: renderer.particles,
        audio: this.audioManager,
        boardLayout: this.currentBoardLayout,
      });

      const input = new BoardInput({
        scene: renderer.scene,
        boardContainer: renderer.boardContainer,
        gameStore: this,
      });

      this.renderer = { ...renderer, animator, input };
      this.clearBonusPreview(true);

      if (this.board.length > 0) {
        this.refreshBoardVisuals(true);
      }
    },
    refreshBoardVisuals(forceRedraw = false) {
      if (!this.renderer || !this.currentBoardLayout) {
        return;
      }

      // Expose current board state for debugging
      window.__currentBoard = this.board;

      const { boardContainer, scene, animator } = this.renderer;
      const fallbackWidth =
        scene?.scale?.width ??
        scene?.scale?.parentSize?.width ??
        scene?.sys?.game?.canvas?.width;
      const fallbackHeight =
        scene?.scale?.height ??
        scene?.scale?.parentSize?.height ??
        scene?.sys?.game?.canvas?.height;

      const viewWidth = scene?.scale?.gameSize?.width ?? fallbackWidth;
      const viewHeight = scene?.scale?.gameSize?.height ?? fallbackHeight;

      if (!viewWidth || !viewHeight) {
        return;
      }

      const cols = this.boardCols ?? this.boardSize ?? 8;
      const rows = this.boardRows ?? this.boardSize ?? 8;

      if (!cols || !rows) {
        return;
      }

      const cellSize = Math.min(viewWidth / cols, viewHeight / rows);
      const boardWidth = cellSize * cols;
      const boardHeight = cellSize * rows;
      const offsetX = (viewWidth - boardWidth) / 2;
      const offsetY = (viewHeight - boardHeight) / 2;

      this.boardSize = cols;
      this.cellSize = cellSize;
      boardContainer.setPosition(offsetX, offsetY);

      if (!animator) {
        return;
      }

      animator.setLayout({ boardCols: cols, boardRows: rows, cellSize });
      this.renderer.input?.setLayout({ boardCols: cols, boardRows: rows, cellSize });
      animator.updateTiles(this.tiles);

      const shouldReset = ((forceRedraw && !this.animationInProgress) || animator.indexToGemId.length === 0);

      if (shouldReset) {
        animator.reset(this.board, { boardCols: cols, boardRows: rows, cellSize });
      } else {
        animator.syncToBoard(this.board);
      }

    },
    async resolveSwap(aIndex, bIndex) {
      if (!this.sessionActive || this.levelCleared) {
        return false;
      }

      this.cancelHint(true);
      this.clearBonusPreview(true);

      if (this.animationInProgress) {
        return this.queueSwap(aIndex, bIndex);
      }

      const cols = this.boardCols ?? this.boardSize ?? 8;
      const rows = this.boardRows ?? this.boardSize ?? 8;
      const animator = this.renderer?.animator;
      const tiles = this.tiles ?? [];
      const tileA = tiles[aIndex];
      const tileB = tiles[bIndex];
      if (tileA?.state === 'FROZEN' || tileB?.state === 'FROZEN') {
        if (animator && matchEngine.areAdjacent(aIndex, bIndex, cols)) {
          await animator.animateInvalidSwap({ aIndex, bIndex });
        }
        if (this.sessionActive) {
          this.scheduleHint();
        }
        return false;
      }

      const evaluation = matchEngine.evaluateSwap(this.board, cols, rows, aIndex, bIndex);
      const isAdjacent = matchEngine.areAdjacent(aIndex, bIndex, cols);
      const swapBonusReady = this.swapBonusArmed;
      if (swapBonusReady) {
        this.swapBonusArmed = false;
      }
      const canForceSwap = swapBonusReady && isAdjacent && evaluation.matches.length === 0;

      if (!evaluation.matches.length && !canForceSwap) {
        if (isAdjacent && animator) {
          await animator.animateInvalidSwap({ aIndex, bIndex });
        }
        if (this.sessionActive) {
          this.scheduleHint();
        }
        return false;
      }

      animator?.clearQueuedSwapHighlight();
      this.animationInProgress = true;

      try {
        const swapPayload = evaluation.swap ?? { aIndex, bIndex };
        if (animator && swapPayload) {
          await animator.animateSwap(swapPayload);
        }

        if (canForceSwap) {
          const nextBoard = [...this.board];
          [nextBoard[aIndex], nextBoard[bIndex]] = [nextBoard[bIndex], nextBoard[aIndex]];
          this.pendingBoardState = nextBoard;
          window.__currentBoard = this.pendingBoardState;

          this.board = nextBoard;
          this.pendingBoardState = null;
          this.boardVersion += 1;
          if (animator) {
            animator.updateTiles(this.tiles);
          } else {
            this.refreshBoardVisuals(true);
          }
          window.__currentBoard = this.board;
          this.cascadeMultiplier = 1;
          this.moves += 1;
          return true;
        }

        const resolution = tileManager.getResolution({
          board: evaluation.board,
          tiles: this.tiles,
          matches: evaluation.matches,
          cols,
          rows,
          bonusesCreated: evaluation.bonusesCreated,
          bonusIndices: evaluation.bonusIndices,
        });
        const layersCleared = resolution.layersCleared ?? 0;
        this._applyScoring(resolution.steps);

        this.pendingBoardState = resolution.board;
        window.__currentBoard = this.pendingBoardState;

        if (!animator) {
          this.board = resolution.board;
          this.pendingBoardState = null;
          this.boardVersion += 1;
          if (layersCleared > 0) {
            this.remainingLayers = Math.max(0, this.remainingLayers - layersCleared);
            this.updateObjectives({ layersCleared });
          }
          this.refreshBoardVisuals(true);
          window.__currentBoard = this.board;
          if (this.remainingLayers === 0 && this.sessionActive) {
            this.completeLevel();
          }
          this.moves += 1;
          return true;
        }

        if (resolution.steps.length) {
          await animator.playSteps(resolution.steps);
        }

        this.board = resolution.board;
        this.pendingBoardState = null;
        this.boardVersion += 1;
        if (layersCleared > 0) {
          this.remainingLayers = Math.max(0, this.remainingLayers - layersCleared);
          this.updateObjectives({ layersCleared });
        }
        animator.updateTiles(this.tiles);

        window.__currentBoard = this.board;

        if (this.remainingLayers === 0 && this.sessionActive) {
          this.completeLevel();
        }

        this.moves += 1;
        return true;
      } catch (error) {
        console.error('Error in resolveSwap:', error);
        return false;
      } finally {
        this.pendingBoardState = null;
        this.animationInProgress = false;
        if (this.sessionActive) {
          this.scheduleHint();
        }
        const queued = this.queuedSwap;
        if (queued) {
          this.queuedSwap = null;
          setTimeout(() => {
            if (!this.sessionActive) {
              return;
            }
            this.resolveSwap(queued.aIndex, queued.bIndex);
          }, 0);
        }
      }
    },
    queueSwap(aIndex, bIndex) {
      if (!this.sessionActive || !this.animationInProgress || this.levelCleared) {
        return false;
      }

      const boardSnapshot = this.pendingBoardState;
      if (!Array.isArray(boardSnapshot) || !boardSnapshot.length) {
        return false;
      }

      if (!Number.isInteger(aIndex) || !Number.isInteger(bIndex)) {
        return false;
      }

      const boardLength = boardSnapshot.length;
      if (aIndex < 0 || bIndex < 0 || aIndex >= boardLength || bIndex >= boardLength) {
        return false;
      }

      const cols = this.boardCols ?? this.boardSize ?? 8;
      if (!matchEngine.areAdjacent(aIndex, bIndex, cols)) {
        return false;
      }

      this.queuedSwap = { aIndex, bIndex };
      this.renderer?.animator?.showQueuedSwap(aIndex, bIndex);
      return true;
    },
    exitLevel() {
      this.cancelHint(true);
      this.sessionActive = false;
      this.board = [];
      this.tiles = [];
      this.objectives = [];
      this.score = 0;
      this.maxCascade = 1;
      this.cascadeMultiplier = 1;
      this.shuffleAllowance = 3;
      this.reshufflesUsed = 0;
      this.animationInProgress = false;
      this.pendingBoardState = null;
      this.queuedSwap = null;
      this.swapBonusArmed = false;
      this.clearBonusPreview(true);
      this.totalLayers = 0;
      this.remainingLayers = 0;
      this.levelCleared = false;
      this.renderer?.animator?.clearQueuedSwapHighlight?.();
      if (this.renderer?.animator) {
        this.renderer.animator.clear();
      } else if (this.renderer?.boardContainer) {
        this.renderer.boardContainer.removeAll?.(true);
      }
      this.renderer?.input?.reset();
      this.boardVersion += 1;
      this.currentLevelId = null;
    },

    completeLevel() {
      this.cancelHint(true);
      this.remainingLayers = 0;
      this.levelCleared = true;
      // Keep session active so the board remains visible behind the victory modal
      // this.sessionActive = false; 
      this.animationInProgress = false;
      this.pendingBoardState = null;
      this.queuedSwap = null;
      this.swapBonusArmed = false;
      this.renderer?.animator?.clearQueuedSwapHighlight?.();
      this.renderer?.input?.reset();
      this.updateObjectives();
      console.log('✨ Level cleared!');
    },

    updateObjectives({ reset = false, scoreDelta = 0, layersCleared = 0 } = {}) {
      const layerObjective = this.objectives.find((objective) => objective.type === 'clear-layers');
      const scoreObjective = this.objectives.find((objective) => objective.type === 'score');

      if (reset) {
        if (layerObjective) {
          layerObjective.progress = layerObjective.target - this.remainingLayers;
        }
        if (scoreObjective) {
          scoreObjective.progress = Math.min(scoreObjective.target, this.score);
        }
        return;
      }

      if (layersCleared && layerObjective) {
        const newProgress = (layerObjective.progress ?? 0) + layersCleared;
        layerObjective.progress = Math.min(layerObjective.target, newProgress);
      } else if (layerObjective) {
        layerObjective.progress = Math.min(
          layerObjective.target,
          layerObjective.target - this.remainingLayers,
        );
      }

      if (scoreObjective && scoreDelta) {
        const newScoreProgress = (scoreObjective.progress ?? 0) + scoreDelta;
        scoreObjective.progress = Math.min(scoreObjective.target, newScoreProgress);
      }
    },
    _applyScoring(steps) {
      if (!Array.isArray(steps) || !steps.length) {
        this.cascadeMultiplier = 1;
        return 0;
      }

      let total = 0;
      let deepestCascade = 1;

      steps.forEach((step, index) => {
        const clearedCount = Array.isArray(step?.cleared) ? step.cleared.length : 0;
        if (!clearedCount) {
          return;
        }
        const cascadeBonus = Math.max(1, index + 1);
        total += clearedCount * 100 * cascadeBonus;
        deepestCascade = Math.max(deepestCascade, cascadeBonus);
      });

      this.cascadeMultiplier = deepestCascade;
      this.maxCascade = Math.max(this.maxCascade ?? 1, deepestCascade);

      if (total > 0) {
        this.score += total;
        this.updateObjectives({ scoreDelta: total });
      }

      return total;
    },
    shuffleBoard() {
      if (!this.sessionActive || this.animationInProgress || this.levelCleared) {
        return false;
      }
      this.cancelHint(true);
      const cols = this.boardCols ?? this.boardSize ?? 8;
      const rows = this.boardRows ?? this.boardSize ?? 8;
      const animator = this.renderer?.animator;

      const nextBoard = [...this.board];
      for (let i = nextBoard.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [nextBoard[i], nextBoard[j]] = [nextBoard[j], nextBoard[i]];
      }

      this.animationInProgress = true;
      this.pendingBoardState = nextBoard;
      window.__currentBoard = this.pendingBoardState;

      const runAnimation = animator?.animateShuffle
        ? animator
          .animateShuffle(nextBoard, { cols, rows })
          .catch((error) => console.error('Shuffle animation failed:', error))
        : Promise.resolve();

      return runAnimation
        .then(() => this._resolveBoardAfterShuffle(nextBoard, { cols, rows, animator }))
        .finally(() => {
          this.pendingBoardState = null;
          this.animationInProgress = false;
          if (this.sessionActive) {
            this.scheduleHint();
          }
        });
    },
    async hammerTile(index) {
      if (!this.sessionActive || this.animationInProgress || this.levelCleared) {
        return;
      }
      this.board[index] = null;

      const cols = this.boardCols ?? this.boardSize ?? 8;
      const rows = this.boardRows ?? this.boardSize ?? 8;

      const resolution = tileManager.getResolution({
        board: this.board,
        tiles: this.tiles,
        matches: [],
        cols,
        rows,
      });

      this.pendingBoardState = resolution.board;
      window.__currentBoard = this.pendingBoardState;

      if (this.renderer.animator && resolution.steps.length) {
        await this.renderer.animator.playSteps(resolution.steps);
      }

      this.board = resolution.board;
      this.pendingBoardState = null;
      this.boardVersion += 1;
      this.renderer.animator.updateTiles(this.tiles);
      window.__currentBoard = this.board;
    },
    async _resolveBoardAfterShuffle(nextBoard, { cols, rows, animator }) {
      try {
        const matches = matchEngine.findMatches(nextBoard, cols, rows);

        let bonusesCreated = [];
        let bonusIndices = [];

        if (matches.length) {
          const bonuses = detectBonusFromMatches(matches, {});
          bonusesCreated = [];
          bonusIndices = [];
          bonuses.forEach((bonus) => {
            if (typeof bonus.index === 'number') {
              nextBoard[bonus.index] = { ...nextBoard[bonus.index], type: bonus.type };
              bonusesCreated.push(bonus.type);
              bonusIndices.push(bonus.index);
            }
          });
        }

        const resolution = tileManager.getResolution({
          board: nextBoard,
          tiles: this.tiles,
          matches,
          cols,
          rows,
          bonusesCreated,
          bonusIndices,
        });
        const layersCleared = resolution.layersCleared ?? 0;
        this._applyScoring(resolution.steps);

        this.pendingBoardState = resolution.board;
        window.__currentBoard = this.pendingBoardState;

        if (animator && resolution.steps.length) {
          await animator.playSteps(resolution.steps);
        }

        this.board = resolution.board;
        this.pendingBoardState = null;
        this.boardVersion += 1;
        if (layersCleared > 0) {
          this.remainingLayers = Math.max(0, this.remainingLayers - layersCleared);
          this.updateObjectives({ layersCleared });
        }
        if (animator) {
          animator.updateTiles(this.tiles);
        } else {
          this.refreshBoardVisuals(true);
        }
        window.__currentBoard = this.board;

        if (this.remainingLayers === 0 && this.sessionActive) {
          this.completeLevel();
        }
        return true;
      } catch (error) {
        console.error('Error resolving board after shuffle:', error);
        return false;
      }
    },
  },
});
