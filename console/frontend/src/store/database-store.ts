import { DatabaseItem } from '@/types/database';
import { create } from 'zustand';
const databaseStore = create<{
  database: DatabaseItem;
  setDatabase: (val: DatabaseItem) => void;
}>((set, get) => ({
  database: {} as DatabaseItem,
  setDatabase: (val: DatabaseItem): void => {
    set({
      database: val,
    });
  },
}));
export default databaseStore;
