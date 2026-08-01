import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from './useAuth'
import { sanitizeName, sanitizeText, sanitizeUrl, sanitizeStringArray, sanitizeEnum } from '../utils/sanitize'
import { useContributionPhotoUpload } from '../lib/unifiedStorage'
import { useCachedQuery, useCachedMutation } from '../context/CacheContext'

const CONTRIBUTIONS_CACHE_TAG = 'contributions'

export const useContributions = (filters = {}) => {
  const { user, role } = useAuth()

  // Use cached query for fetching
  const {
    data: contributions = [],
    loading,
    error,
    isStale,
    refetch,
    updateCache
  } = useCachedQuery(
    `contributions_${JSON.stringify(filters)}_${role || 'none'}`,
    async () => {
      let query = supabase
        .from('contributions')
        .select(`
          *,
          member:profiles!contributions_member_id_fkey(full_name, avatar_url),
          project:projects(title),
          event:events(title),
          comments:contribution_comments(count)
        `)

      // If user is not admin, filter private contributions locally or via supabase query
      if (role !== 'admin') {
        // Fetch public ones OR user's own contributions
        // (visibility = 'public' or member_id = auth.uid())
      }

      const { data, error: fetchErr } = await query.order('created_at', { ascending: false })

      if (fetchErr) throw fetchErr

      // Filter based on visibility policies
      let filtered = data || []
      if (role !== 'admin') {
        filtered = filtered.filter(c => c.visibility === 'public' || c.member_id === user?.id)
      }

      // Apply filter params
      if (filters.projectId) {
        filtered = filtered.filter(c => c.project_id === filters.projectId)
      }
      if (filters.eventId) {
        filtered = filtered.filter(c => c.event_id === filters.eventId)
      }
      if (filters.memberId) {
        filtered = filtered.filter(c => c.member_id === filters.memberId)
      }

      return filtered
    },
    {
      ttl: 5 * 60 * 1000, // 5 minutes
      tags: [CONTRIBUTIONS_CACHE_TAG],
      refetchOnMount: true,
      refetchOnWindowFocus: false
    }
  )

  const uploadPhoto = useContributionPhotoUpload()

  // Mutations with cache invalidation
  const addContribution = useCachedMutation(
    async (contributionData, file) => {
      let photoUrl = contributionData.photo_url || null
      if (file) {
        const result = await uploadPhoto(file, user?.id)
        photoUrl = result.url
      }

      // Sanitize all free-text fields before persisting
      const safeData = {
        title: sanitizeName(contributionData.title, 255),
        description: sanitizeText(contributionData.description, 5000),
        type: sanitizeEnum(contributionData.type, ['project', 'research', 'event', 'competition', 'other']),
        visibility: sanitizeEnum(contributionData.visibility, ['public', 'private']) || 'public',
        external_link: sanitizeUrl(contributionData.external_link) || null,
        tags: sanitizeStringArray(contributionData.tags || []),
        project_id: contributionData.project_id || null,
        event_id: contributionData.event_id || null,
      }

      const { data, error: err } = await supabase
        .from('contributions')
        .insert({
          ...safeData,
          member_id: user?.id,
          photo_url: photoUrl
        })
        .select()
        .single()

      if (err) throw err
      return data
    },
    {
      invalidateTags: [CONTRIBUTIONS_CACHE_TAG],
      onSuccess: () => refetch()
    }
  )

  const toggleFlagContribution = useCachedMutation(
    async (id, flaggedState) => {
      const { error: err } = await supabase
        .from('contributions')
        .update({ flagged: flaggedState })
        .eq('id', id)

      if (err) throw err
    },
    {
      invalidateTags: [CONTRIBUTIONS_CACHE_TAG],
      onSuccess: () => refetch()
    }
  )

  const deleteContribution = useCachedMutation(
    async (id) => {
      const { error: err } = await supabase
        .from('contributions')
        .delete()
        .eq('id', id)

      if (err) throw err
    },
    {
      invalidateTags: [CONTRIBUTIONS_CACHE_TAG],
      onSuccess: () => refetch()
    }
  )

  // Comments support
  const addComment = useCachedMutation(
    async (contributionId, commentText) => {
      if (!user) throw new Error('User must be logged in')
      const safeComment = sanitizeText(commentText, 2000)
      if (!safeComment) throw new Error('Comment cannot be empty')
      const { data, error: err } = await supabase
        .from('contribution_comments')
        .insert({
          contribution_id: contributionId,
          author_id: user.id,
          comment: safeComment
        })
        .select(`
          *,
          author:profiles!contribution_comments_author_id_fkey(full_name, avatar_url)
        `)
        .single()

      if (err) throw err
      return data
    },
    {
      invalidateTags: [CONTRIBUTIONS_CACHE_TAG],
      onSuccess: () => refetch()
    }
  )

  const getComments = useCachedQuery(
    `contribution_comments_${null}`,
    async (contributionId) => {
      const { data, error: err } = await supabase
        .from('contribution_comments')
        .select(`
          *,
          author:profiles!contribution_comments_author_id_fkey(full_name, avatar_url)
        `)
        .eq('contribution_id', contributionId)
        .order('created_at', { ascending: true })

      if (err) throw err
      return data
    },
    {
      ttl: 2 * 60 * 1000,
      tags: [CONTRIBUTIONS_CACHE_TAG],
      enabled: false // We'll call this manually
    }
  )

  return {
    contributions,
    loading,
    error,
    isStale,
    refetch,
    addContribution,
    toggleFlagContribution,
    deleteContribution,
    addComment,
    getComments: getComments.getOrFetch
  }
}