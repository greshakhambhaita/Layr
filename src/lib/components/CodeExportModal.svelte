<script>
  let { store, isOpen, onClose } = $props();

</script>

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 bg-[var(--overlay-bg)] backdrop-blur-md z-[10000] flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-10 animate-fadeIn"
    onclick={onClose}
  >
    <div
      class="bg-[var(--surface)] w-full sm:max-w-[1000px] h-[90vh] sm:h-auto sm:max-h-[85vh] sm:min-h-[500px] rounded-t-2xl sm:rounded-xl border border-[var(--border-subtle)] flex flex-col overflow-hidden animate-slideIn"
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Header -->
      <div
        class="px-4 sm:px-5 py-3 sm:py-4 border-b border-[var(--border-subtle)] flex justify-between items-center bg-[var(--surface)] shrink-0"
      >
        <div class="flex flex-col gap-0.5">
          <h3
            class="font-sans text-[11px] font-bold uppercase tracking-wider text-[var(--text-main)]"
          >
            Grid Preview
          </h3>
          <span
            class="font-mono text-[9px] text-[var(--text-muted)] tracking-wider hidden sm:block"
          >
            Visual layout preview · Original grid output
          </span>
        </div>
        <button
          class="bg-[var(--input-bg)] rounded-lg w-8 h-8 flex items-center justify-center text-xs cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-hover)] transition-all font-bold"
          onclick={onClose}>✕</button
        >
      </div>

      <div
        class="flex-1 flex overflow-hidden items-center justify-center p-8 bg-[var(--code-bg)] relative bg-[radial-gradient(circle,var(--border-subtle)_1px,transparent_1px)] bg-[length:16px_16px]"
      >
        <!-- Preview Container -->
        <div
          class="bg-[var(--surface)] border border-[var(--border-subtle)] rounded-[2px] grid relative pointer-events-none p-2 shadow-2xl"
          style="
            width: {store.gridWidth}px;
            height: {store.gridHeight}px;
            gap: {store.gridGap}px;
            box-sizing: border-box;
            grid-template-columns: repeat({store.internalCols}, 1fr);
            grid-template-rows: repeat({store.internalRows}, 1fr);
            grid-auto-columns: 1fr;
            grid-auto-rows: 1fr;
            transform: scale({Math.min(
            0.8,
            800 / store.gridWidth,
            600 / store.gridHeight,
          )});
            transform-origin: center;
          "
        >
          {#each Object.values(store.cellMeta) as meta (meta.id)}
            <div
              class="border border-[var(--border-subtle)] relative flex items-center justify-center overflow-hidden"
              style="
                grid-area: {meta.r + 1} / {meta.c + 1} / {meta.r +
                1 +
                meta.rowSpan} / {meta.c + 1 + meta.colSpan};
                background: {meta.hex || '#d9d9d9'};
                opacity: {meta.opacity ?? 1};
                border-radius: {store.cellRadius}px;
                {meta.clipPath ? `clip-path: ${meta.clipPath};` : ''}
              "
            >
              {#if meta.type === "image" && meta.imageUrl}
                <img
                  src={meta.imageUrl}
                  alt=""
                  class="absolute inset-0 w-full h-full"
                  style="object-fit: {meta.imageStyle
                    .fit}; object-position: {meta.imageStyle
                    .position}; transform: scale({meta.imageStyle.scale});"
                />
              {/if}
              {#if meta.textElements && meta.textElements.length > 0}
                <div
                  class="absolute inset-0 pointer-events-none overflow-hidden z-[2]"
                >
                  {#each meta.textElements as text}
                    <div
                      style="
                        position: absolute;
                        left: {text.x}%;
                        top: {text.y}%;
                        transform: translate(-50%, -50%) rotate({text.rotation}deg) scale({text.scale});
                        font-family: '{text.fontFamily}', sans-serif;
                        font-size: {text.fontSize * 0.5}px;
                        font-weight: {text.fontWeight};
                        color: {text.color};
                        opacity: {text.opacity};
                      "
                    >
                      {text.text}
                    </div>
                  {/each}
                </div>
              {/if}
              <div
                class="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/5 opacity-40"
              ></div>
              <span class="font-mono text-[9px] text-white/20 z-[1]"
                >{meta.id}</span
              >
            </div>
          {/each}
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(12px) scale(0.97);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .animate-fadeIn {
    animation: fadeIn 0.2s ease;
  }
  .animate-slideIn {
    animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
  }
</style>
