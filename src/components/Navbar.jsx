import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { logError } from '../utils/logger'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../supabaseClient'
import { useTheme } from '../context/ThemeContext'
import { motion } from 'motion/react'
import { getOptimizedImageUrl } from '../utils/imageOptimizer'
import { IothincLogo } from '../assets/IothincLogo'

export const Navbar = ({ sidebarCollapsed, setMobileMenuOpen }) => {
  const { user, profile, role, signOut } = useAuth()
  const navigate = useNavigate()
  const dropdownRef = useRef(null)
  const { isDarkMode, toggleTheme } = useTheme()
  const [searchQuery, setSearchQuery] = useState('')
  
  // Search States
  const searchRef = useRef(null)
  const [searchResults, setSearchResults] = useState({ profiles: [], projects: [], events: [], teams: [] })
  const [isSearching, setIsSearching] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)
  
  // Notification States
  const [notifications, setNotifications] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  // Fetch Notifications
  const fetchNotifications = async () => {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          sender:profiles!notifications_sender_id_fkey(full_name, avatar_url),
          event:events(title)
        `)
        .or(`target_member_id.eq.${user.id},target_role.eq.all,target_role.eq.${role || 'member'}`)
        .order('created_at', { ascending: false })

      if (error) throw error
      setNotifications(data || [])
    } catch (err) {
      logError(err)
    }
  }

  // Search Logic
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults({ profiles: [], projects: [], events: [], teams: [] })
      setShowSearchResults(false)
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      setShowSearchResults(true)
      
      try {
        const searchTerm = `%${searchQuery}%`
        const [
          { data: profiles },
          { data: projects },
          { data: events },
          { data: teams }
        ] = await Promise.all([
          supabase.from('profiles').select('id, full_name, avatar_url, role').ilike('full_name', searchTerm).limit(5),
          supabase.from('projects').select('id, title, status').ilike('title', searchTerm).limit(5),
          supabase.from('events').select('id, title, category').ilike('title', searchTerm).limit(5),
          supabase.from('teams').select('id, name, department').ilike('name', searchTerm).limit(5)
        ])

        setSearchResults({
          profiles: profiles || [],
          projects: projects || [],
          events: events || [],
          teams: teams || []
        })
      } catch (err) {
        logError(err)
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Search UI Listeners
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowSearchResults(false)
      }
    }
    
    const handleOutsideClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearchResults(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleOutsideClick)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [])
  useEffect(() => {
    fetchNotifications()

    // Real-time subscription for notifications
    const channel = supabase
      .channel('realtime_notifications')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => {
          fetchNotifications()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, role])

  // Handle Event Invitation Actions
  const handleEventAction = async (notification, accept) => {
    try {
      // 1. Update registration table (accept -> notify=true, decline -> notify=false)
      const { error: regError } = await supabase
        .from('registrations')
        .upsert({
          event_id: notification.event_id,
          member_id: user.id,
          notify: accept,
          status: accept ? 'confirmed' : 'cancelled'
        }, { onConflict: 'event_id,member_id' })

      if (regError) throw regError

      // 2. Mark notification as read
      const { error: notifError } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notification.id)

      if (notifError) throw notifError

      alert(accept ? 'Event invitation accepted!' : 'Event invitation declined.')
      fetchNotifications()
    } catch (err) {
      console.error('Error executing event action:', err)
      alert('Error updating event registration: ' + err.message)
    }
  }

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id)
      if (unreadIds.length === 0) return

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', unreadIds)

      if (error) throw error
      fetchNotifications()
    } catch (err) {
      console.error('Error marking notifications read:', err)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (err) {
      console.error('Sign out error:', err)
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowNotifications(false)
        setShowProfileMenu(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  return (
    <header className={`bg-surface/80 backdrop-blur-md fixed top-0 right-0 w-full h-16 z-40 border-b border-outline-variant flex justify-between items-center px-stack-lg transition-all duration-300 ${
      sidebarCollapsed ? 'md:w-[calc(100%-64px)]' : 'md:w-[calc(100%-260px)]'
    }`}>
      {/* Mobile Brand / Menu Toggle Placeholder */}
      <div className="flex items-center gap-3 md:hidden">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="text-on-surface-variant p-2 rounded-full hover:bg-surface-container-high"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
        <IothincLogo
          alt="IOTHINC Logo"
          className="h-10 w-auto text-on-surface"
        />
      </div>

      {/* Global Search Bar */}
      <div className="hidden md:flex items-center flex-1 max-w-md relative group" ref={searchRef}>
        <span className="material-symbols-outlined absolute left-3 text-outline group-focus-within:text-primary transition-colors">search</span>
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => { if (searchQuery.length >= 2) setShowSearchResults(true) }}
          className="w-full bg-surface-container-low text-on-surface font-body-sm text-body-sm pl-10 pr-4 py-2 rounded-full border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-outline" 
          placeholder="Search projects, members, events..."
        />

        {showSearchResults && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-full left-0 right-0 mt-2 bg-surface border border-outline-variant rounded-xl shadow-xl z-50 overflow-hidden max-h-[70vh] overflow-y-auto no-scrollbar"
          >
            {isSearching ? (
              <div className="p-4 flex items-center justify-center">
                <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
              </div>
            ) : (
              searchResults.profiles.length === 0 && searchResults.projects.length === 0 && searchResults.events.length === 0 && searchResults.teams.length === 0 ? (
                <div className="p-4 text-center text-on-surface-variant text-sm">
                  No results found
                </div>
              ) : (
                <div className="py-2">
                  {searchResults.profiles.length > 0 && (
                    <div className="mb-2">
                      <div className="px-4 py-1 text-xs font-mono uppercase text-accent font-bold">Members</div>
                      {searchResults.profiles.map(profile => (
                        <button 
                          key={profile.id}
                          onClick={() => { navigate(`/members/${profile.id}`); setShowSearchResults(false) }}
                          className="w-full text-left px-4 py-2 hover:bg-surface-container-high flex items-center gap-3 transition-colors"
                        >
                          <span className="material-symbols-outlined text-on-surface-variant">person</span>
                          <div>
                            <div className="text-sm text-on-surface font-medium">{profile.full_name}</div>
                            <div className="text-[10px] text-on-surface-variant uppercase tracking-wider">{profile.role}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchResults.projects.length > 0 && (
                    <div className="mb-2">
                      <div className="px-4 py-1 text-xs font-mono uppercase text-accent font-bold">Projects</div>
                      {searchResults.projects.map(project => (
                        <button 
                          key={project.id}
                          onClick={() => { navigate(`/projects/${project.id}`); setShowSearchResults(false) }}
                          className="w-full text-left px-4 py-2 hover:bg-surface-container-high flex items-center gap-3 transition-colors"
                        >
                          <span className="material-symbols-outlined text-on-surface-variant">rocket_launch</span>
                          <div>
                            <div className="text-sm text-on-surface font-medium">{project.title}</div>
                            <div className="text-[10px] text-on-surface-variant uppercase tracking-wider">{project.status}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchResults.events.length > 0 && (
                    <div className="mb-2">
                      <div className="px-4 py-1 text-xs font-mono uppercase text-accent font-bold">Events</div>
                      {searchResults.events.map(event => (
                        <button 
                          key={event.id}
                          onClick={() => { navigate(`/events/${event.id}`); setShowSearchResults(false) }}
                          className="w-full text-left px-4 py-2 hover:bg-surface-container-high flex items-center gap-3 transition-colors"
                        >
                          <span className="material-symbols-outlined text-on-surface-variant">event</span>
                          <div>
                            <div className="text-sm text-on-surface font-medium">{event.title}</div>
                            <div className="text-[10px] text-on-surface-variant uppercase tracking-wider">{event.category}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchResults.teams.length > 0 && (
                    <div>
                      <div className="px-4 py-1 text-xs font-mono uppercase text-accent font-bold">Teams</div>
                      {searchResults.teams.map(team => (
                        <button 
                          key={team.id}
                          onClick={() => { navigate(`/teams`); setShowSearchResults(false) }}
                          className="w-full text-left px-4 py-2 hover:bg-surface-container-high flex items-center gap-3 transition-colors"
                        >
                          <span className="material-symbols-outlined text-on-surface-variant">groups</span>
                          <div>
                            <div className="text-sm text-on-surface font-medium">{team.name}</div>
                            <div className="text-[10px] text-on-surface-variant uppercase tracking-wider">{team.department}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            )}
          </motion.div>
        )}
      </div>

      {/* Action Tray */}
      <div className="flex items-center gap-4 ml-auto" ref={dropdownRef}>
        {/* Dark Mode Switcher */}
        <button 
          onClick={toggleTheme}
          className="text-on-surface-variant hover:text-primary transition-colors p-2 rounded-full hover:bg-surface-container-high focus:outline-none"
        >
          <span className="material-symbols-outlined">
            {isDarkMode ? 'light_mode' : 'dark_mode'}
          </span>
        </button>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button 
            onClick={() => {
              setShowNotifications(!showNotifications)
              setShowProfileMenu(false)
              if (!showNotifications) markAllAsRead()
            }}
            className="text-on-surface-variant hover:text-primary transition-colors p-2 rounded-full hover:bg-surface-container-high focus:outline-none relative"
          >
            <span className="material-symbols-outlined">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-error rounded-full ring-2 ring-surface animate-pulse" />
            )}
          </button>

          

          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 bg-surface border border-outline-variant rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
                <h4 className="font-label-caps text-label-caps text-on-surface font-bold uppercase">Notifications</h4>
                {unreadCount > 0 && (
                  <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto no-scrollbar divide-y divide-outline-variant">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-on-surface-variant text-xs font-label-caps">
                    No notifications
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div key={notif.id} className={`p-4 hover:bg-surface-container-low transition-colors ${!notif.is_read ? 'bg-primary-container/5' : ''}`}>
                      <p className="text-sm text-on-surface leading-snug">{notif.message}</p>
                      
                      {/* Event notification interactive choices */}
                      {notif.type === 'event' && notif.event_id && (
                        <div className="mt-3 flex gap-2">
                          <button 
                            onClick={() => handleEventAction(notif, true)}
                            className="bg-primary text-on-primary text-xs font-bold font-label-caps px-3 py-1.5 rounded hover:opacity-90 active:scale-[0.98] transition-transform"
                          >
                            Accept
                          </button>
                          <button 
                            onClick={() => handleEventAction(notif, false)}
                            className="bg-surface-container-high text-on-surface text-xs font-medium font-label-caps px-3 py-1.5 rounded hover:bg-outline-variant active:scale-[0.98] transition-transform"
                          >
                            Decline
                          </button>
                        </div>
                      )}
                      
                      <div className="mt-2 flex justify-between items-center text-[10px] text-outline font-label-caps uppercase">
                        <span>{notif.sender?.full_name || 'System'}</span>
                        <span>{new Date(notif.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Separator */}
        <div className="w-px h-8 bg-outline-variant hidden sm:block" />

        {/* Profile Dropdown */}
        <div className="relative">
          <button 
            onClick={() => {
              setShowProfileMenu(!showProfileMenu)
              setShowNotifications(false)
            }}
            className="flex items-center gap-2 hover:bg-surface-container-high p-1 pr-3 rounded-full transition-colors focus:outline-none"
          >
            <img 
              alt="User Avatar" 
              width="32"
              height="32"
              className="w-8 h-8 rounded-full border border-outline-variant object-cover" 
              src={getOptimizedImageUrl(profile?.avatar_url || 'https://lh3.googleusercontent.com/aida-public/AB6AXuBNaqMiWFAn3N5e7M0gwmYiSokY3sIvWQwnYZMA0OyBqm4ptCO25QtOwdw1OQ5Rt5QTNH1uDqGHdu_L_t9wzqgFCLo5yIV_baf24Wf-xNCZxCaAlPkv5VLrFh3hXAREI068rYzK2DKm2y8Ru5FLCbUMv8cBS3F9GBx18Fv6wZ0tW9z9zXW40sIJ99UJvYbqJmHvgOnTlgxUFhS-L5JK-ZGbPBgMbAJbxIjoc14U41gx8HweiooxRjpNYkw-1cpZIXohA7GIseo7tbY', { width: 32, height: 32 })}
            />
            <span className="hidden sm:block font-label-caps text-label-caps uppercase font-bold text-on-surface">
              {role || 'Member'}
            </span>
            <span className="material-symbols-outlined text-outline text-sm hidden sm:block">expand_more</span>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-3 w-48 bg-surface border border-outline-variant rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="p-4 border-b border-outline-variant bg-surface-container-low">
                <p className="text-xs font-bold text-on-surface truncate">{profile?.full_name || 'User'}</p>
                <p className="text-[10px] text-on-surface-variant truncate mt-0.5">{user?.email}</p>
              </div>
              <div className="p-1">
                <Link 
                  to={`/members/${user?.id}`}
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-on-surface hover:bg-surface-container-high rounded-lg transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">person</span>
                  My Profile
                </Link>
                <button 
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-error hover:bg-error-container/20 rounded-lg transition-colors text-left"
                >
                  <span className="material-symbols-outlined text-sm text-error">logout</span>
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
