import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from './useAuth'
import { sanitizeName, sanitizeText, sanitizeEnum, sanitizeNumber, sanitizeDate } from '../utils/sanitize'
import { useCachedQuery, useCachedMutation } from '../context/CacheContext'

// Cache key generators — always user-isolated to prevent cross-user cache collisions
const getTasksCacheKey = (statusFilter, viewFilter, userId) => {
  return `tasks_merged_${statusFilter || 'All'}_${viewFilter}_${userId || 'none'}`
}
const TASKS_CACHE_TAG = 'tasks'

export const useTasks = (statusFilter = 'All', viewFilter = 'all') => {
  const { user, role } = useAuth()

  // Derive role flags — these are used in render logic (viewTabs, displayTasks, etc.)
  const canManage = ['chairperson', 'vice_chairperson', 'department_lead'].includes(role)
  const isSystemAdmin = ['chairperson', 'vice_chairperson'].includes(role)

  // Use refs so the fetcher always sees the latest role-derived values
  // without stale closures — the fetcher is created once but must read
  // the *current* role on every invocation.
  const canManageRef = useRef(canManage)
  canManageRef.current = canManage
  const isSystemAdminRef = useRef(isSystemAdmin)
  isSystemAdminRef.current = isSystemAdmin
  const roleRef = useRef(role)
  roleRef.current = role

  // CRITICAL: Don't start fetching until role is resolved.
  // `user` is set from the session cache before the profile (which contains
  // the role) is fetched.  If we start querying with role=null, we build
  // wrong filters (non-admin filter for admin users) and cache the result
  // under the final cache key, causing "Your Tasks" to show all tasks.
  const isReady = !!user && role !== null

  // Use cached query for fetching
  const {
    data: tasks = [],
    loading: cacheLoading,
    error,
    isStale,
    refetch,
    updateCache
  } = useCachedQuery(
    getTasksCacheKey(statusFilter, viewFilter, user?.id),
    async () => {
      if (!user) return []

      // Read current role-derived values from refs (not closure captures)
      const _canManage = canManageRef.current

      // Resolve user's team associations for "team" view or non-manager default view
      let myEventTeamIds = []
      let myProjectIds = []
      
      if (!_canManage || viewFilter === 'team') {
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

      // ─── Build general tasks query ────────────────────────────────────────
      let query = supabase
        .from('tasks')
        .select(`
          *,
          batch_id,
          completion_request_status,
          completion_reg_no,
          completion_desc,
          assignee:profiles!tasks_assigned_to_fkey(full_name, avatar_url),
          assigner:profiles!tasks_assigned_by_fkey(full_name),
          project:projects(title),
          event:events(title)
        `)

      if (viewFilter === 'mine') {
        // "Your Tasks" — always only tasks assigned to the current user
        query = query.eq('assigned_to', user.id)
      } else if (viewFilter === 'team') {
        // "Your Team Tasks" — tasks in the user's projects
        if (myProjectIds.length > 0) {
          query = query.in('project_id', myProjectIds)
        } else {
          query = query.eq('id', '00000000-0000-0000-0000-000000000000') // impossible match
        }
      } else if (viewFilter === 'all' && _canManage) {
        // "All Tasks" for managers — no client-side filter, rely on RLS
        // (no filter applied — Supabase RLS will scope appropriately)
      } else {
        // Default/fallback for non-managers — show own + assigned-by + project tasks
        let condition = `assigned_to.eq.${user.id},assigned_by.eq.${user.id}`
        if (myProjectIds.length > 0) {
          condition += `,project_id.in.(${myProjectIds.join(',')})`
        }
        query = query.or(condition)
      }

      // ─── Build event tasks query ──────────────────────────────────────────
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
          eventTasksQuery = eventTasksQuery.eq('id', '00000000-0000-0000-0000-000000000000')
        }
      } else if (viewFilter === 'all' && _canManage) {
        // "All Tasks" for managers — no client-side filter, rely on RLS
      } else {
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

      // SAFETY FILTER: When viewFilter is 'mine', guarantee only the current
      // user's tasks are returned. The DB query already filters with
      // .eq('assigned_to', user.id), but this acts as a belt-and-suspenders
      // guard against cache contamination or stale closures that could leak
      // other users' tasks into the "Your Tasks" view.
      if (viewFilter === 'mine') {
        allTasks = allTasks.filter(t => t.assigned_to === user.id)
      }

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
      // CRITICAL: Don't fetch until both user AND role are resolved.
      // This prevents the initial fetch from running with role=null
      // (which would apply wrong filters and cache wrong results).
      enabled: isReady
    }
  )

  // Show loading while waiting for role to resolve OR while cache is loading
  const loading = !isReady || cacheLoading

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
        batch_id: taskData.batch_id || null,
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
    updateCache,
    assignTask,
    updateTaskProgress,
    toggleTaskCompleted: optimisticToggleTaskCompleted,
    addAdminComment,
    deleteTask: optimisticDeleteTask
  }
}