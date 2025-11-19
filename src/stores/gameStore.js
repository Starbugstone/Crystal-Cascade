import { defineStore } from 'pinia';
import { generateLevelConfigs } from '../game/engine/LevelGenerator';
import { MatchEngine } from '../game/engine/MatchEngine';
import { TileManager } from '../game/engine/TileManager';
import { BonusResolver } from '../game/engine/BonusResolver';
import { HintEngine } from '../game/engine/HintEngine';
import { BoardAnimator } from '../game/phaser/BoardAnimator';
import { BoardInput } from '../game/phaser/BoardInput';

const matchEngine = new MatchEngine();
const tileManager = new TileManager();
const bonusActivator = new BonusActivator();
const hintEngine = new HintEngine();
const HINT_DELAY_MS = 15000;
let hintTimerId = null;

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
    cascadeMultiplier: 1,
    objectives: [],
    boardVersion: 0,
    renderer: null,
    availableLevels: [],
    shuffleAllowance: 3,
    reshufflesUsed: 0,
    animationInProgress: false,
    pendingBoardState: null,
    queuedSwap: null,
    totalLayers: 0,
    remainingLayers: 0,
    levelCleared: false,
    audioManager: null,
    hintMove: null,
    currentBoardLayout: null,
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
    async activateOneTimeBonus(bonusName) {
      if (!this.sessionActive || this.animationInProgress) {
        console.warn('Cannot activate bonus: session not active or animation in progress.');
        return false;
      }

      const cols = this.boardCols ?? this.boardSize ?? 8;
      const rows = this.boardRows ?? this.boardSize ?? 8;
      const animator = this.renderer?.animator;

      this.animationInProgress = true;
      try {
        const clearedIndices = bonusActivator.activateBonus(bonusName, this.board, cols, rows, -1); // -1 as index isn't relevant for these bonuses
        
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

        this.pendingBoardState = resolution.board;
        window.__currentBoard = this.pendingBoardState;

        if (animator && resolution.steps.length) {
          await animator.playSteps(resolution.steps);
        }

        this.board = resolution.board;
        this.pendingBoardState = null;
        this.boardVersion += 1;
        animator.updateTiles(this.tiles);
        window.__currentBoard = this.board;
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
    },
    startLevel(levelId) {
      const selected = this.availableLevels.find((entry) => entry.id === levelId);
      if (!selected) {
        console.warn('No level config found for id', levelId);
        return;
      }

      const { config } = selected;
      this.sessionActive = true;
      this.levelCleared = false;
      this.boardCols = config.boardCols ?? config.boardSize ?? 8;
      this.boardRows = config.boardRows ?? config.boardCols ?? config.boardSize ?? 8;
      this.boardSize = this.boardCols;
      this.board = config.board;
      this.currentBoardLayout = config.boardLayout;
      this.tiles = config.tiles;
      this.objectives = config.objectives.map((objective) => ({ ...objective, progress: 0 }));
      this.shuffleAllowance = config.shuffleAllowance;
      this.reshufflesUsed = 0;
      this.score = 0;
      this.cascadeMultiplier = 1;
      this.animationInProgress = false;
      this.pendingBoardState = null;
      this.queuedSwap = null;
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
      this.scheduleHint();
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

      if (this.board.length > 0) {
        this.refreshBoardVisuals(true);
      }
    },
    refreshBoardVisuals(forceRedraw = false) {
      if (!this.renderer) {
        return;
      }

      // Expose current board state for debugging
      window.__currentBoard = this.board;

      const { boardContainer, scene, animator } = this.renderer;
      const viewWidth = scene.scale.gameSize.width;
      const viewHeight = scene.scale.gameSize.height;

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
      if (!this.sessionActive) {
        return false;
      }

      this.cancelHint(true);

      if (this.animationInProgress) {
        return this.queueSwap(aIndex, bIndex);
      }

      const cols = this.boardCols ?? this.boardSize ?? 8;
      const rows = this.boardRows ?? this.boardSize ?? 8;
      const animator = this.renderer?.animator;
      const evaluation = matchEngine.evaluateSwap(this.board, cols, rows, aIndex, bIndex);
      const isAdjacent = matchEngine.areAdjacent(aIndex, bIndex, cols);

      if (!evaluation.matches.length) {
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
        if (animator && evaluation.swap) {
          await animator.animateSwap(evaluation.swap);
        }

        const breakdown = bonusResolver.resolve(evaluation);
        this.score += breakdown.scoreGain;
        this.cascadeMultiplier = breakdown.multiplier;
        this.updateObjectives({ scoreDelta: breakdown.scoreGain });

        const resolution = tileManager.getResolution({
          board: breakdown.board,
          tiles: this.tiles,
          matches: breakdown.matches,
          cols,
          rows,
          bonusCreated: breakdown.bonusCreated,
          bonusIndex: breakdown.bonusIndex,
        });
        const layersCleared = resolution.layersCleared ?? 0;

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
      if (!this.sessionActive || !this.animationInProgress) {
        return false;
      }

      const boardSnapshot = this.pendingBoardState;
      if (!boardSnapshot) {
        return false;
      }

      const cols = this.boardCols ?? this.boardSize ?? 8;
      const rows = this.boardRows ?? this.boardSize ?? 8;
      const animator = this.renderer?.animator;
      const evaluation = matchEngine.evaluateSwap(boardSnapshot, cols, rows, aIndex, bIndex);

      if (!evaluation.matches.length) {
        return false;
      }

      this.queuedSwap = { aIndex, bIndex };
      animator?.showQueuedSwap(aIndex, bIndex);
      return true;
    },
    exitLevel() {
      this.cancelHint(true);
      this.sessionActive = false;
      this.board = [];
      this.tiles = [];
      this.objectives = [];
      this.score = 0;
      this.cascadeMultiplier = 1;
      this.shuffleAllowance = 3;
      this.reshufflesUsed = 0;
      this.animationInProgress = false;
      this.pendingBoardState = null;
      this.queuedSwap = null;
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
    },

    completeLevel() {
      this.cancelHint(true);
      this.remainingLayers = 0;
      this.levelCleared = true;
      this.sessionActive = false;
      this.animationInProgress = false;
      this.pendingBoardState = null;
      this.queuedSwap = null;
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
  },
});
