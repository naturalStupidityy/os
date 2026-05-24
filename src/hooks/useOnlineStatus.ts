import { useEffect, useState } from 'react';
import { useSyncStore } from '@/stores/syncStore';

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const syncStore = useSyncStore();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncStore.setIsOnline(true);
      // Trigger sync when coming back online
      syncStore.syncAll();
    };

    const handleOffline = () => {
      setIsOnline(false);
      syncStore.setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncStore]);

  return isOnline;
}
