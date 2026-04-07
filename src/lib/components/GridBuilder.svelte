<script>
  import { BentoStore } from "$lib/bentoStore.svelte.js";
  import { onMount } from "svelte";
  import BentoContainer from "./BentoContainer.svelte";
  import CodeExportModal from "./CodeExportModal.svelte";
  import Toolbar from "./Toolbar.svelte";
  import BreakpointSelector from "./BreakpointSelector.svelte";
  import ResponsivePreview from "./ResponsivePreview.svelte";
  import Logo from "$lib/assets/p.svg";

  const store = new BentoStore();

  let isExportOpen = $state(false);
  let isMobileToolbarOpen = $state(false);
  let isMobile = $state(false);

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
  class="flex flex-col lg:flex-row h-screen w-full overflow-hidden animate-viewFadeIn"
>
  <!-- Logo - Top Left Corner -->
  <a 
    href="/" 
    class="fixed top-6 left-6 z-50 group flex items-center bg-[var(--surface)]/20 backdrop-blur-md transition-all duration-500 hover:bg-[var(--surface)]/40 hover:shadow-[0_4px_16px_rgba(0,0,0,0.03)] dark:hover:shadow-[0_4px_16px_rgba(0,0,0,0.2)] border-none rounded-none"
  >
    <div class="px-3 py-2 flex items-center justify-center">
      <img 
        src={Logo} 
        alt="Project Logo" 
        class="h-8 sm:h-9 w-auto opacity-40 contrast-[1.1] dark:invert dark:brightness-[1.15] group-hover:opacity-100 transition-all duration-500"
      />
    </div>
  </a>

  <!-- Breakpoint Selector - Top Center -->
  <div class="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center">
    <BreakpointSelector {store} />
  </div>

  <!-- Canvas / Main Area -->
  <main
    class="flex-1 relative overflow-auto bg-[var(--app-bg)] flex items-center justify-center p-4 pt-20 pb-24 sm:p-6 sm:pt-20 sm:pb-24 lg:p-12 lg:pt-20 lg:pb-12"
  >
    <div class="flex items-center justify-center w-full h-full">
      {#key store.currentBreakpoint}
        <div class="animate-breakpointTransition w-full h-full flex items-center justify-center">
          {#if store.isPreviewMode}
            <!-- Responsive Preview Mode -->
            <ResponsivePreview {store} />
          {:else}
            <!-- Desktop Edit Mode -->
            <BentoContainer {store} />
          {/if}
        </div>
      {/key}
    </div>
  </main>

  <!-- Desktop Sidebar -->
  <aside
    class="hidden lg:block w-[300px] xl:w-[340px] bg-[var(--sidebar-bg)] h-full overflow-y-auto animate-stageSlideIn border-l border-[var(--border-subtle)]"
  >
    <Toolbar {store} />
  </aside>

  <!-- Mobile Bottom Bar -->
  <div class="lg:hidden fixed bottom-0 left-0 right-0 z-[100]">
    <!-- Collapsed Bottom Bar -->
    <div 
      class="bg-[var(--surface)]/95 backdrop-blur-lg border-t border-[var(--border-subtle)] px-4 py-3 flex items-center justify-between shadow-[0_-4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)]"
      class:rounded-t-2xl={!isMobileToolbarOpen}
    >
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center">
          <svg class="w-4 h-4 text-[var(--accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <rect x="3" y="3" width="7" height="7" rx="1"/>
            <rect x="14" y="3" width="7" height="4" rx="1"/>
            <rect x="14" y="10" width="7" height="11" rx="1"/>
            <rect x="3" y="13" width="7" height="8" rx="1"/>
          </svg>
        </div>
        <div class="flex flex-col">
          <span class="text-[11px] font-bold text-[var(--text-main)]">Bento Grid</span>
          <span class="text-[9px] text-[var(--text-muted)]">{Object.keys(store.cellMeta).length} cells</span>
        </div>
      </div>
      
      <div class="flex items-center gap-2">
        <button
          class="h-10 px-4 bg-[var(--accent)] text-white rounded-xl font-bold text-[11px] tracking-wide transition-all hover:bg-[var(--accent-hover)] active:scale-[0.98] shadow-[0_2px_10px_rgba(76,132,245,0.3)] dark:shadow-[0_2px_10px_rgba(107,159,255,0.2)]"
          onclick={() => document.dispatchEvent(new CustomEvent("open-export"))}
        >
          EXPORT
        </button>
        <button
          class="w-10 h-10 rounded-xl bg-[var(--input-bg)] flex items-center justify-center transition-all hover:bg-[var(--surface-hover)] active:scale-95"
          onclick={() => isMobileToolbarOpen = !isMobileToolbarOpen}
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
            <polyline points="18 15 12 9 6 15"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Expandable Mobile Toolbar -->
    {#if isMobileToolbarOpen}
      <div 
        class="bg-[var(--surface)] border-t border-[var(--border-subtle)] max-h-[60vh] overflow-y-auto animate-mobileToolbarIn"
      >
        <Toolbar {store} isMobile={true} onClose={() => isMobileToolbarOpen = false} />
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
