import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from './useAuth'
import { useCachedQuery, useCachedMutation } from '../context/CacheContext'

const TEAM_JOIN_REQUESTS_CACHE_TAG = 'team_join_requests'

export const useTeamJoinRequests = () => {
  const { user } = useAuth()

  // Use cached query for fetching
  const {
    data: allData = { requests: [], myRequests: [] },
    loading,
    error,
    isStale,
    refetch,
    updateCache
  } = useCachedQuery(
    `team_join_requests_${user?.id || 'none'}`,
    async () => {
      if (!user) return { requests: [], myRequests: [] }

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

      // My submitted requests
      const { data: mine } = await supabase
        .from('team_join_requests')
        .select('*, team:teams!team_join_requests_team_id_fkey(id, name)')
        .eq('member_id', user.id)

      return {
        requests: allRequests || [],
        myRequests: mine || []
      }
    },
    {
      ttl: 24 * 60 * 60 * 1000, // 24 hours — invalidated on mutation
      tags: [TEAM_JOIN_REQUESTS_CACHE_TAG],
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      enabled: !!user
    }
  )

  // Set up real-time subscription for instant updates
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel('team_join_requests_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_join_requests' }, () => {
        refetch()
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [refetch, user])

  // Mutations with cache invalidation
  const requestJoin = useCachedMutation(
    async (teamId, message = '') => {
      const { error } = await supabase
        .from('team_join_requests')
        .upsert(
          { team_id: teamId, member_id: user?.id, status: 'pending', request_message: message },
          { onConflict: 'team_id,member_id' }
        )
      if (error) throw error
    },
    {
      invalidateTags: [TEAM_JOIN_REQUESTS_CACHE_TAG],
      onSuccess: () => refetch()
    }
  )

  const approveRequest = useCachedMutation(
    async (requestId, teamId, memberId) => {
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
    },
    {
      invalidateTags: [TEAM_JOIN_REQUESTS_CACHE_TAG, 'teams'],
      onSuccess: () => refetch()
    }
  )

  const rejectRequest = useCachedMutation(
    async (requestId) => {
      const { error } = await supabase
        .from('team_join_requests')
        .update({ status: 'rejected', reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
        .eq('id', requestId)
      if (error) throw error
    },
    {
      invalidateTags: [TEAM_JOIN_REQUESTS_CACHE_TAG],
      onSuccess: () => refetch()
    }
  )

  // Get my request status for a specific team
  const getMyRequestStatus = (teamId) => {
    return allData.myRequests?.find(r => r.team_id === teamId)
  }

  return {
    requests: allData.requests,
    myRequests: allData.myRequests,
    loading,
    error,
    isStale,
    refetch,
    requestJoin,
    approveRequest,
    rejectRequest,
    getMyRequestStatus,
  }
}