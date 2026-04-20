<script>
  import Logo from "$lib/assets/p.svg";
  import { BentoStore } from "$lib/bentoStore.svelte.js";
  import { onMount } from "svelte";
  import BentoContainer from "./BentoContainer.svelte";
  import BreakpointSelector from "./BreakpointSelector.svelte";
  import CodeExportModal from "./CodeExportModal.svelte";
  import Toolbar from "./Toolbar.svelte";

  const store = new BentoStore();

  let isExportOpen = $state(false);
  let isMobileToolbarOpen = $state(false);
  let isMobile = $state(false);
  let isMultiSelectMode = $state(false);

  onMount(() => {
    store.loadFromLocalStorage();
    // Standard event listener for export modal
    const handleOpenExport = () => (isExportOpen = true);
    document.addEventListener("open-export", handleOpenExport);

    // Check for mobile viewport
    const checkMobile = () => {
      isMobile = window.innerWidth < 1024;
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => {
      document.removeEventListener("open-export", handleOpenExport);
      window.removeEventListener("resize", checkMobile);
    };
  });
</script>

<div
  id="builder-view"
  class="flex h-screen w-full overflow-hidden bg-[var(--app-bg)] animate-viewFadeIn"
>
  <!-- Top Bar -->
  <div
    class="fixed top-6 left-0 right-0 z-50 flex items-center px-8 pointer-events-none"
  >
    <div class="hidden lg:flex items-center gap-6 pointer-events-auto">
      <a
        href="/"
        class="group flex items-center transition-all duration-500"
      >
        <img
          src={Logo}
          alt="Layr"
          class="h-[28px] w-auto opacity-25 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-300 dark:invert"
        />
      </a>
      <div class="h-4 w-[1px] bg-[var(--border-subtle)]"></div>
      <div class="flex items-center gap-6">
        <a href="/templates" class="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] hover:text-white transition-colors">Templates</a>
        <a href="/guide" class="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] hover:text-white transition-colors">Technical Guide</a>
        <span class="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[8px] text-white/20 uppercase tracking-widest font-mono">v1.2</span>
      </div>
    </div>

    <!-- Device selector: absolutely centered on lg; inline centered group on mobile -->
    <div
      class="pointer-events-auto lg:absolute lg:left-1/2 lg:-translate-x-1/2 flex items-center gap-2 mx-auto lg:mx-0"
    >
      <!-- LAYR — shown inline only on mobile -->
      <a
        href="/"
        class="lg:hidden group flex items-center transition-all duration-500"
      >
        <img
          src={Logo}
          alt="Layr"
          class="h-[24px] w-auto opacity-25 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-300 dark:invert"
        />
      </a>

      <!-- Divider — mobile only -->
      <div
        class="lg:hidden w-px h-3 bg-[var(--border-subtle)] opacity-60"
      ></div>

      <!-- Device Breakpoint Selector -->
      <BreakpointSelector {store} />

      <!-- Multi-select toggle — mobile/tablet only (desktop uses Shift+Click) -->
      {#if !store.isPreviewMode && Object.keys(store.cellMeta).length > 0}
        <button
          class="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90 border border-[var(--border-subtle)] backdrop-blur-md {isMultiSelectMode
            ? 'bg-[var(--accent)] text-[var(--app-bg)] border-[var(--accent)]'
            : 'bg-[var(--input-bg)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-hover)]'}"
          onclick={() => (isMultiSelectMode = !isMultiSelectMode)}
          aria-label="Toggle multi-select mode"
          title="Multi-select cells"
        >
          <svg
            class="w-3.5 h-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            {#if isMultiSelectMode}
              <path d="M20 6L9 17l-5-5" stroke-width="3" />
            {:else}
              <rect
                x="3"
                y="3"
                width="18"
                height="18"
                rx="2"
                stroke-dasharray="3 1.5"
              />
              <path
                d="M8 8h1M13 8h1M8 13h1M13 13h1"
                stroke-linecap="round"
                stroke-width="3"
              />
            {/if}
          </svg>
        </button>
      {/if}
    </div>
  </div>

  <!-- Canvas / Main Area -->
  <main
    class="flex-1 relative overflow-auto flex items-center justify-center p-6 lg:p-12"
  >
    <div class="flex items-center justify-center w-full h-full">
      {#key store.currentBreakpoint}
        <div
          class="animate-breakpointTransition w-full h-full flex items-center justify-center"
        >
          {#if store.currentBreakpoint === 'desktop'}
            <!-- Desktop Edit Mode -->
            <BentoContainer {store} {isMultiSelectMode} />
          {:else}
            <!-- Responsive Edit Mode with Device Frame -->
            {@const dims = store.getPreviewGridDimensions()}
            {@const isMobileView = store.currentBreakpoint === 'mobile'}
            <div 
              class="device-frame relative bg-[var(--surface)] overflow-hidden transition-all duration-500 rounded-[32px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.4)] border-[6px] border-[#71717a] dark:border-[#2a2a2a] flex flex-col items-center"
              style="width: {isMobileView ? 375 : 768}px; height: {isMobileView ? 667 : 1024}px;"
            >
              <!-- Notch -->
              {#if isMobileView}
                <div class="absolute top-0 left-1/2 -translate-x-1/2 bg-[#71717a] dark:bg-[#2a2a2a] rounded-b-2xl z-20 w-[120px] h-[24px]"></div>
              {/if}
              
              <!-- Screen Content -->
              <div class="w-full h-full bg-[var(--app-bg)] overflow-auto scrollbar-hide pt-10 pb-8 px-4">
                <BentoContainer {store} {isMultiSelectMode} />
              </div>

              <!-- Home Indicator -->
              {#if isMobileView}
                <div class="absolute bottom-2 left-1/2 -translate-x-1/2 bg-[var(--text-muted)]/30 rounded-full w-[100px] h-[4px]"></div>
              {/if}
            </div>
          {/if}
        </div>
      {/key}
    </div>
  </main>

  <!-- Desktop Sidebar — Anchored full length -->
  <aside
    class="hidden lg:flex flex-col w-[340px] xl:w-[380px] h-full border-l border-[var(--border-subtle)] bg-[var(--surface)] animate-stageSlideIn relative z-30"
  >
    <div class="flex-1 overflow-y-auto">
      <Toolbar {store} />
    </div>
  </aside>

  <!-- Mobile Bottom Bar -->
  <div class="lg:hidden fixed bottom-0 left-0 right-0 z-[100]">
    <!-- Collapsed Bottom Bar -->
    <div
      class="bg-[var(--surface)]/95 backdrop-blur-lg border-t border-[var(--border-subtle)] px-4 py-3 flex items-center justify-between shadow-[0_-4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)]"
      class:rounded-t-2xl={!isMobileToolbarOpen}
    >
      <div class="flex items-center gap-3">
        <div
          class="w-8 h-8 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center"
        >
          <svg
            class="w-4 h-4 text-[var(--accent)]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
          >
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="4" rx="1" />
            <rect x="14" y="10" width="7" height="11" rx="1" />
            <rect x="3" y="13" width="7" height="8" rx="1" />
          </svg>
        </div>
        <div class="flex flex-col">
          <span class="text-[11px] font-bold text-[var(--text-main)]"
            >Bento Grid</span
          >
          <span class="text-[9px] text-[var(--text-muted)]"
            >{Object.keys(store.cellMeta).length} cells</span
          >
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button
          class="w-10 h-10 rounded-xl bg-[var(--input-bg)] flex items-center justify-center transition-all hover:bg-[var(--surface-hover)] active:scale-95"
          onclick={() => (isMobileToolbarOpen = !isMobileToolbarOpen)}
          aria-label="Toggle toolbar"
        >
          <svg
            class="w-5 h-5 text-[var(--text-main)] transition-transform duration-300"
            class:rotate-180={isMobileToolbarOpen}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Expandable Mobile Toolbar -->
    {#if isMobileToolbarOpen}
      <div
        class="bg-[var(--surface)] border-t border-[var(--border-subtle)] max-h-[60vh] overflow-y-auto animate-mobileToolbarIn"
      >
        <Toolbar
          {store}
          isMobile={true}
          onClose={() => (isMobileToolbarOpen = false)}
        />
      </div>
    {/if}
  </div>
</div>

<CodeExportModal
  {store}
  isOpen={isExportOpen}
  onClose={() => (isExportOpen = false)}
/>

<style>
  @keyframes viewFadeIn {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  @keyframes stageSlideIn {
    from {
      opacity: 0;
      transform: translateX(-12px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  @keyframes mobileToolbarIn {
    from {
      opacity: 0;
      transform: translateY(100%);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  @keyframes breakpointTransition {
    from {
      opacity: 0;
      transform: scale(0.98);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
  .animate-viewFadeIn {
    animation: viewFadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1) both;
  }
  .animate-stageSlideIn {
    animation: stageSlideIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.1s
      both;
  }
  .animate-mobileToolbarIn {
    animation: mobileToolbarIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .animate-breakpointTransition {
    animation: breakpointTransition 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
  }
</style>
