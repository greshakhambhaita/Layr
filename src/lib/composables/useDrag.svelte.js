/**
 * Composable for dragging cells and snapping them to the grid.
 */

export function useDrag(store, bentoElGetter, bentoScaleWrapGetter, options = {}) {
  let isDragging = $state(false);
  let dragSourceId = $state(null);
  let dragOffsetX = $state(0);
  let dragOffsetY = $state(0);
  let ghostPos = $state({ x: 0, y: 0, w: 0, h: 0 });
  let snapSlot = $state(null);
  let snapStatus = $state(null); // 'free' | 'swap' | 'invalid'
  let snapPlan = $state(null);

  function getSlotFromPoint(cx, cy, scale) {
    const bentoEl = bentoElGetter();
    if (!bentoEl) return null;
    const rect = bentoEl.getBoundingClientRect();
    if (cx < rect.left || cx > rect.right || cy < rect.top || cy > rect.bottom)
      return null;

    const internalX = (cx - rect.left) / scale;
    const internalY = (cy - rect.top) / scale;

    const { cols, rows, width } = store.getPreviewGridDimensions();
    const cellW = (width + store.gridGap) / cols;
    // We don't have a fixed height for the preview, so we use the same aspect as desktop or estimate
    const cellH = (store.gridHeight + store.gridGap) / store.internalRows; 

    return {
      c: Math.max(0, Math.min(Math.floor(internalX / cellW), cols - 1)),
      r: Math.max(0, Math.min(Math.floor(internalY / cellH), rows - 1)),
    };
  }

  function handleDragStart(e, id, scale, isMobile, isMultiSelectMode) {
    if (options.isResizing?.() || (e.touches && e.touches.length > 1)) return;

    e.stopPropagation();

    const isShift = e.shiftKey;
    const isMultiSelect = isShift || (isMobile && isMultiSelectMode);
    if (isMultiSelect) {
      e.preventDefault();
      store.toggleSelection(id, true);
      return;
    }

    const cellEl = e.currentTarget.querySelector(".cell") || e.currentTarget;
    const rect = cellEl.getBoundingClientRect();
    const wrapRect = bentoScaleWrapGetter().getBoundingClientRect();

    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY;

    if (clientX === undefined) return;

    isDragging = true;
    dragSourceId = id;
    dragOffsetX = clientX - rect.left;
    dragOffsetY = clientY - rect.top;

    ghostPos = {
      x: rect.left - wrapRect.left,
      y: rect.top - wrapRect.top,
      w: rect.width,
      h: rect.height,
    };

    store.toggleSelection(id, isShift);
  }

  function handleMouseMove(e, scale) {
    if (isDragging) {
      const clientX = e.clientX ?? e.touches?.[0]?.clientX;
      const clientY = e.clientY ?? e.touches?.[0]?.clientY;
      if (clientX === undefined) return;

      const wrapRect = bentoScaleWrapGetter().getBoundingClientRect();
      ghostPos.x = clientX - dragOffsetX - wrapRect.left;
      ghostPos.y = clientY - dragOffsetY - wrapRect.top;

      const { cols, width } = store.getPreviewGridDimensions();
      const cellW = width / cols;
      
      const snapX = clientX - dragOffsetX + (cellW / 2) * scale;
      const snapY = clientY - dragOffsetY + (store.gridHeight / store.internalRows / 2) * scale;

      const slot = getSlotFromPoint(snapX, snapY, scale);
      if (slot) {
        snapSlot = slot;
        const plan = store.computeDisplacePlan(dragSourceId, slot.r, slot.c);
        snapPlan = plan;
        if (!plan) snapStatus = "invalid";
        else if (plan.moves.length === 0) snapStatus = "free";
        else snapStatus = "swap";
      } else {
        snapSlot = null;
        snapStatus = null;
      }
    }
  }

  function handleMouseUp() {
    if (isDragging) {
      if (snapSlot && snapPlan) {
        store.applyMove(dragSourceId, snapSlot.r, snapSlot.c, snapPlan.moves);
      }
      isDragging = false;
      dragSourceId = null;
      snapSlot = null;
    }
  }

  return {
    get isDragging() { return isDragging; },
    get dragSourceId() { return dragSourceId; },
    get ghostPos() { return ghostPos; },
    get snapSlot() { return snapSlot; },
    get snapStatus() { return snapStatus; },
    handleDragStart,
    handleMouseMove,
    handleMouseUp,
    getSlotFromPoint
  };
}
