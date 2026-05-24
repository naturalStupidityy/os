import { useState, useCallback } from 'react';

interface CameraPermissionState {
  permission: 'prompt' | 'granted' | 'denied' | 'unknown';
  isRequesting: boolean;
  error: string | null;
}

export function useCameraPermission() {
  const [state, setState] = useState<CameraPermissionState>({
    permission: 'unknown',
    isRequesting: false,
    error: null,
  });

  const checkPermission = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setState({ permission: 'denied', isRequesting: false, error: 'Camera not supported' });
        return 'denied' as const;
      }

      // Check current permission state using Permissions API if available
      if (navigator.permissions?.query) {
        const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
        setState((prev) => ({ ...prev, permission: result.state as 'granted' | 'denied' | 'prompt' }));
        return result.state as 'granted' | 'denied' | 'prompt';
      }

      return 'unknown' as const;
    } catch {
      return 'unknown' as const;
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    setState((prev) => ({ ...prev, isRequesting: true, error: null }));

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera is not supported on this device');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      
      // Stop all tracks immediately - we just needed permission
      stream.getTracks().forEach((track) => track.stop());

      setState({ permission: 'granted', isRequesting: false, error: null });
      return true;
    } catch (error) {
      let errorMessage = 'Failed to access camera';
      
      if (error instanceof DOMException) {
        switch (error.name) {
          case 'NotAllowedError':
          case 'PermissionDeniedError':
            errorMessage = 'Camera permission denied. Please enable camera access in your browser settings.';
            setState({ permission: 'denied', isRequesting: false, error: errorMessage });
            return false;
          case 'NotFoundError':
            errorMessage = 'No camera found on this device';
            break;
          case 'NotReadableError':
            errorMessage = 'Camera is already in use by another application';
            break;
        }
      }

      setState({ permission: 'denied', isRequesting: false, error: errorMessage });
      return false;
    }
  }, []);

  return {
    ...state,
    checkPermission,
    requestPermission,
  };
}
