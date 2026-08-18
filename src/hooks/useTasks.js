import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from './useAuth'
import { sanitizeName, sanitizeText, sanitizeEnum, sanitizeNumber, sanitizeDate } from '../utils/sanitize'
import { useCachedQuery, useCachedMutation } from '../context/CacheContext'

// Cache key generators
const getTasksCacheKey = (statusFilter, viewFilter, user, role) => {
  const isAdminOrCoordinator = ['chairperson', 'vice_chairperson'].includes(role)
  return `tasks_merged_${statusFilter || 'All'}_${viewFilter}_${isAdminOrCoordinator ? 'all' : user?.id || 'none'}`
}
const TASKS_CACHE_TAG = 'tasks'

export const useTasks = (statusFilter = 'All', viewFilter = 'all') => {
  const { user, role } = useAuth()
  const isAdminOrCoordinator = ['chairperson', 'vice_chairperson'].includes(role)

  // Use cached query for fetching
  const {
    data: tasks = [],
    loading,
    error,
    isStale,
    refetch,
    updateCache
  } = useCachedQuery(
    getTasksCacheKey(statusFilter, viewFilter, user, role),
    async () => {
      if (!user) return []
      
      // Resolve user's team associations for "team" or "mine_and_team" views
      let myEventTeamIds = []
      let myProjectIds = []
      
      if (!isAdminOrCoordinator || viewFilter === 'team' || viewFilter === 'mine_and_team') {
        const [
          eventTeamMembersRes,
          eventTeamsCreatedRes,
          teamMembersRes,
          teamsLedRes,
          profileRes
        ] = await Promise.all([
          supabase.from('event_team_members').select('event_team_id').eq('member_id', user.id).eq('status', 'active'),
          supabase.from('event_teams').select('id').eq('created_by', user.id),
          supabase.from('team_members').select('team_id').eq('member_id', user.id),
          supabase.from('teams').select('id').eq('lead_id', user.id),
          supabase.from('profiles').select('department').eq('id', user.id).single()
        ])

        const etmIds = eventTeamMembersRes.data?.map(d => d.event_team_id) || []
        const etcIds = eventTeamsCreatedRes.data?.map(d => d.id) || []
        const tmIds = teamMembersRes.data?.map(d => d.team_id) || []
        const tlIds = teamsLedRes.data?.map(d => d.id) || []
        const myGeneralTeamIds = [...new Set([...tmIds, ...tlIds])]

        let matchedEventTeamIds = []
        let teamNamesToMatch = []

        if (myGeneralTeamIds.length > 0) {
          const { data: genTeams } = await supabase.from('teams').select('name').in('id', myGeneralTeamIds)
          teamNamesToMatch = genTeams?.map(t => t.name) || []
        }

        if (profileRes.data?.department && !teamNamesToMatch.includes(profileRes.data.department)) {
          teamNamesToMatch.push(profileRes.data.department)
        }

        if (teamNamesToMatch.length > 0) {
          const { data: matchedEventTeams } = await supabase.from('event_teams').select('id').in('name', teamNamesToMatch)
          matchedEventTeamIds = matchedEventTeams?.map(t => t.id) || []
          
          // Also try case-insensitive match for the first few just in case
          if (matchedEventTeamIds.length === 0 && teamNamesToMatch[0]) {
             const { data: matchedIlike } = await supabase.from('event_teams').select('id').ilike('name', teamNamesToMatch[0])
             matchedEventTeamIds = matchedIlike?.map(t => t.id) || []
          }
        }

        if (myGeneralTeamIds.length > 0) {
          const { data: projs } = await supabase.from('projects').select('id').in('team_id', myGeneralTeamIds)
          myProjectIds = projs?.map(p => p.id) || []
        }

        myEventTeamIds = [...new Set([...etmIds, ...etcIds, ...matchedEventTeamIds])]
      }

      // Fetch general tasks
      let query = supabase
        .from('tasks')
        .select(`
          *,
          assignee:profiles!tasks_assigned_to_fkey(full_name, avatar_url),
          assigner:profiles!tasks_assigned_by_fkey(full_name),
          project:projects(title),
          event:events(title)
        `)

      if (viewFilter === 'mine') {
        query = query.eq('assigned_to', user.id)
      } else if (viewFilter === 'team') {
        if (myProjectIds.length > 0) {
          query = query.in('project_id', myProjectIds)
        } else {
          query = query.eq('id', '00000000-0000-0000-0000-000000000000') // impossible
        }
      } else if (!isAdminOrCoordinator || viewFilter === 'mine_and_team') {
        if (myProjectIds.length > 0) {
          query = query.or(`assigned_to.eq.${user.id},project_id.in.(${myProjectIds.join(',')})`)
        } else {
          query = query.eq('assigned_to', user.id)
        }
      }

      // Fetch event tasks
      let eventTasksQuery = supabase
        .from('event_tasks')
        .select(`
          *,
          assignee:profiles!event_tasks_assigned_to_fkey(full_name, avatar_url),
          event:events(title),
          team:event_teams!event_tasks_event_team_id_fkey(name)
        `)

      if (viewFilter === 'mine') {
        eventTasksQuery = eventTasksQuery.eq('assigned_to', user.id)
      } else if (viewFilter === 'team') {
        if (myEventTeamIds.length > 0) {
          eventTasksQuery = eventTasksQuery.in('event_team_id', myEventTeamIds)
        } else {
          eventTasksQuery = eventTasksQuery.eq('id', '00000000-0000-0000-0000-000000000000') // no teams
        }
      } else if (!isAdminOrCoordinator || viewFilter === 'mine_and_team') {
        if (myEventTeamIds.length > 0) {
          eventTasksQuery = eventTasksQuery.or(`assigned_to.eq.${user.id},event_team_id.in.(${myEventTeamIds.join(',')})`)
        } else {
          eventTasksQuery = eventTasksQuery.eq('assigned_to', user.id)
        }
      }

      const [tasksRes, eventTasksRes] = await Promise.all([
        query.order('due_date', { ascending: true }),
        eventTasksQuery.order('due_date', { ascending: true })
      ])

      if (tasksRes.error) throw tasksRes.error
      if (eventTasksRes.error) throw eventTasksRes.error

      const generalTasks = (tasksRes.data || []).map(t => ({ ...t, isEventTask: false, isMine: t.assigned_to === user.id }))
      const eventTasks = (eventTasksRes.data || []).map(t => ({ 
        ...t, 
        isEventTask: true,
        isMine: t.assigned_to === user.id,
        // Map status
        status: t.status === 'todo' ? 'not_started' : t.status === 'done' ? 'completed' : t.status,
        progress: t.status === 'done' ? 100 : t.status === 'in_progress' ? 50 : 0
      }))

      let allTasks = [...generalTasks, ...eventTasks].sort((a, b) => {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date) - new Date(b.due_date);
      })

      if (statusFilter && statusFilter !== 'All' && statusFilter !== 'all') {
        allTasks = allTasks.filter(t => t.status === statusFilter)
      }

      return allTasks
    },
    {
      ttl: 24 * 60 * 60 * 1000, // 24 hours — invalidated on mutation
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
    async (taskId, progressValue, statusValue, isEventTask = false) => {
      const table = isEventTask ? 'event_tasks' : 'tasks'
      let updatePayload = {}
      if (isEventTask) {
        // map status back to event_task status
        const evStatus = statusValue || (progressValue === 100 ? 'done' : 'in_progress')
        updatePayload = { status: evStatus }
      } else {
        updatePayload = {
          progress: progressValue,
          status: statusValue || (progressValue === 100 ? 'completed' : 'in_progress')
        }
      }

      const { data, error: err } = await supabase
        .from(table)
        .update(updatePayload)
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
    async (task) => {
      const taskId = task.id
      const isEventTask = task.isEventTask
      const currentStatus = task.status
      const table = isEventTask ? 'event_tasks' : 'tasks'
      
      let updatePayload = {}
      if (isEventTask) {
        const newStatus = currentStatus === 'completed' ? 'todo' : 'done'
        updatePayload = { status: newStatus }
      } else {
        const newStatus = currentStatus === 'completed' ? 'not_started' : 'completed'
        const newProgress = newStatus === 'completed' ? 100 : 0
        updatePayload = { status: newStatus, progress: newProgress }
      }
      
      const { data, error: err } = await supabase
        .from(table)
        .update(updatePayload)
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
    async (taskId, commentText, isEventTask = false) => {
      if (isEventTask) {
         // event_tasks doesn't have admin_comment right now, but just in case
         console.warn("admin_comment not supported on event_tasks")
         return null
      }
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
    async (taskId, isEventTask = false) => {
      const table = isEventTask ? 'event_tasks' : 'tasks'
      const { error: err } = await supabase
        .from(table)
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
  const optimisticToggleTaskCompleted = async (task) => {
    const originalTasks = [...tasks]
    const newStatus = task.status === 'completed' ? 'not_started' : 'completed'
    const newProgress = newStatus === 'completed' ? 100 : 0

    // Optimistically update cache and UI
    const updated = tasks.map(t =>
      t.id === task.id
        ? { ...t, status: newStatus, progress: task.isEventTask ? (newStatus === 'completed' ? 100 : 0) : newProgress }
        : t
    )
    updateCache(updated)

    try {
      await mutateToggle(task)
    } catch (err) {
      console.warn('[Optimistic Update] Failed to toggle task completion. Rolling back.', err.message)
      updateCache(originalTasks)
      alert(`Failed to update task status: ${err.message || err}. Changes rolled back.`)
    }
  }

  const { mutate: mutateDelete } = deleteTask
  const optimisticDeleteTask = async (task) => {
    const originalTasks = [...tasks]

    // Optimistically update cache and UI
    const updated = tasks.filter(t => t.id !== task.id)
    updateCache(updated)

    try {
      await mutateDelete(task.id, task.isEventTask)
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