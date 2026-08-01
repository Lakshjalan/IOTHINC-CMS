import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from './useAuth'
import { sanitizeName, sanitizeText, sanitizeEnum, sanitizeNumber, sanitizeDate } from '../utils/sanitize'
import { useCachedQuery, useCachedMutation } from '../context/CacheContext'

// Cache key generators
const getTasksCacheKey = (statusFilter, user, role) => {
  const isAdminOrCoordinator = ['chairperson', 'vice_chairperson', 'department_lead'].includes(role)
  return `tasks_${statusFilter || 'All'}_${isAdminOrCoordinator ? 'all' : user?.id || 'none'}`
}
const TASKS_CACHE_TAG = 'tasks'

export const useTasks = (statusFilter = 'All') => {
  const { user, role } = useAuth()
  const isAdminOrCoordinator = ['chairperson', 'vice_chairperson', 'department_lead'].includes(role)

  // Use cached query for fetching
  const {
    data: tasks = [],
    loading,
    error,
    isStale,
    refetch,
    updateCache
  } = useCachedQuery(
    getTasksCacheKey(statusFilter, user, role),
    async () => {
      if (!user) return []
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

      return filtered
    },
    {
      ttl: 2 * 60 * 1000, // 2 minutes (tasks change more frequently)
      tags: [TASKS_CACHE_TAG],
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      enabled: !!user
    }
  )

  // Mutations with cache invalidation
  const assignTask = useCachedMutation(
    async (taskData) => {
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
      return data
    },
    {
      invalidateTags: [TASKS_CACHE_TAG],
      onSuccess: () => refetch()
    }
  )

  const updateTaskProgress = useCachedMutation(
    async (taskId, progressValue, statusValue) => {
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
      return data
    },
    {
      invalidateTags: [TASKS_CACHE_TAG],
      onSuccess: () => refetch()
    }
  )

  const toggleTaskCompleted = useCachedMutation(
    async (taskId, currentStatus) => {
      const newStatus = currentStatus === 'completed' ? 'not_started' : 'completed'
      const newProgress = newStatus === 'completed' ? 100 : 0
      const { data, error: err } = await supabase
        .from('tasks')
        .update({ status: newStatus, progress: newProgress })
        .eq('id', taskId)
        .select()
        .single()

      if (err) throw err
      return data
    },
    {
      invalidateTags: [TASKS_CACHE_TAG],
      onSuccess: () => refetch()
    }
  )

  const addAdminComment = useCachedMutation(
    async (taskId, commentText) => {
      const safeComment = sanitizeText(commentText, 2000)
      const { data, error: err } = await supabase
        .from('tasks')
        .update({ admin_comment: safeComment })
        .eq('id', taskId)
        .select()
        .single()

      if (err) throw err
      return data
    },
    {
      invalidateTags: [TASKS_CACHE_TAG],
      onSuccess: () => refetch()
    }
  )

  const deleteTask = useCachedMutation(
    async (taskId) => {
      const { error: err } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)

      if (err) throw err
    },
    {
      invalidateTags: [TASKS_CACHE_TAG],
      onSuccess: () => refetch()
    }
  )

  const { mutate: mutateToggle } = toggleTaskCompleted
  const optimisticToggleTaskCompleted = async (taskId, currentStatus) => {
    const originalTasks = [...tasks]
    const newStatus = currentStatus === 'completed' ? 'not_started' : 'completed'
    const newProgress = newStatus === 'completed' ? 100 : 0

    // Optimistically update cache and UI
    const updated = tasks.map(t =>
      t.id === taskId
        ? { ...t, status: newStatus, progress: newProgress }
        : t
    )
    updateCache(updated)

    try {
      await mutateToggle(taskId, currentStatus)
    } catch (err) {
      console.warn('[Optimistic Update] Failed to toggle task completion. Rolling back.', err.message)
      updateCache(originalTasks)
      alert(`Failed to update task status: ${err.message || err}. Changes rolled back.`)
    }
  }

  const { mutate: mutateDelete } = deleteTask
  const optimisticDeleteTask = async (taskId) => {
    const originalTasks = [...tasks]

    // Optimistically update cache and UI
    const updated = tasks.filter(t => t.id !== taskId)
    updateCache(updated)

    try {
      await mutateDelete(taskId)
    } catch (err) {
      console.warn('[Optimistic Update] Failed to delete task. Rolling back.', err.message)
      updateCache(originalTasks)
      alert(`Failed to delete task: ${err.message || err}. Task restored.`)
    }
  }

  return {
    tasks,
    loading,
    error,
    isStale,
    refetch,
    assignTask,
    updateTaskProgress,
    toggleTaskCompleted: optimisticToggleTaskCompleted,
    addAdminComment,
    deleteTask: optimisticDeleteTask
  }
}