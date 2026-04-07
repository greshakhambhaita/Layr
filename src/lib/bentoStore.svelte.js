/**
 * Bento Grid Store
 * Manages the state and logic for the bento grid builder using Svelte 5 runes.
 */

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

// Breakpoint configurations
export const BREAKPOINTS = {
  desktop: { name: 'Desktop', columns: null, icon: 'desktop' }, // null means use original
  tablet: { name: 'Tablet', columns: 2, icon: 'tablet' },
  mobile: { name: 'Mobile', columns: 1, icon: 'mobile' }
};

export class BentoStore {
  numCols = $state(3);
  numRows = $state(3);
  subdivisions = 2; // Each cell is 2x2 internal units
  gridWidth = $state(600);
  gridGap = $state(12);
  cellRadius = $state(8);
  gridX = $state(0);
  gridY = $state(0);
  cellMeta = $state({});
  selectedCellIds = $state(new Set());
  nextId = 0;

  // Responsive preview state
  currentBreakpoint = $state('desktop'); // 'desktop' | 'tablet' | 'mobile'
  
  // Check if we're in preview mode (non-editable)
  get isPreviewMode() {
    return this.currentBreakpoint !== 'desktop';
  }

  get internalCols() { return this.numCols * this.subdivisions; }
  get internalRows() { return this.numRows * this.subdivisions; }

  // slotMap is derived from cellMeta and positions
  // but it's easier to maintain it explicitly for collision checks
  slotMap = $state([]);

  constructor() {
    this.resetGrid();
  }

  loadFromLocalStorage() {
    if (typeof window === 'undefined') return;
    const savedTemplate = localStorage.getItem('bento-template');
    if (savedTemplate) {
      try {
        const template = JSON.parse(savedTemplate);
        console.log("Found template in localStorage, loading...", template);
        this.loadTemplate(template);
        localStorage.removeItem('bento-template');
      } catch (e) {
        console.error("Failed to load template", e);
      }
    }
  }

  get gridHeight() {
    // Each unit width is (totalWidth - totalGaps) / numCols
    const unitW = (this.gridWidth - (this.gridGap * (this.internalCols - 1))) / this.internalCols;
    // Total height is (unitW * numRows) + totalGaps
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

  addCell(colSpan, rowSpan) {
    if (colSpan > this.internalCols || rowSpan > this.internalRows) return;
    const slot = this.findSlot(colSpan, rowSpan);
    if (!slot) return;

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
      type: 'color', // 'color' | 'image'
      imageUrl: '',
      imageStyle: {
        fit: 'cover',
        position: 'center',
        scale: 1,
        offsetX: 0,
        offsetY: 0,
      },
    };

    this.claimSlots(id, slot.r, slot.c, rowSpan, colSpan);
    this.selectedCellIds = new Set([id]);
  }

  removeCell(id) {
    if (!this.cellMeta[id]) return;
    this.freeSlots(id);
    delete this.cellMeta[id];
    const newSet = new Set(this.selectedCellIds);
    newSet.delete(id);
    this.selectedCellIds = newSet;
    
    // Re-sync slotMap just in case
    this.syncSlotMap();
  }

  updateCell(id, updates) {
    if (!this.cellMeta[id]) return;
    this.cellMeta[id] = { ...this.cellMeta[id], ...updates };
  }

  updateSelectedCells(updates) {
    this.selectedCellIds.forEach(id => {
      this.updateCell(id, updates);
    });
  }

  resetGrid() {
    this.numCols = 3;
    this.numRows = 3;
    this.gridWidth = 600;
    this.gridGap = 12;
    this.cellRadius = 8;
    this.gridX = 0;
    this.gridY = 0;
    this.nextId = 0;
    this.cellMeta = {};
    this.slotMap = [];
    this.selectedCellIds = new Set();
    
    this.ensureRows(this.internalRows);
    
    this.addCell(4, 4); // Main hero (2x2)
    this.addCell(2, 2); // Right top (1x1)
    this.addCell(2, 2); // Right middle (1x1)
    this.addCell(4, 2); // Bottom left (2x1)
    this.addCell(2, 2); // Bottom right (1x1)
  }

  loadTemplate(template) {
    // Basic reset
    this.numCols = template.numCols || 18 / (this.subdivisions || 2);
    this.numRows = template.numRows || 10 / (this.subdivisions || 2);
    this.gridWidth = template.gridWidth || 600;
    this.gridGap = template.gridGap || 12;
    this.cellRadius = template.cellRadius || 8;
    this.nextId = 0;
    this.cellMeta = {};
    this.slotMap = [];
    this.selectedCellIds = new Set();
    
    this.ensureRows(this.internalRows);

    if (template.cells) {
      template.cells.forEach(cell => {
        const id = cell.id || this.makeId();
        // Ensure id sequence continues correctly
        if (typeof id === 'string' && id.length === 1) {
            const code = id.charCodeAt(0) - 'a'.charCodeAt(0);
            if (code >= this.nextId) this.nextId = code + 1;
        }

        this.cellMeta[id] = {
          hex: '#d9d9d9',
          opacity: 1,
          type: 'color',
          imageUrl: '',
          imageStyle: { fit: 'cover', position: 'center', scale: 1, offsetX: 0, offsetY: 0 },
          textElements: [],
          ...cell
        };
        this.claimSlots(id, cell.r, cell.c, cell.rowSpan, cell.colSpan);
      });
    }
  }

  // --- Multi-selection helpers ---

  get selectedCellId() {
    if (this.selectedCellIds.size === 1) return [...this.selectedCellIds][0];
    return null;
  }

  toggleSelection(id, shiftKey) {
    if (shiftKey) {
      const newSet = new Set(this.selectedCellIds);
      if (newSet.has(id)) newSet.delete(id);
      else {
        newSet.add(id);
      }
      this.selectedCellIds = newSet;
    } else {
      this.selectedCellIds = new Set([id]);
    }
  }

  clearSelection() {
    this.selectedCellIds = new Set();
  }

  // --- Contiguity check (BFS on grid slots) ---

  areCellsContiguous(ids) {
    if (ids.length < 2) return true;
    const idSet = new Set(ids);
    
    // Collect all grid slots belonging to these cells
    const slots = new Set();
    for (const id of idSet) {
      const meta = this.cellMeta[id];
      if (!meta) return false;
      for (let dr = 0; dr < meta.rowSpan; dr++) {
        for (let dc = 0; dc < meta.colSpan; dc++) {
          slots.add(`${meta.r + dr},${meta.c + dc}`);
        }
      }
    }

    // BFS from first slot
    const arr = [...slots];
    const visited = new Set();
    const queue = [arr[0]];
    visited.add(arr[0]);

    while (queue.length > 0) {
      const key = queue.shift();
      const [r, c] = key.split(',').map(Number);
      for (const [nr, nc] of [[r-1,c],[r+1,c],[r,c-1],[r,c+1]]) {
        const nk = `${nr},${nc}`;
        if (slots.has(nk) && !visited.has(nk)) {
          visited.add(nk);
          queue.push(nk);
        }
      }
    }

    return visited.size === slots.size;
  }

  // --- Clip-path polygon generation ---

  computeClipPath(fusedSlots, minR, minC, spanRows, spanCols, radiusPx = 0, cellWidthPx = 0, cellHeightPx = 0) {
    // Build a boolean grid for the fused region (relative to bounding box)
    const grid = Array.from({ length: spanRows }, () => new Array(spanCols).fill(false));
    for (const key of fusedSlots) {
      const [r, c] = key.split(',').map(Number);
      grid[r - minR][c - minC] = true;
    }

    // March the border: find all edge segments between filled/empty cells
    // We work in a coordinate system where each cell occupies 1x1 unit
    // Vertices are at integer coordinates
    const edges = [];
    for (let r = 0; r < spanRows; r++) {
      for (let c = 0; c < spanCols; c++) {
        if (!grid[r][c]) continue;
        // Top edge: boundary of the fused region
        if (r === 0 || !grid[r-1][c]) edges.push({ x1: c, y1: r, x2: c+1, y2: r });
        // Bottom edge
        if (r === spanRows-1 || !grid[r+1][c]) edges.push({ x1: c+1, y1: r+1, x2: c, y2: r+1 });
        // Left edge
        if (c === 0 || !grid[r][c-1]) edges.push({ x1: c, y1: r+1, x2: c, y2: r });
        // Right edge
        if (c === spanCols-1 || !grid[r][c+1]) edges.push({ x1: c+1, y1: r, x2: c+1, y2: r+1 });
      }
    }

    // Chain edges into a polygon path
    if (edges.length === 0) return '';
    
    const ordered = [edges[0]];
    const used = new Set([0]);
    
    while (ordered.length < edges.length) {
      const last = ordered[ordered.length - 1];
      let found = false;
      for (let i = 0; i < edges.length; i++) {
        if (used.has(i)) continue;
        if (edges[i].x1 === last.x2 && edges[i].y1 === last.y2) {
          ordered.push(edges[i]);
          used.add(i);
          found = true;
          break;
        }
      }
      if (!found) break; // Safety: shouldn't happen for valid shapes
    }

    // Convert radius from pixels to percentage of the bounding box
    // We need actual cell dimensions to calculate this properly
    const radiusXPct = cellWidthPx > 0 ? (radiusPx / cellWidthPx) * 100 : 0;
    const radiusYPct = cellHeightPx > 0 ? (radiusPx / cellHeightPx) * 100 : 0;
    
    // Cap the radius to avoid overlap (max 50% of a single cell)
    const cellWidthPct = 100 / spanCols;
    const cellHeightPct = 100 / spanRows;
    const maxRadiusXPct = Math.min(radiusXPct, cellWidthPct / 2);
    const maxRadiusYPct = Math.min(radiusYPct, cellHeightPct / 2);

    // If no radius or dimensions not provided, use simple polygon
    if (radiusPx === 0 || cellWidthPx === 0 || cellHeightPx === 0) {
      const points = ordered.map(e => {
        const px = (e.x1 / spanCols * 100).toFixed(2);
        const py = (e.y1 / spanRows * 100).toFixed(2);
        return `${px}% ${py}%`;
      });
      return `polygon(${points.join(', ')})`;
    }

    // Generate rounded polygon with extra points at corners
    const roundedPoints = [];
    const numArcSegments = 4; // Number of segments to approximate each corner arc

    for (let i = 0; i < ordered.length; i++) {
      const curr = ordered[i];
      const next = ordered[(i + 1) % ordered.length];
      
      // The corner is at (curr.x2, curr.y2) which equals (next.x1, next.y1)
      const cornerX = curr.x2 / spanCols * 100;
      const cornerY = curr.y2 / spanRows * 100;
      
      // Direction of current edge (normalized)
      const currDx = curr.x2 - curr.x1;
      const currDy = curr.y2 - curr.y1;
      
      // Direction of next edge (normalized)
      const nextDx = next.x2 - next.x1;
      const nextDy = next.y2 - next.y1;
      
      // Determine the corner type based on the turn direction
      // Cross product: currDx * nextDy - currDy * nextDx
      // Positive = left turn (convex corner, needs rounding outward)
      // Negative = right turn (concave corner, needs rounding inward)
      const cross = currDx * nextDy - currDy * nextDx;
      
      // For convex corners (outer corners), we round outward
      // For concave corners (inner corners), we round inward
      const isConvex = cross > 0;
      
      // Calculate the offset for the rounded corner
      // Move back along the current edge and forward along the next edge
      const offsetX = maxRadiusXPct * (currDx !== 0 ? -currDx / Math.abs(currDx) : 0);
      const offsetY = maxRadiusYPct * (currDy !== 0 ? -currDy / Math.abs(currDy) : 0);
      const offsetNextX = maxRadiusXPct * (nextDx !== 0 ? nextDx / Math.abs(nextDx) : 0);
      const offsetNextY = maxRadiusYPct * (nextDy !== 0 ? nextDy / Math.abs(nextDy) : 0);
      
      // Start point of the arc (before the corner on current edge)
      const startX = cornerX + offsetX;
      const startY = cornerY + offsetY;
      
      // End point of the arc (after the corner on next edge)  
      const endX = cornerX + offsetNextX;
      const endY = cornerY + offsetNextY;
      
      // Add the start point
      roundedPoints.push(`${startX.toFixed(2)}% ${startY.toFixed(2)}%`);
      
      // Add arc approximation points
      for (let j = 1; j < numArcSegments; j++) {
        const t = j / numArcSegments;
        // Quadratic bezier approximation for the corner
        const arcX = (1-t)*(1-t)*startX + 2*(1-t)*t*cornerX + t*t*endX;
        const arcY = (1-t)*(1-t)*startY + 2*(1-t)*t*cornerY + t*t*endY;
        roundedPoints.push(`${arcX.toFixed(2)}% ${arcY.toFixed(2)}%`);
      }
      
      // Add the end point
      roundedPoints.push(`${endX.toFixed(2)}% ${endY.toFixed(2)}%`);
    }

    return `polygon(${roundedPoints.join(', ')})`;
  }

  // --- Union (Fusion) ---

  unionCells(ids) {
    if (ids.length < 2) return;
    if (!this.areCellsContiguous(ids)) return;

    // Collect all slots and find bounding box
    const fusedSlots = new Set();
    let minR = Infinity, minC = Infinity, maxR = -Infinity, maxC = -Infinity;
    let largestId = ids[0];
    let largestArea = 0;

    for (const id of ids) {
      const meta = this.cellMeta[id];
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

    // Calculate cell dimensions for rounded clip-path
    const unitW = (this.gridWidth - (this.gridGap * (this.internalCols - 1))) / this.internalCols;
    const cellWidthPx = unitW * spanCols + this.gridGap * (spanCols - 1);
    const cellHeightPx = unitW * spanRows + this.gridGap * (spanRows - 1);

    // Check if the fused region fills the entire bounding box (no clip needed)
    const isFull = fusedSlots.size === spanRows * spanCols;
    const clipPath = isFull ? '' : this.computeClipPath(fusedSlots, minR, minC, spanRows, spanCols, this.cellRadius, cellWidthPx, cellHeightPx);

    // Use color from largest cell
    const dominantColor = { ...this.cellMeta[largestId].color };

    // Remove old cells
    for (const id of ids) {
      this.freeSlots(id);
      delete this.cellMeta[id];
    }

    // Create new fused cell
    const newId = this.makeId();
    this.cellMeta[newId] = {
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

    // Claim only the fused slots (not the entire bounding box)
    for (const key of fusedSlots) {
      const [sr, sc] = key.split(',').map(Number);
      this.slotMap[sr][sc] = newId;
    }

    this.selectedCellIds = new Set([newId]);
  }

  syncSlotMap() {
    this.slotMap = Array.from({ length: this.internalRows }, () => new Array(this.internalCols).fill(null));
    Object.keys(this.cellMeta).forEach(id => {
      const meta = this.cellMeta[id];
      if (meta.fused && meta.fusedSlots) {
        // Fused cells only claim their specific slots, not the full bounding box
        for (const key of meta.fusedSlots) {
          const [sr, sc] = key.split(',').map(Number);
          this.slotMap[sr][sc] = id;
        }
      } else {
        this.claimSlots(id, meta.r, meta.c, meta.rowSpan, meta.colSpan);
      }
    });
  }

  // Recompute clip paths for all fused cells when radius changes
  updateFusedClipPaths() {
    const unitW = (this.gridWidth - (this.gridGap * (this.internalCols - 1))) / this.internalCols;
    
    Object.keys(this.cellMeta).forEach(id => {
      const meta = this.cellMeta[id];
      if (meta.fused && meta.fusedSlots && meta.fusedSlots.length > 0) {
        // Recalculate bounding box
        let minR = Infinity, minC = Infinity, maxR = -Infinity, maxC = -Infinity;
        const fusedSlots = new Set(meta.fusedSlots);
        
        for (const key of fusedSlots) {
          const [r, c] = key.split(',').map(Number);
          if (r < minR) minR = r;
          if (c < minC) minC = c;
          if (r > maxR) maxR = r;
          if (c > maxC) maxC = c;
        }
        
        const spanRows = maxR - minR + 1;
        const spanCols = maxC - minC + 1;
        
        // Check if full rectangle (no clip needed)
        const isFull = fusedSlots.size === spanRows * spanCols;
        if (isFull) {
          meta.clipPath = '';
        } else {
          const cellWidthPx = unitW * spanCols + this.gridGap * (spanCols - 1);
          const cellHeightPx = unitW * spanRows + this.gridGap * (spanRows - 1);
          meta.clipPath = this.computeClipPath(fusedSlots, minR, minC, spanRows, spanCols, this.cellRadius, cellWidthPx, cellHeightPx);
        }
      }
    });
  }

  updateGridDimensions(cols, rows) {
    const oldMeta = { ...this.cellMeta };
    this.numCols = cols;
    this.numRows = rows;
    this.slotMap = [];
    this.ensureRows(this.numRows);
    this.cellMeta = {};

    // Sort by size to prioritize larger cells
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
          // Keep fused slots if position didn't change
          for (const key of meta.fusedSlots) {
            const [sr, sc] = key.split(',').map(Number);
            this.slotMap[sr][sc] = id;
          }
        } else {
          // If it moved or wasn't fused, treat as rectangle and clear fused state
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
          // If it moved, clear fused state
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

    // Free up moving cell and all displaced cells in temp map
    this.freeSlotsInMap(tempMap, id);
    for (const did of displacedIds) this.freeSlotsInMap(tempMap, did);

    // Place moving cell in new position
    for (let dr = 0; dr < meta.rowSpan; dr++) {
      for (let dc = 0; dc < meta.colSpan; dc++) {
        tempMap[nr + dr][nc + dc] = id;
      }
    }

    // Try to place each displaced cell
    for (const did of displacedIds) {
      const dMeta = this.cellMeta[did];
      let placed = false;

      // Search candidates: 
      // 1. moving cell's old position (priority swap)
      // 2. vacated slots
      // 3. everywhere else
      const candidates = [{ r: oldR, c: oldC }];
      for (const slot of freedSlots) candidates.push(slot);
      
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

      if (!placed) return null; // Couldn't find a home for one of the cells
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
    
    // Update fused slots if it's a fused cell
    if (meta.fused && meta.fusedSlots) {
      const dr = r - oldR;
      const dc = c - oldC;
      meta.fusedSlots = meta.fusedSlots.map(key => {
        const [sr, sc] = key.split(',').map(Number);
        return `${sr + dr},${sc + dc}`;
      });
      
      // Claim only specific slots
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
    // Ported from JS logic, returns a plan orbnull
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
      for (let c = 0; c < this.numCols; c++)
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
        if (cand.r + dMeta.rowSpan > this.internalRows) continue;
        if (cand.c + dMeta.colSpan > this.internalCols) continue;

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
    
    // Resizing a fused cell converts it back to a rectangle
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
      
      // If a displaced cell was fused, it also becomes a rectangle if its size changed
      if (mMeta.fused && (mMeta.colSpan !== move.colSpan || mMeta.rowSpan !== move.rowSpan)) {
        mMeta.fused = false;
        delete mMeta.fusedSlots;
        mMeta.clipPath = '';
      }
      
      if (mMeta.fused && mMeta.fusedSlots) {
         // Should realistically handle move here, but resizing displaced cells is rare
         // and usually they are forced into 1x1 anyway. Let's just re-sync if complex.
         this.syncSlotMap();
      } else {
        this.claimSlots(move.id, mMeta.r, mMeta.c, mMeta.rowSpan, mMeta.colSpan);
      }
    }
  }

  // --- Responsive Preview Methods ---

  setBreakpoint(breakpoint) {
    if (BREAKPOINTS[breakpoint]) {
      this.currentBreakpoint = breakpoint;
      // Clear selection when switching to preview mode
      if (breakpoint !== 'desktop') {
        this.clearSelection();
      }
    }
  }

  /**
   * Get transformed layout for responsive preview
   * This generates a derived layout for tablet/mobile views
   * @returns {Array} Array of cell objects with transformed positions
   */
  getResponsiveLayout() {
    const cells = Object.values(this.cellMeta);
    
    if (this.currentBreakpoint === 'desktop') {
      // Return original layout as-is
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
    
    // Sort cells by: 1) Size (largest first), 2) Position (top-to-bottom, left-to-right)
    const sortedCells = [...cells].sort((a, b) => {
      // Calculate original area (represents visual importance)
      const areaA = a.colSpan * a.rowSpan;
      const areaB = b.colSpan * b.rowSpan;
      
      // Larger cells first
      if (areaA !== areaB) return areaB - areaA;
      
      // Same size: sort by position (top-left priority)
      if (a.r !== b.r) return a.r - b.r;
      return a.c - b.c;
    });

    // Transform cells for the new layout
    const transformedCells = [];

    for (const cell of sortedCells) {
      const originalArea = cell.colSpan * cell.rowSpan;
      // Calculate original aspect ratio (width / height)
      const originalAspectRatio = cell.colSpan / cell.rowSpan;
      
      // In mobile (1 column), all cells stack vertically
      // In tablet (2 columns), we flow into a 2-column grid
      let newColSpan, newRowSpan;
      
      if (this.currentBreakpoint === 'mobile') {
        // Mobile: single column stack with fixed ~100px row height
        // We want cells to be reasonably proportioned
        newColSpan = 1;
        
        // For images, calculate rows based on a target aspect ratio
        // Mobile column is ~340px wide, rows are ~100px tall
        // So 1 row = 340:100 = 3.4:1 (very wide)
        // 2 rows = 340:200 = 1.7:1 (wide landscape)
        // 3 rows = 340:300 = ~1:1 (square)
        // 4 rows = 340:400 = ~1:1.2 (portrait)
        
        if (cell.fill?.type === 'image') {
          // Convert original ratio to target rows
          // If original was wide (2:1), use 2 rows → 1.7:1
          // If original was square (1:1), use 3 rows → ~square
          // If original was tall (1:2), use 4 rows → portrait
          if (originalAspectRatio >= 1.5) {
            newRowSpan = 2; // Wide images
          } else if (originalAspectRatio >= 0.8) {
            newRowSpan = 3; // Square-ish images
          } else {
            newRowSpan = 4; // Tall images
          }
        } else {
          // Color cells - simpler logic based on original area
          newRowSpan = Math.max(2, Math.min(3, Math.ceil(originalArea / 2)));
        }
      } else {
        // Tablet: 2-column grid with ~120px row height
        // Column is ~340px wide, rows are ~120px
        // 1 row = 340:120 = 2.8:1 (wide)
        // 2 rows = 340:240 = 1.4:1 (landscape)
        // 3 rows = 340:360 = ~1:1 (square)
        
        // Determine if cell should span full width based on original size
        const shouldSpanFull = originalArea >= 8;
        newColSpan = shouldSpanFull ? 2 : 1;
        
        if (cell.fill?.type === 'image') {
          if (newColSpan === 2) {
            // Full-width cells - more height options
            if (originalAspectRatio >= 1.5) {
              newRowSpan = 2;
            } else if (originalAspectRatio >= 0.8) {
              newRowSpan = 3;
            } else {
              newRowSpan = 4;
            }
          } else {
            // Half-width cells
            if (originalAspectRatio >= 1.5) {
              newRowSpan = 2;
            } else if (originalAspectRatio >= 0.8) {
              newRowSpan = 2;
            } else {
              newRowSpan = 3;
            }
          }
        } else {
          // Color cells
          newRowSpan = Math.max(2, Math.min(3, Math.ceil(originalArea / (newColSpan * 2))));
        }
      }

      transformedCells.push({
        ...cell,
        previewR: 0, // Will be calculated by compactLayout
        previewC: 0, // Will be calculated by compactLayout
        previewColSpan: newColSpan,
        previewRowSpan: newRowSpan,
        originalArea,
        originalAspectRatio,
        // Disable fused/clip-path in preview mode
        previewFused: false,
        previewClipPath: ''
      });
    }

    // Recalculate row positions to avoid gaps
    return this.compactLayout(transformedCells, targetColumns);
  }

  /**
   * Compact the layout to remove gaps
   * Uses a simple bin-packing approach
   */
  compactLayout(cells, targetColumns) {
    if (cells.length === 0) return [];

    // Create a height map for each column
    const columnHeights = new Array(targetColumns).fill(0);
    const compactedCells = [];

    for (const cell of cells) {
      const colSpan = cell.previewColSpan;
      const rowSpan = cell.previewRowSpan;

      // Find the best row to place this cell
      let bestRow = Infinity;
      let bestCol = 0;

      for (let c = 0; c <= targetColumns - colSpan; c++) {
        // Find the maximum height among columns this cell would span
        let maxHeight = 0;
        for (let dc = 0; dc < colSpan; dc++) {
          maxHeight = Math.max(maxHeight, columnHeights[c + dc]);
        }
        
        if (maxHeight < bestRow) {
          bestRow = maxHeight;
          bestCol = c;
        }
      }

      // Place the cell
      compactedCells.push({
        ...cell,
        previewR: bestRow,
        previewC: bestCol
      });

      // Update column heights
      for (let dc = 0; dc < colSpan; dc++) {
        columnHeights[bestCol + dc] = bestRow + rowSpan;
      }
    }

    return compactedCells;
  }

  /**
   * Get the preview grid dimensions
   */
  getPreviewGridDimensions() {
    if (this.currentBreakpoint === 'desktop') {
      return {
        cols: this.internalCols,
        rows: this.internalRows,
        width: this.gridWidth
      };
    }

    const targetColumns = BREAKPOINTS[this.currentBreakpoint].columns;
    const layout = this.getResponsiveLayout();
    
    // Calculate total rows needed
    let maxRow = 0;
    for (const cell of layout) {
      maxRow = Math.max(maxRow, cell.previewR + cell.previewRowSpan);
    }

    // Adjust width for preview
    const previewWidth = this.currentBreakpoint === 'mobile' ? 320 : 480;

    return {
      cols: targetColumns,
      rows: Math.max(1, maxRow),
      width: previewWidth
    };
  }
}
