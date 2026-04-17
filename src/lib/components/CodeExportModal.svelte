<script>
  import { serializeGrid } from '$lib/serializeGrid';
  let { store, isOpen, onClose } = $props();

  let publishing = $state(false);
  let nickname = $state(null);
  let error = $state(null);

  async function handlePublish() {
    publishing = true;
    error = null;
    nickname = null;

    try {
      const config = serializeGrid(store);
      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      const data = await res.json();
      if (res.ok) {
        nickname = data.nickname;
      } else {
        error = data.error || 'Failed to publish';
      }
    } catch (e) {
      error = 'An error occurred while publishing';
      console.error(e);
    } finally {
      publishing = false;
    }
  }

  function copyCommand() {
    if (!nickname) return;
    navigator.clipboard.writeText(`bunx layr-drop add ${nickname}`);
  }
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 bg-[var(--overlay-bg)] backdrop-blur-md z-[10000] flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-10 animate-fadeIn"
    onclick={onClose}
  >
    <div
      class="bg-[var(--surface)] w-full sm:max-w-[1000px] h-[90vh] sm:h-auto sm:max-h-[85vh] sm:min-h-[500px] rounded-t-2xl sm:rounded-xl border border-[var(--border-subtle)] flex flex-col overflow-hidden animate-slideIn shadow-2xl"
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
            Grid Preview & Publish
          </h3>
          <span
            class="font-mono text-[9px] text-[var(--text-muted)] tracking-wider hidden sm:block"
          >
            Visual layout preview · Ready for CLI export
          </span>
        </div>
        <button
          class="bg-[var(--input-bg)] rounded-lg w-8 h-8 flex items-center justify-center text-xs cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-hover)] transition-all font-bold"
          onclick={onClose}>✕</button
        >
      </div>

      <div class="flex-1 flex flex-col sm:flex-row overflow-hidden">
        <!-- Preview Panel -->
        <div
          class="flex-1 flex overflow-hidden items-center justify-center p-8 bg-[var(--code-bg)] relative bg-[radial-gradient(circle,var(--border-subtle)_1px,transparent_1px)] bg-[length:16px_16px]"
        >
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
                (typeof window !== 'undefined' ? window.innerWidth * 0.5 : 400) / store.gridWidth,
                600 / store.gridHeight,
              )});
              transform-origin: center;
            "
          >
            {#each Object.values(store.cellMeta) as meta (meta.id)}
              <div
                class="border border-[var(--border-subtle)] relative flex items-center justify-center overflow-hidden"
                style="
                  grid-area: {meta.r + 1} / {meta.c + 1} / {meta.r + 1 + meta.rowSpan} / {meta.c + 1 + meta.colSpan};
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
                    style="object-fit: {meta.imageStyle.fit}; object-position: {meta.imageStyle.position}; transform: scale({meta.imageStyle.scale});"
                  />
                {/if}
                <div class="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/5 opacity-40"></div>
                <span class="font-mono text-[9px] text-white/20 z-[1]">{meta.id}</span>
              </div>
            {/each}
          </div>
        </div>

        <!-- Publish Panel -->
        <div class="w-full sm:w-[320px] bg-[var(--surface)] border-l border-[var(--border-subtle)] p-6 flex flex-col gap-6 shrink-0">
          <div class="flex flex-col gap-2">
            <h4 class="text-[10px] font-bold text-[var(--text-subtle)] uppercase tracking-[0.15em]">CLI Export</h4>
            <p class="text-[12px] text-[var(--text-muted)] leading-relaxed">
              Publish your grid to the cloud and import it directly into your React project using the Layr CLI.
            </p>
          </div>

          {#if !nickname}
            <button
              class="w-full h-11 bg-[var(--accent)] text-[var(--app-bg)] font-bold text-[12px] rounded-lg transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 group disabled:opacity-50 disabled:pointer-events-none"
              onclick={handlePublish}
              disabled={publishing}
            >
              {#if publishing}
                <svg class="animate-spin h-4 w-4 text-[var(--app-bg)]" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                PUBLISHING...
              {:else}
                <svg class="w-4 h-4 transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/><polyline points="16 16 12 12 8 16"/></svg>
                PUBLISH TO CLOUD
              {/if}
            </button>
          {:else}
            <div class="flex flex-col gap-3 animate-slideIn">
              <div class="bg-[var(--accent)]/10 border border-[var(--accent)]/20 rounded-lg p-4 flex flex-col gap-2">
                <div class="flex items-center gap-2 text-[var(--accent)]">
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                  <span class="text-[11px] font-bold uppercase tracking-wider">Success!</span>
                </div>
                <p class="text-[13px] font-mono text-[var(--text-main)] font-bold">
                  {nickname}
                </p>
                <div class="text-[10px] text-[var(--text-muted)] mt-1">
                  Available for 48 hours
                </div>
              </div>

              <div class="flex flex-col gap-2 mt-2">
                <span class="text-[9px] font-bold text-[var(--text-subtle)] uppercase">Run this command:</span>
                <div class="relative group/cmd">
                  <div class="bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded-lg p-3 pr-10 font-mono text-[11px] text-[var(--text-main)] break-all leading-tight">
                    bunx layr-drop add {nickname}
                  </div>
                  <button 
                    class="absolute top-2 right-2 p-1.5 rounded-md bg-[var(--surface)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--accent)] transition-all hover:scale-105 active:scale-95"
                    onclick={copyCommand}
                    title="Copy to clipboard"
                  >
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
                  </button>
                </div>
              </div>
              
              <button 
                class="text-[10px] font-bold text-[var(--text-subtle)] hover:text-[var(--text-muted)] transition-colors mt-2"
                onclick={() => { nickname = null; }}
              >
                PUBLISH AGAIN
              </button>
            </div>
          {/if}

          {#if error}
            <div class="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-[11px] font-medium leading-normal animate-shake">
              {error}
            </div>
          {/if}

          <div class="mt-auto border-t border-[var(--border-subtle)] pt-4">
              <div class="flex items-center gap-2 text-[var(--text-subtle)]">
                  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                  <span class="text-[10px] font-medium leading-tight">Images will need to be downloaded manually if you used base64 or blob URLs.</span>
              </div>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
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
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-4px); }
    75% { transform: translateX(4px); }
  }

  .animate-fadeIn {
    animation: fadeIn 0.2s ease;
  }
  .animate-slideIn {
    animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
  }
  .animate-shake {
    animation: shake 0.2s ease-in-out 0s 2;
  }
</style>
