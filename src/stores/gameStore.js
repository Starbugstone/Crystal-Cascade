import { defineStore } from 'pinia';
import { generateLevelConfigs } from '../game/engine/LevelGenerator';
import { MatchEngine } from '../game/engine/MatchEngine';
import { TileManager } from '../game/engine/TileManager';
import { BonusResolver } from '../game/engine/BonusResolver';
import { BoardAnimator } from '../game/phaser/BoardAnimator';
import { BoardInput } from '../game/phaser/BoardInput';

const matchEngine = new MatchEngine();
const tileManager = new TileManager();
const bonusResolver = new BonusResolver();

export const useGameStore = defineStore('game', {
  state: () => ({
    sessionActive: false,
    board: [],
    tiles: [],
    boardSize: 8,
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
  }),
  actions: {
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
      this.boardSize = config.boardSize;
      this.board = config.board;
      this.tiles = config.tiles;
      this.objectives = config.objectives;
      this.shuffleAllowance = config.shuffleAllowance;
      this.reshufflesUsed = 0;
      this.score = 0;
      this.cascadeMultiplier = 1;
      this.animationInProgress = false;
      this.boardVersion += 1;
      this.refreshBoardVisuals(true);
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
        gemLayer: renderer.gemLayer,
        fxLayer: renderer.fxLayer,
        textures: renderer.textures,
        bonusAnimations: renderer.bonusAnimations,
        particles: renderer.particles,
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

      const gridSize = this.boardSize;
      const boardSide = Math.min(viewWidth, viewHeight);
      const cellSize = boardSide / gridSize;
      const offsetX = (viewWidth - boardSide) / 2;
      const offsetY = (viewHeight - boardSide) / 2;

      this.cellSize = cellSize;
      boardContainer.setPosition(offsetX, offsetY);

      if (!animator) {
        return;
      }

      animator.setLayout({ boardSize: gridSize, cellSize });
      this.renderer.input?.setLayout({ boardSize: gridSize, cellSize });

      const shouldReset = ((forceRedraw && !this.animationInProgress) || animator.indexToGemId.length === 0);

      if (shouldReset) {
        animator.reset(this.board, { boardSize: gridSize, cellSize });
      } else {
        animator.syncToBoard(this.board);
      }

    },
    async resolveSwap(aIndex, bIndex) {
      if (!this.sessionActive || this.animationInProgress) {
        return false;
      }

      const evaluation = matchEngine.evaluateSwap(this.board, this.boardSize, aIndex, bIndex);
      const animator = this.renderer?.animator;
      const isAdjacent = matchEngine.areAdjacent(aIndex, bIndex, this.boardSize);

      if (!evaluation.matches.length) {
        if (isAdjacent && animator) {
          await animator.animateInvalidSwap({ aIndex, bIndex });
        }
        return false;
      }

      this.animationInProgress = true;

      try {
        if (animator && evaluation.swap) {
          await animator.animateSwap(evaluation.swap);
        }

        const breakdown = bonusResolver.resolve(evaluation);
        this.score += breakdown.scoreGain;
        this.cascadeMultiplier = breakdown.multiplier;

        const resolution = tileManager.getResolution({
          board: breakdown.board,
          tiles: this.tiles,
          matches: breakdown.matches,
          size: this.boardSize,
          bonusCreated: breakdown.bonusCreated,
          bonusIndex: breakdown.bonusIndex,
        });

        if (!animator) {
          this.board = resolution.board;
          this.boardVersion += 1;
          this.refreshBoardVisuals(true);
          return true;
        }

        if (resolution.steps.length) {
          await animator.playSteps(resolution.steps);
        }

        this.board = resolution.board;
        this.boardVersion += 1;
        
        // Update the exposed board reference for debugging
        window.__currentBoard = this.board;
        
        return true;
      } catch (error) {
        console.error('Error in resolveSwap:', error);
        return false;
      } finally {
        this.animationInProgress = false;
      }
    },
    exitLevel() {
      this.sessionActive = false;
      this.board = [];
      this.tiles = [];
      this.objectives = [];
      this.score = 0;
      this.cascadeMultiplier = 1;
      this.shuffleAllowance = 3;
      this.reshufflesUsed = 0;
      this.animationInProgress = false;
      if (this.renderer?.animator) {
        this.renderer.animator.clear();
      } else if (this.renderer?.boardContainer) {
        this.renderer.boardContainer.removeAll?.(true);
      }
      this.renderer?.input?.reset();
      this.boardVersion += 1;
    },
  },
});
