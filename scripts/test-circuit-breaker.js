import { CircuitBreaker } from '../src/lib/circuitBreaker.js';

// Helper to delay execution
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTests() {
  console.log('=== STARTING CIRCUIT BREAKER RESILIENCE TESTS ===\n');

  const config = {
    failureThreshold: 3,
    recoveryTimeout: 2000, // 2s recovery timeout for quick tests
    requestTimeout: 1000,  // 1s request timeout
    concurrencyLimit: 2    // Max 2 concurrent requests
  };

  const cb = new CircuitBreaker('test-service', config);

  // Helper mock actions
  const successAction = async () => {
    await sleep(100);
    return 'SUCCESS';
  };

  const slowAction = async () => {
    await sleep(2000); // Exceeds requestTimeout (1s)
    return 'SLOW_SUCCESS';
  };

  const failingAction = async () => {
    await sleep(100);
    throw new Error('NETWORK_FAILURE');
  };

  const fallbackFn = async (err) => {
    return `FALLBACK_VALUE: ${err.message}`;
  };

  // -------------------------------------------------------------
  // Test 1: Normal execution
  // -------------------------------------------------------------
  console.log('Test 1: Executing successful action...');
  let res = await cb.execute(successAction);
  console.log(`Result: ${res} (Expected: SUCCESS), Breaker state: ${cb.state}\n`);

  // -------------------------------------------------------------
  // Test 2: Timeout Trip
  // -------------------------------------------------------------
  console.log('Test 2: Executing slow action (should timeout)...');
  try {
    await cb.execute(slowAction);
    console.error('FAIL: Request should have timed out!');
  } catch (err) {
    console.log(`Caught expected timeout: ${err.message}, Breaker state: ${cb.state}\n`);
  }

  // -------------------------------------------------------------
  // Test 3: Failure Threshold and Tripping
  // -------------------------------------------------------------
  console.log('Test 3: Tracing consecutive failures to trip breaker...');
  // Currently failureCount = 1 (from timeout). Let's fail 2 more times to hit failureThreshold (3)
  for (let i = 0; i < 2; i++) {
    try {
      await cb.execute(failingAction);
    } catch (err) {
      console.log(`Failed run ${i + 1}: ${err.message}, Breaker state: ${cb.state}`);
    }
  }
  console.log(`Breaker state after 3 failures: ${cb.state} (Expected: OPEN)\n`);

  // -------------------------------------------------------------
  // Test 4: Fast failing in OPEN state
  // -------------------------------------------------------------
  console.log('Test 4: Requesting while breaker is OPEN...');
  try {
    await cb.execute(successAction);
    console.error('FAIL: Should have fast-failed immediately!');
  } catch (err) {
    console.log(`Fast-failed with expected error: ${err.message}`);
  }

  // Try with fallback in OPEN state
  const fallbackRes = await cb.execute(successAction, fallbackFn);
  console.log(`Executed fallback under OPEN breaker: ${fallbackRes}\n`);

  // -------------------------------------------------------------
  // Test 5: Recovery and transition to CLOSED
  // -------------------------------------------------------------
  console.log('Test 5: Waiting for recovery window to elapse (2.2s)...');
  await sleep(2200);
  console.log(`Executing successful request in HALF_OPEN state...`);
  res = await cb.execute(successAction);
  console.log(`Result: ${res} (Expected: SUCCESS), Breaker state: ${cb.state} (Expected: CLOSED)\n`);

  // -------------------------------------------------------------
  // Test 6: Bulkhead Concurrency Limiter
  // -------------------------------------------------------------
  console.log('Test 6: Testing Concurrency Bulkhead limit (Max 2)...');
  const delayedAction = async (id) => {
    await sleep(500);
    return `Task ${id}`;
  };

  // Launch 3 concurrent requests (Limit is 2)
  const p1 = cb.execute(() => delayedAction(1));
  const p2 = cb.execute(() => delayedAction(2));
  let p3Error = null;
  
  try {
    await cb.execute(() => delayedAction(3));
  } catch (err) {
    p3Error = err;
  }

  const results = await Promise.all([p1, p2]);
  console.log(`Concurrent results: ${results.join(', ')}`);
  console.log(`3rd concurrent call rejected (expected): ${p3Error ? p3Error.message : 'FAIL: No error'}`);
  console.log(`Current active requests: ${cb.activeRequests}, Breaker state: ${cb.state}\n`);

  console.log('=== ALL CIRCUIT BREAKER TESTS COMPLETED ===');
}

runTests().catch(console.error);
