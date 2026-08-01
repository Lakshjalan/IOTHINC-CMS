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
  // Local storage cache key for this chat
  const cacheKey = `chat_${chatKey}_messages`

  const fetchMessages = useCallback(async () => {
    if (!user) return
    // Try to load from cache first
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        setMessages(parsed)
        setLoading(false)
      } catch (e) {
        console.warn('Failed to parse cached messages', e)
      }
    }
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
      // Save to cache
      localStorage.setItem(cacheKey, JSON.stringify(data || []))
    } catch (err) {
      console.error('Error fetching messages:', err)
    } finally {
      setLoading(false)
    }
  }, [user, receiverId, teamId, cacheKey])

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
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload) => {
          // Refresh messages when someone updates (e.g., soft delete)
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

  const deleteMessage = async (messageId) => {
    if (!user) return

    try {
      // Soft delete: set is_deleted to true
      // The trigger will validate the 48-hour window and sender_id
      const { error } = await supabase
        .from('messages')
        .update({ is_deleted: true })
        .eq('id', messageId)
        .eq('sender_id', user.id)

      if (error) throw error
      
      // Refresh messages to reflect the deletion
      await fetchMessages()
    } catch (err) {
      console.error('Error deleting message:', err)
      throw err
    }
  }

  const canDeleteMessage = (message) => {
    // Check if user is the sender
    if (message.sender_id !== user?.id) return false
    
    // Check if message is already deleted
    if (message.is_deleted) return false
    
    // Calculate hours since message was created
    const createdAt = new Date(message.created_at)
    const now = new Date()
    const hoursDiff = (now - createdAt) / (1000 * 60 * 60)
    
    // Allow deletion within 48 hours
    return hoursDiff <= 48
  }

  const getTimeRemainingForDelete = (message) => {
    const createdAt = new Date(message.created_at)
    const now = new Date()
    const expiryTime = new Date(createdAt.getTime() + 48 * 60 * 60 * 1000) // 48 hours in ms
    const timeRemaining = expiryTime - now
    
    if (timeRemaining <= 0) return { hours: 0, minutes: 0 }
    
    const hours = Math.floor(timeRemaining / (1000 * 60 * 60))
    const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60))
    
    return { hours, minutes }
  }

  return { 
    messages, 
    loading, 
    sendMessage, 
    deleteMessage, 
    canDeleteMessage, 
    getTimeRemainingForDelete 
  }
}
