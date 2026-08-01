import React, { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useContributions } from '../hooks/useContributions'
import { supabase } from '../supabaseClient'
import { GridSkeleton } from '../components/SkeletonLoaders'

export const Contributions = () => {
  const { user, role } = useAuth()
  const canManage = (role === 'chairperson' || role === 'vice_chairperson')
  const { contributions, loading, toggleFlagContribution, deleteContribution, refetch } = useContributions()
  const [searchParams] = useSearchParams()

  const [filterProject, setFilterProject] = useState(searchParams.get('project_id') || '')
  const [filterEvent, setFilterEvent] = useState(searchParams.get('event_id') || '')
  const [filterMember, setFilterMember] = useState(searchParams.get('member_id') || '')
  const [projectsList, setProjectsList] = useState([])
  const [eventsList, setEventsList] = useState([])
  const [membersList, setMembersList] = useState([])

  useEffect(() => { document.title = "Contributions | IOTHINC" }, [])

  useEffect(() => {
    supabase.from('projects').select('id,title').then(r => setProjectsList(r.data || []))
    supabase.from('events').select('id,title').then(r => setEventsList(r.data || []))
    supabase.from('profiles').select('id,full_name').then(r => setMembersList(r.data || []))
  }, [])

  const filtered = (contributions || []).filter(c => {
    if (filterProject && c.project_id !== filterProject) return false
    if (filterEvent && c.event_id !== filterEvent) return false
    if (filterMember && c.member_id !== filterMember) return false
    return true
  })

  return (
    <main className="flex-1 px-4 md:px-stack-lg pt-24 pb-section-gap max-w-7xl mx-auto w-full">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="font-headline-xl text-headline-xl text-on-surface">Contributions</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2">View and share project contributions and achievements.</p>
        </div>
        <Link to="/contributions/new" className="flex items-center gap-2 bg-primary text-on-primary font-bold font-label-caps text-xs uppercase px-4 py-3 rounded-lg hover:brightness-110 active:scale-[0.98] transition-all">
          <span className="material-symbols-outlined">add</span>New Contribution
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select value={filterProject} onChange={e => setFilterProject(e.target.value)} className="bg-surface-container text-on-surface p-2.5 rounded-lg border border-outline-variant text-xs"><option value="">All Projects</option>{projectsList.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select>
        <select value={filterEvent} onChange={e => setFilterEvent(e.target.value)} className="bg-surface-container text-on-surface p-2.5 rounded-lg border border-outline-variant text-xs"><option value="">All Events</option>{eventsList.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}</select>
        <select value={filterMember} onChange={e => setFilterMember(e.target.value)} className="bg-surface-container text-on-surface p-2.5 rounded-lg border border-outline-variant text-xs"><option value="">All Members</option>{membersList.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}</select>
        {(filterProject || filterEvent || filterMember) && <button onClick={() => { setFilterProject(''); setFilterEvent(''); setFilterMember('') }} className="text-primary text-xs font-bold font-label-caps uppercase hover:underline">Clear</button>}
      </div>

      {loading ? (
        <GridSkeleton items={6} variant="default" className="grid-cols-1 md:grid-cols-2 lg:grid-cols-3" />
      ) : filtered.length === 0 ? (
        <div className="bg-surface-container rounded-xl border border-outline-variant p-12 text-center text-on-surface-variant italic">No contributions found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(c => (
            <div key={c.id} className="bg-surface-container rounded-xl border border-outline-variant shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
              {c.photo_url && <img src={c.photo_url} alt={c.title} className="w-full h-40 object-cover"/>}
              <div className="p-5 flex flex-col flex-1">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-on-surface line-clamp-2 flex-1">{c.title}</h3>
                  {c.flagged && <span className="text-[10px] font-bold font-label-caps uppercase px-2 py-0.5 rounded bg-error/20 text-error shrink-0 ml-2">Flagged</span>}
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-3 flex-1 mb-3">{c.description}</p>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-primary-container/20 flex items-center justify-center text-primary text-[10px] font-bold">{c.member?.full_name?.charAt(0)?.toUpperCase()}</div>
                  <span className="text-xs text-on-surface-variant">{c.member?.full_name || 'Unknown'}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 text-[10px] text-outline font-label-caps uppercase mb-3">
                  {c.project?.title && <span className="bg-primary/10 text-primary px-2 py-0.5 rounded">{c.project?.title}</span>}
                  {c.event?.title && <span className="bg-success/10 text-success px-2 py-0.5 rounded">{c.event?.title}</span>}
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-outline-variant/30">
                  <div className="flex items-center gap-3">
                    {c.member_id === user?.id && (
                      <button onClick={() => alert('Edit functionality coming soon!')} className="text-on-surface-variant hover:text-primary transition-colors"><span className="material-symbols-outlined text-lg">edit</span></button>
                    )}
                    {c.comments?.[0]?.count > 0 && <span className="text-[10px] text-outline flex items-center gap-0.5"><span className="material-symbols-outlined text-sm">comment</span>{c.comments?.[0]?.count}</span>}
                  </div>
                  {canManage && (
                    <div className="flex gap-1.5">
                      <button onClick={() => toggleFlagContribution(c.id, !c.flagged)} className="p-1 rounded hover:bg-surface-container-high transition-colors"><span className="material-symbols-outlined text-lg text-amber-400">flag</span></button>
                      <button onClick={() => { if (confirm('Remove?')) deleteContribution(c.id) }} className="p-1 rounded hover:bg-surface-container-high transition-colors"><span className="material-symbols-outlined text-lg text-error">delete</span></button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
