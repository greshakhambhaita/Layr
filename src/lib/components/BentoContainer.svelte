<script>
  import { useDrag } from "$lib/composables/useDrag.svelte.js";
  import { usePan } from "$lib/composables/usePan.svelte.js";
  import { useResize } from "$lib/composables/useResize.svelte.js";
  import { onMount } from "svelte";
  import GridCell from "./GridCell.svelte";

  let { store, isMultiSelectMode = false } = $props();

  let bentoEl = $state(null);
  let bentoScaleWrap = $state(null);
  let isMobile = $state(false);

  // Initialize Composables
  let drag, resize;

  const pan = usePan(
    store,
    () => bentoEl,
    () => bentoScaleWrap,
  );

  drag = useDrag(
    store,
    () => bentoEl,
    () => bentoScaleWrap,
    {
      isResizing: () => resize?.isResizing,
    },
  );

  resize = useResize(store, () => bentoEl, {
    getSlotFromPoint: (cx, cy, scale) => drag?.getSlotFromPoint(cx, cy, scale),
  });

  // Track isMobile for the template
  onMount(() => {
    const checkMobile = () => {
      isMobile = window.innerWidth < 1024;
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  });

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

  // Derived responsive layout
  let responsiveLayout = $derived(store.getResponsiveLayout());
  let gridInfo = $derived(store.getPreviewGridDimensions());

  // Proxy scaled dimensions
  let scaledWidth = $derived(gridInfo.width * pan.scale);
  let scaledHeight = $derived(gridInfo.rows * ((store.gridHeight / store.internalRows) + store.gridGap) * pan.scale);

  function handleMouseMove(e) {
    pan.handleMouseMove(e);
    drag.handleMouseMove(e, pan.scale);
    resize.handleMouseMove(e, pan.scale);
  }

  function handleMouseUp() {
    pan.handleMouseUp();
    drag.handleMouseUp();
    resize.handleMouseUp();
  }
</script>

<svelte:window
  onmousemove={handleMouseMove}
  onmouseup={handleMouseUp}
  ontouchmove={handleMouseMove}
  ontouchend={handleMouseUp}
/>

<div
  class="w-full flex justify-center items-center overflow-visible relative group/bento transition-all duration-300"
  bind:this={bentoScaleWrap}
  role="presentation"
  style="
    height: {scaledHeight + 40}px;
    cursor: {pan.isPanning
    ? 'grabbing'
    : pan.isSpacePressed
      ? 'grab'
      : 'default'};
    touch-action: none;
  "
  onwheel={pan.handleWheel}
  onmousedown={pan.handlePanStart}
  ontouchstart={pan.handlePanStart}
>
  <!-- Wrapper with scaled dimensions for proper centering -->
  <div
    class="relative"
    style="width: {scaledWidth}px; height: {scaledHeight}px;"
  >
    <div
      bind:this={bentoEl}
      class="bento absolute top-0 left-0 z-10 rounded-[2px] grid transition-transform p-0"
      class:no-transition={drag.isDragging ||
        resize.isResizing ||
        pan.isPanning}
      style="
        width: {gridInfo.width}px;
        height: {(gridInfo.rows * (store.gridHeight / store.internalRows))}px;
        gap: {store.gridGap}px;
        grid-template-columns: repeat({gridInfo.cols}, 1fr);
        grid-template-rows: repeat({gridInfo.rows}, 1fr);
        transform-origin: top left;
        transform: {store.currentBreakpoint === 'desktop' && !isMobile
        ? `translate(${store.gridX}px, ${store.gridY}px) scale(${pan.scale})`
        : `scale(${pan.scale})`};
      "
    >
      <canvas
        bind:this={pan.canvasEl}
        class="absolute inset-0 pointer-events-none transition-opacity duration-500"
        style="width: 100%; height: 100%; z-index: 0;"
      ></canvas>

      <!-- Cells -->
      {#each responsiveLayout as cell (cell.id)}
        <div
          class="contents {isMultiSelectMode ? 'touch-none' : ''}"
          role="button"
          tabindex="0"
          onmousedown={(e) =>
            drag.handleDragStart(
              e,
              cell.id,
              pan.scale,
              isMobile,
              isMultiSelectMode,
            )}
          ontouchstart={(e) =>
            drag.handleDragStart(
              e,
              cell.id,
              pan.scale,
              true, // Force isMobile true for touch events to respect the toggle
              isMultiSelectMode,
            )}
          onkeydown={(e) => {
            if (e.key === "Enter" || e.key === " ")
              store.toggleSelection(cell.id, e.shiftKey);
          }}
        >
          <GridCell
            {...cell}
            r={cell.previewR}
            c={cell.previewC}
            rowSpan={cell.previewRowSpan}
            colSpan={cell.previewColSpan}
            cellRadius={store.cellRadius}
            isSelected={store.selectedCellIds.has(cell.id)}
            isMultiSelected={store.selectedCellIds.has(cell.id) &&
              store.selectedCellIds.size > 1}
            isHero={heroId === cell.id}
            isDragging={drag.dragSourceId === cell.id}
            onResizeStart={(id, corner, cx, cy) =>
              resize.handleResizeStart(id, corner, cx, cy, pan.scale)}
          />
        </div>
      {/each}

      <!-- Snap Indicator -->
      {#if drag.isDragging && drag.snapSlot}
        {@const sourceMeta = responsiveLayout.find(l => l.id === drag.dragSourceId)}
        <div
          class="snap-indicator absolute pointer-events-none z-10 transition-all duration-200 rounded-[4px] border-[3px] shadow-sm animate-pulseFast
          {drag.snapStatus === 'free'
            ? 'bg-[var(--accent)]/10 border-[var(--accent)] shadow-[0_5px_15px_var(--accent-glow)]'
            : ''}
          {drag.snapStatus === 'swap'
            ? 'bg-amber-400/20 border-amber-500 shadow-amber-500/40'
            : ''}
          {drag.snapStatus === 'invalid'
            ? 'bg-red-900/30 border-red-600 shadow-red-600/40'
            : ''}"
          style="
          grid-area: {drag.snapSlot.r + 1} / {drag.snapSlot.c + 1} / {drag
            .snapSlot.r +
            1 +
            sourceMeta.previewRowSpan} / {drag.snapSlot.c +
            1 +
            sourceMeta.previewColSpan};
        "
        >
          <span
            class="absolute -top-7 left-0 text-[10px] bg-[var(--text-main)] text-[var(--app-bg)] px-2 py-0.5 rounded shadow-md whitespace-nowrap uppercase tracking-tighter font-bold"
          >
            {drag.snapStatus === "free"
              ? "Move Here"
              : drag.snapStatus === "swap"
                ? "Swap"
                : "Blocked"}
          </span>
        </div>
      {/if}

      <!-- Resize Ghost -->
      {#if resize.isResizing}
        <div
          class="absolute border-[2.5px] border-dashed rounded-[4px] pointer-events-none z-20 shadow-inner
          {!resize.resizeGhost.blocked
            ? 'border-[var(--accent)] bg-[var(--accent)]/5'
            : 'border-red-500 bg-red-500/10'}"
          style="
          top: {resize.resizeGhost.top}px;
          left: {resize.resizeGhost.left}px;
          width: {resize.resizeGhost.width}px;
          height: {resize.resizeGhost.height}px;
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
  {#if drag.isDragging}
    <div
      class="absolute pointer-events-none z-[9999] rounded-[4px] shadow-[0_8px_30px_rgba(0,0,0,0.12)] animate-ghostIn overflow-hidden opacity-95 flex items-center justify-center"
      style="
        left: {drag.ghostPos.x}px;
        top: {drag.ghostPos.y}px;
        width: {drag.ghostPos.w}px;
        height: {drag.ghostPos.h}px;
        background: {store.cellMeta[drag.dragSourceId].hex};
      "
    ></div>
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
  .no-transition {
    transition: none !important;
  }
  .no-transition :global(.cell) {
    transition: none !important;
  }
</style>
