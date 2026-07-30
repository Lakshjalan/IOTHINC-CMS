import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from './useAuth'
import { sanitizeName, sanitizeText, sanitizeUrl, sanitizeStringArray, sanitizeEnum } from '../utils/sanitize'

export const useContributions = (filters = {}) => {
  const { user, role } = useAuth()
  const [contributions, setContributions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchContributions = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
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

      setContributions(filtered)
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [user, role, filters.projectId, filters.eventId, filters.memberId])

  useEffect(() => {
    fetchContributions()
  }, [fetchContributions])

  // Image Upload helper (Cloudinary Primary -> Supabase Fallback)
  const uploadPhoto = async (file) => {
    if (!user) throw new Error('User must be logged in')

    try {
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME

      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', 'ml_default')

      const cldRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData
      })

      if (cldRes.ok) {
        const cldData = await cldRes.json()
        return cldData.secure_url
      }

      throw new Error('Cloudinary upload unsuccessful')
    } catch (cldErr) {
      // Fallback to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('contribution-photos')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('contribution-photos')
        .getPublicUrl(filePath)

      return publicUrl
    }
  }

  const addContribution = async (contributionData, file) => {
    let photoUrl = contributionData.photo_url || null
    if (file) {
      photoUrl = await uploadPhoto(file)
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
    fetchContributions()
    return data
  }

  const toggleFlagContribution = async (id, flaggedState) => {
    const { error: err } = await supabase
      .from('contributions')
      .update({ flagged: flaggedState })
      .eq('id', id)

    if (err) throw err
    fetchContributions()
  }

  const deleteContribution = async (id) => {
    const { error: err } = await supabase
      .from('contributions')
      .delete()
      .eq('id', id)

    if (err) throw err
    fetchContributions()
  }

  // Comments support
  const addComment = async (contributionId, commentText) => {
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
    fetchContributions() // Refresh contribution counts
    return data
  }

  const getComments = async (contributionId) => {
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
  }

  return {
    contributions,
    loading,
    error,
    refetch: fetchContributions,
    addContribution,
    toggleFlagContribution,
    deleteContribution,
    addComment,
    getComments
  }
}
