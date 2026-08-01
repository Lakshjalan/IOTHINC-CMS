import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from './useAuth'
import { useCachedQuery, useCachedMutation } from '../context/CacheContext'

const TEAMS_CACHE_TAG = 'teams'

export const useTeams = () => {
  const { user } = useAuth()

  // Use cached query for fetching
  const {
    data: teamsData = { teams: [], myTeams: [] },
    loading,
    error,
    isStale,
    refetch,
    updateCache
  } = useCachedQuery(
    'teams_all',
    async () => {
      const { data, error: fetchErr } = await supabase
        .from('teams')
        .select(`
          *,
          lead:profiles!teams_lead_id_fkey(id, full_name, email, avatar_url),
          team_members(id, member_id, joined_at, profiles(id, full_name, avatar_url, department)),
          projects(id)
        `)
        .order('name')

      if (fetchErr) throw fetchErr

      const formatted = (data || []).map(team => {
        const isMember = team.team_members?.some(m => m.member_id === user?.id)
        return {
          ...team,
          memberCount: team.team_members?.length || 0,
          projectCount: team.projects?.length || 0,
          isMember,
          members: team.team_members?.map(m => m.profiles).filter(Boolean) || [],
        }
      })

      return {
        teams: formatted,
        myTeams: formatted.filter(t => t.isMember)
      }
    },
    {
      ttl: 5 * 60 * 1000, // 5 minutes
      tags: [TEAMS_CACHE_TAG],
      refetchOnMount: true,
      refetchOnWindowFocus: false
    }
  )

  // Mutations with cache invalidation
  const createTeam = useCachedMutation(
    async (name, department, leadId, memberIds) => {
      try {
        const { data: team, error: teamErr } = await supabase
          .from('teams')
          .insert({ name, department, lead_id: leadId, status: 'active' })
          .select()
          .single()

        if (teamErr) throw teamErr

        const uniqueMembers = Array.from(new Set([leadId, ...memberIds].filter(Boolean)))
        if (uniqueMembers.length > 0) {
          const memberRows = uniqueMembers.map(memberId => ({ team_id: team.id, member_id: memberId }))
          const { error: memErr } = await supabase.from('team_members').insert(memberRows)
          if (memErr) throw memErr
        }

        return team
      } catch (err) {
        console.error('Error creating team:', err)
        throw err
      }
    },
    {
      invalidateTags: [TEAMS_CACHE_TAG],
      onSuccess: () => refetch()
    }
  )

  const deleteTeam = useCachedMutation(
    async (id) => {
      const { error: err } = await supabase.from('teams').delete().eq('id', id)
      if (err) throw err
    },
    {
      invalidateTags: [TEAMS_CACHE_TAG],
      onSuccess: () => refetch()
    }
  )

  const removeMember = useCachedMutation(
    async (teamId, memberId) => {
      const { error: err } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', teamId)
        .eq('member_id', memberId)
      if (err) throw err
    },
    {
      invalidateTags: [TEAMS_CACHE_TAG],
      onSuccess: () => refetch()
    }
  )

  const addMember = useCachedMutation(
    async (teamId, memberId) => {
      const { data: existing } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', teamId)
        .eq('member_id', memberId)
        .maybeSingle()

      if (existing) return

      const { error: err } = await supabase
        .from('team_members')
        .insert({ team_id: teamId, member_id: memberId })
      if (err) throw err
    },
    {
      invalidateTags: [TEAMS_CACHE_TAG],
      onSuccess: () => refetch()
    }
  )

  return {
    teams: teamsData.teams,
    myTeams: teamsData.myTeams,
    loading,
    error,
    isStale,
    refetch,
    createTeam,
    deleteTeam,
    removeMember,
    addMember,
  }
}