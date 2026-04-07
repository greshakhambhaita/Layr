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
    originalAspectRatio = 1, // width / height of original cell
  } = $props();

  const gridArea = $derived(
    `${r + 1} / ${c + 1} / ${r + 1 + rowSpan} / ${c + 1 + colSpan}`,
  );
  
  const area = $derived(colSpan * rowSpan);
  
  const dynamicRadius = $derived.by(() => {
    if (area <= 1) return cellRadius;
    if (area <= 2) return cellRadius * 1.25;
    return cellRadius * 1.5;
  });

  // Calculate image transform - keep the user's scale and offset settings
  const imageTransform = $derived.by(() => {
    const scale = imageStyle?.scale || 1;
    const offsetX = imageStyle?.offsetX || 0;
    const offsetY = imageStyle?.offsetY || 0;
    return `scale(${scale}) translate(${offsetX}%, ${offsetY}%)`;
  });

  // Inline styles for grid area and custom dimensions
  const style = $derived(`
    grid-area: ${gridArea};
    --cell-bg: ${hex};
    --cell-opacity: ${opacity};
    --cell-radius: ${dynamicRadius}px;
  `);

</script>

<div
  class="preview-cell relative transition-all duration-300"
  {style}
>
  <!-- Background Color Layer -->
  <div
    class="absolute inset-0 bg-[var(--cell-bg)] opacity-[var(--cell-opacity)] transition-all"
    style="border-radius: var(--cell-radius, 8px);"
  ></div>

  <!-- Image Layer -->
  {#if type === "image" && imageUrl}
    <div
      class="absolute inset-0 z-[1] flex items-center justify-center overflow-hidden"
      style="border-radius: var(--cell-radius, 8px);"
    >
      <img
        src={imageUrl}
        alt="Cell content"
        class="w-full h-full transition-transform duration-200"
        style="
          object-fit: cover;
          object-position: center center;
          transform-origin: center center;
          transform: {imageTransform};
        "
        draggable="false"
      />
    </div>
  {/if}

</div>

<style>
  .preview-cell {
    border-radius: var(--cell-radius, 8px);
  }
</style>
