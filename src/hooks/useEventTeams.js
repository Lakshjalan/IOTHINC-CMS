import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from './useAuth'

export const useEventTeams = (eventId) => {
  const { user } = useAuth()
  const [eventTeams, setEventTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchEventTeams = useCallback(async () => {
    if (!eventId) return
    setLoading(true)
    setError(null)
    try {
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

      setEventTeams(formatted)
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [eventId, user])

  useEffect(() => { fetchEventTeams() }, [fetchEventTeams])

  // Create a new sub-team for this event
  const createEventTeam = async ({ name, description, maxMembers }) => {
    const { data, error: err } = await supabase
      .from('event_teams')
      .insert({ event_id: eventId, name, description, max_members: maxMembers || null, created_by: user?.id })
      .select()
      .single()
    if (err) throw err
    await fetchEventTeams()
    return data
  }

  // Delete a sub-team
  const deleteEventTeam = async (teamId) => {
    const { error: err } = await supabase.from('event_teams').delete().eq('id', teamId)
    if (err) throw err
    await fetchEventTeams()
  }

  // Admin: Add a member directly to a sub-team
  const addMemberToTeam = async (eventTeamId, memberId) => {
    const { error: err } = await supabase
      .from('event_team_members')
      .upsert({ event_team_id: eventTeamId, member_id: memberId, status: 'active' }, { onConflict: 'event_team_id,member_id' })
    if (err) throw err
    await fetchEventTeams()
  }

  // Admin: Remove a member from a sub-team
  const removeMemberFromTeam = async (eventTeamId, memberId) => {
    const { error: err } = await supabase
      .from('event_team_members')
      .delete()
      .eq('event_team_id', eventTeamId)
      .eq('member_id', memberId)
    if (err) throw err
    await fetchEventTeams()
  }

  // Member: Request to join a sub-team
  const requestJoinTeam = async (eventTeamId, message = '') => {
    const { error: err } = await supabase
      .from('event_team_members')
      .upsert(
        { event_team_id: eventTeamId, member_id: user?.id, status: 'pending', request_message: message },
        { onConflict: 'event_team_id,member_id' }
      )
    if (err) throw err
    await fetchEventTeams()
  }

  // Admin: Approve a join request
  const approveJoinRequest = async (eventTeamId, memberId) => {
    const { error: err } = await supabase
      .from('event_team_members')
      .update({ status: 'active', reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
      .eq('event_team_id', eventTeamId)
      .eq('member_id', memberId)
    if (err) throw err
    await fetchEventTeams()
  }

  // Admin: Reject a join request
  const rejectJoinRequest = async (eventTeamId, memberId) => {
    const { error: err } = await supabase
      .from('event_team_members')
      .update({ status: 'rejected', reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
      .eq('event_team_id', eventTeamId)
      .eq('member_id', memberId)
    if (err) throw err
    await fetchEventTeams()
  }

  // Create a task in a sub-team
  const createEventTask = async ({ eventTeamId, title, description, assignedTo, priority, dueDate }) => {
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
    await fetchEventTeams()
    return data
  }

  // Update task status
  const updateTaskStatus = async (taskId, status) => {
    const { error: err } = await supabase
      .from('event_tasks')
      .update({ status })
      .eq('id', taskId)
    if (err) throw err
    await fetchEventTeams()
  }

  // Delete a task
  const deleteEventTask = async (taskId) => {
    const { error: err } = await supabase.from('event_tasks').delete().eq('id', taskId)
    if (err) throw err
    await fetchEventTeams()
  }

  // Assign a task to a member
  const assignTask = async (taskId, memberId) => {
    const { error: err } = await supabase
      .from('event_tasks')
      .update({ assigned_to: memberId })
      .eq('id', taskId)
    if (err) throw err
    await fetchEventTeams()
  }

  return {
    eventTeams,
    loading,
    error,
    refetch: fetchEventTeams,
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
