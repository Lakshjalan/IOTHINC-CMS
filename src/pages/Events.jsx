import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useEvents } from '../hooks/useEvents'
import { useAuth } from '../hooks/useAuth'

export const Events = () => {
  const { role } = useAuth()
  const isAdmin = (role === 'chairperson' || role === 'vice_chairperson')
  const canManage = ['chairperson', 'vice_chairperson', 'department_lead'].includes(role)
  const [statusTab, setStatusTab] = useState('All')
  const { events, loading, createEvent, deleteEvent } = useEvents(statusTab)
  const navigate = useNavigate()

  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ 
    title: '', 
    description: '', 
    category: 'WORKSHOP', 
    venue: '', 
    event_date: '', 
    registration_deadline: '', 
    max_seats: '' 
  })

  useEffect(() => { document.title = "Events | IOTHINC" }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      const newEvent = await createEvent({ 
        ...form, 
        max_seats: form.max_seats ? parseInt(form.max_seats) : null, 
        event_date: new Date(form.event_date).toISOString(), 
        registration_deadline: form.registration_deadline ? new Date(form.registration_deadline).toISOString() : null 
      })
      setShowCreate(false)
      setForm({ title: '', description: '', category: 'WORKSHOP', venue: '', event_date: '', registration_deadline: '', max_seats: '' })
      // Navigate directly to the new event to start adding teams
      if (newEvent?.id) {
        navigate(`/events/${newEvent.id}`)
      }
    } catch (err) { alert('Error: ' + err.message) }
  }

  const handleDeleteEvent = async (id, title) => {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return
    try {
      await deleteEvent(id)
    } catch (err) { alert('Error deleting event: ' + err.message) }
  }

  const tabs = ['All', 'Upcoming', 'Ongoing', 'Past', 'My Events']

  return (
    <main className="flex-1 px-4 md:px-stack-lg pt-24 pb-section-gap max-w-7xl mx-auto w-full animate-in fade-in duration-200">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="font-headline-xl text-headline-xl text-on-surface">Events Hub</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2">Discover club events, join sub-teams, and manage tasks.</p>
        </div>
        {canManage && (
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-primary text-on-primary font-bold font-label-caps text-xs uppercase px-4 py-3 rounded-lg hover:brightness-110 active:scale-[0.98] transition-all">
            <span className="material-symbols-outlined">add</span>Create Event
          </button>
        )}
      </div>

      <div className="flex gap-2 border-b border-outline-variant mb-6 pb-px overflow-x-auto no-scrollbar">
        {tabs.map(t => (
          <button key={t} onClick={() => setStatusTab(t)} className={`px-4 py-2.5 font-label-caps text-xs uppercase font-bold border-b-2 transition-all whitespace-nowrap ${statusTab === t ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}>{t}</button>
        ))}
      </div>

      {loading ? (
        <div className="p-12 text-center">
          <svg className="animate-spin h-8 w-8 text-primary mx-auto" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"/></svg>
        </div>
      ) : events.length === 0 ? (
        <div className="bg-surface-container rounded-xl border border-outline-variant p-12 text-center text-on-surface-variant italic">No events found for this filter.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map(ev => {
            const d = new Date(ev.event_date)
            return (
              <div key={ev.id} className="bg-surface-container rounded-2xl border border-outline-variant p-5 flex flex-col shadow-sm hover:shadow-lg hover:border-primary/20 transition-all">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[10px] font-bold font-label-caps uppercase text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">{ev.category}</span>
                  <span className={`text-[10px] font-bold font-label-caps uppercase px-2 py-0.5 rounded-full border ${ev.status === 'upcoming' ? 'bg-success/10 text-success border-success/20' : ev.status === 'ongoing' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-surface-variant text-on-surface-variant border-outline-variant'}`}>{ev.status}</span>
                </div>
                
                <h3 className="font-bold text-lg text-on-surface mb-2 line-clamp-1">{ev.title}</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-2 mb-4 flex-1">{ev.description}</p>
                
                <div className="space-y-2 text-xs text-on-surface-variant mb-5">
                  <div className="flex items-center gap-2"><span className="material-symbols-outlined text-sm">schedule</span>{d.toLocaleDateString()} {d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</div>
                  <div className="flex items-center gap-2"><span className="material-symbols-outlined text-sm">location_on</span>{ev.venue || 'TBD'}</div>
                </div>
                
                <div className="pt-4 border-t border-outline-variant/30 flex justify-between items-center">
                   <div className="flex -space-x-2">
                     <div className="w-6 h-6 rounded-full bg-surface-container-high border-2 border-surface-container flex items-center justify-center text-[10px] text-on-surface-variant"><span className="material-symbols-outlined text-[12px]">group</span></div>
                   </div>
                   <div className="flex items-center gap-2">
                     {isAdmin && (
                       <button
                         onClick={() => handleDeleteEvent(ev.id, ev.title)}
                         className="p-1.5 text-on-surface-variant/40 hover:text-error hover:bg-error/10 rounded-lg transition-colors"
                         title="Delete event"
                       >
                         <span className="material-symbols-outlined text-sm">delete</span>
                       </button>
                     )}
                     <Link to={`/events/${ev.id}`} className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-light transition-colors">
                       View Event <span className="material-symbols-outlined text-sm">arrow_forward</span>
                     </Link>
                   </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-outline-variant rounded-2xl max-w-lg w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <h3 className="font-headline-lg text-headline-lg text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">event_available</span> Create Event
            </h3>
            <p className="text-xs text-on-surface-variant mb-6">Create the event first, then you can add sub-teams and tasks on the event page.</p>
            
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-label-caps text-on-surface-variant mb-1 uppercase">Event Title</label>
                <input type="text" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} className="w-full bg-surface-container-low text-on-surface p-3 rounded-xl border border-outline-variant text-sm focus:ring-primary focus:outline-none focus:ring-2" required placeholder="e.g. Annual Hackathon"/>
              </div>
              <div>
                <label className="block text-xs font-label-caps text-on-surface-variant mb-1 uppercase">Description</label>
                <textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} className="w-full bg-surface-container-low text-on-surface p-3 rounded-xl border border-outline-variant text-sm h-24 resize-none focus:ring-primary focus:outline-none focus:ring-2" placeholder="What is this event about?"/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-label-caps text-on-surface-variant mb-1 uppercase">Category</label>
                  <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} className="w-full bg-surface-container-low text-on-surface p-3 rounded-xl border border-outline-variant text-sm focus:ring-primary focus:outline-none focus:ring-2">
                    <option value="WORKSHOP">Workshop</option>
                    <option value="HACKATHON">Hackathon</option>
                    <option value="SEMINAR">Seminar</option>
                    <option value="COMPETITION">Competition</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-label-caps text-on-surface-variant mb-1 uppercase">Venue</label>
                  <input type="text" value={form.venue} onChange={e=>setForm({...form,venue:e.target.value})} className="w-full bg-surface-container-low text-on-surface p-3 rounded-xl border border-outline-variant text-sm focus:ring-primary focus:outline-none focus:ring-2" placeholder="e.g. Main Auditorium"/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-label-caps text-on-surface-variant mb-1 uppercase">Event Date</label>
                  <input type="datetime-local" value={form.event_date} onChange={e=>setForm({...form,event_date:e.target.value})} className="w-full bg-surface-container-low text-on-surface p-3 rounded-xl border border-outline-variant text-sm focus:ring-primary focus:outline-none focus:ring-2" required/>
                </div>
                <div>
                  <label className="block text-xs font-label-caps text-on-surface-variant mb-1 uppercase">Max Capacity</label>
                  <input type="number" value={form.max_seats} onChange={e=>setForm({...form,max_seats:e.target.value})} className="w-full bg-surface-container-low text-on-surface p-3 rounded-xl border border-outline-variant text-sm focus:ring-primary focus:outline-none focus:ring-2" placeholder="Leave empty for unlimited"/>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/30 mt-6">
                <button type="button" onClick={()=>setShowCreate(false)} className="px-5 py-2.5 text-on-surface-variant hover:bg-surface-container-high rounded-xl font-bold text-sm transition-colors">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-primary text-on-primary rounded-xl font-bold text-sm hover:brightness-110 flex items-center gap-2 transition-all">
                  Create Event <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
