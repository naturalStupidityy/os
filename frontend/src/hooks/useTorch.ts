import { useState, useCallback } from 'react';

interface TorchState {
  isSupported: boolean;
  isOn: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useTorch(videoTrack?: MediaStreamTrack | null) {
  const [state, setState] = useState<TorchState>({
    isSupported: false,
    isOn: false,
    isLoading: false,
    error: null,
  });

  const checkSupport = useCallback(() => {
    if (!videoTrack) {
      setState((prev) => ({ ...prev, isSupported: false }));
      return false;
    }

    const capabilities = videoTrack.getCapabilities();
    const supported = 'torch' in capabilities;
    setState((prev) => ({ ...prev, isSupported: supported }));
    return supported;
  }, [videoTrack]);

  const toggleTorch = useCallback(async () => {
    if (!videoTrack) {
      setState((prev) => ({ ...prev, error: 'No video track available' }));
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const newState = !state.isOn;
      
      await videoTrack.applyConstraints({
        advanced: [{ torch: newState } as MediaTrackConstraintSet],
      });

      setState((prev) => ({
        ...prev,
        isOn: newState,
        isLoading: false,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to toggle torch',
      }));
    }
  }, [videoTrack, state.isOn]);

  const turnOff = useCallback(async () => {
    if (!videoTrack || !state.isOn) return;

    try {
      await videoTrack.applyConstraints({
        advanced: [{ torch: false } as MediaTrackConstraintSet],
      });
      setState((prev) => ({ ...prev, isOn: false }));
    } catch {
      // Silently fail when turning off
    }
  }, [videoTrack, state.isOn]);

  return {
    ...state,
    checkSupport,
    toggleTorch,
    turnOff,
  };
}
