import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from './useAuth'
import { sanitizeName, sanitizeText, sanitizeEnum, sanitizeNumber } from '../utils/sanitize'

const VALID_ROLES = ['all', 'member', 'department_lead', 'vice_chairperson', 'chairperson']

export const useNotifications = () => {
  const { user, role } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchNotifications = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
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
      setNotifications(data || [])
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [user, role])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const sendNotification = async (notifData) => {
    const safeData = {
      title: sanitizeName(notifData.title, 255),
      message: sanitizeText(notifData.message, 2000),
      priority: sanitizeNumber(notifData.priority, 1, 5) ?? 3,
      type: sanitizeEnum(notifData.type, ['announcement', 'task', 'event', 'system', 'message']) || 'announcement',
      target_role: sanitizeEnum(notifData.target_role, VALID_ROLES) || 'all',
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
    fetchNotifications()
    return data ? data[0] : null
  }

  const markRead = async (id) => {
    const { error: err } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)

    if (err) throw err
    fetchNotifications()
  }

  return {
    notifications,
    loading,
    error,
    refetch: fetchNotifications,
    sendNotification,
    markRead
  }
}
