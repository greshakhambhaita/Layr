<script>
  import { onMount } from "svelte";

  let activeSection = $state("intro");
  let sections = [
    { id: "intro", title: "Introduction" },
    { id: "cells", title: "Architecture" },
    { id: "grid", title: "Grid Engine" },
    { id: "responsive", title: "Adaptive Flow" },
    { id: "export", title: "Deployment" },
    { id: "themes", title: "Visual Identity" },
    { id: "tips", title: "Shortcuts" },
  ];

  onMount(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            activeSection = entry.target.id;
          }
        });
      },
      { threshold: 0.3 },
    );

    document.querySelectorAll("section[id]").forEach((section) => {
      observer.observe(section);
    });

    return () => observer.disconnect();
  });

  function scrollTo(id) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  }

  import cellResizing from "$lib/assets/CellResizing.gif";
  import exportImg from "$lib/assets/Export.png";
  import gridControls from "$lib/assets/GridControls.png";
  import gridPreview from "$lib/assets/GridPreview.png";
  import imageEdittingModal from "$lib/assets/ImageEdittingModal.png";
  import whiteTheme from "$lib/assets/inwhitethemeplayground.png";
  import layrOverview from "$lib/assets/LayrOverview.png";
  import swapAndUnion from "$lib/assets/SwapAndUnion.gif";
</script>

<svelte:head>
  <title>Technical Guide | Layr</title>
  <meta
    name="description"
    content="Technical guide for Layr bento grid builder"
  />
</svelte:head>

<div
  class="min-h-screen bg-[#000000] text-white font-sans flex justify-center selection:bg-white selection:text-black"
>
  <!-- Sidebar -->
  <aside
    class="w-72 border-r border-white/5 fixed left-0 h-screen overflow-y-auto p-12 hidden lg:flex flex-col"
  >
    <div class="mb-16">
      <a
        href="/"
        class="text-2xl font-bold tracking-tighter uppercase group flex items-center gap-2"
      >
        Layr
      </a>
    </div>

    <nav class="flex flex-col gap-6">
      <span
        class="text-sm font-bold text-white/30 uppercase tracking-[0.3em] mb-4"
        >Documentation</span
      >
      {#each sections as section}
        <button
          class="text-left text-sm whitespace-nowrap uppercase tracking-widest transition-all duration-500 hover:text-white {activeSection ===
          section.id
            ? 'text-white font-black translate-x-4'
            : 'text-white/40'}"
          onclick={() => scrollTo(section.id)}
        >
          <span class="mr-2 inline-block w-4 h-[1px] bg-current opacity-20"
          ></span>
          {section.title}
        </button>
      {/each}
    </nav>

    <div class="mt-auto pt-12">
      <div class="p-6 rounded-2xl bg-white/[0.03] border border-white/5">
        <p
          class="text-sm text-white/40 leading-relaxed uppercase tracking-wider mb-4"
        >
          Need help?
        </p>
        <a
          href="https://github.com"
          class="text-sm font-bold text-white hover:underline uppercase tracking-widest"
          >Open GitHub</a
        >
      </div>
    </div>
  </aside>

  <!-- Main Content -->
  <main class="w-full max-w-4xl lg:ml-72 px-8 py-2 md:py-24">
    <section id="intro" class="min-h-[70vh] flex flex-col justify-center mb-12">
      <div
        class="inline-block px-3 py-1 rounded-full border border-white/10 bg-white/5 text-[10px] uppercase tracking-[0.3em] font-bold text-white/60 mb-8 self-start"
      >
        Welcome to the Workshop
      </div>
      <h1
        class="text-5xl md:text-8xl font-bold tracking-tighter mb-10 uppercase leading-[0.9]"
      >
        Mastering <br /> <span class="text-white/20">The Grid.</span>
      </h1>
      <p
        class="text-lg md:text-xl text-white/50 leading-relaxed max-w-2xl mb-12"
      >
        Hey there! Layr is designed to be your creative partner in building
        beautiful bento grids. It's powerful, but surprisingly simple once you
        get the hang of it. Let's walk through how to build your first
        masterpiece.
      </p>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        <div class="p-4 rounded-xl bg-white/[0.02] border border-white/5">
          <div class="text-[10px] font-bold text-white/20 uppercase mb-2">
            Philosophy
          </div>
          <p class="text-[11px] text-white/40 uppercase leading-tight">
            Visual fidelity meets technical precision.
          </p>
        </div>
        <div class="p-4 rounded-xl bg-white/[0.02] border border-white/5">
          <div class="text-[10px] font-bold text-white/20 uppercase mb-2">
            Target
          </div>
          <p class="text-[11px] text-white/40 uppercase leading-tight">
            Svelte & React engineers.
          </p>
        </div>
        <div class="p-4 rounded-xl bg-white/[0.02] border border-white/5">
          <div class="text-[10px] font-bold text-white/20 uppercase mb-2">
            Engine
          </div>
          <p class="text-[11px] text-white/40 uppercase leading-tight">
            Real-time CSS Grid displacement.
          </p>
        </div>
      </div>

      <div
        class="border border-white/5 rounded-2xl flex items-center justify-center group overflow-hidden relative"
      >
        <img
          src={layrOverview}
          alt="Layr Overview"
          class="w-full h-auto opacity-80 group-hover:opacity-100 transition-opacity"
        />
        <div
          class="absolute inset-0 bg-gradient-to-tr from-white/[0.05] to-transparent pointer-events-none"
        ></div>
      </div>
    </section>

    <hr class="border-white/20 my-16" />

    <!-- Cells Section -->
    <section id="cells" class="mb-12">
      <div class="flex items-center gap-6 mb-12">
        <h2 class="text-5xl font-bold uppercase tracking-tight">
          Cell Architecture
        </h2>
      </div>

      <div class="grid gap-24">
        <!-- Add & Resize -->
        <div class="grid md:grid-cols-2 gap-12 items-start">
          <div class="space-y-8">
            <div>
              <h3 class="text-2xl font-bold uppercase tracking-wider mb-4">
                Lifecycle & Scaling
              </h3>
              <p class="text-lg text-white/40 leading-relaxed mb-4">
                Creating and removing cells is a breeze. Use the sidebar to
                spawn new shapes, or select an unwanted cell and hit <span
                  class="text-white">Delete</span
                >.
              </p>
              <ul
                class="space-y-2 text-base uppercase tracking-wider text-white/60"
              >
                <li class="flex items-center gap-2">
                  <span class="w-1 h-1 bg-white rounded-full"></span> Add via "ADD
                  SHAPE" menu
                </li>
                <li class="flex items-center gap-2">
                  <span class="w-1 h-1 bg-white rounded-full"></span> Select & Delete
                  to remove
                </li>
                <li class="flex items-center gap-2">
                  <span class="w-1 h-1 bg-white rounded-full"></span> Drag handles
                  to scale units
                </li>
              </ul>
            </div>
            <div
              class="p-4 rounded-lg bg-white/[0.03] border-l-2 border-white/20"
            >
              <span
                class="text-[10px] font-bold uppercase text-white/40 block mb-1"
                >Pro Tip</span
              >
              <p class="text-sm text-white/60 italic">
                Use the properties panel to quickly adjust fill settings!
              </p>
            </div>
          </div>
          <div
            class="bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-center overflow-hidden"
          >
            <img
              src={cellResizing}
              alt="Cell Resizing"
              class="w-full h-auto opacity-80 hover:opacity-100 transition-opacity scale-[1.5] origin-left"
            />
          </div>
        </div>

        <!-- Union & Swapping -->
        <div class="grid md:grid-cols-2 gap-12 items-start">
          <div
            class="order-2 md:order-1 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-center overflow-hidden"
          >
            <img
              src={swapAndUnion}
              alt="Swap and Union"
              class="w-full h-auto opacity-80 hover:opacity-100 transition-opacity scale-[1.5] origin-left"
            />
          </div>
          <div class="order-1 md:order-2 space-y-8">
            <div>
              <h3 class="text-2xl font-bold uppercase tracking-wider mb-4">
                Position & Union
              </h3>
              <p class="text-lg text-white/40 leading-relaxed mb-4">
                Drag cells over each other to automatically swap positions. Need
                a custom shape? Merge them!
              </p>
              <ul
                class="space-y-2 text-base uppercase tracking-wider text-white/60"
              >
                <li class="flex items-center gap-2">
                  <span class="w-1 h-1 bg-white rounded-full"></span> Intelligent
                  displacement swapping
                </li>
                <li class="flex items-center gap-2">
                  <span class="w-1 h-1 bg-white rounded-full"></span> Shift + Click
                  to multi-select
                </li>
                <li class="flex items-center gap-2">
                  <span class="w-1 h-1 bg-white rounded-full"></span> Union button
                  for complex 'L' shapes
                </li>
              </ul>
            </div>
            <div
              class="p-4 rounded-lg bg-white/[0.03] border-l-2 border-white/20"
            >
              <span
                class="text-[10px] font-bold uppercase text-white/40 block mb-1"
                >Shortcut</span
              >
              <p class="text-sm text-white/60 italic">
                Press "U" on your keyboard to union selected cells instantly.
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Detail Props -->
      <div class="mt-32 grid md:grid-cols-2 gap-8 items-stretch">
        <div
          class="p-8 rounded-3xl bg-white/[0.02] border border-white/5 flex flex-col justify-between"
        >
          <div>
            <h3
              class="text-sm font-black uppercase tracking-[0.3em] mb-6 text-white/40"
            >
              Visual Styling
            </h3>
            <div class="space-y-6">
              <div class="group">
                <div
                  class="text-sm font-bold uppercase tracking-widest text-white/60 mb-1 group-hover:text-white transition-colors"
                >
                  Corner Radius
                </div>
                <p class="text-base text-white/40 leading-relaxed uppercase">
                  Adjust the global slider to round off every edge in your
                  layout.
                </p>
              </div>
              <div class="group">
                <div
                  class="text-sm font-bold uppercase tracking-widest text-white/60 mb-1 group-hover:text-white transition-colors"
                >
                  Adaptive Image Fills
                </div>
                <p class="text-base text-white/40 leading-relaxed uppercase">
                  Cover, Contain, or Stretch. Drag within a cell to pan and crop
                  your images.
                </p>
              </div>
              <div class="group">
                <div
                  class="text-sm font-bold uppercase tracking-widest text-white/60 mb-1 group-hover:text-white transition-colors"
                >
                  Global Constraints
                </div>
                <p class="text-base text-white/40 leading-relaxed uppercase">
                  Toggle between auto-flow and fixed dimensions to ensure layout
                  stability across viewports.
                </p>
              </div>
              <div class="group">
                <div
                  class="text-sm font-bold uppercase tracking-widest text-white/60 mb-1 group-hover:text-white transition-colors"
                >
                  Micro-interactions
                </div>
                <p class="text-base text-white/40 leading-relaxed uppercase">
                  Hover effects and active states provide instant tactile
                  feedback for every edit.
                </p>
              </div>
              <div class="group">
                <div
                  class="text-sm font-bold uppercase tracking-widest text-white/60 mb-1 group-hover:text-white transition-colors"
                >
                  Color Palettes
                </div>
                <p class="text-base text-white/40 leading-relaxed uppercase">
                  Transition from raw hex codes to curated monochrome sets with
                  our intuitive picker.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="p-8 rounded-3xl bg-white/[0.03] border border-white/10">
          <h3
            class="text-sm font-black uppercase tracking-[0.3em] mb-6 text-white/40"
          >
            The Image Editor
          </h3>
          <p class="text-[11px] text-white/60 leading-relaxed uppercase mb-6">
            Our built-in editor allows you to pan and zoom images within a cell
            without affecting its grid coordinates.
          </p>
          <div
            class="max-w-[80%] mx-auto bg-black/40 rounded-lg flex items-center justify-center border border-white/5 overflow-hidden"
          >
            <img
              src={imageEdittingModal}
              alt="Editing Modal"
              class="w-full h-auto opacity-80 hover:opacity-100 transition-opacity"
            />
          </div>
        </div>
      </div>
    </section>

    <hr class="border-white/20 my-16" />

    <!-- Grid Section -->
    <section id="grid" class="mb-12">
      <div class="flex items-center gap-6 mb-12">
        <h2 class="text-5xl font-bold uppercase tracking-tight">Grid Engine</h2>
      </div>

      <div class="grid md:grid-cols-2 gap-16">
        <div class="space-y-12">
          <p class="text-xl text-white/50 leading-relaxed italic">
            Configure your master container. The grid is your invisible
            scaffolding, dictating the flow of every element.
          </p>

          <div class="grid gap-10">
            <div class="group border-b border-white/5 pb-8">
              <h4
                class="text-sm font-black uppercase tracking-[0.2em] text-white/60 mb-4 group-hover:text-white transition-colors"
              >
                Dimensions (Rows & Cols)
              </h4>
              <p class="text-lg text-white/40 leading-relaxed">
                Define the granularity of your canvas. A higher column count
                allows for more intricate 'bento' patterns, while fewer columns
                create a bold, blocky look. Layr supports up to 24 units in
                either direction.
              </p>
            </div>

            <div class="group border-b border-white/5 pb-8">
              <h4
                class="text-sm font-black uppercase tracking-[0.2em] text-white/60 mb-4 group-hover:text-white transition-colors"
              >
                Spacing (The Gap)
              </h4>
              <p class="text-lg text-white/40 leading-relaxed">
                Control the literal breathing room between your cells. This
                translates directly to the CSS <code class="text-white"
                  >gap</code
                > property. Larger gaps emphasize the individual 'cards', whereas
                zero gap creates a seamless mosaic.
              </p>
            </div>

            <div class="group border-b border-white/5 pb-8">
              <h4
                class="text-sm font-black uppercase tracking-[0.2em] text-white/60 mb-4 group-hover:text-white transition-colors"
              >
                Offset (X & Y)
              </h4>
              <p class="text-lg text-white/40 leading-relaxed">
                Fine-tune the global position of your grid within the playground
                viewport. These inputs allow for surgical precision when you're
                manually aligning the grid against other visual markers.
              </p>
            </div>

            <div class="group">
              <h4
                class="text-sm font-black uppercase tracking-[0.2em] text-white/60 mb-4 group-hover:text-white transition-colors"
              >
                Panning & Zoom
              </h4>
              <p class="text-lg text-white/40 leading-relaxed">
                Click and drag any empty space to pan the entire workspace. Use
                your scroll wheel to zoom, allowing you to focus on
                micro-details or see the big picture of your responsive flow.
              </p>
            </div>
          </div>

          <div
            class="p-6 rounded-2xl bg-white/[0.03] border-l-4 border-white/20"
          >
            <p class="text-base text-white/60 italic leading-relaxed">
              "The grid is not a cage, but a guide. Don't be afraid to break
              symmetry to create visual interest."
            </p>
          </div>
        </div>

        <div
          class="bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-center overflow-hidden"
        >
          <img
            src={gridControls}
            alt="Grid Controls"
            class="w-full h-auto opacity-80 hover:opacity-100 transition-opacity"
          />
        </div>
      </div>
    </section>

    <hr class="border-white/20 my-16" />

    <!-- Responsive Section -->
    <section id="responsive" class="mb-12">
      <div class="flex items-center gap-6 mb-12">
        <h2 class="text-5xl font-bold uppercase tracking-tight">
          Adaptive Flow
        </h2>
      </div>

      <div class="space-y-16">
        <p class="text-xl text-white/50 leading-relaxed">
          The bento paradigm thrives on multi-device agility. Layr automates the
          transformation from desktop canvas to mobile viewport, while granting
          granular override authority for specialized spacing and height
          requirements.
        </p>

        <div
          class="p-10 rounded-3xl bg-white/[0.02] border border-white/5 overflow-hidden"
        >
          <div class="grid md:grid-cols-5 gap-16 items-center">
            <div class="md:col-span-2 space-y-12">
              <div class="space-y-4">
                <div
                  class="text-sm font-bold uppercase tracking-[0.2em] text-white/20"
                >
                  Desktop Viewport
                </div>
                <p class="text-base text-white/40 leading-relaxed uppercase">
                  Primary layout orchestration. Serves as the source of truth
                  for all child nodes.
                </p>
              </div>
              <div class="space-y-4">
                <div
                  class="text-sm font-bold uppercase tracking-[0.2em] text-white/20"
                >
                  Tablet Viewport
                </div>
                <p class="text-base text-white/40 leading-relaxed uppercase">
                  Automated column compaction with support for manual structural
                  overrides.
                </p>
              </div>
              <div class="space-y-4">
                <div
                  class="text-sm font-bold uppercase tracking-[0.2em] text-white/20"
                >
                  Mobile Viewport
                </div>
                <p class="text-base text-white/40 leading-relaxed uppercase">
                  Optimized single-column logic with programmatic row-height
                  management.
                </p>
              </div>
            </div>
            <div class="md:col-span-3">
              <div
                class="rounded-xl border border-white/5 overflow-hidden bg-black/40"
              >
                <img
                  src={gridPreview}
                  alt="Grid Responsive Preview"
                  class="w-full h-auto opacity-70 group-hover:opacity-100 transition-opacity"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <hr class="border-white/20 my-16" />

    <!-- Export Section -->
    <section id="export" class="mb-12">
      <div class="flex items-center gap-6 mb-12">
        <h2 class="text-5xl font-bold uppercase tracking-tight">
          Deployment Pipeline
        </h2>
      </div>

      <div class="space-y-24">
        <div class="grid md:grid-cols-5 gap-16 items-start">
          <div class="md:col-span-3 space-y-8">
            <h3 class="text-2xl font-bold uppercase tracking-wider">
              From Canvas to Production
            </h3>
            <p class="text-lg text-white/40 leading-relaxed">
              Upon publication, Layr serializes the visual grid topology into a
              lean, type-safe JSON schema. This payload is consumed by the CLI
              utility to generate optimized Svelte or React components featuring
              native CSS Grid implementation.
            </p>
            <div
              class="p-8 bg-black/40 border border-white/10 rounded-2xl font-mono text-sm text-white/80 space-y-6"
            >
              <div class="flex gap-4">
                <span class="text-white/20">A</span>
                <div>
                  <div class="text-white mb-1">Spatial Mapping</div>
                  <div class="text-xs text-white/40 uppercase">
                    Absolute coordinates are translated into relative Grid
                    Tracks (1fr units).
                  </div>
                </div>
              </div>
              <div class="flex gap-4">
                <span class="text-white/20">B</span>
                <div>
                  <div class="text-white mb-1">Responsive Breakpoints</div>
                  <div class="text-xs text-white/40 uppercase">
                    Tablet and Mobile states are baked into native CSS Media
                    Queries.
                  </div>
                </div>
              </div>
              <div class="flex gap-4">
                <span class="text-white/20">C</span>
                <div>
                  <div class="text-white mb-1">Zero-Dependency Core</div>
                  <div class="text-xs text-white/40 uppercase">
                    Generated code relies purely on vanilla CSS—no runtime
                    libraries required.
                  </div>
                </div>
              </div>
              <div class="flex gap-4">
                <span class="text-white/20">D</span>
                <div>
                  <div class="text-white mb-1">SSR Optimization</div>
                  <div class="text-xs text-white/40 uppercase">
                    Fully compatible with SvelteKit, Next.js, and other
                    server-side frameworks.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="md:col-span-2 space-y-6">
            <div class="p-6 rounded-2xl bg-white/[0.03] border border-white/10">
              <h4 class="text-xs font-bold uppercase tracking-widest mb-4">
                The layr-drop CLI
              </h4>
              <div
                class="bg-black p-4 rounded-lg border border-white/5 flex justify-between items-center group mb-4"
              >
                <code class="text-sm text-white opacity-60"
                  >bunx layr-drop add [grid-id]</code
                >
                <span
                  class="text-xs text-white/20 group-hover:text-white transition-colors cursor-pointer uppercase"
                  >Copy</span
                >
              </div>
              <p class="text-sm text-white/30 leading-relaxed uppercase mb-4">
                Execute this command to instantiate the component in your local
                environment.
              </p>

              <div class="pt-4 border-t border-white/5 space-y-3">
                <div class="flex items-center gap-2">
                  <div class="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                  <span class="text-[10px] font-bold text-white/60 uppercase"
                    >Snapshot Versioning</span
                  >
                </div>
                <p class="text-[11px] text-white/30 uppercase leading-tight">
                  Every export generates a unique immutable ID. Your local code
                  stays locked to that version until you specifically choose to
                  update.
                </p>
              </div>
            </div>
            <div
              class="p-6 rounded-2xl bg-white/[0.01] border border-white/5 overflow-hidden"
            >
              <img
                src={exportImg}
                alt="Export Modal"
                class="w-full h-auto opacity-60 hover:opacity-100 transition-opacity mb-6 rounded-lg"
              />
            </div>
          </div>
        </div>

        <!-- Customization Example -->
        <div class="grid md:grid-cols-5 gap-16 pt-12 border-t border-white/5">
          <div class="md:col-span-2 space-y-8">
            <h3 class="text-2xl font-bold uppercase tracking-wider text-white">
              Manual Overrides
            </h3>
            <p class="text-base text-white/40 leading-relaxed">
              The output is standards-compliant CSS. Developers retain full
              authority to modify generated spans, reorder cell indices, or
              inject custom logic post-export.
            </p>

            <div class="space-y-6">
              <div class="p-6 rounded-xl bg-white/[0.02] border border-white/5">
                <h4
                  class="text-sm font-bold text-white/60 mb-2 uppercase tracking-widest"
                >
                  Example: Responsive Track Adjustment
                </h4>
                <p class="text-sm text-white/40 mb-4 leading-relaxed">
                  Modify the responsive span logic for unique tablet layout
                  requirements by updating the media query within the component.
                </p>
                <div
                  class="bg-black p-4 rounded-lg font-mono text-[12px] text-emerald-400/80"
                >
                  <span class="text-white/20">// Original Tablet Span</span><br
                  />
                  grid-column: span 1;<br /><br />
                  <span class="text-white/20">// Manual Override</span><br />
                  grid-column: 1 / -1;
                </div>
              </div>
            </div>
          </div>

          <div
            class="md:col-span-3 p-8 rounded-3xl bg-white/[0.02] border border-white/5"
          >
            <h4
              class="text-sm font-black uppercase text-white/40 mb-8 tracking-[0.2em]"
            >
              Svelte Architecture Template
            </h4>
            <div
              class="bg-black/60 p-6 rounded-xl border border-white/5 font-mono text-[12px] leading-relaxed text-white/60"
            >
              <span class="text-white/30">&lt;script&gt;</span><br />
              &nbsp;&nbsp;import Cell from './Cell.svelte';<br />
              <span class="text-white/30">&lt;/script&gt;</span><br /><br />
              <span class="text-white/30"
                >&lt;div class="grid-container"&gt;</span
              ><br />
              &nbsp;&nbsp;<span class="text-white/30"
                >&lt;!-- Facilitates prop-injection or cell reordering --&gt;</span
              ><br />
              &nbsp;&nbsp;&lt;Cell classes="<span class="text-white"
                >hover:scale-105</span
              >"&gt;<br />
              &nbsp;&nbsp;&nbsp;&nbsp;...<br />
              &nbsp;&nbsp;&lt;/Cell&gt;<br />
              <span class="text-white/30">&lt;/div&gt;</span><br /><br />
              <span class="text-white/30">&lt;style&gt;</span><br />
              &nbsp;&nbsp;.grid-container &#123;<br />
              &nbsp;&nbsp;&nbsp;&nbsp;display: grid;<br />
              &nbsp;&nbsp;&nbsp;&nbsp;<span class="text-white"
                >grid-template-columns: repeat(12, 1fr);</span
              ><br />
              &nbsp;&nbsp;&#125;<br />
              <span class="text-white/30">&lt;/style&gt;</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <hr class="border-white/20 my-16" />

    <!-- Themes Section -->
    <section id="themes" class="mb-12 border-t border-white/5 pt-32">
      <div class="flex items-center gap-6 mb-12">
        <h2 class="text-5xl font-bold uppercase tracking-tight">
          Visual Identity
        </h2>
      </div>

      <div class="grid md:grid-cols-5 gap-16 items-center">
        <div class="md:col-span-3 space-y-6">
          <h3 class="text-2xl font-bold uppercase tracking-wider">
            Monochrome Fidelity
          </h3>
          <p class="text-lg text-white/50 leading-relaxed">
            Layr is engineered around a strict monochrome design system. Whether
            operating within high-contrast dark environments or surgical light
            themes, the interface maintains perfect spatial legibility and
            visual weight distribution.
          </p>
          <div
            class="p-6 rounded-lg bg-white/[0.03] border-l-4 border-white/20"
          >
            <span class="text-sm font-bold uppercase text-white/40 block mb-2"
              >Interface Orchestration</span
            >
            <p class="text-base text-white/60 italic">
              Toggle between thematic states in the utility bar to validate your
              grid architecture across varying luminosity levels.
            </p>
          </div>
        </div>
        <div
          class="md:col-span-2 rounded-2xl border border-white/5 overflow-hidden shadow-[0_0_50px_rgba(255,255,255,0.02)]"
        >
          <img
            src={whiteTheme}
            alt="White Theme Preview"
            class="w-full h-auto opacity-80 hover:opacity-100 transition-opacity"
          />
        </div>
      </div>
    </section>

    <hr class="border-white/20 my-16" />

    <!-- Cheat Sheet Section -->
    <section id="tips" class="mb-12 border-t border-white/5 pt-32">
      <div class="flex items-center gap-6 mb-12">
        <h2 class="text-5xl font-bold uppercase tracking-tight">
          Operator Shortcuts
        </h2>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {#each [
          { key: "Cmd + Z", desc: "Instantly undo your last spatial or visual action." },
          { key: "U (Key)", desc: "Quickly union multiple contiguous selected cells." },
          { key: "Delete", desc: "Permanently remove selected cells from the layout." },
          { key: "Shift + Click", desc: "Select multiple cells for batch property edits." }
        ] as tip}
          <div
            class="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all"
          >
            <div class="text-sm font-black text-white/60 uppercase mb-2">
              {tip.key}
            </div>
            <p class="text-base text-white/30 uppercase leading-relaxed">
              {tip.desc}
            </p>
          </div>
        {/each}
      </div>
    </section>

    <hr class="border-white/20 my-16" />

    <!-- Final CTA -->
    <section class="mt-32 mb-24 text-center">
      <div
        class="inline-block px-4 py-2 rounded-full border border-white/5 bg-white/[0.02] text-[10px] uppercase tracking-[0.4em] font-bold text-white/40 mb-12"
      >
        Ready to Create?
      </div>
      <h2
        class="text-6xl md:text-8xl font-bold tracking-tighter uppercase mb-16 leading-none"
      >
        Build Your <br />
        <span class="text-white/20 text-7xl md:text-9xl">Masterpiece.</span>
      </h2>
      <a
        href="/playground"
        class="inline-flex items-center gap-4 bg-white text-black px-12 py-6 rounded-full font-black uppercase text-sm tracking-widest hover:bg-white/90 hover:scale-105 transition-all duration-500 shadow-[0_0_50px_rgba(255,255,255,0.1)]"
      >
        <span>Open Playground</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          ><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg
        >
      </a>
      <p class="mt-12 text-sm text-white/20 uppercase tracking-[0.2em]">
        Free to use. No account required.
      </p>
    </section>
  </main>
</div>

<style>
  :global(html) {
    scroll-padding-top: 8rem;
    background-color: #000000;
  }

  :global(body) {
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
  }

  /* Navigation highlighting refinement */
  nav button {
    position: relative;
  }

  /* Custom scrollbar for sidebar */
  aside::-webkit-scrollbar {
    width: 2px;
  }
  aside::-webkit-scrollbar-track {
    background: transparent;
  }
  aside::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.05);
  }
</style>
