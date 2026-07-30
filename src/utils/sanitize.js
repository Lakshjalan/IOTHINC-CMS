/**
 * sanitize.js — centralised input sanitization helpers.
 *
 * Rules applied here:
 *  1. Always return a primitive of the expected type (string / number / null).
 *  2. Trim whitespace from all string inputs.
 *  3. Strip every character that is meaningless control-noise (NUL bytes,
 *     ANSI escape sequences, zero-width joiners, etc.).
 *  4. Cap strings at caller-supplied length limits so the DB trigger is a
 *     last-resort backstop, not the first line of defence.
 *  5. Validate emails and URLs with simple but effective regexes.
 *  6. Clamp numerics into caller-supplied [min, max] ranges.
 *
 * NOTE: React JSX already escapes HTML in `{variable}` expressions, so
 * explicit HTML entity escaping is not required for rendering.
 * However, any value that could be placed into a non-JSX context (e.g.
 * a `.or()` filter string built by concatenation) MUST go through the
 * relevant helper below before use.
 */

// ---------------------------------------------------------------------------
// Regex constants
// ---------------------------------------------------------------------------

/** Strips NUL bytes, ANSI escape codes and zero-width Unicode characters. */
const CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F\u200B-\u200D\uFEFF\u2028\u2029]/g;

/** Very permissive email regex — catches blatant non-email strings. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Accepts http:// and https:// URLs only. */
const URL_RE = /^https?:\/\/.{2,}/;

/** UUID v4 — used to validate ID-type query parameters before using them
 *  inside Supabase filter strings (.eq / .or) to prevent injection. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------------------
// Core helpers
// ---------------------------------------------------------------------------

/**
 * Sanitize a free-text string.
 * @param {any}    value    Raw user input
 * @param {number} maxLen   Maximum allowed character length (default 1000)
 * @returns {string}        Clean, trimmed string — never null/undefined
 */
export const sanitizeString = (value, maxLen = 1000) => {
  if (value === null || value === undefined) return '';
  const str = String(value)
    .replace(CONTROL_CHARS, '') // strip dangerous control chars
    .trim();
  return str.slice(0, maxLen);
};

/**
 * Sanitize a short name or title (255 chars max by default).
 */
export const sanitizeName = (value, maxLen = 255) =>
  sanitizeString(value, maxLen);

/**
 * Sanitize a longer textarea / description (5000 chars max by default).
 */
export const sanitizeText = (value, maxLen = 5000) =>
  sanitizeString(value, maxLen);

/**
 * Validate and return an email address, or null if invalid.
 * @param {any} value
 * @returns {string|null}
 */
export const sanitizeEmail = (value) => {
  const str = sanitizeString(value, 255).toLowerCase();
  return EMAIL_RE.test(str) ? str : null;
};

/**
 * Validate and return a URL (http/https only), or null if invalid.
 * @param {any} value
 * @returns {string|null}
 */
export const sanitizeUrl = (value) => {
  const str = sanitizeString(value, 2048);
  return URL_RE.test(str) ? str : null;
};

/**
 * Clamp a numeric value into [min, max], returning null if the input
 * cannot be parsed as a finite number.
 * @param {any}    value
 * @param {number} min
 * @param {number} max
 * @returns {number|null}
 */
export const sanitizeNumber = (value, min = 0, max = Number.MAX_SAFE_INTEGER) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(Math.max(n, min), max);
};

/**
 * Validate that a value is a proper UUID (v4 format).
 * Use this before interpolating IDs into Supabase .or() / .eq() filter
 * strings to prevent injection via URL query parameters.
 * @param {any} value
 * @returns {string|null}  The original string if valid, null otherwise
 */
export const sanitizeUUID = (value) => {
  if (!value) return null;
  const str = String(value).trim();
  return UUID_RE.test(str) ? str : null;
};

/**
 * Sanitize an array of string tags / skills.
 * Each element is trimmed, deduped, and capped at maxItemLen characters.
 * @param {any[]} arr
 * @param {number} maxItems
 * @param {number} maxItemLen
 * @returns {string[]}
 */
export const sanitizeStringArray = (arr, maxItems = 50, maxItemLen = 100) => {
  if (!Array.isArray(arr)) return [];
  const seen = new Set();
  return arr
    .map(item => sanitizeString(item, maxItemLen))
    .filter(item => {
      if (!item || seen.has(item)) return false;
      seen.add(item);
      return true;
    })
    .slice(0, maxItems);
};

/**
 * Sanitize a date string: accepts ISO 8601 strings or Date objects.
 * Returns an ISO string or null if invalid.
 * @param {any} value
 * @returns {string|null}
 */
export const sanitizeDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

/**
 * Ensure an enum-type value is one of the permitted options.
 * Returns the matched option or null.
 * @param {any}      value
 * @param {string[]} allowed
 * @returns {string|null}
 */
export const sanitizeEnum = (value, allowed) => {
  const str = sanitizeString(value, 100);
  return allowed.includes(str) ? str : null;
};
