/**
 * Circuit Breaker Pattern implementation for resilient external dependency calls.
 * Protects against cascading failures, hanging connections, and service overload.
 */

export class CircuitBreaker {
  constructor(name, config = {}) {
    this.name = name;
    this.failureThreshold = config.failureThreshold || 3;       // Trip after 3 consecutive failures
    this.recoveryTimeout = config.recoveryTimeout || 10000;     // Stay OPEN for 10s before retry
    this.requestTimeout = config.requestTimeout || 10000;       // Reject hanging calls after 10s
    this.concurrencyLimit = config.concurrencyLimit || 3;       // Max 3 concurrent requests (Bulkhead)

    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.nextAttempt = 0;      // Timestamp when retry is allowed
    this.activeRequests = 0;   // Current active requests for bulkhead concurrency limiting
  }

  /**
   * Transition circuit breaker state
   */
  _transitionTo(newState) {
    if (this.state !== newState) {
      console.log(`[CircuitBreaker:${this.name}] Transitioning from ${this.state} to ${newState}`);
      this.state = newState;
    }
  }

  /**
   * Executes the asynchronous action wrapped in the circuit breaker, timeout, and bulkhead.
   * If degraded or overloaded, immediately fast-fails or executes the fallback.
   */
  async execute(action, fallback = null) {
    const now = Date.now();

    // 1. State Check: If OPEN, see if the recovery window has elapsed
    if (this.state === 'OPEN') {
      if (now >= this.nextAttempt) {
        this._transitionTo('HALF_OPEN');
      } else {
        // Breaker is OPEN and recovery timeout has not passed: fast-fail or fallback
        const fastFailError = new Error(`Circuit breaker is OPEN for service: ${this.name}`);
        if (fallback) {
          console.warn(`[CircuitBreaker:${this.name}] Breaker is OPEN. Executing fallback.`);
          return fallback(fastFailError);
        }
        throw fastFailError;
      }
    }

    // 2. Concurrency Bulkhead: Limit parallel requests
    if (this.activeRequests >= this.concurrencyLimit) {
      const bulkheadError = new Error(`Bulkhead limit reached for service: ${this.name} (Max: ${this.concurrencyLimit})`);
      if (fallback) {
        console.warn(`[CircuitBreaker:${this.name}] Concurrency limit exceeded. Executing fallback.`);
        return fallback(bulkheadError);
      }
      throw bulkheadError;
    }

    this.activeRequests++;

    try {
      // 3. Timeout Wrapper: Race the request against a timer
      let timeoutId;
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`Timeout: Request to ${this.name} exceeded ${this.requestTimeout}ms`));
        }, this.requestTimeout);
      });

      const actionPromise = action().then((result) => {
        clearTimeout(timeoutId);
        return result;
      }).catch((err) => {
        clearTimeout(timeoutId);
        throw err;
      });

      const result = await Promise.race([actionPromise, timeoutPromise]);

      // Success Path
      this.activeRequests--;
      this.failureCount = 0;
      if (this.state === 'HALF_OPEN') {
        this._transitionTo('CLOSED');
      }
      return result;

    } catch (error) {
      // Failure Path
      this.activeRequests--;
      this.failureCount++;
      console.error(`[CircuitBreaker:${this.name}] Request failed (Consecutive failures: ${this.failureCount}): ${error.message}`);

      if (this.state === 'HALF_OPEN' || this.failureCount >= this.failureThreshold) {
        this.nextAttempt = Date.now() + this.recoveryTimeout;
        this._transitionTo('OPEN');
      }

      if (fallback) {
        console.warn(`[CircuitBreaker:${this.name}] Request failed. Executing fallback.`);
        try {
          return await fallback(error);
        } catch (fallbackErr) {
          throw new Error(`Fallback execution failed: ${fallbackErr.message}. Original error: ${error.message}`);
        }
      }
      throw error;
    }
  }
}

// Global registry of circuit breakers to persist states across hook updates
const breakersRegistry = {};

export const getCircuitBreaker = (name, config = {}) => {
  if (!breakersRegistry[name]) {
    breakersRegistry[name] = new CircuitBreaker(name, config);
  }
  return breakersRegistry[name];
};

export default getCircuitBreaker;
