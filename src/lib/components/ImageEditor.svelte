<script>
  import { onMount, tick } from "svelte";

  let { 
    isOpen = false, 
    imageUrl = '', 
    imageStyle = { fit: 'cover', scale: 1, offsetX: 0, offsetY: 0 },
    cellAspectRatio = 1, // width / height of the cell
    onSave = () => {},
    onClose = () => {}
  } = $props();

  // Local state for editing
  let localScale = $state(1);
  let localOffsetX = $state(0);
  let localOffsetY = $state(0);
  let localFit = $state('cover');

  // Drag state
  let isDragging = $state(false);
  let dragStart = $state({ x: 0, y: 0, offsetX: 0, offsetY: 0 });

  // Container ref
  let previewContainer = $state(null);
  let imageEl = $state(null);

  // Sync local state when props change
  $effect(() => {
    if (isOpen) {
      localScale = imageStyle?.scale || 1;
      localOffsetX = imageStyle?.offsetX || 0;
      localOffsetY = imageStyle?.offsetY || 0;
      localFit = imageStyle?.fit || 'cover';
    }
  });

  // Calculate the transform for image positioning
  let imageTransform = $derived.by(() => {
    const scale = localScale;
    // Convert percentage offsets to actual transform
    // offsetX/Y are percentages of how much the image can move
    const translateX = localOffsetX;
    const translateY = localOffsetY;
    return `scale(${scale}) translate(${translateX}%, ${translateY}%)`;
  });

  function handleMouseDown(e) {
    if (e.button !== 0) return;
    e.preventDefault();
    isDragging = true;
    dragStart = {
      x: e.clientX,
      y: e.clientY,
      offsetX: localOffsetX,
      offsetY: localOffsetY
    };
  }

  function handleMouseMove(e) {
    if (!isDragging || !previewContainer) return;
    
    const rect = previewContainer.getBoundingClientRect();
    const sensitivity = 0.5; // Adjust sensitivity of drag
    
    // Calculate delta as percentage of container size
    const deltaX = ((e.clientX - dragStart.x) / rect.width) * 100 * sensitivity;
    const deltaY = ((e.clientY - dragStart.y) / rect.height) * 100 * sensitivity;
    
    // Limit the offset range based on scale
    const maxOffset = Math.max(0, (localScale - 1) * 50);
    
    localOffsetX = Math.max(-maxOffset, Math.min(maxOffset, dragStart.offsetX + deltaX));
    localOffsetY = Math.max(-maxOffset, Math.min(maxOffset, dragStart.offsetY + deltaY));
  }

  function handleMouseUp() {
    isDragging = false;
  }

  function handleTouchStart(e) {
    if (e.touches.length !== 1) return;
    e.preventDefault();
    isDragging = true;
    dragStart = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      offsetX: localOffsetX,
      offsetY: localOffsetY
    };
  }

  function handleTouchMove(e) {
    if (!isDragging || !previewContainer || e.touches.length !== 1) return;
    
    const rect = previewContainer.getBoundingClientRect();
    const sensitivity = 0.5;
    
    const deltaX = ((e.touches[0].clientX - dragStart.x) / rect.width) * 100 * sensitivity;
    const deltaY = ((e.touches[0].clientY - dragStart.y) / rect.height) * 100 * sensitivity;
    
    const maxOffset = Math.max(0, (localScale - 1) * 50);
    
    localOffsetX = Math.max(-maxOffset, Math.min(maxOffset, dragStart.offsetX + deltaX));
    localOffsetY = Math.max(-maxOffset, Math.min(maxOffset, dragStart.offsetY + deltaY));
  }

  function handleWheel(e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    localScale = Math.max(0.5, Math.min(3, localScale + delta));
    
    // Adjust offsets if scale decreases
    const maxOffset = Math.max(0, (localScale - 1) * 50);
    localOffsetX = Math.max(-maxOffset, Math.min(maxOffset, localOffsetX));
    localOffsetY = Math.max(-maxOffset, Math.min(maxOffset, localOffsetY));
  }

  function handleScaleChange(newScale) {
    localScale = newScale;
    // Adjust offsets if scale decreases
    const maxOffset = Math.max(0, (localScale - 1) * 50);
    localOffsetX = Math.max(-maxOffset, Math.min(maxOffset, localOffsetX));
    localOffsetY = Math.max(-maxOffset, Math.min(maxOffset, localOffsetY));
  }

  function resetPosition() {
    localOffsetX = 0;
    localOffsetY = 0;
    localScale = 1;
  }

  function handleSave() {
    onSave({
      fit: localFit,
      scale: localScale,
      offsetX: localOffsetX,
      offsetY: localOffsetY,
      position: 'center' // Keep for compatibility
    });
    onClose();
  }

  function handleKeyDown(e) {
    if (!isOpen) return;
    if (e.key === 'Escape') onClose();
  }
</script>

<svelte:window 
  onmousemove={handleMouseMove}
  onmouseup={handleMouseUp}
  ontouchmove={handleTouchMove}
  ontouchend={handleMouseUp}
  onkeydown={handleKeyDown}
/>

{#if isOpen}
  <!-- Backdrop -->
  <div 
    class="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm animate-fadeIn"
    onclick={onClose}
    role="presentation"
  ></div>

  <!-- Modal -->
  <div class="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none">
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div 
      class="bg-[var(--surface)] rounded-2xl shadow-2xl w-full max-w-lg pointer-events-auto animate-modalIn overflow-hidden"
      onclick={(e) => e.stopPropagation()}
      role="dialog"
      tabindex="-1"
      aria-modal="true"
      aria-labelledby="image-editor-title"
    >
      <!-- Header -->
      <div class="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)]">
        <h2 id="image-editor-title" class="text-[14px] font-bold text-[var(--text-main)]">
          Edit Image
        </h2>
        <button
          class="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--surface-hover)] transition-colors"
          onclick={onClose}
          aria-label="Close"
        >
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <!-- Preview Area -->
      <div class="p-5">
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <div 
          class="relative w-full bg-[var(--input-bg)] rounded-xl overflow-hidden border-2 border-dashed border-[var(--border-subtle)]"
          style="aspect-ratio: {cellAspectRatio}; max-height: 300px;"
          bind:this={previewContainer}
          onmousedown={handleMouseDown}
          ontouchstart={handleTouchStart}
          onwheel={handleWheel}
          role="application"
          tabindex="0"
          aria-label="Drag to reposition image"
        >
          {#if imageUrl}
            <img
              bind:this={imageEl}
              src={imageUrl}
              alt="Preview"
              class="w-full h-full select-none transition-transform duration-75"
              class:cursor-grab={!isDragging}
              class:cursor-grabbing={isDragging}
              style="
                object-fit: {localFit};
                transform-origin: center center;
                transform: {imageTransform};
              "
              draggable="false"
            />
          {:else}
            <div class="absolute inset-0 flex items-center justify-center text-[var(--text-muted)]">
              No image selected
            </div>
          {/if}

          <!-- Drag Hint Overlay -->
          <div class="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 hover:opacity-100 transition-opacity bg-black/20">
            <div class="bg-black/60 text-white px-3 py-1.5 rounded-lg text-[11px] font-medium">
              Drag to reposition
            </div>
          </div>

          <!-- Crosshair Guide -->
          <div class="absolute inset-0 pointer-events-none">
            <div class="absolute top-1/2 left-0 right-0 h-[1px] bg-white/20"></div>
            <div class="absolute left-1/2 top-0 bottom-0 w-[1px] bg-white/20"></div>
          </div>
        </div>

        <!-- Instructions -->
        <p class="text-[10px] text-[var(--text-muted)] text-center mt-2">
          Drag to pan • Ctrl+Scroll to zoom • Adjust controls below
        </p>
      </div>

      <!-- Controls -->
      <div class="px-5 pb-5 flex flex-col gap-4">
        <!-- Fit Mode -->
        <div class="flex flex-col gap-2">
          <span class="text-[10px] font-bold text-[var(--text-subtle)] uppercase tracking-wider">
            Fit Mode
          </span>
          <div class="flex gap-2">
            {#each ['cover', 'contain', 'fill'] as fit}
              <button
                class="flex-1 h-9 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all"
                class:bg-[var(--accent)]={localFit === fit}
                class:text-white={localFit === fit}
                class:bg-[var(--input-bg)]={localFit !== fit}
                class:text-[var(--text-muted)]={localFit !== fit}
                class:hover:bg-[var(--surface-hover)]={localFit !== fit}
                onclick={() => localFit = fit}
              >
                {fit === 'fill' ? 'Stretch' : fit}
              </button>
            {/each}
          </div>
        </div>

        <!-- Scale Slider -->
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <span id="zoom-label" class="text-[10px] font-bold text-[var(--text-subtle)] uppercase tracking-wider">
              Zoom
            </span>
            <span class="text-[11px] font-bold text-[var(--text-main)]">
              {Math.round(localScale * 100)}%
            </span>
          </div>
          <div class="flex items-center gap-3">
            <input
              type="range"
              min="50"
              max="300"
              value={localScale * 100}
              oninput={(e) => handleScaleChange(parseInt(e.target.value) / 100)}
              class="flex-1 h-2 bg-[var(--input-bg)] rounded-full appearance-none cursor-pointer accent-[var(--accent)]"
              aria-labelledby="zoom-label"
            />
          </div>
        </div>

        <!-- Position Controls -->
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-bold text-[var(--text-subtle)] uppercase tracking-wider">
              Position
            </span>
            <button
              class="text-[10px] font-medium text-[var(--accent)] hover:underline"
              onclick={resetPosition}
            >
              Reset
            </button>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div class="flex items-center gap-2 bg-[var(--input-bg)] rounded-lg px-3 py-2">
              <span class="text-[10px] text-[var(--text-muted)]">X</span>
              <input
                type="number"
                value={Math.round(localOffsetX)}
                oninput={(e) => {
                  const maxOffset = Math.max(0, (localScale - 1) * 50);
                  localOffsetX = Math.max(-maxOffset, Math.min(maxOffset, parseInt(e.target.value) || 0));
                }}
                class="flex-1 bg-transparent text-[12px] font-medium text-[var(--text-main)] outline-none text-center"
              />
              <span class="text-[10px] text-[var(--text-muted)]">%</span>
            </div>
            <div class="flex items-center gap-2 bg-[var(--input-bg)] rounded-lg px-3 py-2">
              <span class="text-[10px] text-[var(--text-muted)]">Y</span>
              <input
                type="number"
                value={Math.round(localOffsetY)}
                oninput={(e) => {
                  const maxOffset = Math.max(0, (localScale - 1) * 50);
                  localOffsetY = Math.max(-maxOffset, Math.min(maxOffset, parseInt(e.target.value) || 0));
                }}
                class="flex-1 bg-transparent text-[12px] font-medium text-[var(--text-main)] outline-none text-center"
              />
              <span class="text-[10px] text-[var(--text-muted)]">%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-end gap-3 px-5 py-4 border-t border-[var(--border-subtle)] bg-[var(--input-bg)]/50">
        <button
          class="px-4 py-2.5 rounded-lg text-[12px] font-bold text-[var(--text-muted)] hover:bg-[var(--surface-hover)] transition-all"
          onclick={onClose}
        >
          Cancel
        </button>
        <button
          class="px-5 py-2.5 rounded-lg text-[12px] font-bold bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-all shadow-sm"
          onclick={handleSave}
        >
          Apply Changes
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes modalIn {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(10px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  .animate-fadeIn {
    animation: fadeIn 0.2s ease-out;
  }

  .animate-modalIn {
    animation: modalIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  /* Custom range slider styling */
  input[type="range"] {
    -webkit-appearance: none;
    appearance: none;
    background: var(--input-bg);
    border-radius: 9999px;
  }

  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--accent);
    cursor: pointer;
    border: 2px solid white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }

  input[type="range"]::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--accent);
    cursor: pointer;
    border: 2px solid white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }

  /* Remove number input arrows */
  input[type="number"]::-webkit-outer-spin-button,
  input[type="number"]::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  input[type="number"] {
    -moz-appearance: textfield;
  }
</style>
