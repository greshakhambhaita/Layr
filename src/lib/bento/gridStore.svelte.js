import { computeClipPath } from './clipPathUtils.js';

export const BREAKPOINTS = {
  desktop: { name: 'Desktop', columns: null, icon: 'desktop' },
  tablet: { name: 'Tablet', columns: 2, icon: 'tablet' },
  mobile: { name: 'Mobile', columns: 1, icon: 'mobile' }
};

const PALETTE = [
  { h: 0, s: 0, l: 85 },
  { h: 0, s: 0, l: 80 },
  { h: 0, s: 0, l: 90 },
  { h: 0, s: 0, l: 75 },
  { h: 0, s: 0, l: 92 },
  { h: 0, s: 0, l: 88 },
  { h: 0, s: 0, l: 82 },
  { h: 0, s: 0, l: 78 }
];

export class GridStore {
  numCols = $state(3);
  numRows = $state(3);
  subdivisions = 2;
  gridWidth = $state(600);
  gridGap = $state(12);
  cellRadius = $state(8);
  gridX = $state(0);
  gridY = $state(0);
  cellMeta = $state({});
  slotMap = $state([]);
  nextId = 0;
  currentBreakpoint = $state('desktop');

  constructor() {
    this.ensureRows(this.internalRows);
  }

  get isPreviewMode() {
    return this.currentBreakpoint !== 'desktop';
  }

  get internalCols() { return this.numCols * this.subdivisions; }
  get internalRows() { return this.numRows * this.subdivisions; }

  get gridHeight() {
    const unitW = (this.gridWidth - (this.gridGap * (this.internalCols - 1))) / this.internalCols;
    return (unitW * this.internalRows) + (this.gridGap * (this.internalRows - 1));
  }

  makeId() {
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    const id = this.nextId < 26
      ? letters[this.nextId]
      : letters[Math.floor(this.nextId / 26) - 1] + letters[this.nextId % 26];
    this.nextId++;
    return id;
  }

  ensureRows(needed) {
    while (this.slotMap.length < needed) {
      this.slotMap.push(new Array(this.internalCols).fill(null));
    }
  }

  slotsFree(r, c, rowSpan, colSpan, ignoreId = null) {
    for (let dr = 0; dr < rowSpan; dr++) {
      for (let dc = 0; dc < colSpan; dc++) {
        const row = r + dr;
        const col = c + dc;
        if (row >= this.internalRows || col >= this.internalCols) return false;
        const occ = this.slotMap[row]?.[col];
        if (occ !== undefined && occ !== null && occ !== ignoreId) return false;
      }
    }
    return true;
  }

  findSlot(colSpan, rowSpan) {
    this.ensureRows(this.internalRows);
    for (let r = 0; r < this.slotMap.length; r++) {
      for (let c = 0; c <= this.internalCols - colSpan; c++) {
        if (this.slotsFree(r, c, rowSpan, colSpan)) return { r, c };
      }
    }
    return null;
  }

  claimSlots(id, r, c, rowSpan, colSpan) {
    this.ensureRows(r + rowSpan);
    for (let dr = 0; dr < rowSpan; dr++) {
      for (let dc = 0; dc < colSpan; dc++) {
        this.slotMap[r + dr][c + dc] = id;
      }
    }
  }

  freeSlots(id) {
    for (let r = 0; r < this.slotMap.length; r++) {
      for (let c = 0; c < this.internalCols; c++) {
        if (this.slotMap[r][c] === id) this.slotMap[r][c] = null;
      }
    }
  }

  findCellPos(id) {
    for (let r = 0; r < this.slotMap.length; r++) {
      for (let c = 0; c < this.internalCols; c++) {
        if (this.slotMap[r][c] === id) return { r, c };
      }
    }
    return null;
  }

  syncSlotMap() {
    this.slotMap = Array.from({ length: this.internalRows }, () => new Array(this.internalCols).fill(null));
    Object.keys(this.cellMeta).forEach(id => {
      const meta = this.cellMeta[id];
      if (meta.fused && meta.fusedSlots) {
        for (const key of meta.fusedSlots) {
          const [sr, sc] = key.split(',').map(Number);
          if (this.slotMap[sr]) this.slotMap[sr][sc] = id;
        }
      } else {
        this.claimSlots(id, meta.r, meta.c, meta.rowSpan, meta.colSpan);
      }
    });
  }

  addCell(colSpan, rowSpan) {
    if (colSpan > this.internalCols || rowSpan > this.internalRows) return null;
    const slot = this.findSlot(colSpan, rowSpan);
    if (!slot) return null;

    const id = this.makeId();
    const color = PALETTE[(this.nextId - 1) % PALETTE.length];
    
    this.cellMeta[id] = {
      id,
      colSpan,
      rowSpan,
      color,
      hex: '#d9d9d9',
      opacity: 1,
      r: slot.r,
      c: slot.c,
      type: 'color',
      imageUrl: '',
      imageStyle: { fit: 'cover', position: 'center', scale: 1, offsetX: 0, offsetY: 0 },
    };

    this.claimSlots(id, slot.r, slot.c, rowSpan, colSpan);
    return id;
  }

  removeCell(id) {
    if (!this.cellMeta[id]) return;
    this.freeSlots(id);
    delete this.cellMeta[id];
    this.syncSlotMap();
  }

  updateGridDimensions(cols, rows) {
    const oldMeta = { ...this.cellMeta };
    this.numCols = cols;
    this.numRows = rows;
    this.slotMap = [];
    this.ensureRows(this.internalRows);
    this.cellMeta = {};

    const ids = Object.keys(oldMeta).sort((a, b) => {
      const sA = oldMeta[a].colSpan * oldMeta[a].rowSpan;
      const sB = oldMeta[b].colSpan * oldMeta[b].rowSpan;
      return sB - sA;
    });

    ids.forEach(id => {
      const meta = oldMeta[id];
      let { r, c, colSpan, rowSpan } = meta;

      if (colSpan > this.internalCols) colSpan = this.internalCols;
      if (rowSpan > this.internalRows) rowSpan = this.internalRows;
      
      if (c + colSpan > this.internalCols) c = Math.max(0, this.internalCols - colSpan);
      if (r + rowSpan > this.internalRows) r = Math.max(0, this.internalRows - rowSpan);

      if (this.slotsFree(r, c, rowSpan, colSpan)) {
        this.cellMeta[id] = { ...meta, r, c, colSpan, rowSpan };
        if (meta.fused && meta.fusedSlots && r === meta.r && c === meta.c) {
          for (const key of meta.fusedSlots) {
            const [sr, sc] = key.split(',').map(Number);
            this.slotMap[sr][sc] = id;
          }
        } else {
          if (meta.fused) {
            this.cellMeta[id].fused = false;
            delete this.cellMeta[id].fusedSlots;
            this.cellMeta[id].clipPath = '';
          }
          this.claimSlots(id, r, c, rowSpan, colSpan);
        }
      } else {
        const slot = this.findSlot(colSpan, rowSpan);
        if (slot) {
          this.cellMeta[id] = { ...meta, r: slot.r, c: slot.c, colSpan, rowSpan };
          if (meta.fused) {
            this.cellMeta[id].fused = false;
            delete this.cellMeta[id].fusedSlots;
            this.cellMeta[id].clipPath = '';
          }
          this.claimSlots(id, slot.r, slot.c, rowSpan, colSpan);
        }
      }
    });
    this.syncSlotMap();
  }

  // --- Displacement ---

  computeDisplacePlan(id, nr, nc) {
    const meta = this.cellMeta[id];
    if (!meta) return null;
    if (nc + meta.colSpan > this.internalCols || nr + meta.rowSpan > this.internalRows) return null;

    const oldR = meta.r;
    const oldC = meta.c;

    const oldFP = new Set();
    for (let dr = 0; dr < meta.rowSpan; dr++)
      for (let dc = 0; dc < meta.colSpan; dc++)
        oldFP.add(`${oldR + dr},${oldC + dc}`);

    const newFP = new Set();
    for (let dr = 0; dr < meta.rowSpan; dr++)
      for (let dc = 0; dc < meta.colSpan; dc++)
        newFP.add(`${nr + dr},${nc + dc}`);

    const freedSlots = [];
    for (const key of oldFP) {
      if (!newFP.has(key)) {
        const [sr, sc] = key.split(',').map(Number);
        freedSlots.push({ r: sr, c: sc });
      }
    }

    const displacedIds = new Set();
    for (const key of newFP) {
      if (oldFP.has(key)) continue;
      const [sr, sc] = key.split(',').map(Number);
      const occ = this.slotMap[sr]?.[sc] ?? null;
      if (occ !== null && occ !== id) displacedIds.add(occ);
    }

    if (displacedIds.size === 0) return { moves: [] };

    const moves = [];
    const tempMap = this.slotMap.map(row => [...row]);

    this.freeSlotsInMap(tempMap, id);
    for (const did of displacedIds) this.freeSlotsInMap(tempMap, did);

    for (let dr = 0; dr < meta.rowSpan; dr++) {
      for (let dc = 0; dc < meta.colSpan; dc++) {
        tempMap[nr + dr][nc + dc] = id;
      }
    }

    for (const did of displacedIds) {
      const dMeta = this.cellMeta[did];
      let placed = false;
      const candidates = [{ r: oldR, c: oldC }, ...freedSlots];
      
      const seen = new Set();
      const uniqueCandidates = [];
      for (const cand of candidates) {
        const key = `${cand.r},${cand.c}`;
        if (seen.has(key)) continue;
        seen.add(key);
        uniqueCandidates.push(cand);
      }

      for (let r = 0; r < this.internalRows; r++) {
        for (let c = 0; c <= this.internalCols - dMeta.colSpan; c++) {
          const key = `${r},${c}`;
          if (!seen.has(key)) {
            seen.add(key);
            uniqueCandidates.push({ r, c });
          }
        }
      }

      for (const cand of uniqueCandidates) {
        if (cand.r + dMeta.rowSpan > this.internalRows || cand.c + dMeta.colSpan > this.internalCols) continue;
        let fits = true;
        for (let dr = 0; dr < dMeta.rowSpan && fits; dr++) {
          for (let dc = 0; dc < dMeta.colSpan && fits; dc++) {
            if (tempMap[cand.r + dr][cand.c + dc] !== null) fits = false;
          }
        }
        if (fits) {
          for (let dr = 0; dr < dMeta.rowSpan; dr++) {
            for (let dc = 0; dc < dMeta.colSpan; dc++) {
              tempMap[cand.r + dr][cand.c + dc] = did;
            }
          }
          moves.push({ id: did, r: cand.r, c: cand.c });
          placed = true;
          break;
        }
      }
      if (!placed) return null;
    }
    return { moves };
  }

  freeSlotsInMap(map, id) {
    for (let r = 0; r < map.length; r++) {
      for (let c = 0; c < map[r].length; c++) {
        if (map[r][c] === id) map[r][c] = null;
      }
    }
  }

  applyMove(id, r, c, planMoves = []) {
    const meta = this.cellMeta[id];
    const oldR = meta.r;
    const oldC = meta.c;

    this.freeSlots(id);
    for (const m of planMoves) this.freeSlots(m.id);

    meta.r = r;
    meta.c = c;
    
    if (meta.fused && meta.fusedSlots) {
      const dr = r - oldR;
      const dc = c - oldC;
      meta.fusedSlots = meta.fusedSlots.map(key => {
        const [sr, sc] = key.split(',').map(Number);
        return `${sr + dr},${sc + dc}`;
      });
      this.ensureRows(r + meta.rowSpan);
      for (const key of meta.fusedSlots) {
        const [sr, sc] = key.split(',').map(Number);
        this.slotMap[sr][sc] = id;
      }
    } else {
      this.claimSlots(id, r, c, meta.rowSpan, meta.colSpan);
    }

    for (const m of planMoves) {
      const mMeta = this.cellMeta[m.id];
      const mOldR = mMeta.r;
      const mOldC = mMeta.c;
      mMeta.r = m.r;
      mMeta.c = m.c;
      if (mMeta.fused && mMeta.fusedSlots) {
        const dr = m.r - mOldR;
        const dc = m.c - mOldC;
        mMeta.fusedSlots = mMeta.fusedSlots.map(key => {
          const [sr, sc] = key.split(',').map(Number);
          return `${sr + dr},${sc + dc}`;
        });
        this.ensureRows(mMeta.r + mMeta.rowSpan);
        for (const key of mMeta.fusedSlots) {
          const [sr, sc] = key.split(',').map(Number);
          this.slotMap[sr][sc] = m.id;
        }
      } else {
        this.claimSlots(m.id, m.r, m.c, mMeta.rowSpan, mMeta.colSpan);
      }
    }
  }

  planResize(id, newR, newC, newRowSpan, newColSpan) {
    const oldMeta = this.cellMeta[id];
    if (!oldMeta) return null;

    const oldFP = new Set();
    for (let dr = 0; dr < oldMeta.rowSpan; dr++)
      for (let dc = 0; dc < oldMeta.colSpan; dc++)
        oldFP.add(`${oldMeta.r + dr},${oldMeta.c + dc}`);

    const newFP = new Set();
    for (let dr = 0; dr < newRowSpan; dr++)
      for (let dc = 0; dc < newColSpan; dc++)
        newFP.add(`${newR + dr},${newC + dc}`);

    const freedSlots = [];
    for (const key of oldFP) {
      if (!newFP.has(key)) {
        const [r, c] = key.split(',').map(Number);
        freedSlots.push({ r, c });
      }
    }

    const gainedKeys = [];
    for (const key of newFP) {
      if (!oldFP.has(key)) gainedKeys.push(key);
    }

    const displacedIds = new Set();
    for (const key of gainedKeys) {
      const [r, c] = key.split(',').map(Number);
      const occ = this.slotMap[r]?.[c] ?? null;
      if (occ !== null && occ !== id) displacedIds.add(occ);
    }

    const moves = [];
    const tempMap = this.slotMap.map(row => [...row]);

    for (let r = 0; r < tempMap.length; r++)
      for (let c = 0; c < this.internalCols; c++)
        if (tempMap[r][c] === id) tempMap[r][c] = null;

    for (const did of displacedIds)
      for (let r = 0; r < tempMap.length; r++)
        for (let c = 0; c < this.internalCols; c++)
          if (tempMap[r][c] === did) tempMap[r][c] = null;

    for (let dr = 0; dr < newRowSpan; dr++)
      for (let dc = 0; dc < newColSpan; dc++)
        tempMap[newR + dr][newC + dc] = id;

    for (const did of displacedIds) {
      const dMeta = this.cellMeta[did];
      let placed = false;
      const candidates = [...freedSlots];
      for (let r = 0; r < this.internalRows; r++)
        for (let c = 0; c <= this.internalCols - dMeta.colSpan; c++)
          candidates.push({ r, c });

      for (const cand of candidates) {
        if (cand.r + dMeta.rowSpan > this.internalRows || cand.c + dMeta.colSpan > this.internalCols) continue;
        let fits = true;
        for (let dr = 0; dr < dMeta.rowSpan && fits; dr++)
          for (let dc = 0; dc < dMeta.colSpan && fits; dc++) {
            const v = tempMap[cand.r + dr]?.[cand.c + dc] ?? null;
            if (v !== null && v !== did) fits = false;
          }
        if (fits) {
          for (let dr = 0; dr < dMeta.rowSpan; dr++)
            for (let dc = 0; dc < dMeta.colSpan; dc++)
              tempMap[cand.r + dr][cand.c + dc] = did;
          moves.push({ id: did, r: cand.r, c: cand.c, colSpan: dMeta.colSpan, rowSpan: dMeta.rowSpan });
          placed = true;
          break;
        }
      }

      if (!placed) {
        for (let r = 0; r < this.internalRows && !placed; r++) {
          for (let c = 0; c < this.internalCols && !placed; c++) {
            const v = tempMap[r]?.[c] ?? null;
            if (v === null || v === did) {
              tempMap[r][c] = did;
              moves.push({ id: did, r, c, colSpan: 1, rowSpan: 1 });
              placed = true;
            }
          }
        }
      }
      if (!placed) return null;
    }
    return { newR, newC, newRowSpan, newColSpan, moves };
  }

  applyResize(id, plan) {
    const involvedIds = new Set([id, ...plan.moves.map(m => m.id)]);
    for (const cid of involvedIds) this.freeSlots(cid);

    const meta = this.cellMeta[id];
    meta.r = plan.newR;
    meta.c = plan.newC;
    meta.colSpan = plan.newColSpan;
    meta.rowSpan = plan.newRowSpan;
    
    if (meta.fused) {
      meta.fused = false;
      delete meta.fusedSlots;
      meta.clipPath = '';
    }
    this.claimSlots(id, meta.r, meta.c, meta.rowSpan, meta.colSpan);

    for (const move of plan.moves) {
      const mMeta = this.cellMeta[move.id];
      mMeta.r = move.r;
      mMeta.c = move.c;
      mMeta.colSpan = move.colSpan;
      mMeta.rowSpan = move.rowSpan;
      if (mMeta.fused && (mMeta.colSpan !== move.colSpan || mMeta.rowSpan !== move.rowSpan)) {
        mMeta.fused = false;
        delete mMeta.fusedSlots;
        mMeta.clipPath = '';
      }
      if (mMeta.fused && mMeta.fusedSlots) this.syncSlotMap();
      else this.claimSlots(move.id, mMeta.r, mMeta.c, mMeta.rowSpan, mMeta.colSpan);
    }
  }

  // --- Responsive Preview ---

  setBreakpoint(breakpoint) {
    if (BREAKPOINTS[breakpoint]) {
      this.currentBreakpoint = breakpoint;
    }
  }

  getResponsiveLayout() {
    const cells = Object.values(this.cellMeta);
    if (this.currentBreakpoint === 'desktop') {
      return cells.map(cell => ({
        ...cell,
        previewR: cell.r,
        previewC: cell.c,
        previewColSpan: cell.colSpan,
        previewRowSpan: cell.rowSpan,
        originalArea: cell.colSpan * cell.rowSpan,
        originalAspectRatio: cell.colSpan / cell.rowSpan
      }));
    }

    const targetColumns = BREAKPOINTS[this.currentBreakpoint].columns;
    const sortedCells = [...cells].sort((a, b) => {
      const areaA = a.colSpan * a.rowSpan;
      const areaB = b.colSpan * b.rowSpan;
      if (areaA !== areaB) return areaB - areaA;
      if (a.r !== b.r) return a.r - b.r;
      return a.c - b.c;
    });

    const transformedCells = [];
    for (const cell of sortedCells) {
      const originalArea = cell.colSpan * cell.rowSpan;
      const originalAspectRatio = cell.colSpan / cell.rowSpan;
      let newColSpan, newRowSpan;
      
      if (this.currentBreakpoint === 'mobile') {
        newColSpan = 1;
        if (cell.type === 'image') {
          if (originalAspectRatio >= 1.5) newRowSpan = 2;
          else if (originalAspectRatio >= 0.8) newRowSpan = 3;
          else newRowSpan = 4;
        } else {
          newRowSpan = Math.max(2, Math.min(3, Math.ceil(originalArea / 2)));
        }
      } else {
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
        previewR: 0,
        previewC: 0,
        previewColSpan: newColSpan,
        previewRowSpan: newRowSpan,
        originalArea,
        originalAspectRatio,
        previewFused: false,
        previewClipPath: ''
      });
    }
    return this.compactLayout(transformedCells, targetColumns);
  }

  compactLayout(cells, targetColumns) {
    if (cells.length === 0) return [];
    const columnHeights = new Array(targetColumns).fill(0);
    const compactedCells = [];
    for (const cell of cells) {
      const colSpan = cell.previewColSpan;
      const rowSpan = cell.previewRowSpan;
      let bestRow = Infinity;
      let bestCol = 0;
      for (let c = 0; c <= targetColumns - colSpan; c++) {
        let maxHeight = 0;
        for (let dc = 0; dc < colSpan; dc++) maxHeight = Math.max(maxHeight, columnHeights[c + dc]);
        if (maxHeight < bestRow) {
          bestRow = maxHeight;
          bestCol = c;
        }
      }
      compactedCells.push({ ...cell, previewR: bestRow, previewC: bestCol });
      for (let dc = 0; dc < colSpan; dc++) columnHeights[bestCol + dc] = bestRow + rowSpan;
    }
    return compactedCells;
  }

  getPreviewGridDimensions() {
    if (this.currentBreakpoint === 'desktop') {
      return { cols: this.internalCols, rows: this.internalRows, width: this.gridWidth };
    }
    const targetColumns = BREAKPOINTS[this.currentBreakpoint].columns;
    const layout = this.getResponsiveLayout();
    let maxRow = 0;
    for (const cell of layout) maxRow = Math.max(maxRow, cell.previewR + cell.previewRowSpan);
    const previewWidth = this.currentBreakpoint === 'mobile' ? 320 : 480;
    return { cols: targetColumns, rows: Math.max(1, maxRow), width: previewWidth };
  }
}
