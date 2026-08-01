import React, { createContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'

export const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  // Initialize user from Supabase's local cache immediately (synchronous)
  // This avoids a blank screen while we wait for network confirmation
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [role, setRole] = useState(null)
  // loading=true only blocks the ProtectedRoute spinner, not initial render
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, role, full_name, avatar_url, department, needs_approval')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        setProfile(null)
        setRole(null)
      } else {
        setProfile(data)
        setRole(data.role)
      }
    } catch (err) {
      console.error('Profile fetch error:', err)
      setProfile(null)
      setRole(null)
    }
  }, [])

  useEffect(() => {
    let mounted = true

    // CRITICAL FIX: Non-blocking auth init.
    // getSession() resolves from localStorage immediately (no network round trip).
    // We only set loading=false after both session + profile are ready,
    // but we set user immediately so UI can start rendering without waiting.
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (!mounted) return

      if (session?.user) {
        setUser(session.user)
        // Fetch profile in background — don't await before setting loading=false
        fetchProfile(session.user.id).finally(() => {
          if (mounted) setLoading(false)
        })
      } else {
        setUser(null)
        setProfile(null)
        setRole(null)
        setLoading(false)
      }
    }

    initSession()

    // Listen for future auth state changes (login/logout/token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      if (event === 'TOKEN_REFRESHED') {
        // Token silently refreshed — no need to re-fetch profile
        if (session?.user) setUser(session.user)
        return
      }

      if (session?.user) {
        setUser(session.user)
        setLoading(true)
        fetchProfile(session.user.id).finally(() => {
          if (mounted) setLoading(false)
        })
      } else {
        setUser(null)
        setProfile(null)
        setRole(null)
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription?.unsubscribe()
    }
  }, [fetchProfile])

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  const signOut = async () => {
    // Clear localStorage caches for user privacy/security
    try {
      localStorage.removeItem('iothinc_cache')
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('chat_')) {
          localStorage.removeItem(key)
        }
      })
    } catch (e) {
      console.warn('Error clearing localStorage on signout:', e)
    }
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const signUp = async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } }
    })
    if (error) throw error
    return data
  }

  const value = {
    user,
    profile,
    role,
    loading,
    signIn,
    signOut,
    signUp,
    refreshProfile: () => user && fetchProfile(user.id)
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
