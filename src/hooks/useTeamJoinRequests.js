import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from './useAuth'

export const useTeamJoinRequests = () => {
  const { user } = useAuth()
  const [requests, setRequests] = useState([])
  const [myRequests, setMyRequests] = useState([]) // requests I've submitted
  const [loading, setLoading] = useState(true)

  const fetchRequests = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      // Admin/coordinator: fetch all pending requests
      const { data: allRequests } = await supabase
        .from('team_join_requests')
        .select(`
          *,
          member:profiles!team_join_requests_member_id_fkey(id, full_name, avatar_url, department, year),
          team:teams!team_join_requests_team_id_fkey(id, name, department)
        `)
        .eq('status', 'pending')
        .order('requested_at', { ascending: false })

      setRequests(allRequests || [])

      // My submitted requests
      const { data: mine } = await supabase
        .from('team_join_requests')
        .select('*, team:teams!team_join_requests_team_id_fkey(id, name)')
        .eq('member_id', user.id)

      setMyRequests(mine || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchRequests()

    const channel = supabase
      .channel('team_join_requests_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_join_requests' }, () => {
        fetchRequests()
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [fetchRequests])

  const requestJoin = async (teamId, message = '') => {
    const { error } = await supabase
      .from('team_join_requests')
      .upsert(
        { team_id: teamId, member_id: user?.id, status: 'pending', request_message: message },
        { onConflict: 'team_id,member_id' }
      )
    if (error) throw error
    await fetchRequests()
  }

  const approveRequest = async (requestId, teamId, memberId) => {
    // 1. Update request status
    const { error: reqErr } = await supabase
      .from('team_join_requests')
      .update({ status: 'approved', reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
      .eq('id', requestId)
    if (reqErr) throw reqErr

    // 2. Add member to team_members
    const { data: existing } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', teamId)
      .eq('member_id', memberId)
      .maybeSingle()

    if (!existing) {
      const { error: memErr } = await supabase
        .from('team_members')
        .insert({ team_id: teamId, member_id: memberId })
      if (memErr) throw memErr
    }

    await fetchRequests()
  }

  const rejectRequest = async (requestId) => {
    const { error } = await supabase
      .from('team_join_requests')
      .update({ status: 'rejected', reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
      .eq('id', requestId)
    if (error) throw error
    await fetchRequests()
  }

  // Get my request status for a specific team
  const getMyRequestStatus = (teamId) => {
    return myRequests.find(r => r.team_id === teamId)
  }

  return {
    requests,
    myRequests,
    loading,
    refetch: fetchRequests,
    requestJoin,
    approveRequest,
    rejectRequest,
    getMyRequestStatus,
  }
}
