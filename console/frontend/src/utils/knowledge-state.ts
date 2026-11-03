import type { Dispatch, SetStateAction } from 'react';

// Publish server-confirmed changes to both views; rejected requests leave state untouched.
export async function commitChunkChange<
  T extends { id: string },
  C extends T | null,
>(
  id: string,
  request: () => Promise<T>,
  setChunks: Dispatch<SetStateAction<T[]>>,
  setCurrentChunk: Dispatch<SetStateAction<C>>
): Promise<void> {
  const updated = await request();
  setChunks(previous =>
    previous.map(item => (item.id === id ? { ...item, ...updated } : item))
  );
  setCurrentChunk(previous =>
    previous?.id === id ? { ...previous, ...updated } : previous
  );
}
