import React, { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { ListSkeleton, GridSkeleton } from '../components/SkeletonLoaders'
import { useMeetings } from '../hooks/useMeetings'
import { useNotifications } from '../hooks/useNotifications'
import { motion, AnimatePresence } from 'motion/react'
import { Calendar } from '@phosphor-icons/react/dist/icons/Calendar'
import { VideoCamera } from '@phosphor-icons/react/dist/icons/VideoCamera'
import { Clock } from '@phosphor-icons/react/dist/icons/Clock'
import { Link as LinkIcon } from '@phosphor-icons/react/dist/icons/Link'
import { CaretDown } from '@phosphor-icons/react/dist/icons/CaretDown'
import { CaretUp } from '@phosphor-icons/react/dist/icons/CaretUp'
import { Plus } from '@phosphor-icons/react/dist/icons/Plus'
import { FileText } from '@phosphor-icons/react/dist/icons/FileText'
import { Users } from '@phosphor-icons/react/dist/icons/Users'
import { CalendarPlus } from '@phosphor-icons/react/dist/icons/CalendarPlus'
import { Trash } from '@phosphor-icons/react/dist/icons/Trash'
import { NotePencil } from '@phosphor-icons/react/dist/icons/NotePencil'
import { X } from '@phosphor-icons/react/dist/icons/X'
import { CheckCircle } from '@phosphor-icons/react/dist/icons/CheckCircle'
import { FileCode } from '@phosphor-icons/react/dist/icons/FileCode'
import { MapPin } from '@phosphor-icons/react/dist/icons/MapPin'

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }
  })
}

const modalOverlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 }
}

const modalContentVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, scale: 0.97, y: 5, transition: { duration: 0.15 } }
}

export const Meetings = () => {
  const { user, role } = useAuth()
  const canSchedule = ['chairperson', 'vice_chairperson', 'department_lead'].includes(role)
  
  const { 
    meetings, 
    loading, 
    createMeeting, 
    joinMeeting, 
    updateMeeting, 
    deleteMeeting 
  } = useMeetings()

  const { sendNotification } = useNotifications()

  // Local states
  const [activeTab, setActiveTab] = useState('upcoming') // 'upcoming' | 'past'
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [editingLogId, setEditingLogId] = useState(null)
  
  // Tick timer for starting-soon checks (every 30 seconds)
  const [currentTime, setCurrentTime] = useState(new Date())
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 30000)
    return () => clearInterval(timer)
  }, [])

  // Google Calendar URL Generator
  const makeGCalUrl = (meeting) => {
    const formatUTC = (dateStr) => {
      const d = new Date(dateStr)
      return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    }
    const start = formatUTC(meeting.scheduled_start)
    const end = formatUTC(meeting.scheduled_end)
    const text = encodeURIComponent(meeting.title)
    const details = encodeURIComponent(
      (meeting.description || '') + '\n\nJoin link: ' + meeting.meeting_link
    )
    const location = encodeURIComponent(meeting.meeting_link)
    
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${end}&details=${details}&location=${location}`
  }

  // Check if a meeting is joinable (starts in 10 minutes or is live)
  const isMeetingJoinable = (meeting) => {
    if (meeting.status === 'live') return true
    if (meeting.status !== 'scheduled') return false
    
    const startTime = new Date(meeting.scheduled_start)
    const endTime = new Date(meeting.scheduled_end)
    
    // Start window: starts in 10 minutes or less
    const tenMins = 10 * 60 * 1000
    const startDiff = startTime.getTime() - currentTime.getTime()
    
    return startDiff <= tenMins && currentTime.getTime() < endTime.getTime()
  }

  // Filter meetings
  const upcomingMeetings = meetings.filter(m => m.status === 'scheduled' || m.status === 'live')
  const pastMeetings = meetings.filter(m => m.status === 'completed' || m.status === 'cancelled')

  // Meeting starting soon banner
  const bannerMeeting = meetings.find(m => isMeetingJoinable(m) && m.status !== 'completed' && m.status !== 'cancelled')

  // Handle Join
  const handleJoinClick = async (meeting) => {
    try {
      await joinMeeting(meeting.id)
      window.open(meeting.meeting_link, '_blank', 'noopener,noreferrer')
    } catch (err) {
      alert('Error joining meeting: ' + err.message)
    }
  }

  return (
    <main className="flex-1 px-6 md:px-12 pt-24 pb-12 max-w-7xl mx-auto w-full animate-in fade-in duration-300">
      
      {/* Banner: Starting soon / Live */}
      <AnimatePresence>
        {bannerMeeting && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6 p-4 bg-accent/15 border border-accent/30 rounded-2xl flex items-center justify-between gap-4 animate-pulse"
          >
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-accent"></span>
            </span>
            <div>
              <p className="text-xs font-mono font-bold uppercase tracking-wider text-accent">
                {bannerMeeting.status === 'live' ? 'Meeting is live' : 'Meeting starting soon'}
              </p>
              <h4 className="text-sm font-bold text-on-surface">{bannerMeeting.title}</h4>
            </div>
          </div>
          <button 
            onClick={() => handleJoinClick(bannerMeeting)}
            className="px-4 py-2 bg-accent text-on-primary text-xs font-mono uppercase tracking-wider font-bold rounded-lg hover:brightness-110 active:scale-[0.98] transition-all"
          >
            Join Now
          </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-on-surface">Club Meetings</h2>
          <p className="text-sm text-on-surface-variant mt-1.5">Schedule alignments, record attendance, and archive discussions.</p>
        </div>
        {canSchedule && (
          <button 
            onClick={() => setShowScheduleModal(true)}
            className="flex items-center gap-2 bg-accent text-on-primary font-mono uppercase tracking-wider text-xs font-bold px-4 py-3 rounded-lg hover:brightness-110 active:scale-[0.98] transition-all self-start md:self-auto"
          >
            <Plus size={16} /> Schedule Meeting
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-outline-variant mb-6 pb-px overflow-x-auto no-scrollbar">
        <button 
          onClick={() => setActiveTab('upcoming')}
          className={`px-4 py-2.5 font-mono text-xs uppercase font-bold border-b-2 transition-all ${
            activeTab === 'upcoming' 
              ? 'border-accent text-accent' 
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Upcoming ({upcomingMeetings.length})
        </button>
        <button 
          onClick={() => setActiveTab('past')}
          className={`px-4 py-2.5 font-mono text-xs uppercase font-bold border-b-2 transition-all ${
            activeTab === 'past' 
              ? 'border-accent text-accent' 
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Archive ({pastMeetings.length})
        </button>
      </div>

      {loading ? (
        <GridSkeleton items={4} cols={{ base: 1, md: 2, lg: 2 }} variant="meeting" />
      ) : activeTab === 'upcoming' ? (
        // Upcoming list
        upcomingMeetings.length === 0 ? (
          <div className="bg-surface-container rounded-2xl border border-outline-variant/60 p-12 text-center text-on-surface-variant italic">
            No scheduled meetings.
          </div>
        ) : (
          <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-6" initial="hidden" animate="visible">
            {upcomingMeetings.map((meeting, index) => {
              const start = new Date(meeting.scheduled_start)
              const joinable = isMeetingJoinable(meeting)
              
              return (
                <motion.div 
                  key={meeting.id} 
                  custom={index}
                  initial="hidden"
                  animate="visible"
                  variants={cardVariants}
                  className="bg-surface-container rounded-2xl border border-outline-variant p-6 flex flex-col justify-between hover:border-accent/30 transition-all"
                >
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <span className="flex items-center gap-1.5 text-xs text-on-surface-variant font-mono">
                        <Calendar size={14} /> {start.toLocaleDateString()}
                      </span>
                      <span className={`text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${
                        meeting.status === 'live' 
                          ? 'bg-accent/15 text-accent border-accent/20 animate-pulse' 
                          : 'bg-surface-container-high text-on-surface-variant border-outline-variant/60'
                      }`}>
                        {meeting.status}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-on-surface mb-2">{meeting.title}</h3>
                    {meeting.description && (
                      <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed mb-4">{meeting.description}</p>
                    )}

                    <div className="space-y-2 mb-6">
                      <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                        <Clock size={14} />
                        <span>
                          {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(meeting.scheduled_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                        <Users size={14} />
                        <span>Host: {meeting.creator?.full_name || 'Coordinator'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                        {meeting.platform === 'in_person' ? <MapPin size={14} /> : <VideoCamera size={14} />}
                        <span className="capitalize">Platform: {meeting.platform ? meeting.platform.replace('_', ' ') : 'other'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-outline-variant/30 flex items-center justify-between gap-4">
                    <a 
                      href={makeGCalUrl(meeting)} 
                      target="_blank" 
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-on-surface-variant hover:text-accent transition-colors"
                    >
                      <CalendarPlus size={14} /> Add to Calendar
                    </a>

                    <div className="flex items-center gap-2">
                      {canSchedule && (
                        <button
                          onClick={async () => {
                            if (confirm('Cancel this meeting?')) {
                              try {
                                await updateMeeting(meeting.id, { status: 'cancelled' })
                              } catch (err) {
                                alert(err.message)
                              }
                            }
                          }}
                          className="p-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-colors"
                          title="Cancel Meeting"
                        >
                          <Trash size={16} />
                        </button>
                      )}

                      {canSchedule && meeting.status !== 'live' && (
                        <button
                          onClick={async () => {
                            try {
                              await updateMeeting(meeting.id, { status: 'live' })
                            } catch (err) {
                              alert(err.message)
                            }
                          }}
                          className="px-3 py-1.5 border border-outline-variant text-on-surface text-xs font-mono uppercase tracking-wider rounded-lg hover:bg-surface-container-high transition-colors"
                        >
                          Go Live
                        </button>
                      )}

                      {canSchedule && (meeting.status === 'live' || (meeting.status === 'scheduled' && new Date() >= new Date(meeting.scheduled_start))) && (
                        <button
                          onClick={async () => {
                            try {
                              await updateMeeting(meeting.id, { status: 'completed' })
                            } catch (err) {
                              alert(err.message)
                            }
                          }}
                          className="px-3 py-1.5 bg-success/20 text-success border border-success/30 text-xs font-mono uppercase tracking-wider rounded-lg hover:bg-success/30 transition-colors"
                        >
                          End Meeting
                        </button>
                      )}

                      <button
                        onClick={() => handleJoinClick(meeting)}
                        disabled={!joinable}
                        className={`px-4 py-2 font-mono uppercase tracking-wider text-xs font-bold rounded-lg transition-all ${
                          joinable 
                            ? 'bg-accent text-on-primary hover:brightness-110 active:scale-[0.98]' 
                            : 'bg-surface-container-high text-on-surface-variant opacity-50 cursor-not-allowed border border-outline-variant/30'
                        }`}
                      >
                        Join Room
                      </button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        )
      ) : (
        // Past / Archive list
        pastMeetings.length === 0 ? (
          <div className="bg-surface-container rounded-2xl border border-outline-variant/60 p-12 text-center text-on-surface-variant italic">
            No completed meetings in database.
          </div>
        ) : (
          <motion.div className="space-y-4" initial="hidden" animate="visible">
            {pastMeetings.map((meeting, index) => {
              const isEditing = editingLogId === meeting.id
              const hasAccess = canSchedule || meeting.created_by === user?.id
              const isCancelled = meeting.status === 'cancelled'
              
              return (
                <motion.div 
                  key={meeting.id} 
                  custom={index}
                  initial="hidden"
                  animate="visible"
                  variants={cardVariants}
                  className="bg-surface-container rounded-2xl border border-outline-variant p-6 hover:border-accent/15 transition-all"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-bold text-on-surface">{meeting.title}</h3>
                        <span className={`text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded border ${
                          isCancelled 
                            ? 'bg-error/15 text-error border-error/20' 
                            : 'bg-success/15 text-success border-success/20'
                        }`}>
                          {meeting.status}
                        </span>
                      </div>
                      <p className="text-xs text-on-surface-variant mt-1">
                        Held on {new Date(meeting.scheduled_start).toLocaleDateString()} · Platform: <span className="capitalize">{meeting.platform ? meeting.platform.replace('_', ' ') : 'other'}</span> · Hosted by {meeting.creator?.full_name || 'Coordinator'}
                      </p>
                    </div>
                    
                    {hasAccess && !isCancelled && !isEditing && (
                      <button 
                        onClick={() => setEditingLogId(meeting.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-outline-variant text-on-surface hover:bg-surface-container-high rounded-lg text-xs font-mono uppercase transition-colors"
                      >
                        <NotePencil size={14} /> Log Minutes
                      </button>
                    )}
                  </div>

                  {meeting.description && (
                    <p className="text-xs text-on-surface-variant leading-relaxed mb-4">{meeting.description}</p>
                  )}

                  {/* Editable Log Area */}
                  {isEditing ? (
                    <EditLogForm 
                      meeting={meeting} 
                      onCancel={() => setEditingLogId(null)}
                      onSave={async (fields) => {
                        try {
                          await updateMeeting(meeting.id, fields)
                          setEditingLogId(null)
                        } catch (err) {
                          alert(err.message)
                        }
                      }}
                    />
                  ) : (
                    // Display Log Details
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-outline-variant/30">
                      
                      {/* Attendance log */}
                      <div className="bg-surface-container-low border border-outline-variant/40 rounded-xl p-4">
                        <h4 className="text-[10px] font-mono uppercase tracking-wider text-on-surface-variant mb-3 flex items-center gap-1.5">
                          <Users size={14} /> Attendance ({meeting.attendeesCount})
                        </h4>
                        {meeting.attendeesCount === 0 ? (
                          <p className="text-xs text-on-surface-variant italic font-light">No members recorded.</p>
                        ) : (
                          <div className="space-y-2 max-h-40 overflow-y-auto no-scrollbar">
                            {meeting.attendeesList.map(att => (
                              <div key={att.member_id} className="flex items-center gap-2">
                                <img 
                                  src={att.member?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(att.member?.full_name || 'U')}`}
                                  className="w-6 h-6 rounded-full object-cover border border-outline-variant"
                                />
                                <span className="text-xs text-on-surface">{att.member?.full_name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Minutes text */}
                      <div className="md:col-span-2 bg-surface-container-low border border-outline-variant/40 rounded-xl p-4">
                        <h4 className="text-[10px] font-mono uppercase tracking-wider text-on-surface-variant mb-3 flex items-center gap-1.5">
                          <FileText size={14} /> Meeting Minutes
                        </h4>
                        {meeting.minutes_text ? (
                          <p className="text-xs text-on-surface-variant leading-relaxed whitespace-pre-line font-light">{meeting.minutes_text}</p>
                        ) : (
                          <p className="text-xs text-on-surface-variant italic font-light">No minutes filed yet.</p>
                        )}

                        {/* Drive/Recording URL */}
                        {meeting.recording_url && (
                          <div className="mt-4 pt-3 border-t border-outline-variant/20">
                            <a 
                              href={meeting.recording_url} 
                              target="_blank" 
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline font-mono"
                            >
                              <VideoCamera size={14} /> View Meeting Recording
                            </a>
                          </div>
                        )}
                      </div>

                    </div>
                  )}
                </motion.div>
              )
            })}
          </motion.div>
        )
      )}

      {/* Schedule Meeting Modal */}
      <AnimatePresence>
        {showScheduleModal && (
          <ScheduleModal 
            onClose={() => setShowScheduleModal(false)}
            onSave={async (fields) => {
              try {
                await createMeeting(fields)
                await sendNotification({
                  title: 'New Meeting Scheduled',
                  message: `A new meeting "${fields.title}" has been scheduled.`,
                  type: 'event',
                  target_role: 'all'
                })
                setShowScheduleModal(false)
              } catch (err) {
                alert(err.message)
              }
            }}
          />
        )}
      </AnimatePresence>

    </main>
  )
}

const ScheduleModal = ({ onClose, onSave }) => {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [link, setLink] = useState('')
  const [platform, setPlatform] = useState('other')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await onSave({
        title,
        description,
        scheduled_start: new Date(start).toISOString(),
        scheduled_end: new Date(end).toISOString(),
        meeting_link: link,
        platform,
        status: 'scheduled'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const isUrlRequired = ['zoom', 'google_meet', 'teams'].includes(platform)

  return (
    <motion.div 
      variants={modalOverlayVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div 
        variants={modalContentVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="bg-surface border border-outline-variant rounded-2xl max-w-lg w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]"
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-on-surface">Schedule Alignment</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-container transition-colors">
            <X size={20} className="text-on-surface-variant" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-on-surface-variant mb-1">Title</label>
            <input 
              type="text" 
              value={title} 
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-surface-container-low text-on-surface p-3 rounded-xl border border-outline-variant text-sm focus:ring-accent focus:outline-none focus:ring-2"
              required 
              placeholder="e.g. Core Board Weekly Alignment"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-on-surface-variant mb-1">Description</label>
            <textarea 
              value={description} 
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-surface-container-low text-on-surface p-3 rounded-xl border border-outline-variant text-sm h-20 resize-none focus:ring-accent focus:outline-none focus:ring-2"
              placeholder="Brief agenda or points to cover"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-on-surface-variant mb-1">Start Time</label>
              <input 
                type="datetime-local" 
                value={start} 
                onChange={e => setStart(e.target.value)}
                className="w-full bg-surface-container-low text-on-surface p-3 rounded-xl border border-outline-variant text-sm focus:ring-accent focus:outline-none focus:ring-2"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-on-surface-variant mb-1">End Time</label>
              <input 
                type="datetime-local" 
                value={end} 
                onChange={e => setEnd(e.target.value)}
                className="w-full bg-surface-container-low text-on-surface p-3 rounded-xl border border-outline-variant text-sm focus:ring-accent focus:outline-none focus:ring-2"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-on-surface-variant mb-1">Platform</label>
              <select
                value={platform}
                onChange={e => setPlatform(e.target.value)}
                className="w-full bg-surface-container-low text-on-surface p-3 rounded-xl border border-outline-variant text-sm focus:ring-accent focus:outline-none focus:ring-2"
              >
                <option value="google_meet">Google Meet</option>
                <option value="zoom">Zoom</option>
                <option value="teams">Microsoft Teams</option>
                <option value="in_person">In Person</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-on-surface-variant mb-1">
                {isUrlRequired ? 'Meeting Link' : 'Location Details / Link'}
              </label>
              <input 
                type={isUrlRequired ? 'url' : 'text'} 
                value={link} 
                onChange={e => setLink(e.target.value)}
                className="w-full bg-surface-container-low text-on-surface p-3 rounded-xl border border-outline-variant text-sm focus:ring-accent focus:outline-none focus:ring-2"
                required 
                placeholder={isUrlRequired ? 'https://meet.google.com/...' : 'e.g. Lab 102 or custom text'}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/30 mt-6">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-5 py-2.5 text-on-surface-variant hover:bg-surface-container rounded-xl font-bold text-xs font-mono uppercase transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={submitting}
              className="px-5 py-2.5 bg-accent text-on-primary rounded-xl font-bold text-xs font-mono uppercase hover:brightness-110 flex items-center gap-2 transition-all"
            >
              {submitting ? 'Scheduling...' : 'Confirm'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ── Edit Log Form Subcomponent ──────────────────────────────
const EditLogForm = ({ meeting, onCancel, onSave }) => {
  const [duration, setDuration] = useState(meeting.actual_duration_minutes || '')
  const [minutes, setMinutes] = useState(meeting.minutes_text || '')
  const [recording, setRecording] = useState(meeting.recording_url || '')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await onSave({
        actual_duration_minutes: duration ? parseInt(duration) : null,
        minutes_text: minutes,
        recording_url: recording,
        status: 'completed'
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <motion.form 
      onSubmit={handleSubmit} 
      initial={{ opacity: 0, height: 0 }} 
      animate={{ opacity: 1, height: 'auto' }}
      className="mt-4 pt-4 border-t border-outline-variant/30 space-y-4 animate-in fade-in duration-200"
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-on-surface-variant mb-1">Actual Duration (mins)</label>
          <input 
            type="number" 
            value={duration} 
            onChange={e => setDuration(e.target.value)}
            className="w-full bg-surface-container-low text-on-surface p-2.5 rounded-lg border border-outline-variant text-xs focus:ring-accent focus:outline-none focus:ring-1"
            placeholder="e.g. 45"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-mono uppercase tracking-wider text-on-surface-variant mb-1">Recording Link</label>
          <input 
            type="url" 
            value={recording} 
            onChange={e => setRecording(e.target.value)}
            className="w-full bg-surface-container-low text-on-surface p-2.5 rounded-lg border border-outline-variant text-xs focus:ring-accent focus:outline-none focus:ring-1"
            placeholder="Google Drive link or OneDrive link"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-mono uppercase tracking-wider text-on-surface-variant mb-1">Minutes / Discussions log</label>
        <textarea 
          value={minutes} 
          onChange={e => setMinutes(e.target.value)}
          className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant text-xs h-32 resize-none focus:ring-accent focus:outline-none focus:ring-1"
          required
          placeholder="Topics discussed, updates, action items..."
        />
      </div>

      <div className="flex gap-2 justify-end">
        <button 
          type="button" 
          onClick={onCancel}
          className="px-4 py-2 border border-outline-variant text-on-surface rounded-lg text-xs font-mono uppercase hover:bg-surface-container-high transition-colors"
        >
          Cancel
        </button>
        <button 
          type="submit" 
          disabled={submitting}
          className="px-4 py-2 bg-accent text-on-primary rounded-lg text-xs font-mono uppercase font-bold hover:brightness-110 transition-colors"
        >
          {submitting ? 'Saving...' : 'Save Log'}
        </button>
      </div>
    </motion.form>
  )
}
