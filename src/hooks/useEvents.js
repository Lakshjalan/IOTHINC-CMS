import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from './useAuth'
import { sanitizeName, sanitizeText, sanitizeUrl, sanitizeNumber, sanitizeDate, sanitizeEnum } from '../utils/sanitize'
import { useCache, useCachedQuery, useCachedMutation } from '../context/CacheContext'

// Cache key generators
const getEventsCacheKey = (statusFilter) => `events_${statusFilter || 'All'}`
const EVENTS_CACHE_TAG = 'events'

export const useEvents = (statusFilter = 'All') => {
  const { user } = useAuth()
  const cache = useCache()

  // Use cached query for fetching
  const {
    data: events = [],
    loading,
    error,
    isStale,
    refetch,
    updateCache
  } = useCachedQuery(
    getEventsCacheKey(statusFilter),
    async () => {
      // Fetch events, organizers, and their registrations
      let query = supabase
        .from('events')
        .select(`
          *,
          organiser:profiles!events_organiser_id_fkey(full_name, avatar_url),
          registrations(member_id, status, notify)
        `)

      const { data, error: fetchErr } = await query.order('event_date', { ascending: true })

      if (fetchErr) throw fetchErr

      // Format data and apply filters locally (flexible and robust)
      let formatted = (data || []).map(event => {
        const myReg = event.registrations?.find(r => r.member_id === user?.id)
        const confirmedRegs = event.registrations?.filter(r => r.status === 'confirmed') || []
        return {
          ...event,
          isRegistered: !!myReg && myReg.status === 'confirmed',
          myRegistration: myReg,
          registeredCount: confirmedRegs.length,
          seatsLeft: event.max_seats ? Math.max(0, event.max_seats - confirmedRegs.length) : null
        }
      })

      const now = new Date()

      if (statusFilter === 'Upcoming') {
        formatted = formatted.filter(e => new Date(e.event_date) > now && e.status !== 'cancelled')
      } else if (statusFilter === 'Ongoing') {
        formatted = formatted.filter(e => e.status === 'ongoing')
      } else if (statusFilter === 'Past') {
        formatted = formatted.filter(e => new Date(e.event_date) < now || e.status === 'past')
      } else if (statusFilter === 'My Events') {
        formatted = formatted.filter(e => e.isRegistered)
      }

      return formatted
    },
    {
      ttl: 5 * 60 * 1000, // 5 minutes
      tags: [EVENTS_CACHE_TAG, `events_${statusFilter}`],
      refetchOnMount: true,
      refetchOnWindowFocus: false
    }
  )

  // Mutations with cache invalidation
  const registerToEvent = useCachedMutation(
    async (eventId) => {
      if (!user) throw new Error('User must be authenticated')
      const { data, error: err } = await supabase
        .from('registrations')
        .upsert({
          event_id: eventId,
          member_id: user.id,
          status: 'confirmed',
          notify: true
        }, { onConflict: 'event_id,member_id' })
        .select()
        .single()

      if (err) throw err
      return data
    },
    {
      invalidateTags: [EVENTS_CACHE_TAG],
      onSuccess: () => refetch()
    }
  )

  const cancelRegistration = useCachedMutation(
    async (eventId) => {
      if (!user) throw new Error('User must be authenticated')
      const { error: err } = await supabase
        .from('registrations')
        .update({ status: 'cancelled' })
        .eq('event_id', eventId)
        .eq('member_id', user.id)

      if (err) throw err
    },
    {
      invalidateTags: [EVENTS_CACHE_TAG],
      onSuccess: () => refetch()
    }
  )

  const toggleNotify = useCachedMutation(
    async (eventId, notifyValue) => {
      if (!user) throw new Error('User must be authenticated')
      const { error: err } = await supabase
        .from('registrations')
        .update({ notify: notifyValue })
        .eq('event_id', eventId)
        .eq('member_id', user.id)

      if (err) throw err
    },
    {
      invalidateTags: [EVENTS_CACHE_TAG],
      onSuccess: () => refetch()
    }
  )

  const createEvent = useCachedMutation(
    async (eventData) => {
      const safeData = {
        title: sanitizeName(eventData.title, 255),
        description: sanitizeText(eventData.description, 5000),
        location: sanitizeName(eventData.location, 255),
        venue_link: sanitizeUrl(eventData.venue_link) || null,
        status: sanitizeEnum(eventData.status, ['upcoming', 'ongoing', 'past', 'cancelled']) || 'upcoming',
        max_seats: sanitizeNumber(eventData.max_seats, 0, 10000),
        event_date: sanitizeDate(eventData.event_date),
      }

      const { data, error: err } = await supabase
        .from('events')
        .insert({ ...safeData, organiser_id: user?.id })
        .select()
        .single()

      if (err) throw err
      return data
    },
    {
      invalidateTags: [EVENTS_CACHE_TAG],
      onSuccess: () => refetch()
    }
  )

  const updateEvent = useCachedMutation(
    async (id, eventData) => {
      const safeData = {}
      if (eventData.title !== undefined)       safeData.title       = sanitizeName(eventData.title, 255)
      if (eventData.description !== undefined) safeData.description = sanitizeText(eventData.description, 5000)
      if (eventData.location !== undefined)    safeData.location    = sanitizeName(eventData.location, 255)
      if (eventData.venue_link !== undefined)  safeData.venue_link  = sanitizeUrl(eventData.venue_link) || null
      if (eventData.status !== undefined)      safeData.status      = sanitizeEnum(eventData.status, ['upcoming', 'ongoing', 'past', 'cancelled'])
      if (eventData.max_seats !== undefined)   safeData.max_seats   = sanitizeNumber(eventData.max_seats, 0, 10000)
      if (eventData.event_date !== undefined)  safeData.event_date  = sanitizeDate(eventData.event_date)

      const { data, error: err } = await supabase
        .from('events')
        .update(safeData)
        .eq('id', id)
        .select()
        .single()

      if (err) throw err
      return data
    },
    {
      invalidateTags: [EVENTS_CACHE_TAG],
      onSuccess: () => refetch()
    }
  )

  const deleteEvent = useCachedMutation(
    async (id) => {
      const { error: err } = await supabase
        .from('events')
        .delete()
        .eq('id', id)

      if (err) throw err
    },
    {
      invalidateTags: [EVENTS_CACHE_TAG],
      onSuccess: () => refetch()
    }
  )

  return {
    events,
    loading,
    error,
    isStale,
    refetch,
    registerToEvent,
    cancelRegistration,
    toggleNotify,
    createEvent,
    updateEvent,
    deleteEvent
  }
}