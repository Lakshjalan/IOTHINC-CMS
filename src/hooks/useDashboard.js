import { useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useCachedQuery } from '../context/CacheContext'

// Cache key generators
const DASHBOARD_CACHE_TAG = 'dashboard'
const getCalendarCacheKey = (monthDate) =>
  `dashboard_calendar_${monthDate.getFullYear()}_${monthDate.getMonth()}`

const EMPTY_STATS = {
  activeProjects: 0,
  totalMembers: 0,
  upcomingEvents: 0,
  competitionDeadlines: 0
}

/**
 * Cached dashboard summary: stat counts, active projects, upcoming events,
 * and announcements. Tagged with the source tables so that mutations made
 * elsewhere in the app (creating a project, RSVP-ing to an event, posting
 * an announcement, etc.) automatically invalidate this cache too.
 */
export const useDashboard = () => {
  const {
    data,
    loading,
    error,
    isStale,
    refetch
  } = useCachedQuery(
    'dashboard_summary',
    async () => {
      const nowStr = new Date().toISOString()

      // 1. Counts
      const [projCount, memCount, eventCount, compCount] = await Promise.all([
        supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('events').select('*', { count: 'exact', head: true }).gt('event_date', nowStr),
        supabase.from('competitions').select('*', { count: 'exact', head: true }).gt('registration_deadline', nowStr)
      ])

      const stats = {
        activeProjects: projCount.count || 0,
        totalMembers: memCount.count || 0,
        upcomingEvents: eventCount.count || 0,
        competitionDeadlines: compCount.count || 0
      }

      // 2. Active projects list
      const { data: projs } = await supabase
        .from('projects')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(3)

      // 3. Upcoming events list
      const { data: evts } = await supabase
        .from('events')
        .select('*')
        .gt('event_date', nowStr)
        .order('event_date', { ascending: true })
        .limit(2)

      // 4. Announcements
      const { data: anns } = await supabase
        .from('notifications')
        .select(`
          *,
          sender:profiles!notifications_sender_id_fkey(full_name)
        `)
        .eq('type', 'announcement')
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false })
        .limit(3)

      return {
        stats,
        activeProjectsList: projs || [],
        upcomingEventsList: evts || [],
        announcements: anns || []
      }
    },
    {
      ttl: 30 * 60 * 1000, // 30 minutes — dashboard refreshes more often
      tags: [DASHBOARD_CACHE_TAG, 'projects', 'members', 'events', 'notifications'],
      refetchOnMount: true,
      refetchOnWindowFocus: false
    }
  )

  // Real-time: refetch whenever any source table changes, so the dashboard
  // stays live even for changes made by other users in other sessions.
  useEffect(() => {
    const channel = supabase
      .channel('dashboard_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => refetch())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [refetch])

  return {
    stats: data?.stats || EMPTY_STATS,
    activeProjectsList: data?.activeProjectsList || [],
    upcomingEventsList: data?.upcomingEventsList || [],
    announcements: data?.announcements || [],
    loading,
    error,
    isStale,
    refetch
  }
}

/**
 * Cached calendar data for a given month (events + competition deadlines).
 * Keyed per month so switching between months hits cache on revisit instead
 * of re-fetching every time.
 */
export const useDashboardCalendar = (monthDate) => {
  const {
    data,
    loading,
    error,
    refetch
  } = useCachedQuery(
    getCalendarCacheKey(monthDate),
    async () => {
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1)

      const [{ data: evts, error: evtErr }, { data: comps, error: compErr }] = await Promise.all([
        supabase
          .from('events')
          .select('id, title, event_date')
          .gte('event_date', monthStart.toISOString())
          .lt('event_date', monthEnd.toISOString()),
        supabase
          .from('competitions')
          .select('id, title, registration_deadline')
          .gte('registration_deadline', monthStart.toISOString())
          .lt('registration_deadline', monthEnd.toISOString())
      ])

      if (evtErr) throw evtErr
      if (compErr) throw compErr

      return { events: evts || [], deadlines: comps || [] }
    },
    {
      ttl: 60 * 60 * 1000, // 1 hour
      tags: [DASHBOARD_CACHE_TAG, 'events', 'competitions'],
      refetchOnMount: true,
      refetchOnWindowFocus: false
    }
  )

  return {
    calendarEvents: data?.events || [],
    calendarDeadlines: data?.deadlines || [],
    loading,
    error,
    refetch
  }
}
