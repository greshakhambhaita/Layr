<script>
  /**
   * ColorPicker.svelte
   * A Figma-inspired color picker component.
   */
  let { hex = "#d9d9d9", onchange, onClose = null } = $props();

  let h = $state(0);
  let s = $state(0);
  let v = $state(85);

  // Sync internal HSV when hex prop changes (from outside)
  $effect(() => {
    const { h: nh, s: ns, v: nv } = hexToHSV(hex);
    // Only update if hex is valid and different enough (to avoid feedback loops)
    if (hsvToHex(h, s, v).toLowerCase() !== hex.toLowerCase()) {
      h = nh;
      s = ns;
      v = nv;
    }
  });

  // Conversion helpers
  function hexToHSV(hex) {
    let r = 0,
      g = 0,
      b = 0;
    if (hex.length === 4) {
      r = parseInt(hex[1] + hex[1], 16);
      g = parseInt(hex[2] + hex[2], 16);
      b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
      r = parseInt(hex.substring(1, 3), 16);
      g = parseInt(hex.substring(3, 5), 16);
      b = parseInt(hex.substring(5, 7), 16);
    }
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b),
      min = Math.min(r, g, b);
    let h,
      s,
      v = max;
    const d = max - min;
    s = max === 0 ? 0 : d / max;
    if (max === min) {
      h = 0;
    } else {
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }
    return { h: h * 360, s: s * 100, v: v * 100 };
  }

  function hsvToHex(h, s, v) {
    s /= 100;
    v /= 100;
    let r, g, b;
    const i = Math.floor(h / 60);
    const f = h / 60 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    switch (i % 6) {
      case 0:
        r = v;
        g = t;
        b = p;
        break;
      case 1:
        r = q;
        g = v;
        b = p;
        break;
      case 2:
        r = p;
        g = v;
        b = t;
        break;
      case 3:
        r = p;
        g = q;
        b = v;
        break;
      case 4:
        r = t;
        g = p;
        b = v;
        break;
      case 5:
        r = v;
        g = p;
        b = q;
        break;
    }
    const toHex = (x) => {
      const hex = Math.round(x * 255).toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  function updateColor() {
    const newHex = hsvToHex(h, s, v);
    onchange(newHex);
  }

  // Event handlers for SV field
  let svFieldEl = $state(null);
  let isDraggingSV = false;

  function handleSVMouse(e) {
    if (!svFieldEl) return;
    const rect = svFieldEl.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    s = x * 100;
    v = (1 - y) * 100;
    updateColor();
  }

  // Event handlers for Hue slider
  let hueSliderEl = $state(null);
  let isDraggingHue = false;

  function handleHueMouse(e) {
    if (!hueSliderEl) return;
    const rect = hueSliderEl.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    h = x * 360;
    updateColor();
  }

  const PRESETS = [
    "#000000",
    "#ffffff",
    "#ff1744", // Red
    "#f50057", // Pink
    "#d500f9", // Purple
    "#651fff", // Deep Purple
    "#3d5afe", // Indigo
    "#2979ff", // Blue
    "#00b0ff", // Light Blue
    "#00e5ff", // Cyan
    "#1de9b6", // Teal
    "#00e676", // Green
    "#76ff03", // Light Green
    "#c6ff00", // Lime
    "#ffea00", // Yellow
    "#ffc400", // Amber
    "#ff9100", // Orange
    "#ff3d00", // Deep Orange
  ];
</script>

<div
  class="flex flex-col gap-3 p-4 w-64 bg-[var(--surface)] rounded-xl shadow-2xl border border-[var(--border-subtle)] animate-in fade-in zoom-in duration-200"
>
  <!-- Header with Close Button -->
  {#if onClose}
    <div class="flex items-center justify-between -mt-1 -mx-1">
      <span class="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Color Picker</span>
      <button 
        class="w-7 h-7 flex items-center justify-center rounded-lg bg-[var(--input-bg)] hover:bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all"
        onclick={onClose}
        aria-label="Close color picker"
      >
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  {/if}

  <!-- Saturation/Value Field -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    bind:this={svFieldEl}
    class="relative w-full aspect-square rounded-lg overflow-hidden cursor-crosshair select-none"
    style="background-color: hsl({h}, 100%, 50%)"
    onmousedown={(e) => {
      isDraggingSV = true;
      handleSVMouse(e);
    }}
  >
    <!-- Gradients for S and V -->
    <div
      class="absolute inset-0 bg-gradient-to-r from-white to-transparent"
    ></div>
    <div
      class="absolute inset-0 bg-gradient-to-t from-black to-transparent"
    ></div>

    <!-- Handle -->
    <div
      class="absolute w-4 h-4 -ml-2 -mt-2 border-2 border-white rounded-full shadow-[0_0_0_1px_rgba(0,0,0,0.1),0_2px_4px_rgba(0,0,0,0.2)] pointer-events-none"
      style="left: {s}%; top: {100 - v}%"
    ></div>
  </div>

  <!-- Hue Slider -->
  <div class="flex flex-col gap-2">
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      bind:this={hueSliderEl}
      class="relative w-full h-3 rounded-full cursor-pointer select-none"
      style="background: linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)"
      onmousedown={(e) => {
        isDraggingHue = true;
        handleHueMouse(e);
      }}
    >
      <!-- Handle -->
      <div
        class="absolute w-5 h-5 -mt-1 -ml-2.5 border-2 border-white rounded-full pointer-events-none"
        style="left: {(h / 360) * 100}%"
      ></div>
    </div>
  </div>

  <!-- Presets Grid -->
  <div class="grid grid-cols-9 gap-1.5 pt-2 border-t border-[var(--border-subtle)]">
    {#each PRESETS as preset}
      <button
        class="w-5 h-5 rounded-md border border-[var(--border-subtle)] transition-transform hover:scale-110"
        style="background-color: {preset}"
        onclick={() => {
          const { h: nh, s: ns, v: nv } = hexToHSV(preset);
          h = nh;
          s = ns;
          v = nv;
          updateColor();
          if (onClose) onClose();
        }}
        title={preset}
      ></button>
    {/each}
  </div>
</div>

<svelte:window
  onmousemove={(e) => {
    if (isDraggingSV) handleSVMouse(e);
    if (isDraggingHue) handleHueMouse(e);
  }}
  onmouseup={() => {
    isDraggingSV = false;
    isDraggingHue = false;
  }}
/>

<style>
  /* Subtle animation for opening */
  .animate-in {
    animation-name: animate-in;
  }
  @keyframes animate-in {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(5px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
</style>
