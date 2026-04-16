import { areCellsContiguous, computeClipPath } from './clipPathUtils.js';

export class FuseStore {
  grid = null;
  selection = null;

  constructor(grid, selection) {
    this.grid = grid;
    this.selection = selection;
  }

  unionCells(ids) {
    if (ids.length < 2) return;
    if (!areCellsContiguous(ids, this.grid.cellMeta)) return;

    const fusedSlots = new Set();
    let minR = Infinity, minC = Infinity, maxR = -Infinity, maxC = -Infinity;
    let largestId = ids[0];
    let largestArea = 0;

    for (const id of ids) {
      const meta = this.grid.cellMeta[id];
      if (!meta) return;
      const area = meta.colSpan * meta.rowSpan;
      if (area > largestArea) {
        largestArea = area;
        largestId = id;
      }
      for (let dr = 0; dr < meta.rowSpan; dr++) {
        for (let dc = 0; dc < meta.colSpan; dc++) {
          const sr = meta.r + dr;
          const sc = meta.c + dc;
          fusedSlots.add(`${sr},${sc}`);
          if (sr < minR) minR = sr;
          if (sc < minC) minC = sc;
          if (sr > maxR) maxR = sr;
          if (sc > maxC) maxC = sc;
        }
      }
    }

    const spanRows = maxR - minR + 1;
    const spanCols = maxC - minC + 1;

    const unitW = (this.grid.gridWidth - (this.grid.gridGap * (this.grid.internalCols - 1))) / this.grid.internalCols;
    const cellWidthPx = unitW * spanCols + this.grid.gridGap * (spanCols - 1);
    const cellHeightPx = unitW * spanRows + this.grid.gridGap * (spanRows - 1);

    const isFull = fusedSlots.size === spanRows * spanCols;
    const clipPath = isFull ? '' : computeClipPath(fusedSlots, minR, minC, spanRows, spanCols, this.grid.cellRadius, cellWidthPx, cellHeightPx);

    const dominantColor = { ...this.grid.cellMeta[largestId].color };

    for (const id of ids) {
      this.grid.freeSlots(id);
      delete this.grid.cellMeta[id];
    }

    const newId = this.grid.makeId();
    this.grid.cellMeta[newId] = {
      id: newId,
      colSpan: spanCols,
      rowSpan: spanRows,
      color: dominantColor,
      hex: '#d9d9d9',
      opacity: 1,
      r: minR,
      c: minC,
      type: 'color',
      imageUrl: '',
      imageStyle: { fit: 'cover', position: 'center', scale: 1 },
      fused: true,
      fusedSlots: [...fusedSlots],
      clipPath: clipPath,
    };

    for (const key of fusedSlots) {
      const [sr, sc] = key.split(',').map(Number);
      if (this.grid.slotMap[sr]) this.grid.slotMap[sr][sc] = newId;
    }

    this.selection.set([newId]);
  }

  updateFusedClipPaths() {
    const unitW = (this.grid.gridWidth - (this.grid.gridGap * (this.grid.internalCols - 1))) / this.grid.internalCols;
    
    Object.keys(this.grid.cellMeta).forEach(id => {
      const meta = this.grid.cellMeta[id];
      if (meta.fused && meta.fusedSlots && meta.fusedSlots.length > 0) {
        let minR = Infinity, minC = Infinity, maxR = -Infinity, maxC = -Infinity;
        const slots = new Set(meta.fusedSlots);
        
        for (const key of slots) {
          const [r, c] = key.split(',').map(Number);
          if (r < minR) minR = r;
          if (c < minC) minC = c;
          if (r > maxR) maxR = r;
          if (c > maxC) maxC = c;
        }
        
        const spanRows = maxR - minR + 1;
        const spanCols = maxC - minC + 1;
        
        const isFull = slots.size === spanRows * spanCols;
        if (isFull) {
          meta.clipPath = '';
        } else {
          const cellWidthPx = unitW * spanCols + this.grid.gridGap * (spanCols - 1);
          const cellHeightPx = unitW * spanRows + this.grid.gridGap * (spanRows - 1);
          meta.clipPath = computeClipPath(slots, minR, minC, spanRows, spanCols, this.grid.cellRadius, cellWidthPx, cellHeightPx);
        }
      }
    });
  }
}
