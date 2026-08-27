import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from './useAuth'
import { sanitizeName, sanitizeText, sanitizeEnum, sanitizeNumber } from '../utils/sanitize'
import { useCachedQuery, useCachedMutation } from '../context/CacheContext'

const VALID_ROLES = ['all', 'member', 'department_lead', 'vice_chairperson', 'chairperson']
const NOTIFICATIONS_CACHE_TAG = 'notifications'

export const useNotifications = () => {
  const { user, role } = useAuth()

  // Use cached query for fetching
  const {
    data: notifications = [],
    loading,
    error,
    isStale,
    refetch,
    updateCache
  } = useCachedQuery(
    `notifications_${user?.id || 'none'}_${role || 'none'}`,
    async () => {
      if (!user) return []
      // Sanitize the role before interpolating it into a .or() filter string
      // to prevent filter-string injection via a tampered user role.
      const safeRole = sanitizeEnum(role, VALID_ROLES) || 'member'
      const { data, error: fetchErr } = await supabase
        .from('notifications')
        .select(`
          *,
          sender:profiles!notifications_sender_id_fkey(full_name, avatar_url)
        `)
        .or(`target_member_id.eq.${user.id},target_role.eq.all,target_role.eq.${safeRole}`)
        .order('created_at', { ascending: false })

      if (fetchErr) throw fetchErr
      return data || []
    },
    {
      ttl: 10 * 60 * 1000, // 10 minutes — notifications refresh more often
      tags: [NOTIFICATIONS_CACHE_TAG],
      refetchOnMount: true,
      refetchOnWindowFocus: true, // Refetch on focus for notifications
      enabled: !!user
    }
  )

  // Mutations with cache invalidation
  const sendNotification = useCachedMutation(
    async (notifData) => {
      const safeData = {
        title: sanitizeName(notifData.title, 255),
        message: sanitizeText(notifData.message, 2000),
        priority: sanitizeNumber(notifData.priority, 1, 5) ?? 3,
        type: sanitizeEnum(notifData.type, ['announcement', 'task', 'event', 'system', 'message']) || 'announcement',
        target_role: notifData.target_role ? (sanitizeEnum(notifData.target_role, VALID_ROLES) || 'all') : (notifData.target_member_id ? null : 'all'),
        target_member_id: notifData.target_member_id || null,
      }
      const { data, error: err } = await supabase
        .from('notifications')
        .insert({
          ...safeData,
          sender_id: user?.id
        })
        .select()

      if (err) throw err
      return data ? data[0] : null
    },
    {
      invalidateTags: [NOTIFICATIONS_CACHE_TAG],
      onSuccess: () => refetch()
    }
  )

  const markRead = useCachedMutation(
    async (id) => {
      const { error: err } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id)

      if (err) throw err
    },
    {
      invalidateTags: [NOTIFICATIONS_CACHE_TAG],
      onSuccess: () => refetch()
    }
  )

  return {
    notifications,
    loading,
    error,
    isStale,
    refetch,
    sendNotification,
    markRead
  }
}