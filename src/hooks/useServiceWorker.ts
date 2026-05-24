import { useEffect, useState, useCallback } from 'react';

interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isUpdateAvailable: boolean;
  isOfflineReady: boolean;
  update: () => void;
}

export function useServiceWorker(): ServiceWorkerState {
  const [isRegistered, setIsRegistered] = useState(false);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [isOfflineReady, setIsOfflineReady] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  const isSupported = typeof window !== 'undefined' && 'serviceWorker' in navigator;

  useEffect(() => {
    if (!isSupported) return;

    const handleControllerChange = () => {
      window.location.reload();
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OFFLINE_READY') {
        setIsOfflineReady(true);
      }
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    navigator.serviceWorker.addEventListener('message', handleMessage);

    // Check for existing registration
    navigator.serviceWorker.ready.then(() => {
      setIsRegistered(true);
    });

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, [isSupported]);

  // Listen for new service worker waiting
  useEffect(() => {
    if (!isSupported) return;

    const handleUpdate = (registration: ServiceWorkerRegistration) => {
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setIsUpdateAvailable(true);
            setWaitingWorker(newWorker);
          }
        });
      });
    };

    navigator.serviceWorker.getRegistration().then((registration) => {
      if (registration) {
        handleUpdate(registration);
      }
    });
  }, [isSupported]);

  const update = useCallback(() => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }
  }, [waitingWorker]);

  return {
    isSupported,
    isRegistered,
    isUpdateAvailable,
    isOfflineReady,
    update,
  };
}

// ===== PWA Install Hook =====

interface PWAInstallState {
  isInstallable: boolean;
  isInstalled: boolean;
  promptInstall: () => Promise<boolean>;
}

export function usePWAInstall(): PWAInstallState {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = async (): Promise<boolean> => {
    if (!deferredPrompt) return false;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return outcome === 'accepted';
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    promptInstall,
  };
}

// Type for BeforeInstallPromptEvent
declare global {
  interface WindowEventMap {
    beforeinstallprompt: Event;
    appinstalled: Event;
  }
  interface BeforeInstallPromptEvent extends Event {
    prompt: () => void;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  }
}
