import type { BentoStore } from './bentoStore.svelte.js';

interface BentoCell {
  id: string;
  type: string;
  imageUrl?: string;
  [key: string]: any;
}

export function serializeGrid(store: BentoStore) {
  const cells = (Object.values(store.cellMeta) as BentoCell[]).map((cell) => {
    const serializedCell = { ...cell };

    if (cell.type === 'image' && cell.imageUrl) {
      if (cell.imageUrl.startsWith('blob:')) {
        // Blob URLs are ephemeral browser-only references — can't be stored
        serializedCell.imageUrl = `./assets/bento-${cell.id}.jpg`;
        serializedCell.hasImage = true;
        serializedCell.imageLost = true;
      }
      // base64 data: URLs are kept as-is — CLI will extract and save them as files
    }

    return serializedCell;
  });

  return {
    nickname: "", // To be filled by server
    createdAt: new Date().toISOString(),
    grid: {
      cols: store.numCols * 2,
      rows: store.numRows * 2,
      gap: store.gridGap,
      cellRadius: store.cellRadius,
      width: store.gridWidth,
      height: (store.grid as any).gridHeight || 600
    },
    cells
  };
}
