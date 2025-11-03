export class BoardInput {
  constructor({ scene, boardContainer, gameStore }) {
    this.scene = scene;
    this.boardContainer = boardContainer;
    this.gameStore = gameStore;

    this.layout = {
      boardSize: 0,
      cellSize: 0,
    };

    this.startCell = null;
    this.selectedCell = null;
    this.isDragging = false;

    this.scene.input.on('pointerdown', this.handlePointerDown, this);
    this.scene.input.on('pointermove', this.handlePointerMove, this);
    this.scene.input.on('pointerup', this.handlePointerUp, this);
    this.scene.input.on('pointerupoutside', this.handlePointerUp, this);
  }

  destroy() {
    this.scene.input.off('pointerdown', this.handlePointerDown, this);
    this.scene.input.off('pointermove', this.handlePointerMove, this);
    this.scene.input.off('pointerup', this.handlePointerUp, this);
    this.scene.input.off('pointerupoutside', this.handlePointerUp, this);
    this.reset();
  }

  reset() {
    this.startCell = null;
    this.selectedCell = null;
    this.isDragging = false;
    this.clearHighlights();
  }

  setLayout({ boardSize, cellSize }) {
    this.layout.boardSize = boardSize;
    this.layout.cellSize = cellSize;
  }

  handlePointerDown(pointer) {
    if (!this.gameStore.sessionActive || this.gameStore.animationInProgress) {
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
      return;
    }

    const currentCell = this.getCellIndexFromPointer(pointer);
    if (currentCell != null && currentCell !== this.startCell) {
      this.isDragging = true;
    }
  }

  async handlePointerUp(pointer) {
    if (
      this.startCell == null ||
      !this.gameStore.sessionActive ||
      this.gameStore.animationInProgress
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
  }

  getCellIndexFromPointer(pointer) {
    const { boardSize, cellSize } = this.layout;
    if (!boardSize || !cellSize) {
      return null;
    }

    const pointerX = typeof pointer.worldX === 'number' ? pointer.worldX : pointer.x;
    const pointerY = typeof pointer.worldY === 'number' ? pointer.worldY : pointer.y;

    const localX = pointerX - this.boardContainer.x;
    const localY = pointerY - this.boardContainer.y;
    const boardSide = boardSize * cellSize;

    if (localX < 0 || localY < 0 || localX >= boardSide || localY >= boardSide) {
      return null;
    }

    const col = Math.floor(localX / cellSize);
    const row = Math.floor(localY / cellSize);

    if (col < 0 || row < 0 || col >= boardSize || row >= boardSize) {
      return null;
    }

    return row * boardSize + col;
  }

  highlightCell(index) {
    const gem = this.gameStore.board[index];
    if (!gem) {
      return;
    }

    gem.highlight = true;
    const animator = this.gameStore.renderer?.animator;
    animator?.highlightCell(index, true);
    animator?.setGemHighlight(index, true);
  }

  clearHighlights() {
    const animator = this.gameStore.renderer?.animator;

    this.gameStore.board.forEach((gem) => {
      if (gem) {
        gem.highlight = false;
      }
    });

    animator?.clearCellHighlights();
    animator?.clearGemHighlights();
  }
}
