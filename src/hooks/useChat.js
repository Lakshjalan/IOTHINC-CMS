import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from './useAuth'
import { sanitizeName } from '../utils/sanitize'

// chatType: 'lobby' | 'dm' | 'team'
export const useChat = (receiverId = null, teamId = null) => {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)

  const chatKey = teamId ? `team_${teamId}` : receiverId ? `dm_${receiverId}` : 'lobby'

  const fetchMessages = useCallback(async () => {
    if (!user) return
    setLoading(true)

    try {
      let query = supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(full_name, avatar_url)
        `)
        .order('created_at', { ascending: true })

      if (teamId) {
        // Team chat
        query = query.eq('team_id', teamId).is('receiver_id', null)
      } else if (receiverId) {
        // 1-on-1 DM
        query = query
          .is('team_id', null)
          .or(`and(sender_id.eq.${user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user.id})`)
      } else {
        // Global lobby
        query = query.is('receiver_id', null).is('team_id', null)
      }

      const { data, error } = await query
      if (error) throw error
      setMessages(data || [])
    } catch (err) {
      console.error('Error fetching messages:', err)
    } finally {
      setLoading(false)
    }
  }, [user, receiverId, teamId])

  useEffect(() => {
    fetchMessages()

    const channel = supabase
      .channel(`chat_${chatKey}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          if (teamId) {
            if (payload.new.team_id === teamId) fetchMessages()
          } else if (receiverId) {
            if (
              (payload.new.sender_id === user?.id && payload.new.receiver_id === receiverId) ||
              (payload.new.sender_id === receiverId && payload.new.receiver_id === user?.id)
            ) fetchMessages()
          } else {
            if (payload.new.receiver_id === null && payload.new.team_id === null) fetchMessages()
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchMessages, receiverId, teamId, user, chatKey])

  const sendMessage = async (content) => {
    if (!user || !content.trim()) return

    // Sanitize: trim, strip control characters, cap length
    const safeContent = sanitizeName(content.trim(), 4000)
    if (!safeContent) return

    try {
      const insertData = {
        sender_id: user.id,
        content: safeContent,
        receiver_id: teamId ? null : receiverId,
        team_id: teamId || null,
      }

      const { error } = await supabase.from('messages').insert(insertData)
      if (error) throw error
    } catch (err) {
      console.error('Error sending message:', err)
      throw err
    }
  }

  return { messages, loading, sendMessage }
}
