<script>
  import { onMount } from "svelte";
  import GridCell from "./GridCell.svelte";
  import { themeStore } from '$lib/themeStore.svelte.js';
  import { usePan } from "$lib/composables/usePan.svelte.js";
  import { useDrag } from "$lib/composables/useDrag.svelte.js";
  import { useResize } from "$lib/composables/useResize.svelte.js";

  let { store } = $props();

  let bentoEl = $state(null);
  let bentoScaleWrap = $state(null);
  let isMobile = $state(false);
  let isMultiSelectMode = $state(false);

  // Initialize Composables
  const pan = usePan(store, () => bentoEl, () => bentoScaleWrap);
  const drag = useDrag(store, () => bentoEl, () => bentoScaleWrap, {
    isResizing: () => resize.isResizing
  });
  const resize = useResize(store, () => bentoEl, {
    getSlotFromPoint: drag.getSlotFromPoint
  });

  // Track isMobile for the template
  onMount(() => {
    const checkMobile = () => { isMobile = window.innerWidth < 1024; };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  });

  // Compute Hero ID
  let heroId = $derived.by(() => {
    let max = 0, hId = null;
    Object.entries(store.cellMeta).forEach(([id, m]) => {
      let s = m.colSpan * m.rowSpan;
      if (s > max) { max = s; hId = id; }
    });
    return hId;
  });

  // Proxy scaled dimensions
  let scaledWidth = $derived(store.gridWidth * pan.scale);
  let scaledHeight = $derived(store.gridHeight * pan.scale);

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
    : store.gridHeight * pan.scale + 'px'};
    cursor: {pan.isPanning ? 'grabbing' : pan.isSpacePressed ? 'grab' : 'default'};
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
      class:no-transition={drag.isDragging || resize.isResizing || pan.isPanning}
      style="
        width: {store.gridWidth}px;
        height: {store.gridHeight}px;
        gap: {store.gridGap}px;
        grid-template-columns: repeat({store.internalCols}, 1fr);
        grid-template-rows: repeat({store.internalRows}, 1fr);
        transform-origin: top left;
        transform: {isMobile
        ? `scale(${pan.scale})`
        : `translate(${store.gridX}px, ${store.gridY}px) scale(${pan.scale})`};
      "
    >
      <canvas
        bind:this={pan.canvasEl}
        class="absolute inset-0 pointer-events-none transition-opacity duration-500"
        style="width: 100%; height: 100%; z-index: 0;"
      ></canvas>

      <!-- Cells -->
      {#each Object.values(store.cellMeta) as meta (meta.id)}
        <div
          class="contents"
          role="button"
          tabindex="0"
          onmousedown={(e) => drag.handleDragStart(e, meta.id, pan.scale, isMobile, isMultiSelectMode)}
          ontouchstart={(e) => drag.handleDragStart(e, meta.id, pan.scale, isMobile, isMultiSelectMode)}
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
            isDragging={drag.dragSourceId === meta.id}
            onResizeStart={(id, corner, cx, cy) => resize.handleResizeStart(id, corner, cx, cy, pan.scale)}
          />
        </div>
      {/each}

      <!-- Snap Indicator -->
      {#if drag.isDragging && drag.snapSlot}
        <div
          class="snap-indicator absolute pointer-events-none z-10 transition-all duration-200 rounded-[4px] border-[3px] shadow-sm animate-pulseFast
          {drag.snapStatus === 'free'
            ? 'bg-blue-500/20 border-blue-500 shadow-blue-500/40'
            : ''}
          {drag.snapStatus === 'swap'
            ? 'bg-amber-400/20 border-amber-500 shadow-amber-500/40'
            : ''}
          {drag.snapStatus === 'invalid'
            ? 'bg-red-900/30 border-red-600 shadow-red-600/40'
            : ''}"
          style="
          grid-area: {drag.snapSlot.r + 1} / {drag.snapSlot.c + 1} / {drag.snapSlot.r +
            1 +
            store.cellMeta[drag.dragSourceId].rowSpan} / {drag.snapSlot.c +
            1 +
            store.cellMeta[drag.dragSourceId].colSpan};
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
            ? 'border-blue-500 bg-blue-500/10'
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
  .no-transition {
    transition: none !important;
  }
  .no-transition :global(.cell) {
    transition: none !important;
  }
</style>
