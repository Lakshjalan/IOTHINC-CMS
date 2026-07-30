import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from './useAuth'

export const useProgress = (memberId = null) => {
  const { user, role } = useAuth()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [avgProgress, setAvgProgress] = useState(0)

  // Target ID is the parameter or fallback to the logged-in user
  const targetId = memberId || user?.id

  const fetchProgress = useCallback(async () => {
    if (!targetId) return
    setLoading(true)
    setError(null)
    try {
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

      setTasks(data || [])

      // Calculate average progress
      if (data && data.length > 0) {
        const total = data.reduce((sum, task) => sum + (task.progress || 0), 0)
        setAvgProgress(Math.round(total / data.length))
      } else {
        setAvgProgress(0)
      }
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [targetId])

  useEffect(() => {
    fetchProgress()
  }, [fetchProgress])

  // Expose aggregated progress tracker admin view helper
  const fetchAllMembersProgress = async () => {
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
  }

  const updateProgress = async (taskId, value) => {
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
    fetchProgress()
    return data
  }

  const markTaskDone = async (taskId) => {
    return updateProgress(taskId, 100)
  }

  return {
    tasks,
    loading,
    error,
    avgProgress,
    refetch: fetchProgress,
    updateProgress,
    markTaskDone,
    fetchAllMembersProgress
  }
}
