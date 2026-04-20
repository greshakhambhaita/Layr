/**
 * Simple Undo/Redo History Manager for Bento State
 */
export class HistoryManager {
  stack = $state([]);
  index = $state(-1);
  maxSize = 50;

  push(state) {
    // Stringify to deep clone
    const snapshot = JSON.stringify(state);
    
    // If we're pushing a new state after undoing, truncate the redo stack
    if (this.index < this.stack.length - 1) {
      this.stack = this.stack.slice(0, this.index + 1);
    }

    this.stack.push(snapshot);
    if (this.stack.length > this.maxSize) {
      this.stack.shift();
    } else {
      this.index++;
    }
  }

  undo() {
    if (this.index > 0) {
      this.index--;
      return JSON.parse(this.stack[this.index]);
    }
    return null;
  }

  redo() {
    if (this.index < this.stack.length - 1) {
      this.index++;
      return JSON.parse(this.stack[this.index]);
    }
    return null;
  }
}
