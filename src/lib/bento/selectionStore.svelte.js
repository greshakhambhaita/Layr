/**
 * Selection Store for Bento Grid
 */
export class SelectionStore {
  selectedCellIds = $state(new Set());

  get selectedCellId() {
    if (this.selectedCellIds.size === 1) return [...this.selectedCellIds][0];
    return null;
  }

  get size() {
    return this.selectedCellIds.size;
  }

  has(id) {
    return this.selectedCellIds.has(id);
  }

  toggle(id, shiftKey) {
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

  clear() {
    this.selectedCellIds = new Set();
  }

  set(ids) {
    this.selectedCellIds = new Set(ids);
  }
}
