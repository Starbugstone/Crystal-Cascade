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
