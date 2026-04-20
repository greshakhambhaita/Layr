<script>
  import ColorPicker from "./ColorPicker.svelte";
  import ImageEditor from "./ImageEditor.svelte";
  import { themeStore } from '$lib/themeStore.svelte.js';

  let { store, isMobile = false, onClose = () => {} } = $props();

  // Check if in preview mode (non-editable)
  let isPreviewMode = $derived(store.isPreviewMode);

  const SHAPES = [
    { colSpan: 1, rowSpan: 1, label: "0.5×0.5" },
    { colSpan: 2, rowSpan: 1, label: "1×0.5" },
    { colSpan: 1, rowSpan: 2, label: "0.5×1" },
    { colSpan: 2, rowSpan: 2, label: "1×1" },
    { colSpan: 4, rowSpan: 2, label: "2×1" },
    { colSpan: 2, rowSpan: 4, label: "1×2" },
    { colSpan: 4, rowSpan: 4, label: "2×2" },
  ];

  let dropdownOpen = $state(false);
  let primarySelectedId = $derived([...store.selectedCellIds][0]);
  let selectedMeta = $derived(store.cellMeta[store.selectedCellId] || null);
  let primarySelectedMeta = $derived(store.cellMeta[primarySelectedId] || null);
  let multiSelectCount = $derived(store.selectedCellIds.size);
  let isContiguous = $derived.by(() => {
    if (store.selectedCellIds.size < 2) return false;
    return store.areCellsContiguous([...store.selectedCellIds]);
  });

  let colorPickerEl = $state(null);
  let copied = $state(false);
  let colorPickerOpen = $state(false);
  let imageEditorOpen = $state(false);
  let fitDropdownOpen = $state(false);

  // Calculate cell aspect ratio for image editor
  let cellAspectRatio = $derived.by(() => {
    if (!primarySelectedMeta) return 1;
    return primarySelectedMeta.colSpan / primarySelectedMeta.rowSpan;
  });


  function handleAddCell(shape) {
    store.addCell(shape.colSpan, shape.rowSpan);
    dropdownOpen = false;
  }

  function handleDimChange(type, value) {
    let v = parseInt(value);
    if (isNaN(v)) return;
    if (type === "cols") store.updateGridDimensions(v, store.numRows);
    if (type === "rows") store.updateGridDimensions(store.numCols, v);
    if (type === "size") store.gridWidth = v;
    if (type === "gap") store.gridGap = v;
    if (type === "radius") {
      store.cellRadius = Math.max(0, v);
      store.updateFusedClipPaths();
    }
    if (type === "x") store.gridX = v;
    if (type === "y") store.gridY = v;
  }

  function handleUnion() {
    store.unionCells([...store.selectedCellIds]);
  }

  function handleDelete() {
    const ids = [...store.selectedCellIds];
    for (const id of ids) {
      store.removeCell(id);
    }
  }



  function triggerColorPicker(e) {
    e.stopPropagation();
    colorPickerOpen = !colorPickerOpen;
  }

  function handleColorChange(newHex) {
    store.updateSelectedCells({ hex: newHex });
  }

  function handleClickOutside(e) {
    if (colorPickerOpen && !e.target.closest(".color-picker-container")) {
      colorPickerOpen = false;
    }
  }
</script>

<svelte:window onclick={handleClickOutside} />

<div
  class="flex flex-col h-full select-none bg-[var(--surface)] font-sans text-[var(--text-main)]"
  class:p-6={!isMobile}
  class:p-4={isMobile}
  class:gap-8={!isMobile}
  class:gap-4={isMobile}
>


  <!-- Theme Toggle -->
  <div class="flex items-center justify-between group">
    <span class="text-[10px] font-bold text-[var(--text-subtle)] uppercase tracking-wider transition-colors group-hover:text-[var(--text-muted)]">Theme</span>
    <button
      class="w-10 h-6 rounded-full bg-[var(--input-bg)] relative transition-all active:scale-95"
      onclick={() => themeStore.toggle()}
      aria-label="Toggle dark mode"
    >
      <div 
        class="absolute top-1 w-4 h-4 rounded-full bg-[var(--accent)] transition-all flex items-center justify-center"
        class:left-1={!themeStore.isDark}
        class:left-5={themeStore.isDark}
      >
        {#if themeStore.isDark}
          <svg class="w-2.5 h-2.5 text-[var(--app-bg)]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        {:else}
          <svg class="w-2.5 h-2.5 text-[var(--app-bg)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <circle cx="12" cy="12" r="5"/>
          </svg>
        {/if}
      </div>
    </button>
  </div>

  <!-- Section: Responsive Settings -->
  {#if store.currentBreakpoint !== 'desktop'}
    <section class="flex flex-col gap-3 animate-dropdownIn">
      <div class="flex items-center justify-between">
        <h3 class="text-[10px] font-bold text-amber-500 dark:text-amber-400 uppercase tracking-wider">
          {store.currentBreakpoint} Overrides
        </h3>
        <button 
          class="text-[9px] font-bold text-[var(--accent)] hover:underline uppercase"
          onclick={() => {
            Object.values(store.cellMeta).forEach(meta => {
              if (meta.overrides?.[store.currentBreakpoint]) {
                delete meta.overrides[store.currentBreakpoint];
              }
            });
            store.syncSlotMap();
          }}
        >
          Reset to Auto
        </button>
      </div>
      <p class="text-[10px] text-[var(--text-muted)] leading-relaxed italic">
        Any moves or resizes you make in this view will only affect the {store.currentBreakpoint} layout.
      </p>
    </section>
  {/if}

  <!-- Section: Create -->
  <section class="flex flex-col gap-3" class:opacity-40={store.currentBreakpoint !== 'desktop'} class:pointer-events-none={store.currentBreakpoint !== 'desktop'}>
    <div class="flex items-center justify-between">
      <h3 class="text-[10px] font-bold text-[var(--text-subtle)] uppercase tracking-wider">
        Create
      </h3>
    </div>
    <div class="relative">
      <button
        class="w-full h-10 flex items-center justify-between px-4 bg-[var(--input-bg)] rounded-lg text-[13px] font-bold transition-all hover:bg-[var(--surface-hover)] hover:ring-2 hover:ring-[var(--accent)]/30 active:scale-[0.98] border border-[var(--border-subtle)]"
        class:ring-2={dropdownOpen}
        class:ring-[var(--accent)]={dropdownOpen}
        class:bg-gradient-to-br={dropdownOpen}
        class:from-[var(--surface)]={dropdownOpen}
        class:to-[var(--surface-hover)]={dropdownOpen}
        onclick={() => (dropdownOpen = !dropdownOpen)}
      >
        <span class="text-[var(--text-muted)] transition-colors" class:!text-[var(--text-main)]={dropdownOpen}>ADD SHAPE</span>
        <svg
          class="w-2.5 h-2.5 text-[var(--text-muted)] transition-all"
          class:rotate-180={dropdownOpen}
          class:!text-[var(--accent)]={dropdownOpen}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="3"><polyline points="6 9 12 15 18 9" /></svg
        >
      </button>

      {#if dropdownOpen}
        <div
          class="absolute left-0 right-0 mt-2 z-50 bg-[var(--surface)] rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.4)] p-2 flex flex-col gap-1 border border-[var(--border-subtle)] animate-dropdownIn"
          class:bottom-full={isMobile}
          class:top-full={!isMobile}
          class:mb-2={isMobile}
        >
          <div class="grid gap-1" class:grid-cols-2={isMobile} class:grid-cols-1={!isMobile}>
            {#each SHAPES as shape}
              <button
                class="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[var(--surface-hover)] transition-all text-[12px] group/shape"
                onclick={() => handleAddCell(shape)}
              >
                <div
                  class="grid grid-cols-4 grid-rows-4 gap-[2px] w-5 h-5 opacity-30 transition-all group-hover/shape:opacity-100 group-hover/shape:scale-110"
                >
                  {#each Array(16) as _, i}
                    {@const r = Math.floor(i / 4)}
                    {@const c = i % 4}
                    <div
                      class="rounded-[1.5px] transition-colors {r < shape.rowSpan &&
                      c < shape.colSpan
                        ? 'bg-[var(--text-main)] group-hover/shape:bg-[var(--accent)]'
                        : 'bg-[var(--text-main)]/10'}"
                    ></div>
                  {/each}
                </div>
                <span class="font-medium text-[var(--text-muted)] group-hover/shape:text-[var(--text-main)] transition-colors">{shape.label}</span>
              </button>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </section>

  <!-- Section: Selection -->
  <section class="flex flex-col gap-3">
    <h3 class="text-[10px] font-bold text-[var(--text-subtle)] uppercase tracking-wider">
      Selection
    </h3>
    <div class="flex flex-col gap-2" class:opacity-40={multiSelectCount === 0} class:pointer-events-none={multiSelectCount === 0}>
      {#if multiSelectCount >= 2 && store.currentBreakpoint === 'desktop'}
        <button
          disabled={!isContiguous || multiSelectCount === 0}
          class="h-10 flex items-center justify-center gap-2 px-4 rounded-lg text-[12px] font-semibold transition-all shadow-none
            {isContiguous && multiSelectCount >= 2
            ? 'bg-[var(--accent)] text-[var(--app-bg)] hover:opacity-90 active:scale-[0.98]'
            : 'bg-[var(--input-bg)] text-[var(--text-subtle)] cursor-not-allowed'}"
          onclick={handleUnion}
        >
          Union Selection
        </button>
      {/if}

      <div class="flex flex-col gap-2">
        <button
          disabled={multiSelectCount === 0}
          class="h-10 flex items-center justify-center px-4 bg-[var(--input-bg)] rounded-lg text-[11px] font-semibold text-[var(--text-muted)] hover:bg-[var(--surface-hover)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          onclick={handleDelete}
        >
          {store.currentBreakpoint === 'desktop' ? 'DELETE SELECTION' : 'REMOVE FROM CURRENT VIEW'}
        </button>
      </div>
    </div>
  </section>

  <!-- Section: Grid Configuration -->
  <section class="flex flex-col gap-3" class:opacity-40={isPreviewMode} class:pointer-events-none={isPreviewMode}>
    <h3 class="text-[10px] font-bold text-[var(--text-subtle)] uppercase tracking-wider">
      Grid Configuration
    </h3>
    <div class="grid gap-2" class:grid-cols-2={true}>
      <div class="grid grid-cols-2 gap-2 col-span-2">
        <div class="flex flex-col gap-1.5">
          <label for="side-x" class="text-[9px] text-[var(--text-muted)] text-center">X Position</label>
          <input
            id="side-x"
            type="number"
            value={Math.round(store.gridX)}
            oninput={(e) => handleDimChange("x", e.target.value)}
            class="w-full h-9 bg-[var(--input-bg)] rounded-lg text-center text-[12px] font-medium outline-none border-none focus:ring-1 focus:ring-[var(--accent)] text-[var(--text-main)]"
          />
        </div>
        <div class="flex flex-col gap-1.5">
          <label for="side-y" class="text-[9px] text-[var(--text-muted)] text-center">Y Position</label>
          <input
            id="side-y"
            type="number"
            value={Math.round(store.gridY)}
            oninput={(e) => handleDimChange("y", e.target.value)}
            class="w-full h-9 bg-[var(--input-bg)] rounded-lg text-center text-[12px] font-medium outline-none border-none focus:ring-1 focus:ring-[var(--accent)] text-[var(--text-main)]"
          />
        </div>
      </div>
      <div class="flex flex-col gap-1.5">
        <label for="side-cols" class="text-[9px] text-[var(--text-muted)] text-center">Columns</label>
        <input
          id="side-cols"
          type="number"
          value={store.numCols}
          oninput={(e) => handleDimChange("cols", e.target.value)}
          class="w-full h-9 bg-[var(--input-bg)] rounded-lg text-center text-[12px] font-medium outline-none border-none focus:ring-1 focus:ring-[var(--accent)] text-[var(--text-main)]"
        />
      </div>
      <div class="flex flex-col gap-1.5">
        <label for="side-rows" class="text-[9px] text-[var(--text-muted)] text-center">Rows</label>
        <input
          id="side-rows"
          type="number"
          value={store.numRows}
          oninput={(e) => handleDimChange("rows", e.target.value)}
          class="w-full h-9 bg-[var(--input-bg)] rounded-lg text-center text-[12px] font-medium outline-none border-none focus:ring-1 focus:ring-[var(--accent)] text-[var(--text-main)]"
        />
      </div>
      <div class="flex flex-col gap-1.5">
        <label for="side-size" class="text-[9px] text-[var(--text-muted)] text-center">Grid Size</label>
        <input
          id="side-size"
          type="number"
          value={store.gridWidth}
          oninput={(e) => handleDimChange("size", e.target.value)}
          class="w-full h-9 bg-[var(--input-bg)] rounded-lg text-center text-[12px] font-medium outline-none border-none focus:ring-1 focus:ring-[var(--accent)] text-[var(--text-main)]"
        />
      </div>
      <div class="flex flex-col gap-1.5">
        <label for="side-gap" class="text-[9px] text-[var(--text-muted)] text-center">Gap</label>
        <input
          id="side-gap"
          type="number"
          value={store.gridGap}
          oninput={(e) => handleDimChange("gap", e.target.value)}
          class="w-full h-9 bg-[var(--input-bg)] rounded-lg text-center text-[12px] font-medium outline-none border-none focus:ring-1 focus:ring-[var(--accent)] text-[var(--text-main)]"
        />
      </div>
    </div>
    <!-- Corner Radius Slider -->
    <div class="flex flex-col gap-2 mt-1">
      <div class="flex items-center justify-between">
        <label for="side-radius" class="text-[9px] text-[var(--text-muted)] uppercase tracking-wider">Corner Radius</label>
        <span class="text-[10px] font-mono font-bold text-[var(--accent)]">{store.cellRadius}px</span>
      </div>
      <div class="flex items-center gap-3 px-3 py-2.5 bg-[var(--input-bg)] rounded-xl">
        <input
          id="side-radius"
          type="range"
          min="0"
          max="100"
          value={store.cellRadius}
          oninput={(e) => handleDimChange("radius", e.target.value)}
          class="radius-slider flex-1"
        />
        <button
          class="w-6 h-6 flex items-center justify-center text-[var(--text-subtle)] hover:text-[var(--text-muted)] transition-colors rounded-full hover:bg-[var(--surface-hover)]"
          onclick={() => { store.cellRadius = 8; store.updateFusedClipPaths(); }}
          aria-label="Reset corner radius"
          title="Reset to default (8px)"
        >
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
          </svg>
        </button>
      </div>
    </div>
  </section>

  <!-- Section: Fill -->
  <section class="flex flex-col gap-4" class:opacity-40={isPreviewMode} class:pointer-events-none={isPreviewMode}>
    <div class="flex items-center justify-between">
      <h3
        class="text-[10px] font-bold text-[var(--text-subtle)] uppercase tracking-wider"
      >
        Fill {multiSelectCount > 1 ? `(${multiSelectCount} Cells)` : ''}
      </h3>
      <div class="flex gap-4" class:opacity-0={multiSelectCount === 0} class:pointer-events-none={multiSelectCount === 0}>
        <button
          class="text-[var(--text-muted)] transition-colors p-1 hover:bg-[var(--surface-hover)] rounded-md"
          class:!text-[var(--accent)]={primarySelectedMeta?.type === "color"}
          onclick={() => store.updateSelectedCells({ type: "color" })}
          aria-label="Set fill type to color"
        >
          <!-- Droplet Icon -->
          <svg
            class="w-5 h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
            ><path
              d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5s-3 3.5-3 5.5a7 7 0 0 0 7 7z"
            /></svg
          >
        </button>
        <button
          class="text-[var(--text-muted)] transition-colors p-1 hover:bg-[var(--surface-hover)] rounded-md"
          class:!text-[var(--accent)]={primarySelectedMeta?.type === "image"}
          onclick={() => store.updateSelectedCells({ type: "image" })}
          aria-label="Set fill type to image"
        >
          <!-- Overlapping Squares Icon -->
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <rect x="4" y="4" width="12" height="12" rx="2" opacity="0.4" />
            <rect
              x="8"
              y="8"
              width="12"
              height="12"
              rx="2"
              stroke="white"
              stroke-width="1.5"
            />
          </svg>
        </button>
      </div>
    </div>

    <div class="flex flex-col gap-4" class:opacity-40={multiSelectCount === 0} class:pointer-events-none={multiSelectCount === 0}>
      {#if primarySelectedMeta?.type === "image"}
        <div class="flex flex-col gap-3">
          <!-- Image URL Input -->
          <div class="relative group">
            <input
              type="text"
              placeholder="Image URL"
              value={primarySelectedMeta?.imageUrl || ''}
              oninput={(e) =>
                store.updateSelectedCells({ imageUrl: e.target.value })}
              class="w-full h-10 bg-[var(--input-bg)] rounded-lg pl-4 pr-10 text-[12px] font-medium outline-none placeholder:text-[var(--text-subtle)] text-[var(--text-main)]"
            />
            <button
              class="absolute right-2 top-1.5 p-1.5 text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
              onclick={() => document.getElementById("sidebar-file-upload").click()}
              aria-label="Upload image"
            >
              <svg
                class="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <input
                id="sidebar-file-upload"
                type="file"
                accept="image/*"
                class="hidden"
                onchange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (re) =>
                      store.updateSelectedCells({
                        imageUrl: re.target.result,
                      });
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </button>
          </div>

          <!-- Edit Image Button -->
          {#if primarySelectedMeta?.imageUrl && multiSelectCount === 1}
            <button
              class="w-full h-10 flex items-center justify-center gap-2 bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 text-[var(--accent)] rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all"
              onclick={() => imageEditorOpen = true}
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15V6"/>
                <path d="M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/>
                <path d="M12 12H3"/>
                <path d="M16 6H3"/>
                <path d="M12 18H3"/>
              </svg>
              Crop & Position
            </button>
          {/if}

          <!-- Image Settings: Fit and Scale -->
          <div class="flex gap-2">
            <!-- Custom Fit Dropdown -->
            <div class="relative flex-1">
              <button
                class="w-full h-10 bg-[var(--input-bg)] hover:bg-[var(--surface-hover)] rounded-lg px-4 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all outline-none"
                onclick={() => (fitDropdownOpen = !fitDropdownOpen)}
              >
                <span>{primarySelectedMeta?.imageStyle?.fit || 'cover'}</span>
                <svg
                  class="w-2 h-2 text-[var(--text-subtle)] transition-transform duration-200"
                  class:rotate-180={fitDropdownOpen}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="5"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {#if fitDropdownOpen}
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div 
                  class="fixed inset-0 z-[100]" 
                  onclick={() => (fitDropdownOpen = false)}
                ></div>

                <div 
                  class="absolute top-full left-0 right-0 mt-1.5 bg-[var(--surface)] border border-[var(--border-subtle)] rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.15)] z-[101] overflow-hidden animate-dropdownIn"
                >
                  {#each [
                    { value: 'cover', label: 'COVER' },
                    { value: 'contain', label: 'CONTAIN' },
                    { value: 'fill', label: 'STRETCH' }
                  ] as option}
                    <button
                      class="w-full px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider transition-all"
                      class:bg-[var(--accent)]={primarySelectedMeta?.imageStyle?.fit === option.value}
                      class:text-[var(--app-bg)]={primarySelectedMeta?.imageStyle?.fit === option.value}
                      class:text-[var(--text-muted)]={primarySelectedMeta?.imageStyle?.fit !== option.value}
                      class:hover:bg-[var(--surface-hover)]={primarySelectedMeta?.imageStyle?.fit !== option.value}
                      class:hover:text-[var(--text-main)]={primarySelectedMeta?.imageStyle?.fit !== option.value}
                      onclick={() => {
                        store.updateSelectedCells({
                          imageStyle: {
                            ...primarySelectedMeta.imageStyle,
                            fit: option.value,
                          },
                        });
                        fitDropdownOpen = false;
                      }}
                    >
                      {option.label}
                    </button>
                  {/each}
                </div>
              {/if}
            </div>

            <!-- Scale Controls -->
            <div class="flex items-center bg-[var(--input-bg)] rounded-lg px-1">
              <button
                class="w-8 h-8 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--accent)] text-lg font-bold"
                onclick={() =>
                  store.updateSelectedCells({
                    imageStyle: {
                      ...primarySelectedMeta.imageStyle,
                      scale: Math.max(0.5, (primarySelectedMeta.imageStyle?.scale || 1) - 0.1),
                    },
                  })}
                aria-label="Decrease image scale">−</button
              >
              <span class="w-8 text-center text-[11px] font-bold text-[var(--text-muted)]"
                >{Math.round((primarySelectedMeta?.imageStyle?.scale || 1) * 100)}%</span
              >
              <button
                class="w-8 h-8 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--accent)] text-lg font-bold"
                onclick={() => {
                  const newScale = Math.min(3, (primarySelectedMeta.imageStyle?.scale || 1) + 0.1);
                  store.updateSelectedCells({
                    imageStyle: {
                      ...(primarySelectedMeta.imageStyle || {}),
                      scale: newScale,
                    },
                  });
                }}
                aria-label="Increase image scale">+</button
              >
            </div>
          </div>

          <!-- Position indicator -->
          {#if (primarySelectedMeta?.imageStyle?.offsetX || 0) !== 0 || (primarySelectedMeta?.imageStyle?.offsetY || 0) !== 0}
            <div class="flex items-center justify-between px-3 py-2 bg-[var(--input-bg)] rounded-lg">
              <span class="text-[10px] text-[var(--text-muted)]">
                Position: X {Math.round(primarySelectedMeta?.imageStyle?.offsetX || 0)}%, Y {Math.round(primarySelectedMeta?.imageStyle?.offsetY || 0)}%
              </span>
              <button
                class="text-[10px] font-medium text-[var(--accent)] hover:underline"
                onclick={() => store.updateCell(primarySelectedMeta.id, {
                  imageStyle: {
                    ...primarySelectedMeta.imageStyle,
                    offsetX: 0,
                    offsetY: 0,
                    scale: 1
                  }
                })}
              >
                Reset
              </button>
            </div>
          {/if}
        </div>
      {:else}
        <div class="flex gap-2">
          <div
            class="flex-1 h-10 bg-[var(--input-bg)] rounded-lg flex items-center px-2 gap-3 color-picker-container relative"
          >
            <button
              class="w-6 h-6 rounded border border-[var(--border-subtle)] transition-transform active:scale-95"
              style="background: {primarySelectedMeta?.hex || '#d9d9d9'}"
              onclick={triggerColorPicker}
              aria-label="Select color"
            ></button>

            {#if colorPickerOpen}
              <div class="absolute bottom-full left-0 mb-2 z-[100]">
                <ColorPicker
                  hex={primarySelectedMeta?.hex || "#d9d9d9"}
                  onchange={handleColorChange}
                  onClose={() => colorPickerOpen = false}
                />
              </div>
            {/if}

            <input
              type="text"
              value={(primarySelectedMeta?.hex || "#d9d9d9")
                .replace("#", "")
                .toUpperCase()}
              oninput={(e) =>
                store.updateSelectedCells({
                  hex: "#" + e.target.value,
                })}
              class="flex-1 bg-transparent border-none text-[12px] font-bold text-[var(--text-main)] outline-none font-mono"
            />
          </div>

          <div
            class="w-24 h-10 bg-[var(--input-bg)] rounded-lg flex items-center px-4 justify-between"
          >
            <input
              type="number"
              value={Math.round((primarySelectedMeta?.opacity || 1) * 100)}
              oninput={(e) =>
                store.updateSelectedCells({
                  opacity: parseInt(e.target.value) / 100,
                })}
              class="w-8 bg-transparent border-none text-[12px] font-bold text-[var(--text-main)] outline-none text-center"
            />
            <span class="text-[11px] font-bold text-[var(--text-subtle)]">%</span>
          </div>
        </div>
      {/if}
    </div>
  </section>


  <!-- Footer Actions -->
  <section 
    class="flex flex-col gap-4 pt-4" 
    class:mt-auto={!isMobile} 
    class:border-t={isMobile} 
    class:border-[var(--border-subtle)]={isMobile}
  >
    {#if !isMobile}
      <button
        class="w-full h-12 bg-[var(--accent)] text-[var(--app-bg)] rounded-xl font-bold text-[12px] tracking-[0.15em] transition-all hover:opacity-90 hover:scale-[1.01] active:scale-[0.98] shadow-[0_10px_30px_var(--accent-glow)] relative overflow-hidden group/btn"
        onclick={() => document.dispatchEvent(new CustomEvent("open-export"))}
      >
        <span class="relative z-10">GRID PREVIEW</span>
      </button>
    {/if}
    <button
      class="w-full text-center text-[var(--text-subtle)] font-bold text-[11px] tracking-widest hover:text-[var(--text-muted)] transition-all uppercase"
      class:py-2={isMobile}
      onclick={() => store.resetGrid()}
    >
      RESET BOARD
    </button>
  </section>
</div>

<!-- Image Editor Modal -->
<ImageEditor
  isOpen={imageEditorOpen}
  imageUrl={selectedMeta?.imageUrl || ''}
  imageStyle={selectedMeta?.imageStyle || { fit: 'cover', scale: 1, offsetX: 0, offsetY: 0 }}
  cellAspectRatio={cellAspectRatio}
  onSave={(newStyle) => {
    store.updateSelectedCells({ imageStyle: newStyle });
  }}
  onClose={() => imageEditorOpen = false}
/>

<style>
  @keyframes dropdownIn {
    from {
      opacity: 0;
      transform: translateY(-5px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
  @keyframes dropdownIn {
    from {
      opacity: 0;
      transform: translateY(-5px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
  .animate-dropdownIn {
    animation: dropdownIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  /* Remove arrows from number inputs */
  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  input[type="number"] {
    appearance: textfield;
  }

  /* Custom radius slider styling */
  .radius-slider {
    -webkit-appearance: none;
    appearance: none;
    height: 4px;
    background: var(--surface-active);
    border-radius: 2px;
    cursor: pointer;
  }

  .radius-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--text-main);
    cursor: pointer;
    border: 2px solid var(--surface);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }

  .radius-slider::-webkit-slider-thumb:hover {
    transform: scale(1.1);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
  }

  .radius-slider::-webkit-slider-thumb:active {
    transform: scale(0.95);
  }

  .radius-slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--text-main);
    cursor: pointer;
    border: 2px solid var(--surface);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }

  .radius-slider::-moz-range-thumb:hover {
    transform: scale(1.1);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
  }

  .radius-slider::-moz-range-track {
    height: 4px;
    background: var(--surface-active);
    border-radius: 2px;
  }
</style>
