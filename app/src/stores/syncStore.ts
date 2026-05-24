import { create } from 'zustand';

interface SyncItem {
  id: string;
  status: string;
}

interface SyncState {
  queue: SyncItem[];
  isSyncing: boolean;
  setIsOnline: (online: boolean) => void;
  syncAll: () => Promise<void>;
}

export const useSyncStore = create<SyncState>((set) => ({
  queue: [],
  isSyncing: false,
  setIsOnline: () => {},
  syncAll: async () => {
    set({ isSyncing: true });
    await new Promise((r) => setTimeout(r, 500));
    set({ isSyncing: false });
  },
}));
