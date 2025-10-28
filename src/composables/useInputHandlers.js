export const useInputHandlers = (gameStore) => {
  let startCell = null;

  const getCellIndexFromEvent = (event) => {
    const root = event.currentTarget;
    if (!root) {
      return null;
    }

    const rect = root.getBoundingClientRect();
    const boardSize = gameStore.boardSize;
    const viewSize = Math.min(rect.width, rect.height);
    const margin = viewSize * 0.05;
    const effectiveSide = viewSize - margin * 2;
    const offsetX = (rect.width - viewSize) / 2 + margin;
    const offsetY = (rect.height - viewSize) / 2 + margin;
    const relativeX = event.clientX - rect.left - offsetX;
    const relativeY = event.clientY - rect.top - offsetY;

    if (relativeX < 0 || relativeY < 0 || relativeX > effectiveSide || relativeY > effectiveSide) {
      return null;
    }

    const col = Math.floor((relativeX / effectiveSide) * boardSize);
    const row = Math.floor((relativeY / effectiveSide) * boardSize);

    if (col < 0 || row < 0 || col >= boardSize || row >= boardSize) {
      return null;
    }

    return row * boardSize + col;
  };

  const handlePointerDown = (event) => {
    startCell = getCellIndexFromEvent(event);
  };

  const handlePointerUp = (event) => {
    if (startCell == null) {
      return;
    }
    const endCell = getCellIndexFromEvent(event);
    if (endCell != null && endCell !== startCell) {
      gameStore.resolveSwap(startCell, endCell);
    }
    startCell = null;
  };

  const bindBoardInput = (root) => {
    if (!root) {
      return;
    }
    root.addEventListener('pointerdown', handlePointerDown);
    root.addEventListener('pointerup', handlePointerUp);
  };

  const unbindBoardInput = (root) => {
    if (!root) {
      return;
    }
    root.removeEventListener('pointerdown', handlePointerDown);
    root.removeEventListener('pointerup', handlePointerUp);
  };

  return {
    bindBoardInput,
    unbindBoardInput,
  };
};
