/**
 * useGeolocation Hook
 * Provides GPS location access
 */

import { useState, useCallback } from 'react';

export interface GeolocationCoords {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number | null;
  altitudeAccuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
}

export interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

export function useGeolocation(options: GeolocationOptions = {}) {
  const [coords, setCoords] = useState<GeolocationCoords | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Check if geolocation is available
  const isGeolocationAvailable = useCallback(() => {
    return !!navigator.geolocation;
  }, []);

  // Get current position
  const getCurrentPosition = useCallback(async (): Promise<GeolocationCoords | null> => {
    if (!isGeolocationAvailable()) {
      setError('Geolocation not available on this device');
      return null;
    }

    setLoading(true);
    setError(null);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: GeolocationCoords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            altitudeAccuracy: position.coords.altitudeAccuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
          };
          
          setCoords(coords);
          setLoading(false);
          resolve(coords);
        },
        (err) => {
          console.error('Geolocation error:', err);
          let errorMessage = 'Failed to get location';
          
          switch (err.code) {
            case err.PERMISSION_DENIED:
              errorMessage = 'Location permission denied. Please enable location access.';
              break;
            case err.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable.';
              break;
            case err.TIMEOUT:
              errorMessage = 'Location request timed out.';
              break;
          }
          
          setError(errorMessage);
          setLoading(false);
          resolve(null);
        },
        {
          enableHighAccuracy: options.enableHighAccuracy !== false,
          timeout: options.timeout || 10000,
          maximumAge: options.maximumAge || 0,
        }
      );
    });
  }, [options.enableHighAccuracy, options.timeout, options.maximumAge, isGeolocationAvailable]);

  // Watch position (continuous tracking)
  const watchPosition = useCallback((callback: (coords: GeolocationCoords) => void) => {
    if (!isGeolocationAvailable()) {
      setError('Geolocation not available on this device');
      return null;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const coords: GeolocationCoords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          altitudeAccuracy: position.coords.altitudeAccuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
        };
        
        setCoords(coords);
        callback(coords);
      },
      (err) => {
        console.error('Geolocation watch error:', err);
        setError('Failed to track location');
      },
      {
        enableHighAccuracy: options.enableHighAccuracy !== false,
        timeout: options.timeout || 10000,
        maximumAge: options.maximumAge || 0,
      }
    );

    return watchId;
  }, [options, isGeolocationAvailable]);

  // Clear watch
  const clearWatch = useCallback((watchId: number) => {
    if (navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  return {
    coords,
    error,
    loading,
    isGeolocationAvailable: isGeolocationAvailable(),
    getCurrentPosition,
    watchPosition,
    clearWatch,
  };
}

