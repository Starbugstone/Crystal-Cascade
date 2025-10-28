export const useInputHandlers = (gameStore) => {
  let startCell = null;
  let selectedCell = null;
  let isDragging = false;

  const getCellIndexFromEvent = (event) => {
    const root = event.currentTarget;
    if (!root) {
      return null;
    }

    const rect = root.getBoundingClientRect();
    const boardSize = gameStore.boardSize;
    const viewSize = Math.min(rect.width, rect.height);
    const offsetX = (rect.width - viewSize) / 2;
    const offsetY = (rect.height - viewSize) / 2;
    const relativeX = event.clientX - rect.left - offsetX;
    const relativeY = event.clientY - rect.top - offsetY;

    if (relativeX < 0 || relativeY < 0 || relativeX > viewSize || relativeY > viewSize) {
      return null;
    }

    const clampedX = Math.min(Math.max(relativeX, 0), viewSize - 0.0001);
    const clampedY = Math.min(Math.max(relativeY, 0), viewSize - 0.0001);

    const col = Math.floor((clampedX / viewSize) * boardSize);
    const row = Math.floor((clampedY / viewSize) * boardSize);

    if (col < 0 || row < 0 || col >= boardSize || row >= boardSize) {
      return null;
    }

    return row * boardSize + col;
  };

  const highlightCell = (index) => {
    if (index == null || !gameStore.board[index]) {
      return;
    }
    gameStore.board[index].highlight = true;
    
    // Also highlight the background cell
    const animator = gameStore.renderer?.animator;
    if (animator) {
      animator.highlightCell(index, true);
    }
    
    gameStore.refreshBoardVisuals(false);
  };

  const clearHighlights = () => {
    gameStore.board.forEach((gem) => {
      if (gem) {
        gem.highlight = false;
      }
    });
    
    // Also clear background cell highlights
    const animator = gameStore.renderer?.animator;
    if (animator) {
      animator.clearCellHighlights();
    }
    
    gameStore.refreshBoardVisuals(false);
  };

  const handlePointerDown = (event) => {
    console.log('Pointer down detected', event);
    if (gameStore.animationInProgress) {
      console.log('Animation in progress, ignoring input');
      return;
    }
    
    startCell = getCellIndexFromEvent(event);
    console.log('Start cell:', startCell);
    isDragging = false;
  };

  const handlePointerMove = (event) => {
    if (startCell == null || gameStore.animationInProgress) {
      return;
    }
    
    const currentCell = getCellIndexFromEvent(event);
    if (currentCell != null && currentCell !== startCell) {
      isDragging = true;
    }
  };

  const handlePointerUp = (event) => {
    console.log('Pointer up detected', { startCell, isDragging });
    if (startCell == null || gameStore.animationInProgress) {
      return;
    }

    const endCell = getCellIndexFromEvent(event);
    console.log('End cell:', endCell);
    
    if (endCell == null) {
      startCell = null;
      isDragging = false;
      return;
    }

    // If this was a drag operation
    if (isDragging && endCell !== startCell) {
      console.log('Processing drag swap:', startCell, '->', endCell);
      clearHighlights();
      selectedCell = null;
      gameStore.resolveSwap(startCell, endCell);
      startCell = null;
      isDragging = false;
      return;
    }

    // Click behavior (not a drag)
    if (endCell === startCell) {
      // If there's already a selected cell
      if (selectedCell != null) {
        // If clicking the same cell, deselect it
        if (selectedCell === endCell) {
          console.log('Deselecting cell:', selectedCell);
          clearHighlights();
          selectedCell = null;
        } else {
          // Otherwise swap the two cells
          console.log('Processing click swap:', selectedCell, '->', endCell);
          clearHighlights();
          const firstCell = selectedCell;
          selectedCell = null;
          gameStore.resolveSwap(firstCell, endCell);
        }
      } else {
        // No cell selected yet, select this one
        console.log('Selecting cell:', endCell);
        clearHighlights();
        selectedCell = endCell;
        highlightCell(selectedCell);
      }
    }

    startCell = null;
    isDragging = false;
  };

  const bindBoardInput = (root) => {
    if (!root) {
      return;
    }
    root.addEventListener('pointerdown', handlePointerDown);
    root.addEventListener('pointermove', handlePointerMove);
    root.addEventListener('pointerup', handlePointerUp);
  };

  const unbindBoardInput = (root) => {
    if (!root) {
      return;
    }
    root.removeEventListener('pointerdown', handlePointerDown);
    root.removeEventListener('pointermove', handlePointerMove);
    root.removeEventListener('pointerup', handlePointerUp);
  };

  return {
    bindBoardInput,
    unbindBoardInput,
  };
};
