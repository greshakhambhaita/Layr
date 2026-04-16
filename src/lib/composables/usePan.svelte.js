/**
 * Composable for panning and zooming the bento grid.
 */
import { onMount } from "svelte";

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
    // We can't easily access themeStore here unless we import it, but we can pass it or just use getComputedStyle
    
    if (!canvasEl) return;

    const ctx = canvasEl.getContext("2d");
    if (!ctx) return;

    canvasEl.width = _w;
    canvasEl.height = _h;
    ctx.clearRect(0, 0, _w, _h);

    const gridColor = getComputedStyle(document.documentElement).getPropertyValue("--text-main").trim() || "#000";
    ctx.strokeStyle = gridColor;
    ctx.globalAlpha = 0.25;
    ctx.lineWidth = 1;

    const cellW = (_w - _gap * (_cols - 1)) / _cols;
    const cellH = (_h - _gap * (_rows - 1)) / _rows;

    ctx.beginPath();
    for (let i = 0; i <= _cols; i++) {
      let x = i * (cellW + _gap);
      if (i === _cols) x = _w;
      const drawX = Math.round(x);
      ctx.moveTo(drawX, 0);
      ctx.lineTo(drawX, _h);
    }
    for (let i = 0; i <= _rows; i++) {
      let y = i * (cellH + _gap);
      if (i === _rows) y = _h;
      const drawY = Math.round(y);
      ctx.moveTo(0, drawY);
      ctx.lineTo(_w, drawY);
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
