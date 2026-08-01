import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { sanitizeName, sanitizeText, sanitizeEmail, sanitizeEnum, sanitizeNumber, sanitizeStringArray } from '../utils/sanitize'
import { useCachedQuery, useCachedMutation } from '../context/CacheContext'

// Cache key generators
const getMembersCacheKey = (filters) => `members_${JSON.stringify(filters)}`
const MEMBERS_CACHE_TAG = 'members'

export const useMembers = (filters = {}) => {
  // Use cached query for fetching
  const {
    data: members = [],
    loading,
    error,
    isStale,
    refetch,
    updateCache
  } = useCachedQuery(
    getMembersCacheKey(filters),
    async () => {
      let query = supabase
        .from('profiles')
        .select('*, contributions(count)')

      if (filters.department) {
        query = query.eq('department', filters.department)
      }
      if (filters.year) {
        query = query.eq('year', filters.year)
      }
      if (filters.role) {
        query = query.eq('role', filters.role)
      }

      const { data, error: fetchErr } = await query.order('full_name')

      if (fetchErr) throw fetchErr

      // Format response to flat contributions count
      const formatted = data.map(m => ({
        ...m,
        contributionsCount: m.contributions ? m.contributions[0]?.count || 0 : 0
      }))

      return formatted
    },
    {
      ttl: 5 * 60 * 1000, // 5 minutes
      tags: [MEMBERS_CACHE_TAG],
      refetchOnMount: true,
      refetchOnWindowFocus: false
    }
  )

  // Mutations with cache invalidation
  const addMember = useCachedMutation(
    async (memberData) => {
      // Note: Creating user in auth is done via Supabase auth, this writes profile details
      // For admin to insert into profiles directly:
      const safeData = {
        full_name: sanitizeName(memberData.full_name, 255),
        email: sanitizeEmail(memberData.email),
        role: sanitizeEnum(memberData.role, ['member', 'department_lead', 'vice_chairperson', 'chairperson']) || 'member',
        department: sanitizeName(memberData.department, 100),
        year: sanitizeNumber(memberData.year, 1, 6),
        skills: sanitizeStringArray(memberData.skills || []),
        bio: sanitizeText(memberData.bio, 2000),
        needs_approval: memberData.needs_approval === true ? true : false,
      }
      const { data, error: err } = await supabase
        .from('profiles')
        .insert(safeData)
        .select()

      if (err) throw err
      return data ? data[0] : null
    },
    {
      invalidateTags: [MEMBERS_CACHE_TAG],
      onSuccess: () => refetch()
    }
  )

  const updateMember = useCachedMutation(
    async (id, memberData) => {
      // Sanitize only the fields that are being updated
      const safeData = {}
      if (memberData.full_name !== undefined) safeData.full_name   = sanitizeName(memberData.full_name, 255)
      if (memberData.email !== undefined)     safeData.email       = sanitizeEmail(memberData.email)
      if (memberData.role !== undefined)      safeData.role        = sanitizeEnum(memberData.role, ['member', 'department_lead', 'vice_chairperson', 'chairperson'])
      if (memberData.department !== undefined)safeData.department  = sanitizeName(memberData.department, 100)
      if (memberData.year !== undefined)      safeData.year        = sanitizeNumber(memberData.year, 1, 6)
      if (memberData.skills !== undefined)    safeData.skills      = sanitizeStringArray(memberData.skills || [])
      if (memberData.bio !== undefined)       safeData.bio         = sanitizeText(memberData.bio, 2000)
      if (memberData.needs_approval !== undefined) safeData.needs_approval = !!memberData.needs_approval
      if (memberData.member_tag !== undefined) safeData.member_tag = sanitizeText(memberData.member_tag, 100)

      const { data, error: err } = await supabase
        .from('profiles')
        .update(safeData)
        .eq('id', id)
        .select()

      if (err) throw err
      // Supabase does NOT return an error when RLS blocks an update -- it
      // just returns 0 rows. Treat that as a failure instead of silently
      // reporting success, otherwise the UI lies about what happened.
      if (!data || data.length === 0) {
        throw new Error('Update was blocked: you may not have permission to change this profile.')
      }
      return data[0]
    },
    {
      invalidateTags: [MEMBERS_CACHE_TAG],
      onSuccess: () => refetch()
    }
  )

  const deleteMember = useCachedMutation(
    async (id) => {
      const { error: err } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id)

      if (err) throw err
    },
    {
      invalidateTags: [MEMBERS_CACHE_TAG],
      onSuccess: () => refetch()
    }
  )

  return {
    members,
    loading,
    error,
    isStale,
    refetch,
    addMember,
    updateMember,
    deleteMember
  }
}