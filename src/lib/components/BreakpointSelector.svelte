<script>
  import { BREAKPOINTS } from '$lib/bentoStore.svelte.js';

  let { store } = $props();

  const breakpoints = [
    { key: 'desktop', name: 'Desktop', icon: 'desktop' },
    { key: 'tablet', name: 'Tablet', icon: 'tablet' },
    { key: 'mobile', name: 'Mobile', icon: 'mobile' }
  ];

  function handleBreakpointChange(breakpoint) {
    store.setBreakpoint(breakpoint);
  }
</script>

<div class="flex items-center gap-1 p-1 bg-[var(--input-bg)] rounded-xl border border-[var(--border-subtle)]">
  {#each breakpoints as bp}
    <button
      class="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all duration-200"
      class:bg-[var(--surface)]={store.currentBreakpoint === bp.key}
      class:text-[var(--text-main)]={store.currentBreakpoint === bp.key}
      class:text-[var(--text-muted)]={store.currentBreakpoint !== bp.key}
      class:hover:text-[var(--text-main)]={store.currentBreakpoint !== bp.key}
      class:hover:bg-[var(--surface-hover)]={store.currentBreakpoint !== bp.key}
      onclick={() => handleBreakpointChange(bp.key)}
      aria-label="Switch to {bp.name} view"
      aria-pressed={store.currentBreakpoint === bp.key}
    >
      <!-- Icon -->
      {#if bp.icon === 'desktop'}
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
      {:else if bp.icon === 'tablet'}
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/>
          <line x1="12" y1="18" x2="12.01" y2="18"/>
        </svg>
      {:else if bp.icon === 'mobile'}
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
          <line x1="12" y1="18" x2="12.01" y2="18"/>
        </svg>
      {/if}
      
      <span class="hidden sm:inline">{bp.name}</span>
    </button>
  {/each}
</div>
