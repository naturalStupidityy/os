import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { SyncQueueItem, SyncOperation } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface SyncStore {
  // Data
  queue: SyncQueueItem[];
  isSyncing: boolean;
  lastSyncTime: string | null;
  isOnline: boolean;
  
  // Actions
  addToQueue: (operation: SyncOperation, entity: string, payload: Record<string, unknown>) => string;
  removeFromQueue: (id: string) => void;
  markAsSyncing: (id: string) => void;
  markAsCompleted: (id: string) => void;
  markAsFailed: (id: string, error: string) => void;
  retryItem: (id: string) => void;
  
  // Sync actions
  setIsSyncing: (syncing: boolean) => void;
  setIsOnline: (online: boolean) => void;
  setLastSyncTime: (time: string) => void;
  syncAll: () => Promise<boolean>;
  clearCompleted: () => void;
  
  // Getters
  getPendingCount: () => number;
  getFailedCount: () => number;
  getPendingItems: () => SyncQueueItem[];
  getFailedItems: () => SyncQueueItem[];
}

const MAX_RETRIES = 3;

export const useSyncStore = create<SyncStore>()(
  persist(
    (set, get) => ({
      // Initial state
      queue: [],
      isSyncing: false,
      lastSyncTime: null,
      isOnline: true,

      // Add item to queue
      addToQueue: (operation, entity, payload) => {
        const id = uuidv4();
        const item: SyncQueueItem = {
          id,
          operation,
          entity,
          payload,
          status: 'pending',
          retryCount: 0,
          maxRetries: MAX_RETRIES,
          createdAt: new Date().toISOString(),
        };
        
        set((state) => ({
          queue: [...state.queue, item],
        }));
        
        return id;
      },

      // Remove item from queue
      removeFromQueue: (id) => {
        set((state) => ({
          queue: state.queue.filter((item) => item.id !== id),
        }));
      },

      // Mark item as syncing
      markAsSyncing: (id) => {
        set((state) => ({
          queue: state.queue.map((item) =>
            item.id === id
              ? { ...item, status: 'syncing' as const, lastAttemptAt: new Date().toISOString() }
              : item
          ),
        }));
      },

      // Mark item as completed
      markAsCompleted: (id) => {
        set((state) => ({
          queue: state.queue.map((item) =>
            item.id === id ? { ...item, status: 'completed' as const } : item
          ),
        }));
      },

      // Mark item as failed
      markAsFailed: (id, error) => {
        set((state) => ({
          queue: state.queue.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: 'failed' as const,
                  retryCount: item.retryCount + 1,
                  error,
                  lastAttemptAt: new Date().toISOString(),
                }
              : item
          ),
        }));
      },

      // Retry a failed item
      retryItem: (id) => {
        set((state) => ({
          queue: state.queue.map((item) =>
            item.id === id
              ? { ...item, status: 'pending' as const, error: undefined }
              : item
          ),
        }));
      },

      // Set syncing state
      setIsSyncing: (syncing) => set({ isSyncing: syncing }),

      // Set online state
      setIsOnline: (online) => set({ isOnline: online }),

      // Set last sync time
      setLastSyncTime: (time) => set({ lastSyncTime: time }),

      // Sync all pending items
      syncAll: async () => {
        const { queue, isOnline } = get();
        
        if (!isOnline || queue.filter((q) => q.status === 'pending').length === 0) {
          return true;
        }

        set({ isSyncing: true });
        
        try {
          // Dynamically import to avoid circular dependency
          const { default: api } = await import('@/lib/api');
          const pendingItems = queue.filter((item) => item.status === 'pending');
          
          for (const item of pendingItems) {
            get().markAsSyncing(item.id);
            
            try {
              // Call appropriate API based on entity and operation
              switch (item.entity) {
                case 'check_in':
                  await api.attendance.checkIn(item.payload as unknown as import('@/types').CheckInPayload);
                  break;
                case 'exam_submit':
                  await api.exam.submitExam(
                    item.payload.examId as string,
                    item.payload.answers as Record<string, string>
                  );
                  break;
                default:
                  // Generic sync endpoint
                  await api.sync.syncItems([item]);
              }
              
              get().markAsCompleted(item.id);
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : 'Sync failed';
              get().markAsFailed(item.id, errorMsg);
            }
          }
          
          set({
            isSyncing: false,
            lastSyncTime: new Date().toISOString(),
          });
          
          return true;
        } catch {
          set({ isSyncing: false });
          return false;
        }
      },

      // Clear completed items
      clearCompleted: () => {
        set((state) => ({
          queue: state.queue.filter((item) => item.status !== 'completed'),
        }));
      },

      // Getters
      getPendingCount: () => {
        return get().queue.filter((item) => item.status === 'pending').length;
      },

      getFailedCount: () => {
        return get().queue.filter((item) => item.status === 'failed').length;
      },

      getPendingItems: () => {
        return get().queue.filter((item) => item.status === 'pending');
      },

      getFailedItems: () => {
        return get().queue.filter((item) => item.status === 'failed');
      },
    }),
    {
      name: 'vkumb_sync_queue',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        queue: state.queue,
        lastSyncTime: state.lastSyncTime,
      }),
    }
  )
);
