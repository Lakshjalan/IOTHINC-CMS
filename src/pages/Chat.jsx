import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useChat } from '../hooks/useChat'
import { useTeams } from '../hooks/useTeams'
import { supabase } from '../supabaseClient'

export const Chat = () => {
  const { user, profile } = useAuth()
  const [activeChat, setActiveChat] = useState({ type: 'lobby', data: null })
  // type: 'lobby' | 'dm' | 'department' | 'event_team'
  const [members, setMembers] = useState([])
  const [myEventTeams, setMyEventTeams] = useState([])
  const [messageText, setMessageText] = useState('')
  const [showDMs, setShowDMs] = useState(true)
  const [showEventTeams, setShowEventTeams] = useState(true)
  const [onlineUsers, setOnlineUsers] = useState([])
  const messagesEndRef = useRef(null)

  // "departments" are the teams from the departments/teams table
  const { myTeams: myDepartments } = useTeams()

  // Determine IDs for useChat
  const receiverId = activeChat.type === 'dm' ? activeChat.data?.id : null
  const teamId = (activeChat.type === 'department' || activeChat.type === 'event_team')
    ? activeChat.data?.id
    : null

  const { messages, loading, sendMessage } = useChat(receiverId, teamId)

  // Fetch all other members for DMs
  useEffect(() => {
    const fetchMembers = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role')
        .neq('id', user?.id)
        .order('full_name')
      setMembers(data || [])
    }
    if (user) fetchMembers()
  }, [user])

  // Fetch event teams where I'm an active member
  useEffect(() => {
    const fetchMyEventTeams = async () => {
      if (!user) return
      const { data } = await supabase
        .from('event_team_members')
        .select(`
          event_team_id,
          status,
          event_teams(id, name, event_id, events(title))
        `)
        .eq('member_id', user.id)
        .eq('status', 'active')
      const teams = (data || [])
        .map(row => row.event_teams)
        .filter(Boolean)
      setMyEventTeams(teams)
    }
    fetchMyEventTeams()
  }, [user])

  // Subscribe to Presence for Online/Active Members
  useEffect(() => {
    if (!user) return

    const presenceChannel = supabase.channel('online-users')

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState()
        // Extract all active user IDs
        const onlineIds = Object.keys(state)
        setOnlineUsers(onlineIds)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            online_at: new Date().toISOString()
          })
        }
      })

    return () => {
      presenceChannel.unsubscribe()
    }
  }, [user])

  // Resolve online profiles for Active Now bar
  const activeMembers = onlineUsers
    .map(id => {
      if (id === user?.id) {
        return { id, full_name: 'You', avatar_url: profile?.avatar_url, role: profile?.role, isSelf: true }
      }
      return members.find(m => m.id === id)
    })
    .filter(Boolean)

  // Scroll to bottom when messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!messageText.trim()) return
    try {
      await sendMessage(messageText)
      setMessageText('')
    } catch (err) {
      alert('Failed to send message: ' + err.message)
    }
  }

  const getChatHeader = () => {
    if (activeChat.type === 'lobby') {
      return { title: 'Global Lobby', subtitle: 'Chat with everyone in IOTHINC', icon: 'public' }
    }
    if (activeChat.type === 'department') {
      return {
        title: activeChat.data.name,
        subtitle: `${activeChat.data.memberCount ?? ''} members · Department Channel`,
        icon: 'corporate_fare'
      }
    }
    if (activeChat.type === 'event_team') {
      return {
        title: activeChat.data.name,
        subtitle: `Event: ${activeChat.data.events?.title || 'Event Team'} · Team Channel`,
        icon: 'groups'
      }
    }
    // DM
    return {
      title: activeChat.data.full_name,
      subtitle: activeChat.data.role,
      avatar: activeChat.data.avatar_url ||
        `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(activeChat.data.full_name)}`
    }
  }

  const headerInfo = getChatHeader()

  const channelButtonClass = (active) =>
    `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
      active ? 'bg-primary/20 text-primary font-semibold' : 'text-on-surface hover:bg-surface-container-high'
    }`

  const channelIconClass = (active) =>
    `w-8 h-8 rounded-lg flex items-center justify-center ${
      active ? 'bg-primary text-on-primary' : 'bg-surface-container-highest text-on-surface'
    }`

  return (
    <main className="flex-1 flex flex-col md:flex-row h-screen pt-16 animate-in fade-in duration-200">
      
      {/* ── Sidebar: Chat Channels & Members ───────────────── */}
      <aside className="w-full md:w-72 bg-surface-container border-r border-outline-variant flex flex-col h-[calc(100vh-64px)] overflow-hidden shrink-0">
        <div className="p-4 border-b border-outline-variant flex items-center justify-between">
          <h2 className="font-bold text-on-surface text-lg">Messages</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto no-scrollbar py-2">

          {/* ── Active Now ────────────────────────── */}
          {activeMembers.length > 0 && (
            <div className="px-4 mb-4 border-b border-outline-variant/30 pb-4">
              <h3 className="text-[10px] font-label-caps uppercase text-on-surface-variant mb-2 px-1 flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                </span>
                Active Now ({activeMembers.length})
              </h3>
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                {activeMembers.map(act => (
                  <button
                    key={act.id}
                    onClick={() => {
                      if (!act.isSelf) {
                        setActiveChat({ type: 'dm', data: act })
                      }
                    }}
                    className="flex flex-col items-center shrink-0 w-12 text-center group cursor-pointer"
                  >
                    <div className="relative">
                      <img 
                        src={act.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(act.full_name)}`} 
                        alt={act.full_name} 
                        className="w-9 h-9 rounded-full object-cover border border-outline-variant group-hover:border-primary transition-colors"
                      />
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-success rounded-full ring-2 ring-surface animate-pulse" />
                    </div>
                    <span className="text-[9px] font-medium text-on-surface-variant group-hover:text-primary truncate w-full mt-1">
                      {act.full_name.split(' ')[0]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Global Lobby ──────────────────────── */}
          <div className="px-3 mb-4">
            <h3 className="text-[10px] font-label-caps uppercase text-on-surface-variant mb-2 px-2">Channels</h3>
            <button 
              onClick={() => setActiveChat({ type: 'lobby', data: null })}
              className={channelButtonClass(activeChat.type === 'lobby')}
            >
              <div className={channelIconClass(activeChat.type === 'lobby')}>
                <span className="material-symbols-outlined text-[18px]">public</span>
              </div>
              <span className="text-sm">Global Lobby</span>
            </button>
          </div>

          {/* ── Department Channels (from teams/departments table) ── */}
          {myDepartments && myDepartments.length > 0 && (
            <div className="px-3 mb-4">
              <h3 className="text-[10px] font-label-caps uppercase text-on-surface-variant mb-2 px-2 flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">lock</span>
                Department Channels
              </h3>
              {myDepartments.map(dept => {
                const isActive = activeChat.type === 'department' && activeChat.data.id === dept.id
                return (
                  <button 
                    key={dept.id}
                    onClick={() => setActiveChat({ type: 'department', data: dept })}
                    className={`${channelButtonClass(isActive)} mb-1`}
                  >
                    <div className={`${channelIconClass(isActive)} text-xs font-bold`}>
                      <span className="material-symbols-outlined text-[16px]">corporate_fare</span>
                    </div>
                    <div className="flex flex-col items-start truncate flex-1">
                      <span className="truncate text-sm">{dept.name}</span>
                      {dept.department && (
                        <span className="text-[10px] text-on-surface-variant/60 font-label-caps uppercase truncate">{dept.department}</span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* ── Event Team Channels ───────────────── */}
          {myEventTeams.length > 0 && (
            <div className="px-3 mb-4">
              <button
                onClick={() => setShowEventTeams(!showEventTeams)}
                className="w-full text-left flex items-center justify-between text-[10px] font-label-caps uppercase text-on-surface-variant mb-2 px-2 hover:text-on-surface transition-colors"
              >
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">groups</span>
                  Event Team Channels
                </span>
                <span className="material-symbols-outlined text-[14px]">
                  {showEventTeams ? 'expand_less' : 'expand_more'}
                </span>
              </button>
              {showEventTeams && myEventTeams.map(et => {
                const isActive = activeChat.type === 'event_team' && activeChat.data.id === et.id
                return (
                  <button
                    key={et.id}
                    onClick={() => setActiveChat({ type: 'event_team', data: et })}
                    className={`${channelButtonClass(isActive)} mb-1`}
                  >
                    <div className={`${channelIconClass(isActive)} text-xs font-bold`}>
                      {et.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col items-start truncate flex-1">
                      <span className="truncate text-sm">{et.name}</span>
                      {et.events?.title && (
                        <span className="text-[10px] text-on-surface-variant/60 font-label-caps uppercase truncate">{et.events.title}</span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* ── Direct Messages ───────────────────── */}
          <div className="px-3 mt-2">
            <button
              onClick={() => setShowDMs(!showDMs)}
              className="w-full text-left flex items-center justify-between text-[10px] font-label-caps uppercase text-on-surface-variant mb-2 px-2 hover:text-on-surface transition-colors"
            >
              <span>Direct Messages</span>
              <span className="material-symbols-outlined text-[14px]">{showDMs ? 'expand_less' : 'expand_more'}</span>
            </button>
            {showDMs && members.map(member => {
              const isActive = activeChat.type === 'dm' && activeChat.data.id === member.id
              const isOnline = onlineUsers.includes(member.id)
              return (
                <button 
                  key={member.id}
                  onClick={() => setActiveChat({ type: 'dm', data: member })}
                  className={`${channelButtonClass(isActive)} mb-1`}
                >
                  <div className="relative shrink-0">
                    <img 
                      src={member.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(member.full_name)}`} 
                      alt={member.full_name} 
                      className="w-8 h-8 rounded-full object-cover border border-outline-variant"
                    />
                    {isOnline && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-success rounded-full ring-2 ring-surface" />
                    )}
                  </div>
                  <div className="flex flex-col items-start truncate">
                    <span className="truncate text-sm">{member.full_name}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </aside>

      {/* ── Main Chat Area ─────────────────────────────────── */}
      <section className="flex-1 flex flex-col h-[calc(100vh-64px)] bg-background relative">
        {/* Chat Header */}
        <header className="h-16 border-b border-outline-variant bg-surface-container-lowest flex items-center px-6 shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-3">
            {headerInfo.icon ? (
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-2xl">{headerInfo.icon}</span>
              </div>
            ) : (
              <img src={headerInfo.avatar} alt="" className="w-10 h-10 rounded-full border border-outline-variant object-cover"/>
            )}
            <div>
              <h2 className="font-bold text-on-surface text-base leading-none mb-1">{headerInfo.title}</h2>
              <p className="text-[11px] text-on-surface-variant uppercase font-label-caps">{headerInfo.subtitle}</p>
            </div>
          </div>
        </header>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
             <div className="h-full flex items-center justify-center">
               <svg className="animate-spin h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24">
                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                 <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"></path>
               </svg>
             </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-on-surface-variant opacity-60">
              <span className="material-symbols-outlined text-6xl mb-4">forum</span>
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_id === user?.id
              return (
                <div key={msg.id} className={`flex gap-3 max-w-[80%] ${isMe ? 'ml-auto flex-row-reverse' : ''}`}>
                  {!isMe && (
                    <img 
                      src={msg.sender?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(msg.sender?.full_name || 'U')}`} 
                      alt="" 
                      className="w-8 h-8 rounded-full border border-outline-variant object-cover shrink-0 mt-1"
                    />
                  )}
                  <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    {!isMe && <span className="text-[10px] text-on-surface-variant font-label-caps uppercase ml-1 mb-1">{msg.sender?.full_name}</span>}
                    <div className={`px-4 py-2.5 text-sm leading-relaxed ${isMe ? 'bg-primary text-on-primary rounded-2xl rounded-tr-sm' : 'bg-surface-container-highest text-on-surface rounded-2xl rounded-tl-sm'}`}>
                      {msg.content}
                    </div>
                    <span className="text-[10px] text-outline mt-1 mx-1">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-surface-container border-t border-outline-variant shrink-0">
          <form onSubmit={handleSend} className="max-w-4xl mx-auto relative flex items-center">
            <input 
              type="text" 
              value={messageText}
              onChange={e => setMessageText(e.target.value)}
              placeholder={
                activeChat.type === 'lobby'
                  ? 'Message the Global Lobby…'
                  : activeChat.type === 'department'
                  ? `Message #${headerInfo.title}…`
                  : activeChat.type === 'event_team'
                  ? `Message team ${headerInfo.title}…`
                  : `Message ${headerInfo.title}…`
              }
              className="w-full bg-surface-container-low text-on-surface placeholder:text-outline border border-outline-variant rounded-full pl-6 pr-14 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
            <button 
              type="submit"
              disabled={!messageText.trim()}
              className="absolute right-2 w-10 h-10 bg-primary text-on-primary rounded-full hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-[20px] ml-0.5">send</span>
            </button>
          </form>
        </div>
      </section>

    </main>
  )
}
