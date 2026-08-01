import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { useAuth } from '../hooks/useAuth'
import { useDashboard, useDashboardCalendar } from '../hooks/useDashboard'
import { DashboardSkeleton } from '../components/SkeletonLoaders'

const statCardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: (i) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { delay: i * 0.08, duration: 0.45, ease: [0.16, 1, 0.3, 1] }
  })
}

const listItemVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: (i) => ({
    opacity: 1, x: 0,
    transition: { delay: i * 0.06, duration: 0.35, ease: [0.16, 1, 0.3, 1] }
  })
}

export const Dashboard = () => {
  const { profile, role } = useAuth()
  const isAdmin = (role === 'chairperson' || role === 'vice_chairperson')
  const location = useLocation()
  const navigate = useNavigate()
  const [accessDeniedMessage, setAccessDeniedMessage] = useState(location.state?.accessDeniedMessage || null)

  // Clear the one-time redirect message from history state so refreshing
  // or navigating away/back doesn't keep re-showing it.
  useEffect(() => {
    if (location.state?.accessDeniedMessage) {
      navigate(location.pathname, { replace: true, state: {} })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cached dashboard data (stats, active projects, upcoming events, announcements)
  const { stats, activeProjectsList, upcomingEventsList, announcements, loading } = useDashboard()
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null)

  // Calendar state: which month is being viewed, plus the real events and
  // competition deadlines that fall in that month - cached per month.
  const today = new Date()
  const [calendarMonth, setCalendarMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const { calendarEvents, calendarDeadlines, loading: calendarLoading } = useDashboardCalendar(calendarMonth)

  // Title Setup
  useEffect(() => {
    document.title = "IOTHINC Management Hub"
  }, [])

  // Real calendar grid computed from calendarMonth + the actual events and
  // competition deadlines fetched for that month (replaces the old
  // hardcoded "October 2024" mock).
  const currentMonthYear = calendarMonth.toLocaleString('default', { month: 'long', year: 'numeric' })

  const goToPrevMonth = () => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  const goToNextMonth = () => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))

  const buildCalendarDays = () => {
    const year = calendarMonth.getFullYear()
    const month = calendarMonth.getMonth()
    const firstOfMonth = new Date(year, month, 1)
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const daysInPrevMonth = new Date(year, month, 0).getDate()
    const startWeekday = firstOfMonth.getDay() // 0 = Sunday

    const eventsByDay = {}
    calendarEvents.forEach(e => {
      const d = new Date(e.event_date)
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate()
        eventsByDay[day] = eventsByDay[day] || []
        eventsByDay[day].push(e.title)
      }
    })

    const deadlinesByDay = {}
    calendarDeadlines.forEach(c => {
      const d = new Date(c.registration_deadline)
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate()
        deadlinesByDay[day] = deadlinesByDay[day] || []
        deadlinesByDay[day].push(c.title)
      }
    })

    const days = []

    // Leading days from the previous month (grayed out)
    for (let i = startWeekday - 1; i >= 0; i--) {
      days.push({ day: daysInPrevMonth - i, isCurrentMonth: false })
    }

    // Days in the current month
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = year === today.getFullYear() && month === today.getMonth() && day === today.getDate()
      const dayEvents = eventsByDay[day]
      const dayDeadlines = deadlinesByDay[day]
      days.push({
        day,
        isCurrentMonth: true,
        isToday,
        isEvent: !!dayEvents,
        isDeadline: !!dayDeadlines,
        tooltip: [...(dayDeadlines || []), ...(dayEvents || [])].join(', ') || undefined
      })
    }

    // Trailing days from the next month to complete the final week row
    const remainder = days.length % 7
    if (remainder !== 0) {
      for (let day = 1; day <= 7 - remainder; day++) {
        days.push({ day, isCurrentMonth: false })
      }
    }

    return days
  }

  const calendarDays = buildCalendarDays()

  if (loading) {
    return <DashboardSkeleton />
  }

  return (
    <>
    <main className="flex-1 px-4 md:px-stack-lg pt-24 pb-section-gap max-w-7xl mx-auto w-full animate-in fade-in duration-200">
      {accessDeniedMessage && (
        <div className="mb-6 bg-error-container/20 border border-error/30 text-error text-sm font-medium px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{accessDeniedMessage}</span>
          <button onClick={() => setAccessDeniedMessage(null)} className="text-error/70 hover:text-error">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
      )}
      {/* Welcome Header */}
      <motion.div 
        className="mb-8"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <h2 className="font-headline-xl text-headline-xl text-on-surface">
          Welcome back, {profile?.full_name || 'Member'}!
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant mt-2">
          Here is what's happening with IOTHINC today.
        </p>
      </motion.div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Active Projects */}
        <motion.div 
          custom={0} initial="hidden" animate="visible" variants={statCardVariants}
          className="bg-surface-container rounded-xl border border-outline-variant p-5 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-primary-container/10 rounded-lg text-primary">
              <span className="material-symbols-outlined fill-1">account_tree</span>
            </div>
            <span className="font-label-caps text-label-caps uppercase text-secondary bg-surface-container-high px-2 py-1 rounded-full">
              Live
            </span>
          </div>
          <div>
            <p className="font-label-caps text-label-caps uppercase text-on-surface-variant mb-1">Active Projects</p>
            <h3 className="font-headline-xl text-headline-xl text-on-surface">{stats.activeProjects}</h3>
          </div>
        </motion.div>

        {/* Total Members */}
        <motion.div 
          custom={1} initial="hidden" animate="visible" variants={statCardVariants}
          className="bg-surface-container rounded-xl border border-outline-variant p-5 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-secondary-container rounded-lg text-on-secondary-container">
              <span className="material-symbols-outlined fill-1">group</span>
            </div>
            <span className="font-label-caps text-label-caps uppercase text-primary bg-primary-container/10 px-2 py-1 rounded-full">
              Members
            </span>
          </div>
          <div>
            <p className="font-label-caps text-label-caps uppercase text-on-surface-variant mb-1">Total Members</p>
            <h3 className="font-headline-xl text-headline-xl text-on-surface">{stats.totalMembers}</h3>
          </div>
        </motion.div>

        {/* Upcoming Events */}
        <motion.div 
          custom={2} initial="hidden" animate="visible" variants={statCardVariants}
          className="bg-surface-container rounded-xl border border-outline-variant p-5 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-tertiary-fixed rounded-lg text-on-tertiary-fixed-variant">
              <span className="material-symbols-outlined fill-1">event</span>
            </div>
            <span className="font-label-caps text-label-caps uppercase text-success bg-success/10 px-2 py-1 rounded-full">
              New
            </span>
          </div>
          <div>
            <p className="font-label-caps text-label-caps uppercase text-on-surface-variant mb-1">Upcoming Events</p>
            <h3 className="font-headline-xl text-headline-xl text-on-surface">{stats.upcomingEvents}</h3>
          </div>
        </motion.div>

        {/* Competition Deadlines */}
        <motion.div 
          custom={3} initial="hidden" animate="visible" variants={statCardVariants}
          className="bg-surface-container rounded-xl border border-outline-variant p-5 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-error-container rounded-lg text-on-error-container">
              <span className="material-symbols-outlined fill-1">timer</span>
            </div>
            <span className="font-label-caps text-label-caps uppercase text-error bg-error-container/30 px-2 py-1 rounded-full">
              Urgent
            </span>
          </div>
          <div>
            <p className="font-label-caps text-label-caps uppercase text-on-surface-variant mb-1">Competition Deadlines</p>
            <h3 className="font-headline-xl text-headline-xl text-on-surface">{stats.competitionDeadlines}</h3>
          </div>
        </motion.div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Active Projects Widget (8 cols) */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="lg:col-span-8 bg-surface-container rounded-xl border border-outline-variant shadow-sm flex flex-col">
          <div className="p-5 border-b border-surface-variant flex justify-between items-center bg-surface-container-low rounded-t-xl">
            <h3 className="font-headline-lg text-headline-lg text-on-surface">Active Projects</h3>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Link
                  to="/projects?new=true"
                  className="flex items-center gap-1.5 bg-primary text-on-primary text-xs font-semibold px-3 py-1.5 rounded-lg hover:opacity-90 active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  New Project
                </Link>
              )}
              <Link to="/projects" className="text-primary font-label-caps text-label-caps uppercase hover:bg-primary-container/10 px-3 py-1.5 rounded-full transition-colors">
                View All
              </Link>
            </div>
          </div>
          <div className="p-5 flex-1 flex flex-col gap-5">
            {activeProjectsList.length === 0 ? (
              <p className="text-sm text-on-surface-variant italic p-4 text-center">No active projects logged yet.</p>
            ) : (
              activeProjectsList.map((project, index) => (
                <motion.div key={project.id} custom={index} initial="hidden" animate="visible" variants={listItemVariants} className="group">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-surface-container-high flex items-center justify-center text-secondary group-hover:bg-primary-container/10 group-hover:text-primary transition-colors">
                        <span className="material-symbols-outlined text-sm">code</span>
                      </div>
                      <span className="font-body-sm text-body-sm font-semibold text-on-surface">
                        {project.title}
                      </span>
                    </div>
                    <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">
                      {project.progress}%
                    </span>
                  </div>
                  <div className="w-full bg-surface-container-highest rounded-full h-2 overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${project.progress}%` }}
                      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                      className="bg-primary h-2 rounded-full"
                    />
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>

        {/* Upcoming Events Widget (4 cols) */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="lg:col-span-4 bg-surface-container rounded-xl border border-outline-variant shadow-sm flex flex-col">
          <div className="p-5 border-b border-surface-variant bg-surface-container-low rounded-t-xl">
            <h3 className="font-headline-lg text-headline-lg text-on-surface">Upcoming Events</h3>
          </div>
          <div className="p-0 flex-1 divide-y divide-outline-variant">
            {upcomingEventsList.length === 0 ? (
              <p className="text-sm text-on-surface-variant italic p-6 text-center">No upcoming events scheduled.</p>
            ) : (
              upcomingEventsList.map((event, index) => {
                const eventDate = new Date(event.event_date)
                const month = eventDate.toLocaleString('default', { month: 'short' }).toUpperCase()
                const day = eventDate.getDate()
                const time = eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

                return (
                  <motion.div key={event.id} custom={index} initial="hidden" animate="visible" variants={listItemVariants}>
                  <Link to={`/events/${event.id}`} className="p-4 hover:bg-surface-container-low transition-colors flex gap-4 items-center">
                    <div className="flex flex-col items-center justify-center min-w-[48px] bg-surface-container-high rounded-lg p-2 border border-outline-variant">
                      <span className="font-label-caps text-label-caps uppercase text-primary font-bold">{month}</span>
                      <span className="font-headline-lg text-headline-lg text-on-surface leading-none">{day}</span>
                    </div>
                    <div>
                      <h4 className="font-body-sm text-body-sm font-bold text-on-surface">{event.title}</h4>
                      <p className="font-label-caps text-label-caps uppercase text-on-surface-variant mt-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">schedule</span> {time} - {event.venue}
                      </p>
                    </div>
                  </Link>
                  </motion.div>
                )
              })
            )}
          </div>
        </motion.div>

        {/* Announcements (6 cols) */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="lg:col-span-6 bg-surface-container rounded-xl border border-outline-variant shadow-sm flex flex-col">
          <div className="p-5 border-b border-surface-variant bg-surface-container-low rounded-t-xl">
            <h3 className="font-headline-lg text-headline-lg text-on-surface">Announcements</h3>
          </div>
          <div className="p-5 space-y-4">
            {announcements.length === 0 ? (
              <p className="text-sm text-on-surface-variant italic p-4 text-center">No system announcements.</p>
            ) : (
              announcements.map((ann) => (
                <div 
                  key={ann.id} 
                  className="flex gap-4 cursor-pointer hover:bg-surface-container-high p-2 rounded transition-colors"
                  onDoubleClick={() => setSelectedAnnouncement(ann)}
                >
                  <div className={`w-2 h-2 mt-2 rounded-full shrink-0 ${ann.priority === 1 ? 'bg-red-500' : ann.priority === 2 ? 'bg-amber-400' : 'bg-primary'}`}></div>
                  <div className="flex-1 min-w-0">
                    {ann.title && <h4 className="font-body-sm text-body-sm font-bold text-on-surface truncate">{ann.title}</h4>}
                    <p className={`font-body-sm text-body-sm text-on-surface ${ann.title ? 'mt-1 line-clamp-2 text-on-surface-variant' : 'font-semibold'}`}>
                      {ann.message}
                    </p>
                    <span className="font-label-caps text-label-caps uppercase text-outline mt-2 block">
                      By {ann.sender?.full_name || 'System'} • {new Date(ann.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Calendar / Deadlines (6 cols) */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="lg:col-span-6 bg-surface-container rounded-xl border border-outline-variant shadow-sm flex flex-col p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-headline-lg text-headline-lg text-on-surface">{currentMonthYear}</h3>
            <div className="flex gap-2">
              <button onClick={goToPrevMonth} className="p-1 text-on-surface-variant hover:bg-surface-container-high rounded"><span className="material-symbols-outlined text-sm">chevron_left</span></button>
              <button onClick={goToNextMonth} className="p-1 text-on-surface-variant hover:bg-surface-container-high rounded"><span className="material-symbols-outlined text-sm">chevron_right</span></button>
            </div>
          </div>
          <div className={`bg-surface-container-lowest rounded-lg border border-outline-variant p-4 transition-opacity duration-200 ${calendarLoading ? 'opacity-50' : 'opacity-100'}`}>
            <div className="grid grid-cols-7 gap-1 text-center mb-2 font-label-caps text-label-caps uppercase text-on-surface-variant">
              <div>S</div><div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center font-body-sm text-body-sm">
              {calendarDays.map((dayObj, index) => {
                let cellClass = "p-1 rounded transition-colors "
                if (!dayObj.isCurrentMonth) cellClass += "text-outline/40"
                else if (dayObj.isToday) cellClass += "bg-primary text-on-primary font-bold"
                else if (dayObj.isDeadline) cellClass += "bg-error-container text-on-error-container font-bold relative group cursor-pointer"
                else if (dayObj.isEvent) cellClass += "bg-tertiary-container text-on-tertiary-container font-bold relative group cursor-pointer"

                return (
                  <div key={index} className={cellClass}>
                    {dayObj.day}
                    {dayObj.tooltip && (
                      <span className="absolute hidden group-hover:block bottom-full mb-1 left-1/2 -translate-x-1/2 w-max p-1 bg-inverse-surface text-inverse-on-surface text-xs rounded z-10">
                        {dayObj.tooltip}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
          <div className="mt-4 flex gap-4 font-label-caps text-label-caps uppercase text-xs">
            <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-primary"></div> Today</div>
            <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-error-container"></div> Deadline</div>
            <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-tertiary-container"></div> Event</div>
          </div>
        </motion.div>
      </div>
    </main>

    {selectedAnnouncement && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in zoom-in duration-200" onClick={() => setSelectedAnnouncement(null)}>
        <div className="bg-surface rounded-xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto border border-outline-variant shadow-xl" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-start mb-4">
            <h2 className="font-headline-md text-headline-md text-on-surface pr-4">
              {selectedAnnouncement.title || 'Announcement'}
            </h2>
            <button onClick={() => setSelectedAnnouncement(null)} className="text-on-surface-variant hover:text-on-surface">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <p className="font-body-md text-body-md text-on-surface whitespace-pre-wrap">
            {selectedAnnouncement.message}
          </p>
          <div className="mt-6 pt-4 border-t border-outline-variant flex justify-between items-center text-sm text-on-surface-variant">
            <span>By {selectedAnnouncement.sender?.full_name || 'System'}</span>
            <span>{new Date(selectedAnnouncement.created_at).toLocaleString()}</span>
          </div>
        </div>
      </div>
    )}
    </>
  )
}