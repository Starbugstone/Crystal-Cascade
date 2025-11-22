export class BoardInput {
  constructor({ scene, boardContainer, gameStore }) {
    this.scene = scene;
    this.boardContainer = boardContainer;
    this.gameStore = gameStore;

    this.layout = {
      boardCols: 0,
      boardRows: 0,
      cellSize: 0,
    };

    this.startCell = null;
    this.selectedCell = null;
    this.isDragging = false;

    const input = this.scene?.input;
    if (!input?.on) {
      return;
    }

    input.on('pointerdown', this.handlePointerDown, this);
    input.on('pointermove', this.handlePointerMove, this);
    input.on('pointerup', this.handlePointerUp, this);
    input.on('pointerupoutside', this.handlePointerUp, this);
  }

  destroy() {
    const input = this.scene?.input;
    if (!input?.off) {
      return;
    }
    input.off('pointerdown', this.handlePointerDown, this);
    input.off('pointermove', this.handlePointerMove, this);
    input.off('pointerup', this.handlePointerUp, this);
    input.off('pointerupoutside', this.handlePointerUp, this);
    this.reset();
  }

  reset() {
    this.startCell = null;
    this.selectedCell = null;
    this.isDragging = false;
    this.clearHighlights();
  }

  setLayout({ boardCols, boardRows, cellSize }) {
    this.layout.boardCols = boardCols;
    this.layout.boardRows = boardRows;
    this.layout.cellSize = cellSize;
  }

  handlePointerDown(pointer) {
    if (this.gameStore?.sessionActive && typeof this.gameStore.notifyPlayerActivity === 'function') {
      this.gameStore.notifyPlayerActivity();
    }

    if (!this.gameStore.sessionActive) {
      return;
    }

    const cell = this.getCellIndexFromPointer(pointer);
    this.startCell = cell;
    this.isDragging = false;
  }

  handlePointerMove(pointer) {
    if (
      this.startCell == null ||
      !this.gameStore.sessionActive ||
      this.gameStore.animationInProgress
    ) {
      this.gameStore.clearBonusPreview();
      return;
    }

    const currentCell = this.getCellIndexFromPointer(pointer);
    if (currentCell != null && currentCell !== this.startCell) {
      this.gameStore.previewBonusSwap(this.startCell, currentCell);
      if (!this.isDragging && typeof this.gameStore.notifyPlayerActivity === 'function') {
        this.gameStore.notifyPlayerActivity();
      }
      this.isDragging = true;
    } else if (this.isDragging) {
      this.gameStore.clearBonusPreview();
    }
  }

  async handlePointerUp(pointer) {
    if (this.gameStore?.sessionActive && typeof this.gameStore.notifyPlayerActivity === 'function') {
      this.gameStore.notifyPlayerActivity();
    }

    if (
      this.startCell == null ||
      !this.gameStore.sessionActive
    ) {
      this.startCell = null;
      this.isDragging = false;
      return;
    }

    const endCell = this.getCellIndexFromPointer(pointer);

    if (endCell == null) {
      this.startCell = null;
      this.isDragging = false;
      return;
    }

    if (this.isDragging && endCell !== this.startCell) {
      this.clearHighlights();
      this.selectedCell = null;
      this.gameStore.clearBonusPreview();
      await this.gameStore.resolveSwap(this.startCell, endCell);
      this.startCell = null;
      this.isDragging = false;
      return;
    }

    if (endCell === this.startCell) {
      if (this.selectedCell != null) {
        if (this.selectedCell === endCell) {
          this.clearHighlights();
          this.selectedCell = null;
        } else {
          const firstCell = this.selectedCell;
          this.clearHighlights();
          this.selectedCell = null;
          this.gameStore.clearBonusPreview();
          await this.gameStore.resolveSwap(firstCell, endCell);
        }
      } else {
        this.clearHighlights();
        this.selectedCell = endCell;
        this.highlightCell(endCell);
      }
    }

    this.startCell = null;
    this.isDragging = false;
    this.gameStore.clearBonusPreview();
  }

  getCellIndexFromPointer(pointer) {
    const { boardCols, boardRows, cellSize } = this.layout;
    if (!boardCols || !boardRows || !cellSize) {
      return null;
    }

    const pointerX = typeof pointer.worldX === 'number' ? pointer.worldX : pointer.x;
    const pointerY = typeof pointer.worldY === 'number' ? pointer.worldY : pointer.y;

    const localX = pointerX - this.boardContainer.x;
    const localY = pointerY - this.boardContainer.y;
    const boardWidth = boardCols * cellSize;
    const boardHeight = boardRows * cellSize;

    if (localX < 0 || localY < 0 || localX >= boardWidth || localY >= boardHeight) {
      return null;
    }

    const col = Math.floor(localX / cellSize);
    const row = Math.floor(localY / cellSize);

    if (col < 0 || row < 0 || col >= boardCols || row >= boardRows) {
      return null;
    }

    return row * boardCols + col;
  }

  highlightCell(index) {
    const board = this.gameStore.activeBoard;
    const gem = board?.[index];
    if (gem) {
      gem.highlight = true;
    }

    const animator = this.gameStore.renderer?.animator;
    animator?.highlightCell(index, true);
    animator?.setGemHighlight(index, true);
  }

  clearHighlights() {
    const animator = this.gameStore.renderer?.animator;

    const processed = new Set();
    [this.gameStore.board, this.gameStore.pendingBoardState].forEach((board) => {
      if (!Array.isArray(board) || processed.has(board)) {
        return;
      }
      processed.add(board);
      board.forEach((gem) => {
        if (gem) {
          gem.highlight = false;
        }
      });
    });

    animator?.clearCellHighlights();
    animator?.clearGemHighlights();
  }
}
