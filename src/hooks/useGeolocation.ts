import { useState, useCallback } from 'react';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  error: string | null;
  isLoading: boolean;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null,
    isLoading: false,
  });

  const getCurrentPosition = useCallback(
    (): Promise<GeolocationState> => {
      return new Promise((resolve) => {
        if (!navigator.geolocation) {
          const errorState: GeolocationState = {
            ...state,
            error: 'Geolocation is not supported by your browser',
          };
          setState(errorState);
          resolve(errorState);
          return;
        }

        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        navigator.geolocation.getCurrentPosition(
          (position) => {
            const newState: GeolocationState = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              error: null,
              isLoading: false,
            };
            setState(newState);
            resolve(newState);
          },
          (error) => {
            let errorMessage = 'Unable to retrieve location';
            switch (error.code) {
              case error.PERMISSION_DENIED:
                errorMessage = 'Location permission denied';
                break;
              case error.POSITION_UNAVAILABLE:
                errorMessage = 'Location information unavailable';
                break;
              case error.TIMEOUT:
                errorMessage = 'Location request timed out';
                break;
            }
            const errorState: GeolocationState = {
              ...state,
              error: errorMessage,
              isLoading: false,
            };
            setState(errorState);
            resolve(errorState);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000,
          }
        );
      });
    },
    [state]
  );

  return {
    ...state,
    getCurrentPosition,
  };
}
