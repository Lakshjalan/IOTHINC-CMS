/**
 * Utility to throttle async functions (e.g., API calls) to prevent them from
 * being called multiple times rapidly in succession.
 * @param {Function} fn - The async function to throttle
 * @param {number} delay - The cooldown period in milliseconds
 * @returns {Function} - The throttled async function
 */
export const throttleAsync = (fn, delay = 1000) => {
  let isThrottled = false;
  
  return async (...args) => {
    if (isThrottled) {
      console.warn('Action throttled: please wait before trying again.');
      return;
    }
    
    isThrottled = true;
    try {
      return await fn(...args);
    } finally {
      setTimeout(() => {
        isThrottled = false;
      }, delay);
    }
  };
};
