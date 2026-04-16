/**
 * Clip-path utility functions for Bento Grid
 */

/**
 * Computes a CSS clip-path polygon for a fused region of cells.
 * 
 * @param {Set<string>|Array<string>} fusedSlots Set of "r,c" strings representing slots in the fused region
 * @param {number} minR Minimum row index of the bounding box
 * @param {number} minC Minimum column index of the bounding box
 * @param {number} spanRows Number of rows the bounding box spans
 * @param {number} spanCols Number of columns the bounding box spans
 * @param {number} radiusPx Corner radius in pixels
 * @param {number} cellWidthPx Total width of the bounding box in pixels
 * @param {number} cellHeightPx Total height of the bounding box in pixels
 * @returns {string} CSS clip-path value (polygon)
 */
export function computeClipPath(fusedSlots, minR, minC, spanRows, spanCols, radiusPx = 0, cellWidthPx = 0, cellHeightPx = 0) {
    const slots = Array.isArray(fusedSlots) ? new Set(fusedSlots) : fusedSlots;
    
    // Build a boolean grid for the fused region (relative to bounding box)
    const grid = Array.from({ length: spanRows }, () => new Array(spanCols).fill(false));
    for (const key of slots) {
      const [r, c] = key.split(',').map(Number);
      if (grid[r - minR]) grid[r - minR][c - minC] = true;
    }

    // March the border: find all edge segments between filled/empty cells
    const edges = [];
    for (let r = 0; r < spanRows; r++) {
      for (let c = 0; c < spanCols; c++) {
        if (!grid[r][c]) continue;
        // Top edge
        if (r === 0 || !grid[r - 1][c]) edges.push({ x1: c, y1: r, x2: c + 1, y2: r });
        // Bottom edge
        if (r === spanRows - 1 || !grid[r + 1][c]) edges.push({ x1: c + 1, y1: r + 1, x2: c, y2: r + 1 });
        // Left edge
        if (c === 0 || !grid[r][c - 1]) edges.push({ x1: c, y1: r + 1, x2: c, y2: r });
        // Right edge
        if (c === spanCols - 1 || !grid[r][c + 1]) edges.push({ x1: c + 1, y1: r, x2: c + 1, y2: r + 1 });
      }
    }

    if (edges.length === 0) return '';
    
    // Chain edges into a polygon path
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
      if (!found) break;
    }

    // Convert radius from pixels to percentage of the bounding box
    const radiusXPct = cellWidthPx > 0 ? (radiusPx / cellWidthPx) * 100 : 0;
    const radiusYPct = cellHeightPx > 0 ? (radiusPx / cellHeightPx) * 100 : 0;
    
    const cellWidthPct = 100 / spanCols;
    const cellHeightPct = 100 / spanRows;
    const maxRadiusXPct = Math.min(radiusXPct, cellWidthPct / 2);
    const maxRadiusYPct = Math.min(radiusYPct, cellHeightPct / 2);

    if (radiusPx === 0 || cellWidthPx === 0 || cellHeightPx === 0) {
      const points = ordered.map(e => {
        const px = (e.x1 / spanCols * 100).toFixed(2);
        const py = (e.y1 / spanRows * 100).toFixed(2);
        return `${px}% ${py}%`;
      });
      return `polygon(${points.join(', ')})`;
    }

    const roundedPoints = [];
    const numArcSegments = 4;

    for (let i = 0; i < ordered.length; i++) {
      const curr = ordered[i];
      const next = ordered[(i + 1) % ordered.length];
      
      const cornerX = curr.x2 / spanCols * 100;
      const cornerY = curr.y2 / spanRows * 100;
      
      const currDx = curr.x2 - curr.x1;
      const currDy = curr.y2 - curr.y1;
      const nextDx = next.x2 - next.x1;
      const nextDy = next.y2 - next.y1;
      
      const offsetX = maxRadiusXPct * (currDx !== 0 ? -currDx / Math.abs(currDx) : 0);
      const offsetY = maxRadiusYPct * (currDy !== 0 ? -currDy / Math.abs(currDy) : 0);
      const offsetNextX = maxRadiusXPct * (nextDx !== 0 ? nextDx / Math.abs(nextDx) : 0);
      const offsetNextY = maxRadiusYPct * (nextDy !== 0 ? nextDy / Math.abs(nextDy) : 0);
      
      const startX = cornerX + offsetX;
      const startY = cornerY + offsetY;
      const endX = cornerX + offsetNextX;
      const endY = cornerY + offsetNextY;
      
      roundedPoints.push(`${startX.toFixed(2)}% ${startY.toFixed(2)}%`);
      
      for (let j = 1; j < numArcSegments; j++) {
        const t = j / numArcSegments;
        const arcX = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * cornerX + t * t * endX;
        const arcY = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * cornerY + t * t * endY;
        roundedPoints.push(`${arcX.toFixed(2)}% ${arcY.toFixed(2)}%`);
      }
      
      roundedPoints.push(`${endX.toFixed(2)}% ${endY.toFixed(2)}%`);
    }

    return `polygon(${roundedPoints.join(', ')})`;
}

/**
 * Checks if a set of cells are contiguous on the grid
 * 
 * @param {Array<string>} ids Array of cell IDs
 * @param {Object} cellMeta Metadata for all cells
 * @returns {boolean} True if cells are contiguous
 */
export function areCellsContiguous(ids, cellMeta) {
    if (ids.length < 2) return true;
    const idSet = new Set(ids);
    
    // Collect all grid slots belonging to these cells
    const slots = new Set();
    for (const id of idSet) {
      const meta = cellMeta[id];
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
      for (const [nr, nc] of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]) {
        const nk = `${nr},${nc}`;
        if (slots.has(nk) && !visited.has(nk)) {
          visited.add(nk);
          queue.push(nk);
        }
      }
    }

    return visited.size === slots.size;
}
