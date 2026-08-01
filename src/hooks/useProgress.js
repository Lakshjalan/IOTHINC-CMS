import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from './useAuth'
import { useCachedQuery, useCachedMutation } from '../context/CacheContext'

const PROGRESS_CACHE_TAG = 'progress'

export const useProgress = (memberId = null) => {
  const { user, role } = useAuth()
  const [avgProgress, setAvgProgress] = useState(0)

  // Target ID is the parameter or fallback to the logged-in user
  const targetId = memberId || user?.id

  // Use cached query for fetching
  const {
    data: tasks = [],
    loading,
    error,
    isStale,
    refetch,
    updateCache
  } = useCachedQuery(
    `progress_tasks_${targetId || 'none'}`,
    async () => {
      if (!targetId) return []
      const { data, error: fetchErr } = await supabase
        .from('tasks')
        .select(`
          *,
          assigner:profiles!tasks_assigned_by_fkey(full_name),
          project:projects(title),
          event:events(title)
        `)
        .eq('assigned_to', targetId)
        .order('due_date', { ascending: true })

      if (fetchErr) throw fetchErr
      return data || []
    },
    {
      ttl: 3 * 60 * 1000, // 3 minutes
      tags: [PROGRESS_CACHE_TAG],
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      enabled: !!targetId
    }
  )

  // Calculate average progress from cached data
  useEffect(() => {
    if (tasks && tasks.length > 0) {
      const total = tasks.reduce((sum, task) => sum + (task.progress || 0), 0)
      setAvgProgress(Math.round(total / tasks.length))
    } else {
      setAvgProgress(0)
    }
  }, [tasks])

  // Mutations with cache invalidation
  const updateProgress = useCachedMutation(
    async (taskId, value) => {
      const isCompleted = value === 100
      const { data, error: err } = await supabase
        .from('tasks')
        .update({
          progress: value,
          status: isCompleted ? 'completed' : 'in_progress'
        })
        .eq('id', taskId)
        .select()
        .single()

      if (err) throw err
      return data
    },
    {
      invalidateTags: [PROGRESS_CACHE_TAG, `progress_tasks_${targetId}`],
      onSuccess: () => refetch()
    }
  )

  const markTaskDone = useCachedMutation(
    async (taskId) => {
      const { data, error: err } = await supabase
        .from('tasks')
        .update({
          progress: 100,
          status: 'completed'
        })
        .eq('id', taskId)
        .select()
        .single()

      if (err) throw err
      return data
    },
    {
      invalidateTags: [PROGRESS_CACHE_TAG, `progress_tasks_${targetId}`],
      onSuccess: () => refetch()
    }
  )

  // Admin: fetch all members' progress (not cached - admin only)
  const fetchAllMembersProgress = useCallback(async () => {
    try {
      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('id, full_name, email, department, year, role, avatar_url')
        .order('full_name')

      if (pErr) throw pErr

      const { data: tasksData, error: tErr } = await supabase
        .from('tasks')
        .select('assigned_to, progress, status')

      if (tErr) throw tErr

      // Aggregate task stats for each profile
      const aggregated = profiles.map(profile => {
        const memberTasks = tasksData.filter(t => t.assigned_to === profile.id)
        const totalCount = memberTasks.length
        const completedCount = memberTasks.filter(t => t.status === 'completed').length
        const totalProgress = memberTasks.reduce((sum, t) => sum + (t.progress || 0), 0)
        const avg = totalCount > 0 ? Math.round(totalProgress / totalCount) : 0

        return {
          ...profile,
          tasksCount: totalCount,
          completedCount,
          avgProgress: avg
        }
      })

      return aggregated;
    } catch (err) {
      console.error('Error fetching admin progress:', err)
      return []
    }
  }, [])

  return {
    tasks,
    loading,
    error,
    isStale,
    avgProgress,
    refetch,
    updateProgress,
    markTaskDone,
    fetchAllMembersProgress
  }
}