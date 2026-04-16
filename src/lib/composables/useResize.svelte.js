/**
 * Composable for resizing cells.
 */

export function useResize(store, bentoElGetter, options = {}) {
  let isResizing = $state(false);
  let resizeCellId = $state(null);
  let resizeCorner = $state(null);
  let resizeAnchor = $state({ r: 0, c: 0 });
  let resizeGhost = $state({
    top: 0,
    left: 0,
    width: 0,
    height: 0,
    blocked: false,
  });
  let resizeStart = $state({ x: 0, y: 0, rect: null });

  function handleResizeStart(id, corner, cx, cy, scale) {
    isResizing = true;
    resizeCellId = id;
    resizeCorner = corner;

    const meta = store.cellMeta[id];
    const { r, c, colSpan, rowSpan } = meta;

    if (corner === "se") resizeAnchor = { r, c };
    if (corner === "sw") resizeAnchor = { r, c: c + colSpan - 1 };
    if (corner === "ne") resizeAnchor = { r: r + rowSpan - 1, c };
    if (corner === "nw") resizeAnchor = { r: r + rowSpan - 1, c: c + colSpan - 1 };

    const bentoEl = bentoElGetter();
    const cellEl = bentoEl.querySelector(`.cell-${id}`);
    const rect = cellEl.getBoundingClientRect();
    const bentoRect = bentoEl.getBoundingClientRect();

    resizeStart = {
      x: cx,
      y: cy,
      rect: {
        top: (rect.top - bentoRect.top) / scale,
        left: (rect.left - bentoRect.left) / scale,
        width: rect.width / scale,
        height: rect.height / scale,
      },
    };

    resizeGhost = { ...resizeStart.rect, blocked: false };
  }

  function updateResizeGhost(cx, cy, scale) {
    const dx = (cx - resizeStart.x) / scale;
    const dy = (cy - resizeStart.y) / scale;
    const rect = resizeStart.rect;

    let left = rect.left,
      top = rect.top,
      width = rect.width,
      height = rect.height;

    if (resizeCorner === "se") {
      width += dx;
      height += dy;
    } else if (resizeCorner === "sw") {
      left += dx;
      width -= dx;
      height += dy;
    } else if (resizeCorner === "ne") {
      top += dy;
      width += dx;
      height -= dy;
    } else {
      top += dy;
      left += dx;
      width -= dx;
      height -= dy;
    }

    resizeGhost.left = Math.max(0, left);
    resizeGhost.top = Math.max(0, top);
    resizeGhost.width = Math.max(20, width);
    resizeGhost.height = Math.max(20, height);

    const slot = options.getSlotFromPoint?.(cx, cy, scale);
    if (slot) {
      const footprint = computeNewFootprint(resizeCorner, resizeAnchor, slot);
      const plan = store.planResize(
        resizeCellId,
        footprint.r,
        footprint.c,
        footprint.rowSpan,
        footprint.colSpan,
      );

      if (plan) {
        resizeGhost.blocked = false;
        store.applyResize(resizeCellId, plan);
      } else {
        resizeGhost.blocked = true;
      }
    }
  }

  function handleMouseMove(e, scale) {
    if (isResizing) {
      const clientX = e.clientX || (e.touches && e.touches[0].clientX);
      const clientY = e.clientY || (e.touches && e.touches[0].clientY);
      updateResizeGhost(clientX, clientY, scale);
    }
  }

  function handleMouseUp() {
    if (isResizing) {
      isResizing = false;
      resizeCellId = null;
    }
  }

  function computeNewFootprint(corner, anchor, slot) {
    let r, c, rs, cs;
    if (corner === "se") {
      r = anchor.r;
      c = anchor.c;
      rs = Math.max(1, slot.r - anchor.r + 1);
      cs = Math.max(1, slot.c - anchor.c + 1);
    } else if (corner === "sw") {
      r = anchor.r;
      c = Math.min(slot.c, anchor.c);
      rs = Math.max(1, slot.r - anchor.r + 1);
      cs = Math.max(1, anchor.c - slot.c + 1);
    } else if (corner === "ne") {
      c = anchor.c;
      r = Math.min(slot.r, anchor.r);
      cs = Math.max(1, slot.c - anchor.c + 1);
      rs = Math.max(1, anchor.r - slot.r + 1);
    } else {
      r = Math.min(slot.r, anchor.r);
      c = Math.min(slot.c, anchor.c);
      rs = Math.max(1, anchor.r - slot.r + 1);
      cs = Math.max(1, anchor.c - slot.c + 1);
    }
    return { r, c, rowSpan: rs, colSpan: cs };
  }

  return {
    get isResizing() { return isResizing; },
    get resizeCellId() { return resizeCellId; },
    get resizeGhost() { return resizeGhost; },
    handleResizeStart,
    handleMouseMove,
    handleMouseUp
  };
}
