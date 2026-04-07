<script>
  import { onMount, tick } from "svelte";
  import PreviewCell from "./PreviewCell.svelte";

  let { store } = $props();

  let containerEl = $state(null);
  let scale = $state(0.8);

  // Get the responsive layout and grid dimensions
  let layout = $derived(store.getResponsiveLayout());
  let dimensions = $derived(store.getPreviewGridDimensions());

  // Calculate row height - use smaller fixed heights for responsive views
  let rowHeight = $derived.by(() => {
    const cols = dimensions.cols;
    const width = dimensions.width;
    const gap = store.gridGap;
    
    if (store.currentBreakpoint === 'mobile') {
      // Mobile: smaller row height (not square) for compact stacking
      // Use approximately 120px per row unit
      return 100;
    } else if (store.currentBreakpoint === 'tablet') {
      // Tablet: medium row height
      return 120;
    }
    
    // Desktop: square cells
    const unitW = (width - (gap * (cols - 1))) / cols;
    return unitW;
  });

  // Calculate grid height based on rows
  let gridHeight = $derived.by(() => {
    const rows = dimensions.rows;
    const gap = store.gridGap;
    return (rowHeight * rows) + (gap * (rows - 1));
  });

  // Get preview frame dimensions based on breakpoint
  let frameWidth = $derived.by(() => {
    if (store.currentBreakpoint === 'mobile') return 375;
    if (store.currentBreakpoint === 'tablet') return 768;
    return null;
  });

  let frameHeight = $derived.by(() => {
    if (store.currentBreakpoint === 'mobile') return 667;
    if (store.currentBreakpoint === 'tablet') return 1024;
    return null;
  });

  async function updateScale() {
    await tick();
    if (!containerEl) return;
    
    const padding = 100;
    const rect = containerEl.getBoundingClientRect();
    const availW = rect.width - padding;
    const availH = rect.height - padding;
    
    // Scale to fit the frame within available space
    const targetWidth = frameWidth || dimensions.width;
    const targetHeight = frameHeight || gridHeight;
    
    const scaleByWidth = availW / targetWidth;
    const scaleByHeight = availH / targetHeight;
    
    scale = Math.min(scaleByWidth, scaleByHeight, 1.0, 0.9);
  }

  onMount(() => {
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  });

  // Re-calculate scale when breakpoint or layout changes
  $effect(() => {
    store.currentBreakpoint;
    dimensions;
    layout;
    updateScale();
  });
</script>

<div 
  class="w-full h-full flex items-center justify-center p-8 relative"
  bind:this={containerEl}
>
  <!-- Device Frame for Mobile/Tablet -->
  <div 
    class="device-frame relative bg-[var(--surface)] overflow-hidden transition-all duration-500"
    class:rounded-[32px]={store.currentBreakpoint !== 'desktop'}
    class:shadow-[0_20px_60px_rgba(0,0,0,0.15)]={store.currentBreakpoint !== 'desktop'}
    class:dark:shadow-[0_20px_60px_rgba(0,0,0,0.4)]={store.currentBreakpoint !== 'desktop'}
    class:border-[6px]={store.currentBreakpoint !== 'desktop'}
    class:border-[#71717a]={store.currentBreakpoint !== 'desktop'}
    class:dark:border-[#2a2a2a]={store.currentBreakpoint !== 'desktop'}
    style="
      width: {(frameWidth || dimensions.width) * scale}px;
      height: {(frameHeight || gridHeight) * scale}px;
      transform-origin: center center;
    "
  >
    <!-- Device Notch (Mobile only) -->
    {#if store.currentBreakpoint === 'mobile'}
      <div 
        class="absolute top-0 left-1/2 -translate-x-1/2 bg-[#71717a] dark:bg-[#2a2a2a] rounded-b-2xl z-20"
        style="width: {120 * scale}px; height: {24 * scale}px;"
      ></div>
    {/if}

    <!-- Device Screen -->
    <div 
      class="w-full h-full bg-[var(--app-bg)] overflow-auto flex flex-col"
      style="padding: {(store.currentBreakpoint === 'mobile' ? 16 : 24) * scale}px; padding-top: {(store.currentBreakpoint === 'mobile' ? 40 : 24) * scale}px;"
    >
      <!-- Grid Preview -->
      <div
        class="grid mx-auto transition-all duration-300 flex-shrink-0"
        style="
          width: {dimensions.width * scale}px;
          gap: {store.gridGap * scale}px;
          grid-template-columns: repeat({dimensions.cols}, 1fr);
          grid-auto-rows: {rowHeight * scale}px;
        "
      >
        {#each layout as cell (cell.id)}
          <PreviewCell
            id={cell.id}
            colSpan={cell.previewColSpan}
            rowSpan={cell.previewRowSpan}
            r={cell.previewR}
            c={cell.previewC}
            hex={cell.hex}
            opacity={cell.opacity}
            cellRadius={store.cellRadius * scale}
            type={cell.type}
            imageUrl={cell.imageUrl}
            imageStyle={cell.imageStyle}
            originalAspectRatio={cell.originalAspectRatio}
          />
        {/each}
      </div>
    </div>

    <!-- Home Indicator (Mobile only) -->
    {#if store.currentBreakpoint === 'mobile'}
      <div 
        class="absolute bottom-2 left-1/2 -translate-x-1/2 bg-[var(--text-muted)]/30 rounded-full"
        style="width: {100 * scale}px; height: {4 * scale}px;"
      ></div>
    {/if}
  </div>

  <!-- Device Label -->
  <div class="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 bg-[var(--surface)]/80 backdrop-blur-sm rounded-full border border-[var(--border-subtle)]">
    {#if store.currentBreakpoint === 'mobile'}
      <svg class="w-3.5 h-3.5 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
        <line x1="12" y1="18" x2="12.01" y2="18"/>
      </svg>
      <span class="text-[10px] font-medium text-[var(--text-muted)]">iPhone SE - 375 x 667</span>
    {:else if store.currentBreakpoint === 'tablet'}
      <svg class="w-3.5 h-3.5 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/>
        <line x1="12" y1="18" x2="12.01" y2="18"/>
      </svg>
      <span class="text-[10px] font-medium text-[var(--text-muted)]">iPad - 768 x 1024</span>
    {:else}
      <svg class="w-3.5 h-3.5 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
        <line x1="8" y1="21" x2="16" y2="21"/>
        <line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
      <span class="text-[10px] font-medium text-[var(--text-muted)]">Desktop - Original Layout</span>
    {/if}
  </div>
</div>

<style>
  .device-frame {
    animation: frameIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  @keyframes frameIn {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(10px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
</style>
