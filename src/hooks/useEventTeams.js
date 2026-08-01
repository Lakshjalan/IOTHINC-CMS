import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from './useAuth'
import { useCachedQuery, useCachedMutation } from '../context/CacheContext'

const EVENT_TEAMS_CACHE_TAG = 'event_teams'

export const useEventTeams = (eventId) => {
  const { user } = useAuth()

  // Use cached query for fetching
  const {
    data: eventTeams = [],
    loading,
    error,
    isStale,
    refetch,
    updateCache
  } = useCachedQuery(
    `event_teams_${eventId || 'none'}`,
    async () => {
      if (!eventId) return []
      const { data, error: fetchErr } = await supabase
        .from('event_teams')
        .select(`
          *,
          event_team_members(
            id, member_id, status, request_message, joined_at,
            member:profiles!event_team_members_member_id_fkey(id, full_name, avatar_url, department)
          ),
          event_tasks(
            id, title, description, status, priority, due_date, assigned_to,
            assignee:profiles!event_tasks_assigned_to_fkey(id, full_name, avatar_url)
          )
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: true })

      if (fetchErr) throw fetchErr

      const formatted = (data || []).map(team => {
        const activeMembers = team.event_team_members?.filter(m => m.status === 'active') || []
        const pendingMembers = team.event_team_members?.filter(m => m.status === 'pending') || []
        const myMembership = team.event_team_members?.find(m => m.member_id === user?.id)
        return {
          ...team,
          activeMembers,
          pendingMembers,
          myMembership,
          memberCount: activeMembers.length,
          taskCount: team.event_tasks?.length || 0,
          doneTaskCount: team.event_tasks?.filter(t => t.status === 'done').length || 0,
          isMember: myMembership?.status === 'active',
          isPending: myMembership?.status === 'pending',
        }
      })

      return formatted
    },
    {
      ttl: 3 * 60 * 1000, // 3 minutes
      tags: [EVENT_TEAMS_CACHE_TAG, `event_teams_${eventId}`],
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      enabled: !!eventId
    }
  )

  // Mutations with cache invalidation
  const createEventTeam = useCachedMutation(
    async ({ name, description, maxMembers }) => {
      const { data, error: err } = await supabase
        .from('event_teams')
        .insert({ event_id: eventId, name, description, max_members: maxMembers || null, created_by: user?.id })
        .select()
        .single()
      if (err) throw err
      return data
    },
    {
      invalidateTags: [EVENT_TEAMS_CACHE_TAG, `event_teams_${eventId}`],
      onSuccess: () => refetch()
    }
  )

  const deleteEventTeam = useCachedMutation(
    async (teamId) => {
      const { error: err } = await supabase.from('event_teams').delete().eq('id', teamId)
      if (err) throw err
    },
    {
      invalidateTags: [EVENT_TEAMS_CACHE_TAG, `event_teams_${eventId}`],
      onSuccess: () => refetch()
    }
  )

  const addMemberToTeam = useCachedMutation(
    async (eventTeamId, memberId) => {
      const { error: err } = await supabase
        .from('event_team_members')
        .upsert({ event_team_id: eventTeamId, member_id: memberId, status: 'active' }, { onConflict: 'event_team_id,member_id' })
      if (err) throw err
    },
    {
      invalidateTags: [EVENT_TEAMS_CACHE_TAG, `event_teams_${eventId}`],
      onSuccess: () => refetch()
    }
  )

  const removeMemberFromTeam = useCachedMutation(
    async (eventTeamId, memberId) => {
      const { error: err } = await supabase
        .from('event_team_members')
        .delete()
        .eq('event_team_id', eventTeamId)
        .eq('member_id', memberId)
      if (err) throw err
    },
    {
      invalidateTags: [EVENT_TEAMS_CACHE_TAG, `event_teams_${eventId}`],
      onSuccess: () => refetch()
    }
  )

  const requestJoinTeam = useCachedMutation(
    async (eventTeamId, message = '') => {
      const { error: err } = await supabase
        .from('event_team_members')
        .upsert(
          { event_team_id: eventTeamId, member_id: user?.id, status: 'pending', request_message: message },
          { onConflict: 'event_team_id,member_id' }
        )
      if (err) throw err
    },
    {
      invalidateTags: [EVENT_TEAMS_CACHE_TAG, `event_teams_${eventId}`],
      onSuccess: () => refetch()
    }
  )

  const approveJoinRequest = useCachedMutation(
    async (eventTeamId, memberId) => {
      const { error: err } = await supabase
        .from('event_team_members')
        .update({ status: 'active', reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
        .eq('event_team_id', eventTeamId)
        .eq('member_id', memberId)
      if (err) throw err
    },
    {
      invalidateTags: [EVENT_TEAMS_CACHE_TAG, `event_teams_${eventId}`],
      onSuccess: () => refetch()
    }
  )

  const rejectJoinRequest = useCachedMutation(
    async (eventTeamId, memberId) => {
      const { error: err } = await supabase
        .from('event_team_members')
        .update({ status: 'rejected', reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
        .eq('event_team_id', eventTeamId)
        .eq('member_id', memberId)
      if (err) throw err
    },
    {
      invalidateTags: [EVENT_TEAMS_CACHE_TAG, `event_teams_${eventId}`],
      onSuccess: () => refetch()
    }
  )

  const createEventTask = useCachedMutation(
    async ({ eventTeamId, title, description, assignedTo, priority, dueDate }) => {
      const { data, error: err } = await supabase
        .from('event_tasks')
        .insert({
          event_team_id: eventTeamId,
          event_id: eventId,
          title,
          description,
          assigned_to: assignedTo || null,
          priority: priority || 'medium',
          due_date: dueDate || null,
          created_by: user?.id,
          status: 'todo'
        })
        .select()
        .single()
      if (err) throw err
      return data
    },
    {
      invalidateTags: [EVENT_TEAMS_CACHE_TAG, `event_teams_${eventId}`],
      onSuccess: () => refetch()
    }
  )

  const updateTaskStatus = useCachedMutation(
    async (taskId, status) => {
      const { error: err } = await supabase
        .from('event_tasks')
        .update({ status })
        .eq('id', taskId)
      if (err) throw err
    },
    {
      invalidateTags: [EVENT_TEAMS_CACHE_TAG, `event_teams_${eventId}`],
      onSuccess: () => refetch()
    }
  )

  const deleteEventTask = useCachedMutation(
    async (taskId) => {
      const { error: err } = await supabase.from('event_tasks').delete().eq('id', taskId)
      if (err) throw err
    },
    {
      invalidateTags: [EVENT_TEAMS_CACHE_TAG, `event_teams_${eventId}`],
      onSuccess: () => refetch()
    }
  )

  const assignTask = useCachedMutation(
    async (taskId, memberId) => {
      const { error: err } = await supabase
        .from('event_tasks')
        .update({ assigned_to: memberId })
        .eq('id', taskId)
      if (err) throw err
    },
    {
      invalidateTags: [EVENT_TEAMS_CACHE_TAG, `event_teams_${eventId}`],
      onSuccess: () => refetch()
    }
  )

  return {
    eventTeams,
    loading,
    error,
    isStale,
    refetch,
    createEventTeam,
    deleteEventTeam,
    addMemberToTeam,
    removeMemberFromTeam,
    requestJoinTeam,
    approveJoinRequest,
    rejectJoinRequest,
    createEventTask,
    updateTaskStatus,
    deleteEventTask,
    assignTask,
  }
}