import { markRaw } from 'vue';
import { PlayClock } from '../game/engine/PlayClock';
import { useCampaignStore } from './campaignStore';
import { useSettingsStore } from './settingsStore';
import { defineStore } from 'pinia';
import { generateLevelConfigs } from '../game/engine/LevelGenerator';
import { GEM_TYPES } from '../game/engine/GemFactory';
import { MatchEngine } from '../game/engine/MatchEngine';
import { TileManager } from '../game/engine/TileManager';
import { useInventoryStore } from './inventoryStore';
import { BonusActivator } from '../game/engine/BonusActivator';
import { HintEngine } from '../game/engine/HintEngine';
import { detectBonusFromMatches } from '../game/engine/MatchPatterns';
import { BoardAnimator } from '../game/phaser/BoardAnimator';
import { BoardInput } from '../game/phaser/BoardInput';
import { canSwapGem, layerCount } from '../game/engine/TileRules';

const matchEngine = new MatchEngine();
const tileManager = new TileManager();
const bonusActivator = new BonusActivator();
const hintEngine = new HintEngine();
const HINT_DELAY_MS = 15000;
let hintTimerId = null;
let arcadeImpactTimeout = null;
let arcadeBannerTimeout = null;
let scoreFlashTimeoutId = null;
let reshuffleNoticeTimeoutId = null;

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
      ...(tile.maxChainHealth != null ? { chainHealth: tile.maxChainHealth } : {}),
      cleared: false,
    };
  });
};

export const useGameStore = defineStore('game', {
  state: () => ({
    sessionActive: false,
    sessionVersion: 0,
    inputPaused: false,
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
    queuedBonus: null,
    activeBonusMode: null,
    bonusPreview: {
      indices: [],
      swap: null,
      key: null,
    },
    totalLayers: 0,
    remainingLayers: 0,
    totalRelics: 0,
    levelCleared: false,
    levelRewards: [],
    arcadeImpact: null,
    arcadeBanner: null,
    playClock: markRaw(new PlayClock()),
    elapsedMs: 0,
    speedTargetMs: 0,
    audioManager: null,
    hintMove: null,
    currentBoardLayout: null,
    currentLevelId: null,
    reshuffleNotice: null,
    scorePenaltyFlash: false,
  }),
  getters: {
    activeBoard(state) {
      return state.pendingBoardState ?? state.board;
    },
    remainingRelics: (state) => state.board.filter((gem) => gem?.type === 'relic').length,
    goalTotal: (state) => state.totalLayers + state.totalRelics,
    goalProgress() {
      return this.goalTotal - this.remainingLayers - this.remainingRelics;
    },
    layerLabel: (state) =>
      state.currentLevelId > 36
        ? (state.objectives.find((objective) => objective.type === 'clear-layers')?.label ??
          'Layers')
        : 'Ice & stone',
  },
  actions: {
    showArcadeBanner(banner) {
      if (!this.sessionActive || this.levelCleared) return;
      if (this.arcadeBanner?.kind === 'fusion' && banner.kind !== 'fusion') return;
      clearTimeout(arcadeBannerTimeout);
      this.arcadeBanner = { ...banner, id: (this.arcadeBanner?.id ?? 0) + 1 };
      arcadeBannerTimeout = setTimeout(() => (this.arcadeBanner = null), 2000);
    },
    showArcadeImpact(effect) {
      if (useSettingsStore().reducedMotion || !this.sessionActive || this.levelCleared) return;
      clearTimeout(arcadeImpactTimeout);
      this.arcadeImpact = { ...effect, id: (this.arcadeImpact?.id ?? 0) + 1 };
      arcadeImpactTimeout = setTimeout(() => (this.arcadeImpact = null), 850);
    },
    syncRunClock(running) {
      const canPlay =
        running ??
        (this.sessionActive &&
          !this.levelCleared &&
          !this.animationInProgress &&
          !this.inputPaused &&
          !!this.renderer);
      this.elapsedMs = this.playClock.setRunning(canPlay);
    },
    setAudioManager(manager) {
      this.audioManager = manager ? markRaw(manager) : null;
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
    setBonusMode(mode) {
      // Allow clearing even if session is paused; activation still requires sessionActive checks elsewhere
      if (mode === null) {
        this.activeBonusMode = null;
        this.queuedBonus = null;
        this.renderer?.animator?.clearQueuedBonusHighlight?.();
        this.clearBonusPreview(true);
        return true;
      }

      if (!this.sessionActive || this.levelCleared) {
        return false;
      }

      this.cancelHint(true);

      // Toggle off if already selected
      if (this.activeBonusMode === mode) {
        this.activeBonusMode = null;
        this.queuedBonus = null;
        this.renderer?.animator?.clearQueuedBonusHighlight?.();
        this.clearBonusPreview(true);
        return true;
      }

      // Switching modes clears any queued bonus target and previews
      this.activeBonusMode = mode;
      this.queuedBonus = null;
      this.renderer?.animator?.clearQueuedBonusHighlight?.();
      this.clearBonusPreview(true);
      return true;
    },
    async resolveBonusClick(index) {
      const session = this.sessionVersion;
      if (!this.sessionActive || !this.activeBonusMode || this.levelCleared) {
        return false;
      }

      const bonusName = this.activeBonusMode;
      this.cancelHint(true);
      let boardUpdated = false;

      if (this.animationInProgress) {
        // Queue the bonus activation to run once current animations finish
        this.queuedBonus = { index, bonusName };
        this.renderer?.animator?.showQueuedBonus?.(index);
        this.activeBonusMode = null;
        this.renderer?.animator?.clearBonusPreview?.();
        return true;
      }

      this.renderer?.animator?.clearQueuedBonusHighlight?.();
      this.activeBonusMode = null;

      const cols = this.boardCols ?? this.boardSize ?? 8;
      const rows = this.boardRows ?? this.boardSize ?? 8;
      const animator = this.renderer?.animator;

      this.animationInProgress = true;
      try {
        const clearedIndices = bonusActivator.activateBonus(
          bonusName,
          this.board,
          cols,
          rows,
          index,
        );

        if (clearedIndices.length === 0) {
          console.log(`Bonus ${bonusName} had no effect.`);
          return false;
        }

        const matches = [{ type: bonusName, indices: clearedIndices }];

        const resolution = tileManager.getResolution({
          gemTypes: GEM_TYPES.slice(0, this.currentBoardLayout?.gemTypeCount ?? 6),
          board: this.board,
          tiles: this.tiles,
          matches: matches,
          cols,
          rows,
        });

        if (resolution.steps[0]) {
          resolution.steps[0].bonusEffect = { type: bonusName, originIndex: index };
        }

        const layersCleared = resolution.layersCleared ?? 0;
        this._applyScoring(resolution.steps);

        this.pendingBoardState = resolution.board;

        if (animator && resolution.steps.length) {
          await animator.playSteps(resolution.steps);
          if (session !== this.sessionVersion) return false;
        }

        this.board = resolution.board;
        this.updateObjectives();
        this.pendingBoardState = null;
        this.boardVersion += 1;

        if (layersCleared > 0) {
          this.remainingLayers = Math.max(0, this.remainingLayers - layersCleared);
          this.updateObjectives({ layersCleared });
        }

        animator?.updateTiles(this.tiles);

        if (this.remainingLayers === 0 && this.sessionActive) {
          this.completeLevel();
        }

        const inventoryStore = useInventoryStore();
        inventoryStore.consumeItem(bonusName);
        boardUpdated = true;
        return true;
      } catch (error) {
        console.error('Error activating bonus:', error);
        return false;
      } finally {
        if (session !== this.sessionVersion) return false;
        this.pendingBoardState = null;
        this.animationInProgress = false;
        if (this.sessionActive) {
          this.scheduleHint();
        }
        this.processQueuedInput();
        if (boardUpdated && this.sessionActive && !this.levelCleared) {
          await this.ensurePlayableBoard();
        }
      }
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

      if (!canSwapGem(gemA, this.tiles[aIndex]) || !canSwapGem(gemB, this.tiles[bIndex])) {
        this.clearBonusPreview();
        return;
      }

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
    /**
     * Preview the effect of an interactive power (hammer, color_wand, tile_breaker) at a given tile index.
     * Shows which tiles will be affected when the power is activated.
     */
    previewPowerEffect(index) {
      if (!this.sessionActive || this.animationInProgress || this.levelCleared) {
        this.clearBonusPreview();
        return;
      }

      const bonusMode = this.activeBonusMode;
      if (!bonusMode) {
        this.clearBonusPreview();
        return;
      }

      const cols = this.boardCols ?? this.boardSize ?? 8;
      const rows = this.boardRows ?? this.boardSize ?? 8;
      const board = this.activeBoard;

      if (
        !Array.isArray(board) ||
        !board.length ||
        index == null ||
        index < 0 ||
        index >= board.length
      ) {
        this.clearBonusPreview();
        return;
      }

      // Get the indices that would be affected
      const indices = bonusActivator.previewBonus(bonusMode, board, cols, rows, index) ?? [];

      if (!indices.length) {
        this.clearBonusPreview();
        return;
      }

      const cacheKey = `power-${bonusMode}-${index}-${indices.join(',')}`;
      if (this.bonusPreview?.key === cacheKey) {
        return; // Already showing this preview
      }

      this.bonusPreview = {
        indices,
        swap: null,
        key: cacheKey,
      };
      this.renderer?.animator?.showBonusPreview?.(indices);
    },
    processQueuedInput() {
      if (this.animationInProgress || !this.sessionActive || this.levelCleared) return;
      if (this.queuedBonus) {
        const queued = this.queuedBonus;
        this.queuedBonus = null;
        this.activeBonusMode = queued.bonusName;
        this.resolveBonusClick(queued.index);
      } else if (this.queuedSwap) {
        const queued = this.queuedSwap;
        this.queuedSwap = null;
        this.renderer?.animator?.clearQueuedSwapHighlight?.();
        this.resolveSwap(queued.aIndex, queued.bIndex);
      }
    },
    async activateOneTimeBonus(bonusName) {
      const session = this.sessionVersion;
      if (!this.sessionActive || this.animationInProgress || this.levelCleared) {
        console.warn(
          'Cannot activate bonus: session not active, animation in progress, or level cleared.',
        );
        return false;
      }
      this.clearBonusPreview(true);
      let boardUpdated = false;

      const cols = this.boardCols ?? this.boardSize ?? 8;
      const rows = this.boardRows ?? this.boardSize ?? 8;
      const animator = this.renderer?.animator;
      let bonusOriginIndex = getBoardCenterIndex(cols, rows);

      if (bonusName === 'clear_row') {
        // Pick a random row
        const randomRow = Math.floor(Math.random() * rows);
        bonusOriginIndex = randomRow * cols;
      }

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
          gemTypes: GEM_TYPES.slice(0, this.currentBoardLayout?.gemTypeCount ?? 6),
          board: this.board,
          tiles: this.tiles,
          matches: matches,
          cols,
          rows,
        });

        if (resolution.steps[0]) {
          resolution.steps[0].bonusEffect = { type: bonusName, originIndex: bonusOriginIndex };
        }

        const layersCleared = resolution.layersCleared ?? 0;
        this._applyScoring(resolution.steps);

        this.pendingBoardState = resolution.board;

        if (animator && resolution.steps.length) {
          await animator.playSteps(resolution.steps);
          if (session !== this.sessionVersion) return false;
        }

        this.board = resolution.board;
        this.updateObjectives();
        this.pendingBoardState = null;
        this.boardVersion += 1;

        if (layersCleared > 0) {
          this.remainingLayers = Math.max(0, this.remainingLayers - layersCleared);
          this.updateObjectives({ layersCleared });
        }

        animator?.updateTiles(this.tiles);

        if (this.remainingLayers === 0 && this.sessionActive) {
          this.completeLevel();
        }
        boardUpdated = true;
        return true;
      } catch (error) {
        console.error('Error activating bonus:', error);
        return false;
      } finally {
        if (session !== this.sessionVersion) return false;
        this.pendingBoardState = null;
        this.animationInProgress = false;
        if (this.sessionActive) {
          this.scheduleHint();
        }
        if (boardUpdated && this.sessionActive && !this.levelCleared) {
          await this.ensurePlayableBoard();
        }
        this.processQueuedInput();
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

      this.availableLevels = generateLevelConfigs().map((level, index) => ({
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
      if (!useCampaignStore().isUnlocked(levelId)) return false;
      const selected = this.availableLevels.find((entry) => entry.id === levelId);
      if (!selected) {
        console.warn('No level config found for id', levelId);
        return;
      }

      this.sessionVersion += 1;
      const session = this.sessionVersion;
      this.renderer?.animator?.clear();
      this.renderer?.input?.reset();
      const { config } = selected;
      this.playClock.reset();
      this.elapsedMs = 0;
      this.speedTargetMs = config.speedTargetMs ?? 0;
      this.currentLevelId = levelId;
      if (scoreFlashTimeoutId) {
        clearTimeout(scoreFlashTimeoutId);
        scoreFlashTimeoutId = null;
      }
      if (reshuffleNoticeTimeoutId) {
        clearTimeout(reshuffleNoticeTimeoutId);
        reshuffleNoticeTimeoutId = null;
      }
      const freshBoard = cloneBoardState(config.board);
      const freshTiles = cloneTileLayers(config.tiles);
      this.sessionActive = true;
      this.levelCleared = false;
      this.levelRewards = [];
      clearTimeout(arcadeImpactTimeout);
      this.arcadeImpact = null;
      clearTimeout(arcadeBannerTimeout);
      this.arcadeBanner = null;
      this.scorePenaltyFlash = false;
      this.reshuffleNotice = null;
      this.boardCols = config.boardCols ?? config.boardSize ?? 8;
      this.boardRows = config.boardRows ?? config.boardCols ?? config.boardSize ?? 8;
      this.boardSize = this.boardCols;
      this.board = freshBoard;
      this.clearBonusPreview(true);
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
      this.queuedBonus = null;
      this.activeBonusMode = null;
      this.clearBonusPreview(true);
      this.renderer?.animator?.clearQueuedSwapHighlight?.();
      this.totalLayers = this.tiles.reduce((sum, tile) => sum + layerCount(tile), 0);
      this.remainingLayers = this.totalLayers;
      this.totalRelics = this.remainingRelics;
      this.updateObjectives({ reset: true });
      this.boardVersion += 1;
      this.refreshBoardVisuals(true);
      this.cancelHint(true);

      const introPromise = this.renderer?.animator?.playIntroCascade?.();
      const finalizeIntro = () => {
        if (session !== this.sessionVersion) return;
        this.animationInProgress = false;
        if (this.sessionActive) {
          this.scheduleHint();
        }
        this.processQueuedInput();
        this.ensurePlayableBoard();
      };

      if (introPromise?.then) {
        introPromise
          .then(() => {
            if (session !== this.sessionVersion) return;
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
        particles: renderer.particles,
        audio: this.audioManager,
        settings: useSettingsStore(),
        onImpact: (effect) => this.showArcadeImpact(effect),
        onBanner: (banner) => this.showArcadeBanner(banner),
        boardLayout: this.currentBoardLayout,
      });

      const input = new BoardInput({
        scene: renderer.scene,
        boardContainer: renderer.boardContainer,
        gameStore: this,
      });

      this.renderer = markRaw({ ...renderer, animator, input });
      this.clearBonusPreview(true);

      if (this.board.length > 0) {
        this.refreshBoardVisuals(true);
      }
    },
    refreshBoardVisuals(forceRedraw = false) {
      if (!this.renderer || !this.currentBoardLayout) {
        return;
      }

      const { boardContainer, scene, animator } = this.renderer;
      const fallbackWidth =
        scene?.scale?.width ?? scene?.scale?.parentSize?.width ?? scene?.sys?.game?.canvas?.width;
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

      const shouldReset =
        (forceRedraw && !this.animationInProgress) || animator.indexToGemId.length === 0;

      if (shouldReset) {
        animator.reset(this.board, { boardCols: cols, boardRows: rows, cellSize });
      } else if (!this.animationInProgress) {
        animator.syncToBoard(this.board);
      }
    },
    async resolveSwap(aIndex, bIndex) {
      const session = this.sessionVersion;
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
      let boardUpdated = false;
      if (!canSwapGem(this.board[aIndex], tileA) || !canSwapGem(this.board[bIndex], tileB)) {
        if (animator && matchEngine.areAdjacent(aIndex, bIndex, cols)) {
          this.animationInProgress = true;
          try {
            await animator.animateInvalidSwap({ aIndex, bIndex });
          } finally {
            if (session === this.sessionVersion) {
              this.animationInProgress = false;
              this.processQueuedInput();
            }
          }
          if (session !== this.sessionVersion) return false;
        }
        if (this.sessionActive) {
          this.scheduleHint();
        }
        return false;
      }

      const evaluation = matchEngine.evaluateSwap(this.board, cols, rows, aIndex, bIndex, tiles);
      const isAdjacent = matchEngine.areAdjacent(aIndex, bIndex, cols);

      if (!evaluation.matches.length) {
        if (isAdjacent && animator) {
          this.animationInProgress = true;
          try {
            await animator.animateInvalidSwap({ aIndex, bIndex });
          } finally {
            if (session === this.sessionVersion) {
              this.animationInProgress = false;
              this.processQueuedInput();
            }
          }
          if (session !== this.sessionVersion) return false;
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
          if (session !== this.sessionVersion) return false;
        }

        const resolution = tileManager.getResolution({
          gemTypes: GEM_TYPES.slice(0, this.currentBoardLayout?.gemTypeCount ?? 6),
          board: evaluation.board,
          tiles: this.tiles,
          matches: evaluation.matches,
          cols,
          rows,
          bonusesCreated: evaluation.bonusesCreated,
          bonusIndices: evaluation.bonusIndices,
        });
        if (resolution.steps.length && evaluation.bonusSwap) {
          resolution.steps[0].bonusSwap = evaluation.bonusSwap;
        }
        const layersCleared = resolution.layersCleared ?? 0;
        this._applyScoring(resolution.steps);

        this.pendingBoardState = resolution.board;

        if (!animator) {
          this.board = resolution.board;
          this.updateObjectives();
          this.pendingBoardState = null;
          this.boardVersion += 1;
          if (layersCleared > 0) {
            this.remainingLayers = Math.max(0, this.remainingLayers - layersCleared);
            this.updateObjectives({ layersCleared });
          }
          this.refreshBoardVisuals(true);
          if (this.remainingLayers === 0 && this.sessionActive) {
            this.completeLevel();
          }
          this.moves += 1;
          boardUpdated = true;
          return true;
        }

        if (resolution.steps.length) {
          await animator.playSteps(resolution.steps);
          if (session !== this.sessionVersion) return false;
        }

        this.board = resolution.board;
        this.updateObjectives();
        this.pendingBoardState = null;
        this.boardVersion += 1;
        if (layersCleared > 0) {
          this.remainingLayers = Math.max(0, this.remainingLayers - layersCleared);
          this.updateObjectives({ layersCleared });
        }
        animator.updateTiles(this.tiles);

        if (this.remainingLayers === 0 && this.sessionActive) {
          this.completeLevel();
        }

        this.moves += 1;
        boardUpdated = true;
        return true;
      } catch (error) {
        console.error('Error in resolveSwap:', error);
        return false;
      } finally {
        if (session !== this.sessionVersion) return false;
        this.pendingBoardState = null;
        this.animationInProgress = false;
        if (this.sessionActive) {
          this.scheduleHint();
        }
        this.processQueuedInput();
        if (boardUpdated && this.sessionActive && !this.levelCleared) {
          await this.ensurePlayableBoard();
        }
      }
    },
    queueSwap(aIndex, bIndex) {
      if (!this.sessionActive || !this.animationInProgress || this.levelCleared) {
        return false;
      }

      const boardSnapshot = this.pendingBoardState ?? this.board;
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
      this.syncRunClock(false);
      this.sessionVersion += 1;
      this.cancelHint(true);
      if (scoreFlashTimeoutId) {
        clearTimeout(scoreFlashTimeoutId);
        scoreFlashTimeoutId = null;
      }
      if (reshuffleNoticeTimeoutId) {
        clearTimeout(reshuffleNoticeTimeoutId);
        reshuffleNoticeTimeoutId = null;
      }
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
      this.queuedBonus = null;
      this.activeBonusMode = null;
      this.renderer?.animator?.clearQueuedBonusHighlight?.();
      this.clearBonusPreview(true);
      this.totalLayers = 0;
      this.remainingLayers = 0;
      this.totalRelics = 0;
      this.levelCleared = false;
      this.levelRewards = [];
      clearTimeout(arcadeImpactTimeout);
      this.arcadeImpact = null;
      clearTimeout(arcadeBannerTimeout);
      this.arcadeBanner = null;
      this.scorePenaltyFlash = false;
      this.reshuffleNotice = null;
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
      if (
        this.levelCleared ||
        !this.sessionActive ||
        this.remainingLayers > 0 ||
        this.remainingRelics > 0
      )
        return;
      this.syncRunClock(false);
      this.levelRewards = useCampaignStore().recordVictory({
        elapsedMs: this.playClock.started ? this.elapsedMs : null,
        speedTargetMs: this.speedTargetMs,
        id: this.currentLevelId,
        score: this.score,
        combo: this.maxCascade,
        target: this.objectives.find((objective) => objective.type === 'score')?.target ?? 0,
      });
      this.cancelHint(true);
      if (scoreFlashTimeoutId) {
        clearTimeout(scoreFlashTimeoutId);
        scoreFlashTimeoutId = null;
      }
      if (reshuffleNoticeTimeoutId) {
        clearTimeout(reshuffleNoticeTimeoutId);
        reshuffleNoticeTimeoutId = null;
      }
      this.scorePenaltyFlash = false;
      this.reshuffleNotice = null;
      this.remainingLayers = 0;
      this.levelCleared = true;
      // Keep session active so the board remains visible behind the victory modal
      // this.sessionActive = false;
      this.animationInProgress = false;
      this.pendingBoardState = null;
      this.queuedSwap = null;
      this.queuedBonus = null;
      this.activeBonusMode = null;
      this.renderer?.animator?.clearQueuedSwapHighlight?.();
      this.renderer?.input?.reset();
      this.updateObjectives();
    },

    updateObjectives({ reset = false, scoreDelta = 0, layersCleared = 0 } = {}) {
      const layerObjective = this.objectives.find((objective) => objective.type === 'clear-layers');
      const scoreObjective = this.objectives.find((objective) => objective.type === 'score');
      const relicObjective = this.objectives.find(
        (objective) => objective.type === 'collect-relics',
      );
      if (relicObjective) relicObjective.progress = this.totalRelics - this.remainingRelics;

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
        const newScoreProgress = Math.max(0, (scoreObjective.progress ?? 0) + scoreDelta);
        scoreObjective.progress = Math.min(scoreObjective.target, newScoreProgress);
      }
    },
    _hasPlayableMove() {
      const cols = this.boardCols ?? this.boardSize ?? 8;
      const rows = this.boardRows ?? this.boardSize ?? 8;
      const board = this.activeBoard;

      if (
        !this.sessionActive ||
        this.levelCleared ||
        !Array.isArray(board) ||
        !board.length ||
        !cols ||
        !rows
      ) {
        return false;
      }

      return !!hintEngine.findBestMove(board, this.tiles ?? [], cols, rows, { first: true });
    },
    _triggerScorePenaltyFlash() {
      if (scoreFlashTimeoutId) {
        clearTimeout(scoreFlashTimeoutId);
      }
      this.scorePenaltyFlash = false;
      const enableFlash = () => {
        this.scorePenaltyFlash = true;
        scoreFlashTimeoutId = setTimeout(() => {
          this.scorePenaltyFlash = false;
        }, 1200);
      };
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(enableFlash);
      } else {
        enableFlash();
      }
    },
    _showReshuffleNotice(lostScore = 0) {
      if (reshuffleNoticeTimeoutId) {
        clearTimeout(reshuffleNoticeTimeoutId);
      }
      this.reshuffleNotice = {
        loss: lostScore,
        message: 'No moves left. A free shuffle to keep you going.',
        timestamp: Date.now(),
      };
      reshuffleNoticeTimeoutId = setTimeout(() => {
        this.reshuffleNotice = null;
      }, 2000);
    },
    async ensurePlayableBoard({ attempts = 0, noticeShown = false } = {}) {
      if (this.animationInProgress || !this.sessionActive || this.levelCleared) {
        return false;
      }

      const cols = this.boardCols ?? this.boardSize ?? 8;
      const rows = this.boardRows ?? this.boardSize ?? 8;
      const board = this.activeBoard;
      if (!Array.isArray(board) || !board.length || !cols || !rows) {
        return false;
      }

      if (this._hasPlayableMove()) {
        return false;
      }

      if (!noticeShown) {
        this._showReshuffleNotice();
        noticeShown = true;
      }

      const shuffleResult = await this.shuffleBoard();
      if (!shuffleResult) {
        return false;
      }

      if (!this._hasPlayableMove() && attempts < 2) {
        return this.ensurePlayableBoard({ attempts: attempts + 1, noticeShown });
      }

      return true;
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
      const session = this.sessionVersion;
      if (!this.sessionActive || this.animationInProgress || this.levelCleared) {
        return false;
      }
      this.cancelHint(true);
      const cols = this.boardCols ?? this.boardSize ?? 8;
      const rows = this.boardRows ?? this.boardSize ?? 8;
      const animator = this.renderer?.animator;

      const nextBoard = [...this.board];
      const movable = nextBoard
        .map((gem, index) => (canSwapGem(gem, this.tiles[index]) ? index : -1))
        .filter((index) => index >= 0);
      for (let i = movable.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const a = movable[i],
          b = movable[j];
        [nextBoard[a], nextBoard[b]] = [nextBoard[b], nextBoard[a]];
      }

      this.animationInProgress = true;
      this.pendingBoardState = nextBoard;

      const runAnimation = animator?.animateShuffle
        ? animator
            .animateShuffle(nextBoard, { cols, rows })
            .catch((error) => console.error('Shuffle animation failed:', error))
        : Promise.resolve();

      return runAnimation
        .then(() =>
          session === this.sessionVersion
            ? this._resolveBoardAfterShuffle(nextBoard, { cols, rows, animator })
            : false,
        )
        .finally(() => {
          if (session !== this.sessionVersion) return;
          this.pendingBoardState = null;
          this.animationInProgress = false;
          if (this.sessionActive) {
            this.scheduleHint();
          }
          this.processQueuedInput();
        });
    },
    async _resolveBoardAfterShuffle(nextBoard, { cols, rows, animator }) {
      const session = this.sessionVersion;
      try {
        const matches = matchEngine.findMatches(nextBoard, cols, rows, this.tiles);

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
          gemTypes: GEM_TYPES.slice(0, this.currentBoardLayout?.gemTypeCount ?? 6),
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

        if (animator && resolution.steps.length) {
          await animator.playSteps(resolution.steps);
          if (session !== this.sessionVersion) return false;
        }

        this.board = resolution.board;
        this.updateObjectives();
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
