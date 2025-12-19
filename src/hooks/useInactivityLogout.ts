import { useEffect, useRef } from 'react';

/**
 * Hook to auto-logout users after a period of inactivity
 * Tracks mouse movement, keyboard input, clicks, and touch events
 * Resets the timer on any user activity
 * 
 * @param timeoutMinutes - Minutes of inactivity before auto-logout (default: 30)
 * @param onTimeout - Callback function to execute when timeout occurs
 */
export function useInactivityLogout(
  timeoutMinutes: number = 30,
  onTimeout: () => void
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(0);

  useEffect(() => {
    lastActivityRef.current = Date.now();

    // Reset the inactivity timer
    const resetTimer = () => {
      lastActivityRef.current = Date.now();
      
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout
      timeoutRef.current = setTimeout(() => {
        console.log('[Inactivity] User inactive for', timeoutMinutes, 'minutes. Logging out...');
        onTimeout();
      }, timeoutMinutes * 60 * 1000);
    };

    // Activity event handler
    const handleActivity = () => {
      // Throttle: only reset timer if last activity was more than 1 second ago
      const now = Date.now();
      if (now - lastActivityRef.current > 1000) {
        console.log('[Inactivity] User activity detected, resetting timer');
        resetTimer();
      }
    };

    // Events that indicate user activity
    const events = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'click'
    ];

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Initialize timer
    resetTimer();

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [timeoutMinutes, onTimeout]);
}





