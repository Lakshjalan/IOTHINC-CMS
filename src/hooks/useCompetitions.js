import { supabase } from '../supabaseClient'
import { useAuth } from './useAuth'
import { useCachedQuery, useCachedMutation } from '../context/CacheContext'

const COMPETITIONS_CACHE_TAG = 'competitions'

export const useCompetitions = () => {
  const { user } = useAuth()

  const {
    data: competitions = [],
    loading,
    error,
    isStale,
    refetch
  } = useCachedQuery(
    'competitions_all',
    async () => {
      const { data, error: fetchErr } = await supabase
        .from('competitions')
        .select(`
          *,
          host:profiles!competitions_hosted_by_fkey(full_name),
          submissions:competition_submissions(id, member_id, team_name, team_members, status, created_at)
        `)
        .order('created_at', { ascending: false })

      if (fetchErr) throw fetchErr
      return data || []
    },
    {
      ttl: 24 * 60 * 60 * 1000, // 24 hours — invalidated on mutation
      tags: [COMPETITIONS_CACHE_TAG],
      refetchOnMount: true,
      refetchOnWindowFocus: false
    }
  )

  const submitEntry = useCachedMutation(
    async ({ competitionId, teamName, teamMembers }) => {
      if (!user) throw new Error('User must be logged in')
      const { data, error: err } = await supabase
        .from('competition_submissions')
        .insert({
          competition_id: competitionId,
          member_id: user.id,
          team_name: teamName,
          team_members: teamMembers.length > 0 ? JSON.stringify(teamMembers) : null,
          status: 'submitted'
        })
        .select()
        .single()

      if (err) throw err
      return data
    },
    {
      invalidateTags: [COMPETITIONS_CACHE_TAG],
      onSuccess: () => refetch()
    }
  )

  const deleteCompetition = useCachedMutation(
    async (id) => {
      const { error: err } = await supabase
        .from('competitions')
        .delete()
        .eq('id', id)

      if (err) throw err
    },
    {
      invalidateTags: [COMPETITIONS_CACHE_TAG],
      onSuccess: () => refetch()
    }
  )

  return {
    competitions,
    loading,
    error,
    isStale,
    refetch,
    submitEntry,
    deleteCompetition
  }
}
