import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from './useAuth'
import { sanitizeName, sanitizeText, sanitizeEnum, sanitizeNumber, sanitizeDate } from '../utils/sanitize'

export const useTasks = (statusFilter = 'All') => {
  const { user, role } = useAuth()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const isAdminOrCoordinator = ['chairperson', 'vice_chairperson', 'department_lead'].includes(role)

  const fetchTasks = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('tasks')
        .select(`
          *,
          assignee:profiles!tasks_assigned_to_fkey(full_name, avatar_url),
          assigner:profiles!tasks_assigned_by_fkey(full_name),
          project:projects(title),
          event:events(title)
        `)

      // If user is member, only fetch their tasks
      if (!isAdminOrCoordinator) {
        query = query.eq('assigned_to', user.id)
      }

      const { data, error: fetchErr } = await query.order('due_date', { ascending: true })

      if (fetchErr) throw fetchErr

      let filtered = data || []
      if (statusFilter && statusFilter !== 'All' && statusFilter !== 'all') {
  filtered = filtered.filter(t => t.status === statusFilter)
}

      setTasks(filtered)
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [user, role, statusFilter])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const assignTask = async (taskData) => {
    const safeData = {
      title: sanitizeName(taskData.title, 255),
      priority: sanitizeEnum(taskData.priority, ['low', 'medium', 'high']) || 'medium',
      assigned_to: taskData.assigned_to || null,
      project_id: taskData.project_id || null,
      event_id: taskData.event_id || null,
      due_date: sanitizeDate(taskData.due_date),
      progress: sanitizeNumber(taskData.progress, 0, 100) ?? 0,
    }
    const { data, error: err } = await supabase
      .from('tasks')
      .insert({ ...safeData, assigned_by: user?.id })
      .select()
      .single()

    if (err) throw err
    fetchTasks()
    return data
  }

  const updateTaskProgress = async (taskId, progressValue, statusValue) => {
    const { data, error: err } = await supabase
      .from('tasks')
      .update({ 
        progress: progressValue, 
        status: statusValue || (progressValue === 100 ? 'completed' : 'in_progress')
      })
      .eq('id', taskId)
      .select()
      .single()

    if (err) throw err
    fetchTasks()
    return data
  }

  const toggleTaskCompleted = async (taskId, currentStatus) => {
    const newStatus = currentStatus === 'completed' ? 'not_started' : 'completed'
    const newProgress = newStatus === 'completed' ? 100 : 0
    const { data, error: err } = await supabase
      .from('tasks')
      .update({ status: newStatus, progress: newProgress })
      .eq('id', taskId)
      .select()
      .single()

    if (err) throw err
    fetchTasks()
    return data
  }

  const addAdminComment = async (taskId, commentText) => {
    const safeComment = sanitizeText(commentText, 2000)
    const { data, error: err } = await supabase
      .from('tasks')
      .update({ admin_comment: safeComment })
      .eq('id', taskId)
      .select()
      .single()

    if (err) throw err
    fetchTasks()
    return data
  }

  const deleteTask = async (taskId) => {
    const { error: err } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)

    if (err) throw err
    fetchTasks()
  }

  return {
    tasks,
    loading,
    error,
    refetch: fetchTasks,
    assignTask,
    updateTaskProgress,
    toggleTaskCompleted,
    addAdminComment,
    deleteTask
  }
}
