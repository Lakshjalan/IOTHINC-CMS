// src/utils/logger.js
// Simple client-side logger that forwards error details to a server endpoint.

export async function logError(error) {
  try {
    const payload = {
      message: error?.message || String(error),
      stack: error?.stack || null,
      url: window.location.href,
    };
    await fetch('/api/log-client-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.warn('Failed to log client error', e);
  }
}
