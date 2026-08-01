import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'

/**
 * Cache System
 *
 * Features:
 * - In-memory cache with TTL (time-to-live)
 * - Automatic cache invalidation on mutations
 * - Cache persistence via localStorage (optional)
 * - Stale-while-revalidate pattern
 * - Cache tags for granular invalidation
 */

const DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes
const MAX_CACHE_SIZE = 100 // Maximum number of cache entries

// Create the cache context
const CacheContext = createContext(null)

/**
 * Cache Provider Component
 * Wraps the app to provide caching functionality
 */
export const CacheProvider = ({
  children,
  defaultTTL = DEFAULT_TTL,
  persistToStorage = false,
  storageKey = 'iothinc_cache'
}) => {
  const [cache, setCache] = useState(new Map())
  const [pendingInvalidations, setPendingInvalidations] = useState(new Set())
  const cacheRef = useRef(cache)
  cacheRef.current = cache

  // Load from localStorage on mount
  useEffect(() => {
    if (persistToStorage) {
      try {
        const stored = localStorage.getItem(storageKey)
        if (stored) {
          const parsed = JSON.parse(stored)
          const now = Date.now()
          const validEntries = new Map()

          for (const [key, value] of Object.entries(parsed)) {
            if (value.expiresAt > now) {
              validEntries.set(key, value)
            }
          }

          setCache(validEntries)
        }
      } catch (e) {
        console.warn('Failed to load cache from localStorage:', e)
      }
    }
  }, [persistToStorage, storageKey])

  // Save to localStorage on changes
  useEffect(() => {
    if (persistToStorage) {
      try {
        const obj = Object.fromEntries(cache)
        localStorage.setItem(storageKey, JSON.stringify(obj))
      } catch (e) {
        console.warn('Failed to save cache to localStorage:', e)
      }
    }
  }, [cache, persistToStorage, storageKey])

  /**
   * Get cached data
   * Returns { data, isStale, age } or null if not cached
   */
  const get = useCallback((key) => {
    const entry = cacheRef.current.get(key)
    if (!entry) return null

    const now = Date.now()
    const age = now - entry.timestamp
    const isExpired = age > entry.ttl
    const isStale = age > entry.ttl * 0.5 // Stale at 50% TTL

    if (isExpired) {
      // Clean up expired entry
      setCache(prev => {
        const next = new Map(prev)
        next.delete(key)
        return next
      })
      return null
    }

    return {
      data: entry.data,
      isStale,
      age,
      timestamp: entry.timestamp
    }
  }, [])

  /**
   * Set cache entry
   */
  const set = useCallback((key, data, options = {}) => {
    const ttl = options.ttl || defaultTTL
    const tags = options.tags || []

    setCache(prev => {
      const next = new Map(prev)

      // Enforce max cache size
      if (next.size >= MAX_CACHE_SIZE && !next.has(key)) {
        const firstKey = next.keys().next().value
        if (firstKey) next.delete(firstKey)
      }

      next.set(key, {
        data,
        timestamp: Date.now(),
        ttl,
        tags
      })
      return next
    })
  }, [defaultTTL])

  /**
   * Invalidate cache by key
   */
  const invalidate = useCallback((key) => {
    setCache(prev => {
      const next = new Map(prev)
      next.delete(key)
      return next
    })
  }, [])

  /**
   * Invalidate cache by tag
   * Removes all entries that have the given tag
   */
  const invalidateByTag = useCallback((tag) => {
    setCache(prev => {
      const next = new Map(prev)
      for (const [key, entry] of next.entries()) {
        if (entry.tags && entry.tags.includes(tag)) {
          next.delete(key)
        }
      }
      return next
    })
  }, [])

  /**
   * Invalidate multiple keys/tags
   */
  const invalidateAll = useCallback((keysOrTags) => {
    setCache(prev => {
      const next = new Map(prev)
      for (const keyOrTag of keysOrTags) {
        // Try as key first
        if (next.has(keyOrTag)) {
          next.delete(keyOrTag)
        } else {
          // Try as tag
          for (const [key, entry] of next.entries()) {
            if (entry.tags && entry.tags.includes(keyOrTag)) {
              next.delete(key)
            }
          }
        }
      }
      return next
    })
  }, [])

  /**
   * Clear entire cache
   */
  const clear = useCallback(() => {
    setCache(new Map())
    if (persistToStorage) {
      localStorage.removeItem(storageKey)
    }
  }, [persistToStorage, storageKey])

  /**
   * Get or fetch pattern - returns cached data immediately, fetches in background if stale
   */
  const getOrFetch = useCallback(async (key, fetcher, options = {}) => {
    const { ttl, tags, forceRefresh = false } = options

    // Check cache first
    const cached = !forceRefresh ? get(key) : null

    if (cached && !cached.isStale) {
      // Fresh cache hit - return immediately
      return { data: cached.data, fromCache: true, isStale: false }
    }

    // Stale or miss - fetch fresh data
    try {
      const data = await fetcher()
      set(key, data, { ttl, tags })

      if (cached) {
        // Was stale, now fresh
        return { data, fromCache: true, isStale: true }
      }

      // Was miss, now fresh
      return { data, fromCache: false, isStale: false }
    } catch (error) {
      // If we have stale data, return it with error flag
      if (cached) {
        return {
          data: cached.data,
          fromCache: true,
          isStale: true,
          error: error.message
        }
      }
      throw error
    }
  }, [get, set])

  /**
   * Prefetch data for a key
   */
  const prefetch = useCallback(async (key, fetcher, options = {}) => {
    // Don't prefetch if already fresh
    const cached = get(key)
    if (cached && !cached.isStale) return

    try {
      const data = await fetcher()
      set(key, data, options)
    } catch (e) {
      // Silently fail prefetch
      console.debug(`Prefetch failed for ${key}:`, e.message)
    }
  }, [get, set])

  const value = {
    get,
    set,
    invalidate,
    invalidateByTag,
    invalidateAll,
    clear,
    getOrFetch,
    prefetch,
    cache // Expose raw cache for debugging
  }

  return (
    <CacheContext.Provider value={value}>
      {children}
    </CacheContext.Provider>
  )
}

/**
 * Hook to use the cache context
 */
export const useCache = () => {
  const context = useContext(CacheContext)
  if (!context) {
    throw new Error('useCache must be used within a CacheProvider')
  }
  return context
}

/**
 * Higher-order hook for cached data fetching
 * Provides stale-while-revalidate behavior automatically
 */
export const useCachedQuery = (key, fetcher, options = {}) => {
  const {
    ttl = DEFAULT_TTL,
    tags = [],
    enabled = true,
    refetchOnMount = true,
    refetchOnWindowFocus = false
  } = options

  const cache = useCache()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isStale, setIsStale] = useState(false)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  // Track if component is mounted
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const executeFetch = useCallback(async (isBackground = false) => {
    if (!enabled) return

    if (!isBackground) setLoading(true)
    setError(null)

    try {
      const result = await cache.getOrFetch(key, fetcherRef.current, { ttl, tags })

      if (!mountedRef.current) return

      setData(result.data)
      setIsStale(result.isStale)

      if (result.error) {
        setError(result.error)
      }
    } catch (err) {
      if (!mountedRef.current) return
      setError(err.message)

      // Try to get stale data on error
      const stale = cache.get(key)
      if (stale) {
        setData(stale.data)
        setIsStale(true)
      }
    } finally {
      if (!isBackground && mountedRef.current) {
        setLoading(false)
      }
    }
  }, [cache, key, ttl, tags, enabled])

  // Initial fetch
  useEffect(() => {
    if (refetchOnMount && enabled) {
      executeFetch()
    } else if (!refetchOnMount) {
      // Just check cache
      const cached = cache.get(key)
      if (cached) {
        setData(cached.data)
        setIsStale(cached.isStale)
      }
      setLoading(false)
    }
  }, [executeFetch, refetchOnMount, enabled, cache, key])

  // Refetch on window focus
  useEffect(() => {
    if (!refetchOnWindowFocus) return

    const handleFocus = () => {
      executeFetch(true) // Background refetch
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [executeFetch, refetchOnWindowFocus])

  const refetch = useCallback(() => executeFetch(false), [executeFetch])
  const invalidate = useCallback(() => cache.invalidate(key), [cache, key])

  return {
    data,
    loading,
    error,
    isStale,
    refetch,
    invalidate,
    // Helper to update cache directly after mutations
    updateCache: (newData) => {
      cache.set(key, newData, { ttl, tags })
      setData(newData)
      setIsStale(false)
    }
  }
}

/**
 * Hook for mutations that automatically invalidate related cache
 */
export const useCachedMutation = (mutationFn, options = {}) => {
  const {
    invalidateKeys = [],
    invalidateTags = [],
    onSuccess,
    onError
  } = options

  const cache = useCache()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const mutate = useCallback(async (...args) => {
    setLoading(true)
    setError(null)

    try {
      const result = await mutationFn(...args)

      // Invalidate related cache
      for (const key of invalidateKeys) {
        cache.invalidate(key)
      }
      for (const tag of invalidateTags) {
        cache.invalidateByTag(tag)
      }

      onSuccess?.(result)
      return result
    } catch (err) {
      setError(err.message)
      onError?.(err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [mutationFn, invalidateKeys, invalidateTags, cache, onSuccess, onError])

  return { mutate, loading, error }
}

export default CacheProvider