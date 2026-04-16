/**
 * Bento Grid Store (BentoStore wrapper)
 * Coordinater for grid, selection, and fusion stores.
 */

import { GridStore } from './bento/gridStore.svelte.js';
import { SelectionStore } from './bento/selectionStore.svelte.js';
import { FuseStore } from './bento/fuseStore.svelte.js';
import * as utils from './bento/clipPathUtils.js';

export { BREAKPOINTS } from './bento/gridStore.svelte.js';

export class BentoStore {
  grid = new GridStore();
  selection = new SelectionStore();
  fuse = new FuseStore(this.grid, this.selection);

  constructor() {
    this.resetGrid();
  }

  // --- Grid State Proxies ---
  get numCols() { return this.grid.numCols; }
  set numCols(v) { this.grid.numCols = v; }
  get numRows() { return this.grid.numRows; }
  set numRows(v) { this.grid.numRows = v; }
  get subdivisions() { return this.grid.subdivisions; }
  get gridWidth() { return this.grid.gridWidth; }
  set gridWidth(v) { this.grid.gridWidth = v; }
  get gridGap() { return this.grid.gridGap; }
  set gridGap(v) { this.grid.gridGap = v; }
  get cellRadius() { return this.grid.cellRadius; }
  set cellRadius(v) { this.grid.cellRadius = v; }
  get gridX() { return this.grid.gridX; }
  set gridX(v) { this.grid.gridX = v; }
  get gridY() { return this.grid.gridY; }
  set gridY(v) { this.grid.gridY = v; }
  get cellMeta() { return this.grid.cellMeta; }
  set cellMeta(v) { this.grid.cellMeta = v; }
  get slotMap() { return this.grid.slotMap; }
  set slotMap(v) { this.grid.slotMap = v; }
  get nextId() { return this.grid.nextId; }
  set nextId(v) { this.grid.nextId = v; }
  get currentBreakpoint() { return this.grid.currentBreakpoint; }
  set currentBreakpoint(v) { this.grid.currentBreakpoint = v; }

  // --- Selection State Proxies ---
  get selectedCellIds() { return this.selection.selectedCellIds; }
  set selectedCellIds(v) { this.selection.selectedCellIds = v; }

  // --- Getters ---
  get isPreviewMode() { return this.grid.isPreviewMode; }
  get internalCols() { return this.grid.internalCols; }
  get internalRows() { return this.grid.internalRows; }
  get gridHeight() { return this.grid.gridHeight; }
  get selectedCellId() { return this.selection.selectedCellId; }

  // --- Storage ---
  loadFromLocalStorage() {
    if (typeof window === 'undefined') return;
    const savedTemplate = localStorage.getItem('bento-template');
    if (savedTemplate) {
      try {
        const template = JSON.parse(savedTemplate);
        this.loadTemplate(template);
        localStorage.removeItem('bento-template');
      } catch (e) {
        console.error("Failed to load template", e);
      }
    }
  }

  // --- Grid Methods ---
  makeId() { return this.grid.makeId(); }
  ensureRows(needed) { this.grid.ensureRows(needed); }
  slotsFree(r, c, rowSpan, colSpan, ignoreId = null) { return this.grid.slotsFree(r, c, rowSpan, colSpan, ignoreId); }
  findSlot(colSpan, rowSpan) { return this.grid.findSlot(colSpan, rowSpan); }
  claimSlots(id, r, c, rowSpan, colSpan) { this.grid.claimSlots(id, r, c, rowSpan, colSpan); }
  freeSlots(id) { this.grid.freeSlots(id); }
  findCellPos(id) { return this.grid.findCellPos(id); }

  addCell(colSpan, rowSpan) {
    const id = this.grid.addCell(colSpan, rowSpan);
    if (id) this.selection.set([id]);
  }

  removeCell(id) {
    this.grid.removeCell(id);
    const newSet = new Set(this.selectedCellIds);
    newSet.delete(id);
    this.selectedCellIds = newSet;
  }

  updateCell(id, updates) {
    if (!this.cellMeta[id]) return;
    this.cellMeta[id] = { ...this.cellMeta[id], ...updates };
  }

  updateSelectedCells(updates) {
    this.selectedCellIds.forEach(id => this.updateCell(id, updates));
  }

  resetGrid() {
    this.grid.numCols = 3;
    this.grid.numRows = 3;
    this.grid.gridWidth = 600;
    this.grid.gridGap = 12;
    this.grid.cellRadius = 8;
    this.grid.gridX = 0;
    this.grid.gridY = 0;
    this.grid.nextId = 0;
    this.grid.cellMeta = {};
    this.grid.slotMap = [];
    this.selection.clear();
    
    this.grid.ensureRows(this.grid.internalRows);
    
    this.addCell(4, 4); // Main hero (2x2)
    this.addCell(2, 2); // Right top (1x1)
    this.addCell(2, 2); // Right middle (1x1)
    this.addCell(4, 2); // Bottom left (2x1)
    this.addCell(2, 2); // Bottom right (1x1)
  }

  loadTemplate(template) {
    this.grid.numCols = template.numCols || 18 / (this.grid.subdivisions || 2);
    this.grid.numRows = template.numRows || 10 / (this.grid.subdivisions || 2);
    this.grid.gridWidth = template.gridWidth || 600;
    this.grid.gridGap = template.gridGap || 12;
    this.grid.cellRadius = template.cellRadius || 8;
    this.grid.nextId = 0;
    this.grid.cellMeta = {};
    this.grid.slotMap = [];
    this.selection.clear();
    
    this.grid.ensureRows(this.grid.internalRows);

    if (template.cells) {
      template.cells.forEach(cell => {
        const id = cell.id || this.makeId();
        if (typeof id === 'string' && id.length === 1) {
            const code = id.charCodeAt(0) - 'a'.charCodeAt(0);
            if (code >= this.grid.nextId) this.grid.nextId = code + 1;
        }
        this.grid.cellMeta[id] = {
          hex: '#d9d9d9', opacity: 1, type: 'color', imageUrl: '',
          imageStyle: { fit: 'cover', position: 'center', scale: 1, offsetX: 0, offsetY: 0 },
          textElements: [], ...cell
        };
        this.grid.claimSlots(id, cell.r, cell.c, cell.rowSpan, cell.colSpan);
      });
    }
  }

  // --- Selection Methods ---
  toggleSelection(id, shiftKey) { this.selection.toggle(id, shiftKey); }
  clearSelection() { this.selection.clear(); }

  // --- Fusion Methods ---
  unionCells(ids) { this.fuse.unionCells(ids); }
  updateFusedClipPaths() { this.fuse.updateFusedClipPaths(); }
  areCellsContiguous(ids) { return utils.areCellsContiguous(ids, this.cellMeta); }
  computeClipPath(...args) { return utils.computeClipPath(...args); }

  // --- Grid Management ---
  syncSlotMap() { this.grid.syncSlotMap(); }
  updateGridDimensions(cols, rows) { this.grid.updateGridDimensions(cols, rows); }

  // --- Displacement ---
  computeDisplacePlan(id, nr, nc) { return this.grid.computeDisplacePlan(id, nr, nc); }
  applyMove(id, r, c, planMoves = []) { this.grid.applyMove(id, r, c, planMoves); }
  planResize(id, newR, newC, newRowSpan, newColSpan) { return this.grid.planResize(id, newR, newC, newRowSpan, newColSpan); }
  applyResize(id, plan) { this.grid.applyResize(id, plan); }

  // --- Responsive ---
  setBreakpoint(breakpoint) {
    this.grid.setBreakpoint(breakpoint);
    if (breakpoint !== 'desktop') this.clearSelection();
  }
  getResponsiveLayout() { return this.grid.getResponsiveLayout(); }
  compactLayout(cells, targetColumns) { return this.grid.compactLayout(cells, targetColumns); }
  getPreviewGridDimensions() { return this.grid.getPreviewGridDimensions(); }
}
