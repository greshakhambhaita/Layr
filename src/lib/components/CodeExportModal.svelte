<script>
  let { store, isOpen, onClose } = $props();

  let downloading = $state(false);
  let downloadDone = $state(false);

  // True when any cell carries an image — used to show the images/ row in the UI
  const hasImages = $derived(
    Object.values(store.cellMeta).some((m) => m.type === "image" && m.imageUrl),
  );

  // ─── Responsive Layout Computation ──────────────────────────────────────────
  
  // Replicates the store's responsive transformation logic for export
  function computeResponsiveLayouts(cells) {
    // Sort cells by: 1) Size (largest first), 2) Position (top-to-bottom, left-to-right)
    const sortedCells = [...cells].sort((a, b) => {
      const areaA = a.colSpan * a.rowSpan;
      const areaB = b.colSpan * b.rowSpan;
      if (areaA !== areaB) return areaB - areaA;
      if (a.r !== b.r) return a.r - b.r;
      return a.c - b.c;
    });

    // Compute layout for a given number of columns
    function computeLayout(targetColumns, rowHeight) {
      const transformedCells = [];
      
      for (const cell of sortedCells) {
        const originalArea = cell.colSpan * cell.rowSpan;
        const originalAspectRatio = cell.colSpan / cell.rowSpan;
        
        let newColSpan, newRowSpan;
        
        if (targetColumns === 1) {
          // Mobile: single column
          newColSpan = 1;
          if (cell.type === 'image') {
            if (originalAspectRatio >= 1.5) newRowSpan = 2;
            else if (originalAspectRatio >= 0.8) newRowSpan = 3;
            else newRowSpan = 4;
          } else {
            newRowSpan = Math.max(2, Math.min(3, Math.ceil(originalArea / 2)));
          }
        } else {
          // Tablet: 2 columns
          const shouldSpanFull = originalArea >= 8;
          newColSpan = shouldSpanFull ? 2 : 1;
          
          if (cell.type === 'image') {
            if (newColSpan === 2) {
              if (originalAspectRatio >= 1.5) newRowSpan = 2;
              else if (originalAspectRatio >= 0.8) newRowSpan = 3;
              else newRowSpan = 4;
            } else {
              if (originalAspectRatio >= 1.5) newRowSpan = 2;
              else if (originalAspectRatio >= 0.8) newRowSpan = 2;
              else newRowSpan = 3;
            }
          } else {
            newRowSpan = Math.max(2, Math.min(3, Math.ceil(originalArea / (newColSpan * 2))));
          }
        }
        
        transformedCells.push({
          ...cell,
          newColSpan,
          newRowSpan
        });
      }
      
      // Bin-packing to assign positions
      return compactLayout(transformedCells, targetColumns);
    }
    
    // Compact layout using bin-packing
    function compactLayout(cells, targetColumns) {
      if (cells.length === 0) return [];
      
      const columnHeights = new Array(targetColumns).fill(0);
      const compactedCells = [];
      
      for (const cell of cells) {
        const colSpan = cell.newColSpan;
        const rowSpan = cell.newRowSpan;
        
        let bestRow = Infinity;
        let bestCol = 0;
        
        for (let c = 0; c <= targetColumns - colSpan; c++) {
          let maxHeight = 0;
          for (let dc = 0; dc < colSpan; dc++) {
            maxHeight = Math.max(maxHeight, columnHeights[c + dc]);
          }
          if (maxHeight < bestRow) {
            bestRow = maxHeight;
            bestCol = c;
          }
        }
        
        compactedCells.push({
          ...cell,
          previewR: bestRow,
          previewC: bestCol
        });
        
        for (let dc = 0; dc < colSpan; dc++) {
          columnHeights[bestCol + dc] = bestRow + rowSpan;
        }
      }
      
      return compactedCells;
    }
    
    return {
      tablet: computeLayout(2, 120),
      mobile: computeLayout(1, 100)
    };
  }

  // ─── Svelte file generators ─────────────────────────────────────────────────

  // FIX: build the BentoCell source as an array of plain double-quoted strings
  // joined by \n.  Backticks and ${...} inside a double-quoted JS string are
  // just literal characters — the Svelte parser never sees an "unterminated
  // template" and we need zero escape sequences.
  function generateBentoCellSvelte() {
    return [
      "<script>",
      "  let {",
      "    id,",
      "    colSpan,",
      "    rowSpan,",
      "    r,",
      "    c,",
      "    hex = '#d9d9d9',",
      "    opacity = 1,",
      "    type = 'color',",
      "    imageUrl = '',",
      "    imageStyle = { fit: 'cover', position: 'center', scale: 1 },",
      "    clipPath = '',",
      "    textElements = [],",
      "    children,",
      "  } = $props();",
      "",
      // Backtick template literal in the *output* file — perfectly fine here
      // because it lives inside a plain double-quoted JS string, not a template literal.
      "  const gridArea = `${r + 1} / ${c + 1} / ${r + 1 + rowSpan} / ${c + 1 + colSpan}`;",
      "",
      "  $effect(() => {",
      "    textElements.forEach(t => {",
      "      const fontFamily = t.fontFamily;",
      "      const id = `font-${fontFamily.replace(/\\s+/g, '-').toLowerCase()}`;",
      "      if (!document.getElementById(id)) {",
      "        const link = document.createElement('link');",
      "        link.id = id;",
      "        link.rel = 'stylesheet';",
      "        link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/\\s+/g, '+')}:wght@400;600;700&display=swap`;",
      "        document.head.appendChild(link);",
      "      }",
      "    });",
      "  });",
      "<" + "/script>",
      "",
      "<div",
      '  class="bento-cell bento-cell-{id}"',
      '  style="',
      "    grid-area: {gridArea};",
      "    --cell-bg: {hex};",
      "    --cell-opacity: {opacity};",
      "    {clipPath ? `clip-path: ${clipPath};` : ''}",
      '  "',
      ">",
      "  {#if type === 'image' && imageUrl}",
      "    <img",
      "      src={imageUrl}",
      '      alt=""',
      '      style="',
      "        object-fit: {imageStyle.fit};",
      "        object-position: {imageStyle.position};",
      "        transform: scale({imageStyle.scale});",
      '      "',
      "    />",
      "  {/if}",
      "  {#if textElements && textElements.length > 0}",
      "    <div class=\"bento-text-layer\" style=\"position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 2;\">",
      "      {#each textElements as text}",
      "        <div ",
      "          style=\"",
      "            position: absolute;",
      "            left: {text.x}%; ",
      "            top: {text.y}%; ",
      "            transform: translate(-50%, -50%) rotate({text.rotation}deg) scale({text.scale});",
      "            font-family: '{text.fontFamily}', sans-serif;",
      "            font-size: {text.fontSize}px;",
      "            font-weight: {text.fontWeight};",
      "            color: {text.color};",
      "            opacity: {text.opacity};",
      "            text-align: {text.textAlign};",
      "            white-space: nowrap;",
      "          \"",
      "        >",
      "          {text.text}",
      "        </div>",
      "      {/each}",
      "    </div>",
      "  {/if}",
      "  {@render children?.()}",
      "</div>",
      "",
      "<" + "style>",
      "  .bento-cell {",
      "    position: relative;",
      `    border-radius: var(--bento-radius, ${store.cellRadius}px);`,
      "    background: var(--cell-bg);",
      "    opacity: var(--cell-opacity);",
      "    overflow: hidden;",
      "  }",
      "  .bento-cell img {",
      "    position: absolute;",
      "    inset: 0;",
      "    width: 100%;",
      "    height: 100%;",
      "  }",
      "<" + "/style>",
    ].join("\n");
  }

  // imageUrlMap: { [cellId]: './images/cell-{id}.ext' }
  // Populated by extractImages() at download time so generated code uses
  // clean relative paths instead of blob / data URLs.
  function generateBentoGridSvelte(imageUrlMap = {}) {
    const cells = Object.values(store.cellMeta);
    
    // Compute responsive layouts
    const responsiveLayouts = computeResponsiveLayouts(cells);

    const cellLines = cells
      .map((meta) => {
        const resolvedUrl = imageUrlMap[meta.id] ?? meta.imageUrl ?? "";
        const attrs = [
          `id="${meta.id}"`,
          `r={${meta.r}}`,
          `c={${meta.c}}`,
          `colSpan={${meta.colSpan}}`,
          `rowSpan={${meta.rowSpan}}`,
          `hex="${meta.hex || "#d9d9d9"}"`,
          `opacity={${meta.opacity ?? 1}}`,
          `type="${meta.type || "color"}"`,
        ];
        if (resolvedUrl) attrs.push(`imageUrl="${resolvedUrl}"`);
        if (meta.clipPath) attrs.push(`clipPath="${meta.clipPath}"`);
        if (meta.imageStyle) {
          attrs.push(
            `imageStyle={{ fit: '${meta.imageStyle.fit}', position: '${meta.imageStyle.position}', scale: ${meta.imageStyle.scale} }}`,
          );
        }
        if (meta.textElements && meta.textElements.length > 0) {
          attrs.push(`textElements={${JSON.stringify(meta.textElements)}}`);
        }
        return `  <BentoCell ${attrs.join(" ")} />`;
      })
      .join("\n");

    // Generate tablet CSS overrides - use :global() to reach child components
    const tabletOverrides = responsiveLayouts.tablet
      .map((cell) => {
        const r = cell.previewR;
        const c = cell.previewC;
        const rowSpan = cell.newRowSpan;
        const colSpan = cell.newColSpan;
        return `    :global(.bento-cell-${cell.id}) { grid-area: ${r + 1} / ${c + 1} / ${r + 1 + rowSpan} / ${c + 1 + colSpan} !important; }`;
      })
      .join("\n");

    // Generate mobile CSS overrides - use :global() to reach child components
    const mobileOverrides = responsiveLayouts.mobile
      .map((cell) => {
        const r = cell.previewR;
        const c = cell.previewC;
        const rowSpan = cell.newRowSpan;
        const colSpan = cell.newColSpan;
        return `    :global(.bento-cell-${cell.id}) { grid-area: ${r + 1} / ${c + 1} / ${r + 1 + rowSpan} / ${c + 1 + colSpan} !important; }`;
      })
      .join("\n");

    return `<script>
  import BentoCell from './BentoCell.svelte';
<\/script>

<!--
  BentoGrid — generated by Bento Grid Builder
  Drop this folder into your project and import BentoGrid.svelte.
  Customise the CSS variables in bento.css to restyle globally.
  
  Responsive breakpoints:
  - Desktop (>768px): Original layout (fluid, max ${store.gridWidth}px)
  - Tablet (≤768px): 2-column grid, 120px rows
  - Mobile (≤480px): Single column, 100px rows
-->
<div class="bento-grid">
${cellLines}
</div>

<${"style"}>
  /* Desktop — original layout (fluid width) */
  .bento-grid {
    display: grid;
    gap: ${store.gridGap}px;
    padding: 10px;
    box-sizing: border-box;
    width: 100%;
    max-width: ${store.gridWidth}px;
    aspect-ratio: ${store.gridWidth} / ${Math.round(store.gridHeight)};
    grid-template-columns: repeat(${store.internalCols}, 1fr);
    grid-template-rows: repeat(${store.internalRows}, 1fr);
  }

  /* Tablet — 2 column grid (≤768px) */
  @media (max-width: 768px) {
    .bento-grid {
      max-width: 480px;
      aspect-ratio: auto;
      grid-template-columns: repeat(2, 1fr);
      grid-template-rows: none;
      grid-auto-rows: 120px;
    }
${tabletOverrides}
  }

  /* Mobile — single column stack (≤480px) */
  @media (max-width: 480px) {
    .bento-grid {
      max-width: 100%;
      grid-template-columns: 1fr;
      grid-auto-rows: 100px;
    }
${mobileOverrides}
  }
</${"style"}>
`;
  }

  function generateBentoCSS() {
    return `/*
  bento.css — global design tokens for your Bento Grid
  Import once at the top level of your app, e.g. in app.css:
    @import './bento.css';
*/

:root {
  /* Design tokens */
  --bento-radius: ${store.cellRadius}px;
  --bento-gap: ${store.gridGap}px;
  --bento-width: ${store.gridWidth}px;
  
  /* Responsive breakpoints */
  --bento-breakpoint-tablet: 768px;
  --bento-breakpoint-mobile: 480px;
  
  /* Responsive row heights */
  --bento-row-height-tablet: 120px;
  --bento-row-height-mobile: 100px;
}
`;
  }

  function generateReadme() {
    const fence = "`" + "`" + "`";
    return `# Bento Grid — generated component

Generated with Bento Grid Builder.

## Usage

1. Copy this folder into your SvelteKit project, e.g. \`src/lib/components/bento/\`

2. Import the global styles once in your \`app.css\` or root layout:
${fence}css
@import './bento.css';
${fence}

3. Use the component anywhere in your app:
${fence}svelte
<script>
  import BentoGrid from '$lib/components/bento/BentoGrid.svelte';
<\/script>

<BentoGrid />
${fence}

## Responsive Behavior

The grid automatically adapts to different screen sizes using CSS media queries:

| Breakpoint | Screen Width | Layout | Row Height |
|---|---|---|---|
| Desktop | >768px | Original (${store.internalCols} columns) | Auto |
| Tablet | ≤768px | 2 columns | 120px |
| Mobile | ≤480px | 1 column | 100px |

The responsive layout:
- **Preserves visual hierarchy** — larger cells remain prominent
- **Maintains image aspect ratios** — cells resize proportionally
- **Uses CSS only** — no JavaScript required

## Customisation

Override the CSS variables in \`bento.css\` to change global styles:

| Variable | Default | Purpose |
|---|---|---|
| \`--bento-radius\` | \`${store.cellRadius}px\` | Corner radius of every cell |
| \`--bento-gap\` | \`${store.gridGap}px\` | Gap between cells |
| \`--bento-width\` | \`${store.gridWidth}px\` | Base grid width |
| \`--bento-breakpoint-tablet\` | \`768px\` | Tablet breakpoint |
| \`--bento-breakpoint-mobile\` | \`480px\` | Mobile breakpoint |
| \`--bento-row-height-tablet\` | \`120px\` | Row height on tablet |
| \`--bento-row-height-mobile\` | \`100px\` | Row height on mobile |

Each cell's colour is set via \`--cell-bg\` and \`--cell-opacity\` inline CSS variables
on \`<BentoCell>\`, so you can override individual cells using a wrapper class.

## Files

| File | Purpose |
|---|---|
| \`BentoGrid.svelte\` | Top-level grid with responsive CSS media queries |
| \`BentoCell.svelte\` | Reusable single cell — accepts \`children\` via snippet |
| \`bento.css\` | Global CSS design tokens + breakpoint variables |
| \`images/\` | Bundled image assets (one file per image cell) |
| \`README.md\` | This file |

## Requirements

- No CLI, no registry — just files you own and edit.
- Svelte 5 (uses runes + snippets syntax)
- No other dependencies
`;
  }

  // ─── Image extraction ────────────────────────────────────────────────────────

  const MIME_TO_EXT = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/avif": "avif",
    "image/svg+xml": "svg",
  };

  // Fetches every image cell's blob URL or data URL, converts it to raw bytes,
  // and returns:
  //   imageUrlMap  — { [cellId]: './images/cell-{id}.ext' }
  //   imageFiles   — [{ path, data: Uint8Array }] ready to add to the zip
  async function extractImages(cells) {
    const imageUrlMap = {};
    const imageFiles = [];

    for (const meta of cells) {
      if (meta.type !== "image" || !meta.imageUrl) continue;

      try {
        let bytes;
        let mimeType;

        if (meta.imageUrl.startsWith("data:")) {
          // data URL → decode base64 directly, no fetch needed
          const [header, b64] = meta.imageUrl.split(",");
          mimeType = header.match(/:(.*?);/)?.[1] || "image/jpeg";
          const binary = atob(b64);
          bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++)
            bytes[i] = binary.charCodeAt(i);
        } else {
          // blob URL or remote URL → fetch it
          const res = await fetch(meta.imageUrl);
          mimeType =
            res.headers.get("content-type")?.split(";")[0] || "image/jpeg";
          bytes = new Uint8Array(await res.arrayBuffer());
        }

        const ext = MIME_TO_EXT[mimeType] || "jpg";
        const filePath = `images/cell-${meta.id}.${ext}`;
        imageFiles.push({ path: filePath, data: bytes });
        imageUrlMap[meta.id] = `./${filePath}`;
      } catch (err) {
        console.warn(`Could not extract image for cell ${meta.id}:`, err);
        // fall back to the original URL so the zip still generates
        imageUrlMap[meta.id] = meta.imageUrl;
      }
    }

    return { imageUrlMap, imageFiles };
  }

  // ─── Download ────────────────────────────────────────────────────────────────

  async function handleDownload() {
    downloading = true;
    try {
      const { default: JSZip } = await import(
        "https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm"
      );

      const cells = Object.values(store.cellMeta);
      const { imageUrlMap, imageFiles } = await extractImages(cells);

      const zip = new JSZip();
      const folder = zip.folder("bento-grid");

      // Add bundled images first
      for (const { path, data } of imageFiles) {
        folder.file(path, data);
      }

      folder.file("BentoGrid.svelte", generateBentoGridSvelte(imageUrlMap));
      folder.file("BentoCell.svelte", generateBentoCellSvelte());
      folder.file("bento.css", generateBentoCSS());
      folder.file("README.md", generateReadme());

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "bento-grid.zip";
      anchor.click();
      URL.revokeObjectURL(url);

      downloadDone = true;
      setTimeout(() => (downloadDone = false), 3000);
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      downloading = false;
    }
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
      class="bg-[var(--surface)] w-full sm:max-w-[1100px] h-[90vh] sm:h-auto sm:max-h-[85vh] sm:min-h-[500px] rounded-t-2xl sm:rounded-xl border border-[var(--border-subtle)] flex flex-col overflow-hidden animate-slideIn"
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
            Export Code
          </h3>
          <span
            class="font-mono text-[9px] text-[var(--text-muted)] tracking-wider hidden sm:block"
          >
            Copy snippets · or download ready-to-use Svelte components
          </span>
        </div>
        <button
          class="bg-[var(--input-bg)] rounded-lg w-8 h-8 flex items-center justify-center text-xs cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-hover)] transition-all font-bold"
          onclick={onClose}>✕</button
        >
      </div>

      <div class="flex-1 flex overflow-hidden flex-col md:flex-row min-h-0">
        <!-- Preview -->
        <div
          class="hidden md:flex flex-1 p-8 bg-[var(--code-bg)] overflow-hidden items-center justify-center relative bg-[radial-gradient(circle,var(--border-subtle)_1px,transparent_1px)] bg-[length:16px_16px]"
        >
          <div
            class="bg-[var(--surface)] border border-[var(--border-subtle)] rounded-[2px] grid relative pointer-events-none p-2"
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
              0.5,
              220 / store.gridWidth,
              220 / store.gridHeight,
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
                  <div class="absolute inset-0 pointer-events-none overflow-hidden z-[2]">
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

        <!-- Right panel -->
        <div
          class="w-full md:w-[420px] md:border-l border-[var(--border-subtle)] flex flex-col bg-[var(--surface)] min-h-0 flex-1 md:flex-initial"
        >
          <!-- Download panel -->
          <div
            class="flex-1 flex flex-col items-center justify-center gap-5 p-6 bg-[var(--code-bg)]"
          >
            <!-- Files preview -->
            <div class="w-full max-w-xs flex flex-col gap-2">
              {#each [{ name: "BentoGrid.svelte", desc: "Responsive grid layout" }, { name: "BentoCell.svelte", desc: "Reusable cell component" }, { name: "bento.css", desc: "Tokens + breakpoints" }, { name: "README.md", desc: "Drop-in instructions" }] as file}
                <div
                  class="flex items-center gap-3 px-3 py-2.5 bg-[var(--surface)] rounded-lg border border-[var(--border-subtle)]"
                >
                  <span
                    class="font-mono text-[10px] text-[var(--accent)] font-bold truncate"
                    >{file.name}</span
                  >
                  <span
                    class="text-[9px] text-[var(--text-subtle)] ml-auto shrink-0"
                    >{file.desc}</span
                  >
                </div>
              {/each}

              <!-- Show images/ row only when the grid contains image cells -->
              {#if hasImages}
                <div
                  class="flex items-center gap-3 px-3 py-2.5 bg-[var(--surface)] rounded-lg border border-[var(--border-subtle)]"
                >
                  <span
                    class="font-mono text-[10px] text-[var(--accent)] font-bold truncate"
                    >images/</span
                  >
                  <span
                    class="text-[9px] text-[var(--text-subtle)] ml-auto shrink-0"
                    >Bundled image assets</span
                  >
                </div>
              {/if}
            </div>

            <!-- Usage snippet -->
            <div
              class="w-full max-w-xs bg-[var(--input-bg)] rounded-lg p-3 font-mono text-[10px] text-[var(--text-muted)] leading-relaxed overflow-x-auto"
            >
              <div class="text-[var(--text-subtle)]">
                // your SvelteKit page
              </div>
              <div>
                <span class="text-[var(--accent)]">import</span> BentoGrid
                <span class="text-[var(--accent)]">from</span>
                <span class="text-[var(--text-subtle)]"
                  >'$lib/components/bento/BentoGrid.svelte'</span
                >;
              </div>
            </div>

            <!-- Download button -->
            <button
              class="w-full max-w-xs h-12 rounded-xl font-bold text-[13px] tracking-wide transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:cursor-not-allowed
                {downloadDone
                ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                : 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] shadow-[0_4px_15px_rgba(76,132,245,0.3)] dark:shadow-[0_4px_15px_rgba(107,159,255,0.2)]'}"
              onclick={handleDownload}
              disabled={downloading}
            >
              {#if downloading}
                <svg
                  class="w-4 h-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                >
                  <path
                    d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
                  />
                </svg>
                Zipping…
              {:else if downloadDone}
                <svg
                  class="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Downloaded!
              {:else}
                <svg
                  class="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download bento-grid.zip
              {/if}
            </button>

            <p
              class="text-[9px] text-[var(--text-subtle)] text-center max-w-xs leading-relaxed"
            >
              Unzip into <span class="font-mono">src/lib/components/</span> and follow
              the README. No CLI, no registry — just files you own and edit.
            </p>
          </div>
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
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .animate-fadeIn {
    animation: fadeIn 0.2s ease;
  }
  .animate-slideIn {
    animation: slideIn 0.3s cubic-bezier(0.34, 1.3, 0.64, 1);
  }
  .animate-spin {
    animation: spin 0.8s linear infinite;
  }
</style>
