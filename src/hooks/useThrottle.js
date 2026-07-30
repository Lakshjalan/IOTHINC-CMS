import { useRef, useCallback } from 'react';

/**
 * A custom hook to throttle UI actions (like button clicks) to prevent spamming.
 * @param {Function} callback - The function to throttle
 * @param {number} delay - The delay in milliseconds
 * @returns {Function} - The throttled function
 */
export function useThrottle(callback, delay = 1000) {
  const isThrottled = useRef(false);

  return useCallback((...args) => {
    if (isThrottled.current) {
      return;
    }
    callback(...args);
    isThrottled.current = true;
    setTimeout(() => {
      isThrottled.current = false;
    }, delay);
  }, [callback, delay]);
}
