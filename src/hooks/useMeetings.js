import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from './useAuth'
import { sanitizeName, sanitizeText, sanitizeUrl, sanitizeEnum, sanitizeDate } from '../utils/sanitize'
import { useCachedQuery, useCachedMutation } from '../context/CacheContext'

const MEETINGS_CACHE_TAG = 'meetings'

export const useMeetings = () => {
  const { user } = useAuth()

  // Use cached query for fetching
  const {
    data: meetings = [],
    loading,
    error,
    isStale,
    refetch,
    updateCache
  } = useCachedQuery(
    'meetings_all',
    async () => {
      // Fetch meetings, creator profiles, and their attendees
      const { data, error: fetchErr } = await supabase
        .from('meetings')
        .select(`
          *,
          creator:profiles!meetings_created_by_fkey(full_name, avatar_url),
          meeting_attendees(member_id, joined_at, member:profiles(full_name, avatar_url))
        `)
        .order('scheduled_start', { ascending: true })

      if (fetchErr) throw fetchErr

      // Format data and calculate status client-side or verify against user id
      const formatted = (data || []).map(m => {
        const hasJoined = m.meeting_attendees?.some(a => a.member_id === user?.id)
        return {
          ...m,
          hasJoined,
          attendeesCount: m.meeting_attendees?.length || 0,
          attendeesList: m.meeting_attendees || []
        }
      })

      return formatted
    },
    {
      ttl: 5 * 60 * 1000, // 5 minutes
      tags: [MEETINGS_CACHE_TAG],
      refetchOnMount: true,
      refetchOnWindowFocus: false
    }
  )

  // Set up real-time subscription for instant meeting status changes
  useEffect(() => {
    const channel = supabase
      .channel('meetings_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'meetings' },
        () => {
          refetch()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [refetch])

  // Mutations with cache invalidation
  const createMeeting = useCachedMutation(
    async (meetingData) => {
      if (!user) throw new Error('User must be authenticated')
      const isUrlRequired = ['zoom', 'google_meet', 'teams'].includes(meetingData.platform)
      const safeData = {
        title: sanitizeName(meetingData.title, 255),
        description: sanitizeText(meetingData.description, 5000),
        meeting_link: isUrlRequired
          ? (sanitizeUrl(meetingData.meeting_link) || 'https://meet.google.com')
          : (sanitizeName(meetingData.meeting_link, 1000) || 'In-person / Other location'),
        platform: sanitizeEnum(meetingData.platform, ['zoom', 'google_meet', 'teams', 'other', 'in_person']) || 'other',
        scheduled_start: sanitizeDate(meetingData.scheduled_start),
        scheduled_end: sanitizeDate(meetingData.scheduled_end),
      }

      const { data, error: err } = await supabase
        .from('meetings')
        .insert({
          ...safeData,
          created_by: user.id
        })
        .select()
        .single()

      if (err) throw err
      return data
    },
    {
      invalidateTags: [MEETINGS_CACHE_TAG],
      onSuccess: () => refetch()
    }
  )

  const joinMeeting = useCachedMutation(
    async (meetingId) => {
      if (!user) throw new Error('User must be authenticated')
      const { data, error: err } = await supabase
        .from('meeting_attendees')
        .upsert({
          meeting_id: meetingId,
          member_id: user.id
        }, { onConflict: 'meeting_id,member_id' })
        .select()
        .single()

      if (err) throw err
      return data
    },
    {
      invalidateTags: [MEETINGS_CACHE_TAG],
      onSuccess: () => refetch()
    }
  )

  const updateMeeting = useCachedMutation(
    async (id, meetingData) => {
      const safeData = {}
      if (meetingData.title !== undefined)           safeData.title           = sanitizeName(meetingData.title, 255)
      if (meetingData.description !== undefined)     safeData.description     = sanitizeText(meetingData.description, 5000)
      if (meetingData.meeting_link !== undefined) {
        const currentPlatform = meetingData.platform || 'other'
        const isUrlRequired = ['zoom', 'google_meet', 'teams'].includes(currentPlatform)
        safeData.meeting_link = isUrlRequired
          ? (sanitizeUrl(meetingData.meeting_link) || 'https://meet.google.com')
          : (sanitizeName(meetingData.meeting_link, 1000) || 'In-person / Other location')
      }
      if (meetingData.platform !== undefined)        safeData.platform        = sanitizeEnum(meetingData.platform, ['zoom', 'google_meet', 'teams', 'other', 'in_person'])
      if (meetingData.scheduled_start !== undefined) safeData.scheduled_start = sanitizeDate(meetingData.scheduled_start)
      if (meetingData.scheduled_end !== undefined)   safeData.scheduled_end   = sanitizeDate(meetingData.scheduled_end)
      if (meetingData.status !== undefined)          safeData.status          = sanitizeEnum(meetingData.status, ['scheduled', 'live', 'completed', 'cancelled'])
      if (meetingData.actual_duration_minutes !== undefined) safeData.actual_duration_minutes = meetingData.actual_duration_minutes ? parseInt(meetingData.actual_duration_minutes) : null
      if (meetingData.minutes_text !== undefined)    safeData.minutes_text    = sanitizeText(meetingData.minutes_text, 10000)
      if (meetingData.recording_url !== undefined)   safeData.recording_url   = sanitizeUrl(meetingData.recording_url) || null

      const { data, error: err } = await supabase
        .from('meetings')
        .update(safeData)
        .eq('id', id)
        .select()
        .single()

      if (err) throw err
      return data
    },
    {
      invalidateTags: [MEETINGS_CACHE_TAG],
      onSuccess: () => refetch()
    }
  )

  const deleteMeeting = useCachedMutation(
    async (id) => {
      const { error: err } = await supabase
        .from('meetings')
        .delete()
        .eq('id', id)

      if (err) throw err
    },
    {
      invalidateTags: [MEETINGS_CACHE_TAG],
      onSuccess: () => refetch()
    }
  )

  return {
    meetings,
    loading,
    error,
    isStale,
    refetch,
    createMeeting,
    joinMeeting,
    updateMeeting,
    deleteMeeting
  }
}