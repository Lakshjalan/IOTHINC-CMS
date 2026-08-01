import { useState, useEffect, useRef } from 'react'

export const useCachedFetch = (key, fetcher, options = {}) => {
  const { ttl = 5 * 60 * 1000, storage = 'local' } = options

  const store = typeof window !== 'undefined' ? (storage === 'session' ? window.sessionStorage : window.localStorage) : null

  const readCache = () => {
    if (!store) return null
    try {
      const raw = store.getItem(key)
      if (!raw) return null
      const parsed = JSON.parse(raw)
      if (!parsed || typeof parsed !== 'object') return null
      if (Date.now() - (parsed.ts || 0) > ttl) return null
      return parsed.data
    } catch (e) {
      return null
    }
  }

  const [data, setData] = useState(() => readCache())
  const [loading, setLoading] = useState(data === null)
  const [error, setError] = useState(null)
  const mounted = useRef(true)

  useEffect(() => {
    return () => { mounted.current = false }
  }, [])

  const doFetch = async (force = false) => {
    if (!force) {
      const cached = readCache()
      if (cached !== null) {
        setData(cached)
        setLoading(false)
        return cached
      }
    }

    setLoading(true)
    setError(null)
    try {
      const result = await fetcher()
      if (!mounted.current) return result
      setData(result)
      try {
        if (store) store.setItem(key, JSON.stringify({ data: result, ts: Date.now() }))
      } catch (e) {
        // ignore storage errors
      }
      setLoading(false)
      return result
    } catch (err) {
      if (!mounted.current) throw err
      setError(err?.message || String(err))
      setLoading(false)
      throw err
    }
  }

  useEffect(() => {
    // If we started without cache, fetch once
    if (data === null) doFetch().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const refetch = () => doFetch(true)

  return { data, setData, loading, error, refetch }
}
