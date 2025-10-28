import { defineStore } from 'pinia';
import { Graphics, Sprite } from 'pixi.js';
import { generateLevelConfigs } from '../game/engine/LevelGenerator';
import { MatchEngine } from '../game/engine/MatchEngine';
import { TileManager } from '../game/engine/TileManager';
import { BonusResolver } from '../game/engine/BonusResolver';

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
      this.boardVersion += 1;
      this.refreshBoardVisuals();
    },
    attachRenderer(renderer) {
      this.renderer = renderer;
      // If there's already a board, refresh visuals now
      if (this.board.length > 0) {
        this.refreshBoardVisuals();
      }
    },
    refreshBoardVisuals(forceRedraw = false) {
      if (!this.renderer) {
        return;
      }

      const { boardContainer, app, sprites } = this.renderer;
      const viewWidth = app.screen.width;
      const viewHeight = app.screen.height;

      if (!viewWidth || !viewHeight) return;

      const gridSize = this.boardSize;
      const boardSide = Math.min(viewWidth, viewHeight);
      const cellSize = boardSide / gridSize;
      const offsetX = (viewWidth - boardSide) / 2;
      const offsetY = (viewHeight - boardSide) / 2;

      if (forceRedraw) {
        boardContainer.removeChildren().forEach((child) => child.destroy());
      }

      boardContainer.position.set(offsetX, offsetY);

      this.board.forEach((cell, index) => {
        if (!cell) return;

        const col = index % gridSize;
        const row = Math.floor(index / gridSize);
        const x = col * cellSize;
        const y = row * cellSize;

        // Draw cell border/background
        const cellBorder = new Graphics();
        cellBorder.rect(x, y, cellSize, cellSize);
        cellBorder.stroke({ width: 2, color: 0x87CEEB, alpha: 0.4 });
        cellBorder.fill({ color: 0x1e293b, alpha: 0.3 });
        cellBorder.zIndex = 0;
        boardContainer.addChild(cellBorder);

        const texture = sprites[cell.type];
        if (!texture) {
          console.warn(`Missing texture for type: ${cell.type}`);
          return;
        }

        const gemSprite = new Sprite(texture);
        const spriteSize = cellSize * 0.85; // Slightly smaller than the cell
        gemSprite.width = spriteSize;
        gemSprite.height = spriteSize;
        gemSprite.anchor.set(0.5);

        gemSprite.x = x + cellSize / 2;
        gemSprite.y = y + cellSize / 2;
        gemSprite.zIndex = 1;

        boardContainer.addChild(gemSprite);
      });

      if (boardContainer.sortableChildren) {
        boardContainer.sortChildren();
      }

      app.render();
    },
    resolveSwap(aIndex, bIndex) {
      if (!this.sessionActive) {
        return false;
      }
      const result = matchEngine.evaluateSwap(this.board, this.boardSize, aIndex, bIndex);
      if (!result.matches.length) {
        return false;
      }

      const breakdown = bonusResolver.resolve(result);
      this.applyMatchResult(breakdown);
      return true;
    },
    applyMatchResult(payload) {
      this.score += payload.scoreGain;
      this.cascadeMultiplier = payload.multiplier;
      this.board = tileManager.applyMatchResult({
        board: payload.board,
        tiles: this.tiles,
        matches: payload.matches,
        size: this.boardSize,
        bonusCreated: payload.bonusCreated,
        bonusIndex: payload.bonusIndex,
      });
      this.refreshBoardVisuals(true);
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
      if (this.renderer?.boardContainer) {
        this.renderer.boardContainer.removeChildren();
      }
      this.boardVersion += 1;
    },
  },
});
