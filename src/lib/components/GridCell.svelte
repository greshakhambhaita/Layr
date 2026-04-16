<script>
  let {
    id,
    colSpan,
    rowSpan,
    r,
    c,
    hex = "#d9d9d9",
    opacity = 1,
    cellRadius = 8,
    type = "color",
    imageUrl = "",
    imageStyle = { fit: "cover", position: "center", scale: 1, offsetX: 0, offsetY: 0 },
    clipPath = "",
    isSelected,
    isMultiSelected = false,
    isHero,
    isDragging,
    onResizeStart,
  } = $props();

  // 1. Layout and Area Calculations
  const gridArea = $derived(`${r + 1} / ${c + 1} / ${r + 1 + rowSpan} / ${c + 1 + colSpan}`);
  const area = $derived(colSpan * rowSpan);
  
  // 2. Dynamic Aesthetics
  const dynamicRadius = $derived.by(() => {
    if (area <= 4) return cellRadius;
    if (area <= 8) return cellRadius * 1.5;
    return cellRadius * 2;
  });

  const contrastFilter = $derived.by(() => {
    if (area >= 16) return "brightness(1.05)";
    if (area <= 4) return "brightness(0.95)";
    return "none";
  });

  // 3. Image Transformation
  const imageTransform = $derived.by(() => {
    const scale = imageStyle?.scale || 1;
    const offsetX = imageStyle?.offsetX || 0;
    const offsetY = imageStyle?.offsetY || 0;
    return `scale(${scale}) translate(${offsetX}%, ${offsetY}%)`;
  });

  // 4. Consolidated Root Styles
  const rootStyle = $derived(`
    grid-area: ${gridArea};
    --cell-bg: ${hex};
    --cell-opacity: ${opacity};
    --cell-radius: ${dynamicRadius}px;
    ${contrastFilter !== "none" ? `filter: ${contrastFilter};` : ""}
    ${clipPath ? `clip-path: ${clipPath};` : ""}
  `);

  // Handlers
  function handleResizeStart(e, corner) {
    if (e.cancelable) e.preventDefault();
    e.stopPropagation();

    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY;

    if (clientX === undefined) return;
    onResizeStart(id, corner, clientX, clientY);
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="cell cell-{id} relative transition-all duration-300 cursor-grab active:cursor-grabbing group/cell hover:scale-[1.015] hover:z-10"
  class:selected={isSelected || isMultiSelected}
  class:dragging={isDragging}
  style={rootStyle}
>
  <!-- [BASE LAYER] Color and Opacity -->
  <div
    class="absolute inset-0 bg-[var(--cell-bg)] opacity-[var(--cell-opacity)] group-hover/cell:brightness-95 transition-all"
    style="border-radius: var(--cell-radius, 8px);"
  ></div>

  <!-- [CONTENT LAYER] Image Content -->
  {#if type === "image" && imageUrl}
    <div
      class="absolute inset-0 z-[1] flex items-center justify-center overflow-hidden"
      style="border-radius: var(--cell-radius, 8px);"
    >
      <img
        src={imageUrl}
        alt="Cell {id} content"
        class="w-full h-full transition-transform duration-200"
        style="
          object-fit: {imageStyle.fit};
          transform-origin: center center;
          transform: {imageTransform};
        "
        draggable="false"
      />
    </div>
  {/if}

  <!-- [INTERACTION LAYER] Selection State Overlay -->
  {#if isSelected || isMultiSelected}
    <div
      class="absolute inset-0 z-[5] border-2 border-[--accent] pointer-events-none"
      style="border-radius: var(--cell-radius, 8px);"
    ></div>
  {/if}

  <!-- [CONTROL LAYER] Resize Handles -->
  {#if (isSelected || isMultiSelected) && !isDragging}
    {#each ["nw", "ne", "sw", "se"] as corner}
      <!-- svelte-ignore a11y_consider_explicit_label -->
      <button
        class="resize-handle resize-{corner} absolute w-2 h-2 z-[10] bg-[--accent] rounded-[1px] transition-transform hover:scale-125 pointer-events-auto"
        onmousedown={(e) => handleResizeStart(e, corner)}
        ontouchstart={(e) => handleResizeStart(e, corner)}
      ></button>
    {/each}
  {/if}
</div>

<style>
  .cell {
    border-radius: var(--cell-radius, 8px);
  }
  .cell.dragging {
    opacity: 0.3;
    transform: scale(0.98);
  }

  /* Handle Positioning */
  .resize-nw { top: -3px; left: -3px; cursor: nw-resize; }
  .resize-ne { top: -3px; right: -3px; cursor: ne-resize; }
  .resize-sw { bottom: -3px; left: -3px; cursor: sw-resize; }
  .resize-se { bottom: -3px; right: -3px; cursor: se-resize; }
</style>
