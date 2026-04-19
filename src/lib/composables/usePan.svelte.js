/**
 * Composable for panning and zooming the bento grid.
 */
import { onMount } from "svelte";
import { themeStore } from "$lib/themeStore.svelte.js";

export function usePan(store, bentoElGetter, bentoScaleWrapGetter) {
  let scale = $state(1);
  let isPanning = $state(false);
  let panStart = $state({ x: 0, y: 0, offX: 0, offY: 0 });
  let isSpacePressed = $state(false);
  let canvasEl = $state(null);

  // Reactive canvas drawing
  $effect(() => {
    const _cols = store.internalCols;
    const _rows = store.internalRows;
    const _gap = store.gridGap;
    const _w = store.gridWidth;
    const _h = store.gridHeight;
    const sub = store.subdivisions || 2;
    const mainCols = store.numCols;
    const mainRows = store.numRows;
    
    if (!canvasEl) return;

    const ctx = canvasEl.getContext("2d");
    if (!ctx) return;

    canvasEl.width = Math.ceil(_w);
    canvasEl.height = Math.ceil(_h);
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

    const gridColor = getComputedStyle(document.documentElement).getPropertyValue("--text-main").trim() || "#000";
    ctx.strokeStyle = gridColor;
    ctx.globalAlpha = themeStore.isDark ? 0.35 : 0.2;
    ctx.lineWidth = 1;

    const cellW = (_w - _gap * (_cols - 1)) / _cols;
    const cellH = (_h - _gap * (_rows - 1)) / _rows;
    const mainCellW = sub * cellW + (sub - 1) * _gap;
    const mainCellH = sub * cellH + (sub - 1) * _gap;

    ctx.beginPath();
    for (let r = 0; r < mainRows; r++) {
      for (let c = 0; c < mainCols; c++) {
        // Calculate top-left of each main cell
        const x = c * (mainCellW + _gap);
        const y = r * (mainCellH + _gap);
        
        // Use 0.5 offset for sharp lines
        const drawX = Math.floor(x) + 0.5;
        const drawY = Math.floor(y) + 0.5;
        
        // Calculate width/height, ensuring we don't clip at the very edge (canvas dims)
        let drawW = Math.round(mainCellW);
        let drawH = Math.round(mainCellH);
        
        // On the last column/row, clamp to canvas bounds minus 0.5px 
        // to ensure the right/bottom border is fully visible within canvas pixels
        if (c === mainCols - 1) drawW = canvasEl.width - drawX - 0.5;
        if (r === mainRows - 1) drawH = canvasEl.height - drawY - 0.5;

        ctx.rect(drawX, drawY, drawW, drawH);
      }
    }
    ctx.stroke();
  });

  function updateScale() {
    const bentoScaleWrap = bentoScaleWrapGetter();
    const bentoEl = bentoElGetter();
    if (!bentoScaleWrap || !bentoEl) return;

    const isMobile = window.innerWidth < 1024;
    const isSmallMobile = window.innerWidth < 640;

    const padding = isSmallMobile ? 32 : isMobile ? 48 : 96;
    const availW = window.innerWidth - padding;
    const availH = isMobile ? window.innerHeight - 180 : Infinity;

    const scaleByWidth = availW / store.gridWidth;
    const scaleByHeight = availH / store.gridHeight;
    const targetScale = Math.min(scaleByWidth, scaleByHeight, 1.0);

    scale = targetScale;
    if (isMobile) {
      store.gridX = 0;
      store.gridY = 0;
    }
  }

  function handlePanStart(e) {
    const isMiddleClick = e.button === 1;
    const isSpacePan = (isSpacePressed || (e.touches && e.touches.length > 1)) && (e.button === 0 || !e.button);
    const isBackgroundClick = e.target === bentoScaleWrapGetter() || bentoElGetter().contains(e.target);

    if (isBackgroundClick && !isMiddleClick && !isSpacePan && e.button === 0) {
      store.clearSelection();
    }

    if (isMiddleClick || isSpacePan || isBackgroundClick) {
      if (e.cancelable) e.preventDefault();
      isPanning = true;
      const clientX = e.clientX ?? e.touches?.[0]?.clientX;
      const clientY = e.clientY ?? e.touches?.[0]?.clientY;
      panStart = {
        x: clientX,
        y: clientY,
        offX: store.gridX,
        offY: store.gridY,
      };
    }
  }

  function handleWheel(e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();

    const zoomFactor = 0.1;
    const delta = e.deltaY > 0 ? 1 - zoomFactor : 1 + zoomFactor;
    const newScale = Math.max(0.2, Math.min(scale * delta, 5));

    const rect = bentoScaleWrapGetter().getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    store.gridX = mx - (mx - store.gridX) * (newScale / scale);
    store.gridY = my - (my - store.gridY) * (newScale / scale);
    scale = newScale;
  }

  function handleMouseMove(e) {
    if (isPanning) {
      const clientX = e.clientX ?? e.touches?.[0]?.clientX;
      const clientY = e.clientY ?? e.touches?.[0]?.clientY;
      if (clientX === undefined) return;
      store.gridX = panStart.offX + (clientX - panStart.x);
      store.gridY = panStart.offY + (clientY - panStart.y);
    }
  }

  function handleMouseUp() {
    if (isPanning) isPanning = false;
  }

  function handleKeyDown(e) {
    if (e.code === "Space") isSpacePressed = true;
  }

  function handleKeyUp(e) {
    if (e.code === "Space") isSpacePressed = false;
  }

  onMount(() => {
    updateScale();
    window.addEventListener("resize", updateScale);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("resize", updateScale);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  });

  return {
    get scale() { return scale; },
    set scale(v) { scale = v; },
    get isPanning() { return isPanning; },
    get isSpacePressed() { return isSpacePressed; },
    get canvasEl() { return canvasEl; },
    set canvasEl(v) { canvasEl = v; },
    handlePanStart,
    handleWheel,
    handleMouseMove,
    handleMouseUp,
    updateScale
  };
}
