import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from './useAuth'

export const useTeams = () => {
  const { user } = useAuth()
  const [teams, setTeams] = useState([])
  const [myTeams, setMyTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchTeams = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
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

      setTeams(formatted)
      setMyTeams(formatted.filter(t => t.isMember))
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchTeams()
  }, [fetchTeams])

  const createTeam = async (name, department, leadId, memberIds) => {
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

      fetchTeams()
      return team
    } catch (err) {
      console.error('Error creating team:', err)
      throw err
    }
  }

  const deleteTeam = async (id) => {
    const { error: err } = await supabase.from('teams').delete().eq('id', id)
    if (err) throw err
    fetchTeams()
  }

  const removeMember = async (teamId, memberId) => {
    const { error: err } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('member_id', memberId)
    if (err) throw err
    fetchTeams()
  }

  const addMember = async (teamId, memberId) => {
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
    fetchTeams()
  }

  return {
    teams,
    myTeams,
    loading,
    error,
    refetch: fetchTeams,
    createTeam,
    deleteTeam,
    removeMember,
    addMember,
  }
}
