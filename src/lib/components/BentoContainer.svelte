<script>
  import { onMount } from "svelte";
  import GridCell from "./GridCell.svelte";

  let { store } = $props();

  let bentoEl = $state(null);
  let bentoScaleWrap = $state(null);
  let scale = $state(1);
  let isPanning = $state(false);
  let panStart = $state({ x: 0, y: 0, offX: 0, offY: 0 });
  let isSpacePressed = $state(false);
  let isMobile = $state(false);
  let isMultiSelectMode = $state(false);

  // Interaction states
  let isDragging = $state(false);
  let dragSourceId = $state(null);
  let dragOffsetX = $state(0);
  let dragOffsetY = $state(0);
  let ghostPos = $state({ x: 0, y: 0, w: 0, h: 0 });
  let snapSlot = $state(null);
  let snapStatus = $state(null); // 'free' | 'swap' | 'invalid'
  let snapPlan = $state(null);

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

  // Compute Hero ID
  let heroId = $derived.by(() => {
    let max = 0,
      hId = null;
    Object.entries(store.cellMeta).forEach(([id, m]) => {
      let s = m.colSpan * m.rowSpan;
      if (s > max) {
        max = s;
        hId = id;
      }
    });
    return hId;
  });

  // Computed scaled dimensions for container sizing
  let scaledWidth = $derived(store.gridWidth * scale);
  let scaledHeight = $derived(store.gridHeight * scale);

  function updateScale() {
    if (!bentoScaleWrap || !bentoEl) return;

    isMobile = window.innerWidth < 1024;
    const isSmallMobile = window.innerWidth < 640;

    // Calculate available width with appropriate padding
    const padding = isSmallMobile ? 32 : isMobile ? 48 : 96;
    const availW = window.innerWidth - padding;

    // Also consider available height on mobile (leave room for bottom bar and hint)
    const availH = isMobile ? window.innerHeight - 180 : Infinity;

    // Calculate scale to fit the grid within available space (both width and height)
    const scaleByWidth = availW / store.gridWidth;
    const scaleByHeight = availH / store.gridHeight;
    const targetScale = Math.min(scaleByWidth, scaleByHeight, 1.0);

    scale = targetScale;
    // On mobile, always center by resetting offsets
    if (isMobile) {
      store.gridX = 0;
      store.gridY = 0;
    }
  }

  onMount(() => {
    updateScale();
    window.addEventListener("resize", updateScale);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("resize", updateScale);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  });

  function handleKeyDown(e) {
    if (e.code === "Space") isSpacePressed = true;
  }
  function handleKeyUp(e) {
    if (e.code === "Space") isSpacePressed = false;
  }

  // Pan logic
  function handlePanStart(e) {
    // Start pan on: Middle click (1) OR Space + Left click (0) OR clicking background
    const isMiddleClick = e.button === 1;
    const isSpacePan =
      (isSpacePressed || (e.touches && e.touches.length > 1)) &&
      (e.button === 0 || !e.button);
    const isBackgroundClick =
      e.target === bentoScaleWrap || bentoEl.contains(e.target);

    // If it's a normal click on the background (not middle click or space pan), clear selection
    if (isBackgroundClick && !isMiddleClick && !isSpacePan && e.button === 0) {
      store.clearSelection();
    }

    if (isMiddleClick || isSpacePan || isBackgroundClick) {
      if (e.cancelable) e.preventDefault();
      isPanning = true;
      const clientX = e.clientX ?? e.touches?.[0]?.clientX;
      const clientY = e.clientY ?? e.touches?.[0]?.clientY;
      panStart = {
        x: clientX,
        y: clientY,
        offX: store.gridX,
        offY: store.gridY,
      };
    }
  }

  // Zoom logic
  function handleWheel(e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();

    const zoomFactor = 0.1;
    const delta = e.deltaY > 0 ? 1 - zoomFactor : 1 + zoomFactor;
    const newScale = Math.max(0.2, Math.min(scale * delta, 5));

    // Zoom centered on cursor
    const rect = bentoScaleWrap.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Adjust offsets to keep cursor point fixed (math for origin: 0 0)
    store.gridX = mx - (mx - store.gridX) * (newScale / scale);
    store.gridY = my - (my - store.gridY) * (newScale / scale);
    scale = newScale;
  }

  // Drag logic
  function handleDragStart(e, id) {
    if (isResizing || (e.touches && e.touches.length > 1)) return;

    // Stop propagation so clicking a cell doesn't trigger "clear selection" on the background
    e.stopPropagation();

    // Shift+Click OR Multi-select mode on mobile = multi-select toggle (no drag)
    const isShift = e.shiftKey;
    const isMultiSelect = isShift || (isMobile && isMultiSelectMode);
    if (isMultiSelect) {
      e.preventDefault();
      store.toggleSelection(id, true);
      return;
    }

    // Target the actual .cell element, as the currentTarget is contents (zero size)
    const cellEl = e.currentTarget.querySelector(".cell") || e.currentTarget;
    const rect = cellEl.getBoundingClientRect();
    const wrapRect = bentoScaleWrap.getBoundingClientRect();

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

    // Consolidated selection logic: toggle on shift, select single otherwise
    store.toggleSelection(id, isShift);
  }

  function handleMouseMove(e) {
    if (isDragging) {
      const clientX = e.clientX ?? e.touches?.[0]?.clientX;
      const clientY = e.clientY ?? e.touches?.[0]?.clientY;
      if (clientX === undefined) return;

      const wrapRect = bentoScaleWrap.getBoundingClientRect();
      ghostPos.x = clientX - dragOffsetX - wrapRect.left;
      ghostPos.y = clientY - dragOffsetY - wrapRect.top;

      // Use top-left corner for snapping sensitivity
      const snapX =
        clientX -
        dragOffsetX +
        (store.gridWidth / store.internalCols / 2) * scale;
      const snapY =
        clientY -
        dragOffsetY +
        (store.gridHeight / store.internalRows / 2) * scale;

      const slot = getSlotFromPoint(snapX, snapY);
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

    if (isPanning) {
      const clientX = e.clientX ?? e.touches?.[0]?.clientX;
      const clientY = e.clientY ?? e.touches?.[0]?.clientY;
      if (clientX === undefined) return;
      store.gridX = panStart.offX + (clientX - panStart.x);
      store.gridY = panStart.offY + (clientY - panStart.y);
    }

    if (isResizing) {
      const clientX = e.clientX || (e.touches && e.touches[0].clientX);
      const clientY = e.clientY || (e.touches && e.touches[0].clientY);
      updateResizeGhost(clientX, clientY);
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

    if (isResizing) {
      isResizing = false;
      resizeCellId = null;
    }

    if (isPanning) {
      isPanning = false;
    }
  }

  // Resize logic
  function handleResizeStart(id, corner, cx, cy) {
    isResizing = true;
    resizeCellId = id;
    resizeCorner = corner;

    const meta = store.cellMeta[id];
    const { r, c, colSpan, rowSpan } = meta;

    if (corner === "se") resizeAnchor = { r, c };
    if (corner === "sw") resizeAnchor = { r, c: c + colSpan - 1 };
    if (corner === "ne") resizeAnchor = { r: r + rowSpan - 1, c };
    if (corner === "nw")
      resizeAnchor = { r: r + rowSpan - 1, c: c + colSpan - 1 };

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

  function updateResizeGhost(cx, cy) {
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

    const slot = getSlotFromPoint(cx, cy);
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
        // Optimization: snap the actual UI state while dragging for immediate feedback
        // Similar to original JS logic, we apply the plan if it's feasible
        store.applyResize(resizeCellId, plan);
      } else {
        resizeGhost.blocked = true;
      }
    }
  }

  // Utils
  function getSlotFromPoint(cx, cy) {
    if (!bentoEl) return null;
    const rect = bentoEl.getBoundingClientRect();
    if (cx < rect.left || cx > rect.right || cy < rect.top || cy > rect.bottom)
      return null;

    // Use internal coordinates (unscaled) for grid logic to ensure precision
    const internalX = (cx - rect.left) / scale;
    const internalY = (cy - rect.top) / scale;

    const internalCellW =
      (store.gridWidth + store.gridGap) / store.internalCols;
    const internalCellH =
      (store.gridHeight + store.gridGap) / store.internalRows;

    return {
      c: Math.max(
        0,
        Math.min(Math.floor(internalX / internalCellW), store.internalCols - 1),
      ),
      r: Math.max(
        0,
        Math.min(Math.floor(internalY / internalCellH), store.internalRows - 1),
      ),
    };
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
</script>

<svelte:window
  onmousemove={handleMouseMove}
  onmouseup={handleMouseUp}
  ontouchmove={handleMouseMove}
  ontouchend={handleMouseUp}
/>

<!-- Mobile Multi-Select Toggle Button -->
{#if isMobile && Object.keys(store.cellMeta).length > 0}
  <button
    class="lg:hidden fixed bottom-20 right-4 z-[90] w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95"
    class:bg-[var(--accent)]={isMultiSelectMode}
    class:text-white={isMultiSelectMode}
    class:bg-[var(--surface)]={!isMultiSelectMode}
    class:text-[var(--accent)]={!isMultiSelectMode}
    class:border-2={!isMultiSelectMode}
    class:border-[var(--accent)]={!isMultiSelectMode}
    onclick={() => (isMultiSelectMode = !isMultiSelectMode)}
    aria-label="Toggle multi-select mode"
  >
    <svg
      class="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.5"
    >
      {#if isMultiSelectMode}
        <polyline points="9 11 12 14 22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      {:else}
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <line x1="9" y1="9" x2="15" y2="15" />
        <line x1="15" y1="9" x2="9" y2="15" />
      {/if}
    </svg>
  </button>
{/if}

<div
  class="w-full flex justify-center items-center overflow-visible relative group/bento transition-all duration-300"
  bind:this={bentoScaleWrap}
  role="presentation"
  style="
    height: {isMobile
    ? scaledHeight + 40 + 'px'
    : store.gridHeight * scale + 'px'};
    cursor: {isPanning ? 'grabbing' : isSpacePressed ? 'grab' : 'default'};
    touch-action: none;
  "
  onwheel={handleWheel}
  onmousedown={handlePanStart}
  ontouchstart={handlePanStart}
>
  <!-- Wrapper with scaled dimensions for proper centering -->
  <div
    class="relative"
    style="width: {scaledWidth}px; height: {scaledHeight}px;"
  >
    <div
      bind:this={bentoEl}
      class="bento absolute top-0 left-0 z-10 rounded-[2px] grid transition-transform p-0"
      class:no-transition={isDragging || isResizing || isPanning}
      style="
        width: {store.gridWidth}px;
        height: {store.gridHeight}px;
        gap: {store.gridGap}px;
        grid-template-columns: repeat({store.internalCols}, 1fr);
        grid-template-rows: repeat({store.internalRows}, 1fr);
        transform-origin: top left;
        transform: {isMobile
        ? `scale(${scale})`
        : `translate(${store.gridX}px, ${store.gridY}px) scale(${scale})`};
      "
    >
      <!-- Grid Guide Overlay (Performance Optimized) -->
      <div
        class="absolute pointer-events-none transition-opacity duration-500 bento-grid-guides"
        style="
        inset: 0px;
        --grid-cols: {store.internalCols};
        --grid-rows: {store.internalRows};
        --grid-gap: {store.gridGap}px;
      "
      ></div>

      <!-- Cells -->
      {#each Object.values(store.cellMeta) as meta (meta.id)}
        <div
          class="contents"
          role="button"
          tabindex="0"
          onmousedown={(e) => handleDragStart(e, meta.id)}
          ontouchstart={(e) => handleDragStart(e, meta.id)}
          onkeydown={(e) => {
            if (e.key === "Enter" || e.key === " ")
              store.toggleSelection(meta.id, e.shiftKey);
          }}
        >
          <GridCell
            {...meta}
            cellRadius={store.cellRadius}
            isSelected={store.selectedCellIds.has(meta.id)}
            isMultiSelected={store.selectedCellIds.has(meta.id) &&
              store.selectedCellIds.size > 1}
            isHero={heroId === meta.id}
            isDragging={dragSourceId === meta.id}
            onResizeStart={handleResizeStart}
          />
        </div>
      {/each}

      <!-- Snap Indicator -->
      {#if isDragging && snapSlot}
        <div
          class="snap-indicator absolute pointer-events-none z-10 transition-all duration-200 rounded-[4px] border-[3px] shadow-sm animate-pulseFast
          {snapStatus === 'free'
            ? 'bg-blue-500/20 border-blue-500 shadow-blue-500/40'
            : ''}
          {snapStatus === 'swap'
            ? 'bg-amber-400/20 border-amber-500 shadow-amber-500/40'
            : ''}
          {snapStatus === 'invalid'
            ? 'bg-red-900/30 border-red-600 shadow-red-600/40'
            : ''}"
          style="
          grid-area: {snapSlot.r + 1} / {snapSlot.c + 1} / {snapSlot.r +
            1 +
            store.cellMeta[dragSourceId].rowSpan} / {snapSlot.c +
            1 +
            store.cellMeta[dragSourceId].colSpan};
        "
        >
          <span
            class="absolute -top-7 left-0 text-[10px] bg-[var(--text-main)] text-[var(--app-bg)] px-2 py-0.5 rounded shadow-md whitespace-nowrap uppercase tracking-tighter font-bold"
          >
            {snapStatus === "free"
              ? "Move Here"
              : snapStatus === "swap"
                ? "Swap"
                : "Blocked"}
          </span>
        </div>
      {/if}

      <!-- Resize Ghost -->
      {#if isResizing}
        <div
          class="absolute border-[2.5px] border-dashed rounded-[4px] pointer-events-none z-20 shadow-inner
          {!resizeGhost.blocked
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-red-500 bg-red-500/10'}"
          style="
          top: {resizeGhost.top}px;
          left: {resizeGhost.left}px;
          width: {resizeGhost.width}px;
          height: {resizeGhost.height}px;
        "
        ></div>
      {/if}

      <!-- Empty State Guide -->
      {#if Object.keys(store.cellMeta).length === 0}
        <div
          class="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-400 font-mono text-sm opacity-50 pointer-events-none"
        >
          <span>Drag cells to rearrange</span>
          <span>Use corners to resize</span>
        </div>
      {/if}
    </div>
  </div>

  <!-- Navigation Hint - Desktop Only -->
  <div
    class="hidden lg:flex fixed bottom-6 left-1/2 -translate-x-1/2 items-center gap-6 px-4 py-2 bg-[var(--surface)]/70 backdrop-blur-md border border-[var(--border-subtle)] rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.2)] z-50 text-[10px] font-medium text-[var(--text-muted)] pointer-events-none select-none animate-hintIn"
  >
    <div class="flex items-center gap-2">
      <span
        class="px-1.5 py-0.5 bg-[var(--input-bg)] rounded-[4px] border border-[var(--border-subtle)] font-bold text-[var(--text-main)]"
        >Ctrl</span
      >
      <span>+</span>
      <span
        class="px-1.5 py-0.5 bg-[var(--input-bg)] rounded-[4px] border border-[var(--border-subtle)] font-bold text-[var(--text-main)]"
        >Scroll</span
      >
      <span class="ml-1 opacity-60">to Zoom</span>
    </div>
    <div class="w-[1px] h-3 bg-[var(--border-subtle)]"></div>
    <div class="flex items-center gap-2">
      <span
        class="px-1.5 py-0.5 bg-[var(--input-bg)] rounded-[4px] border border-[var(--border-subtle)] font-bold text-[var(--text-main)]"
        >Space</span
      >
      <span>+</span>
      <span
        class="px-1.5 py-0.5 bg-[var(--input-bg)] rounded-[4px] border border-[var(--border-subtle)] font-bold text-[var(--text-main)]"
        >Drag</span
      >
      <span class="ml-1 opacity-60">to Pan</span>
    </div>
    <div class="w-[1px] h-3 bg-[var(--border-subtle)]"></div>
    <div class="flex items-center gap-2">
      <span
        class="px-1.5 py-0.5 bg-[var(--input-bg)] rounded-[4px] border border-[var(--border-subtle)] font-bold text-[var(--text-main)]"
        >Shift</span
      >
      <span>+</span>
      <span
        class="px-1.5 py-0.5 bg-[var(--input-bg)] rounded-[4px] border border-[var(--border-subtle)] font-bold text-[var(--text-main)]"
        >Click</span
      >
      <span class="ml-1 opacity-60">to Multi-select</span>
    </div>
  </div>
  <!-- Drag Ghost Visual -->
  {#if isDragging}
    <div
      class="absolute pointer-events-none z-[9999] rounded-[4px] border-2 border-white/60 shadow-[0_8px_30px_rgba(0,0,0,0.12)] animate-ghostIn overflow-hidden opacity-95 flex items-center justify-center"
      style="
        left: {ghostPos.x}px;
        top: {ghostPos.y}px;
        width: {ghostPos.w}px;
        height: {ghostPos.h}px;
        background: {store.cellMeta[dragSourceId].hex};
      "
    >
      <span class="font-mono text-[10px] text-white opacity-80"
        >{dragSourceId}</span
      >
    </div>
  {/if}
</div>

<style>
  @keyframes ghostIn {
    from {
      transform: scale(0.92) rotate(-1deg);
      opacity: 0.5;
    }
    to {
      transform: scale(1) rotate(0deg);
      opacity: 0.95;
    }
  }
  @keyframes pulseFast {
    0%,
    100% {
      opacity: 0.9;
      transform: scale(1);
    }
    50% {
      opacity: 1;
      transform: scale(1.005);
    }
  }
  @keyframes hintIn {
    from {
      opacity: 0;
      transform: translate(-50%, 20px);
    }
    to {
      opacity: 1;
      transform: translate(-50%, 0);
    }
  }
  .animate-pulseFast {
    animation: pulseFast 1s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
  .animate-ghostIn {
    animation: ghostIn 0.1s ease-out forwards;
  }
  .animate-hintIn {
    animation: hintIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
  }
  .bento-grid-guides {
    background-image: linear-gradient(
        to right,
        var(--text-main) 1px,
        transparent 1px
      ),
      linear-gradient(to bottom, var(--text-main) 1px, transparent 1px);
    background-size: calc((100% + var(--grid-gap)) / var(--grid-cols))
      calc((100% + var(--grid-gap)) / var(--grid-rows));
    opacity: 0.3;
    pointer-events: none;
    z-index: 0;
    border-right: 1px solid var(--text-main);
    border-bottom: 1px solid var(--text-main);
  }

  .no-transition {
    transition: none !important;
  }
  .no-transition :global(.cell) {
    transition: none !important;
  }
</style>
