/**
 * Reusable utility to transform Supabase storage URLs and Google user content URLs.
 * If Supabase image transformation is not supported (e.g. Free Tier),
 * this falls back safely to the original un-transformed public URLs.
 */

export function getOptimizedImageUrl(url, { width, height, quality = 75 } = {}) {
  if (!url || typeof url !== 'string') return url

  // Safely pass through all URLs as-is to prevent 404s/broken images on Supabase Free Tier
  // and googleusercontent URLs that do not support suffix resizing.
  // Explicit width/height attributes on the <img> elements will still prevent Cumulative Layout Shift (CLS).
  return url
}
