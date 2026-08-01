import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useAllMembersProgress } from '../hooks/useProgress'
import { useContributions } from '../hooks/useContributions'
import { supabase } from '../supabaseClient'
import { TableSkeleton, GridSkeleton } from '../components/SkeletonLoaders'

export const ProgressTrackerAdmin = () => {
  const { role, user } = useAuth()
  const navigate = useNavigate()
  const { members, loading } = useAllMembersProgress()

  const [activeTab, setActiveTab] = useState('members') // 'members' | 'contributions'
  const [search, setSearch] = useState('')
  const [commentTarget, setCommentTarget] = useState(null)
  const [commentText, setCommentText] = useState('')

  // Derived from cached members data — no separate state/effect needed
  const clubAvg = members.length > 0
    ? Math.round(members.reduce((sum, m) => sum + m.avgProgress, 0) / members.length)
    : 0

  // Contributions tab states & filtering
  const { contributions, loading: contrLoading, toggleFlagContribution, deleteContribution } = useContributions()
  const [filterProject, setFilterProject] = useState('')
  const [filterEvent, setFilterEvent] = useState('')
  const [filterMember, setFilterMember] = useState('')
  const [projectsList, setProjectsList] = useState([])
  const [eventsList, setEventsList] = useState([])
  const [membersList, setMembersList] = useState([])

  useEffect(() => { document.title = "Progress Tracker (Admin) | IOTHINC" }, [])

  useEffect(() => {
    supabase.from('projects').select('id,title').then(r => setProjectsList(r.data || []))
    supabase.from('events').select('id,title').then(r => setEventsList(r.data || []))
    supabase.from('profiles').select('id,full_name').then(r => setMembersList(r.data || []))
  }, [])

  const handleAddComment = async (memberId) => {
    if (!commentText.trim()) return
    try {
      await supabase.from('tasks').update({ admin_comment: commentText }).eq('assigned_to', memberId)
      setCommentTarget(null)
      setCommentText('')
      alert('Comment added to all tasks for this member.')
    } catch (err) { alert(err.message) }
  }

  if (!['chairperson', 'vice_chairperson', 'department_lead'].includes(role)) {
    return <main className="flex-1 px-4 md:px-stack-lg pt-24 pb-section-gap max-w-7xl mx-auto w-full"><div className="text-center text-error text-lg mt-20">Access denied. Leadership only.</div></main>
  }

  const filtered = members.filter(m => m.full_name?.toLowerCase().includes(search.toLowerCase()))

  const filteredContributions = (contributions || []).filter(c => {
    if (filterProject && c.project_id !== filterProject) return false
    if (filterEvent && c.event_id !== filterEvent) return false
    if (filterMember && c.member_id !== filterMember) return false
    return true
  })

  return (
    <main className="flex-1 px-4 md:px-stack-lg pt-24 pb-section-gap max-w-7xl mx-auto w-full">
      <h2 className="font-headline-xl text-headline-xl text-on-surface mb-2">Progress Tracker</h2>
      <p className="font-body-md text-body-md text-on-surface-variant mb-8">Monitor all members' task progress across the club.</p>

      {/* Club Average */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-surface-container rounded-xl border border-outline-variant p-5 shadow-sm">
          <div className="text-[10px] font-label-caps uppercase text-outline mb-1">Club Average</div>
          <div className="text-2xl font-bold font-mono-data text-primary">{clubAvg}%</div>
          <div className="w-full h-1.5 bg-surface rounded-full mt-2"><div className="h-full bg-primary rounded-full transition-all" style={{ width: `${clubAvg}%` }}/></div>
        </div>
        <div className="bg-surface-container rounded-xl border border-outline-variant p-5 shadow-sm">
          <div className="text-[10px] font-label-caps uppercase text-outline mb-1">Total Members</div>
          <div className="text-2xl font-bold font-mono-data text-on-surface">{members.length}</div>
        </div>
        <div className="bg-surface-container rounded-xl border border-outline-variant p-5 shadow-sm">
          <div className="text-[10px] font-label-caps uppercase text-outline mb-1">With Active Tasks</div>
          <div className="text-2xl font-bold font-mono-data text-success">{members.filter(m => m.tasksCount > 0).length}</div>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex gap-4 border-b border-outline-variant mb-6">
        <button
          onClick={() => setActiveTab('members')}
          className={`pb-3 px-1 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'members'
              ? 'border-primary text-primary'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Members Progress
        </button>
        <button
          onClick={() => setActiveTab('contributions')}
          className={`pb-3 px-1 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'contributions'
              ? 'border-primary text-primary'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          All Contributions
        </button>
      </div>

      {activeTab === 'members' ? (
        <>
          {/* Search */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">search</span>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search members..." className="w-full bg-surface-container text-on-surface pl-10 pr-4 py-3 rounded-lg border border-outline-variant text-sm focus:ring-primary"/>
            </div>
          </div>

          {loading ? (
            <TableSkeleton columns={6} rows={8} />
          ) : (
            <div className="bg-surface-container rounded-xl border border-outline-variant shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant">
                      <th className="text-left px-5 py-3 text-[10px] font-bold font-label-caps uppercase text-outline">Member</th>
                      <th className="text-left px-5 py-3 text-[10px] font-bold font-label-caps uppercase text-outline">Department</th>
                      <th className="text-center px-5 py-3 text-[10px] font-bold font-label-caps uppercase text-outline">Tasks</th>
                      <th className="text-center px-5 py-3 text-[10px] font-bold font-label-caps uppercase text-outline">Completed</th>
                      <th className="text-left px-5 py-3 text-[10px] font-bold font-label-caps uppercase text-outline min-w-[160px]">Avg Progress</th>
                      <th className="text-right px-5 py-3 text-[10px] font-bold font-label-caps uppercase text-outline">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(m => (
                      <React.Fragment key={m.id}>
                        <tr className="border-b border-outline-variant/50 hover:bg-surface-container-low transition-colors">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary-container/20 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                                {m.avatar_url ? <img src={m.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover"/> : m.full_name?.charAt(0)?.toUpperCase()}
                              </div>
                              <div>
                                <div className="font-bold text-on-surface text-sm">{m.full_name}</div>
                                <div className="text-[10px] text-outline">{m.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-on-surface-variant text-xs">{m.department || '—'}</td>
                          <td className="px-5 py-3 text-center font-mono-data text-on-surface">{m.tasksCount}</td>
                          <td className="px-5 py-3 text-center font-mono-data text-success">{m.completedCount}</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-surface rounded-full"><div className="h-full bg-primary rounded-full transition-all" style={{ width: `${m.avgProgress}%` }}/></div>
                              <span className="text-xs font-mono-data text-primary shrink-0 w-8 text-right">{m.avgProgress}%</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button onClick={() => navigate(`/progress?member_id=${m.id}`)} className="p-1.5 rounded hover:bg-primary/10 transition-colors" title="View Progress">
                                <span className="material-symbols-outlined text-lg text-primary">visibility</span>
                              </button>
                              <button onClick={() => setCommentTarget(commentTarget === m.id ? null : m.id)} className="p-1.5 rounded hover:bg-primary/10 transition-colors" title="Add Comment">
                                <span className="material-symbols-outlined text-lg text-primary">comment</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                        {commentTarget === m.id && (
                          <tr className="bg-surface-container-low">
                            <td colSpan={6} className="px-5 py-3">
                              <div className="flex items-center gap-3">
                                <textarea value={commentText} onChange={e => setCommentText(e.target.value)} placeholder={`Add admin comment for ${m.full_name}'s tasks...`} className="flex-1 bg-surface text-on-surface p-3 rounded-lg border border-outline-variant text-xs resize-none h-16 focus:ring-primary"/>
                                <div className="flex flex-col gap-1.5">
                                  <button onClick={() => handleAddComment(m.id)} className="px-3 py-1.5 bg-primary text-on-primary text-xs font-bold font-label-caps uppercase rounded hover:brightness-110">Send</button>
                                  <button onClick={() => { setCommentTarget(null); setCommentText('') }} className="px-3 py-1.5 text-on-surface-variant text-xs rounded hover:bg-surface-container-high">Cancel</button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                    {filtered.length === 0 && (
                      <tr><td colSpan={6} className="px-5 py-8 text-center text-on-surface-variant italic">No members found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-6">
            <select value={filterProject} onChange={e => setFilterProject(e.target.value)} className="bg-surface-container text-on-surface p-2.5 rounded-lg border border-outline-variant text-xs">
              <option value="">All Projects</option>
              {projectsList.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
            <select value={filterEvent} onChange={e => setFilterEvent(e.target.value)} className="bg-surface-container text-on-surface p-2.5 rounded-lg border border-outline-variant text-xs">
              <option value="">All Events</option>
              {eventsList.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
            </select>
            <select value={filterMember} onChange={e => setFilterMember(e.target.value)} className="bg-surface-container text-on-surface p-2.5 rounded-lg border border-outline-variant text-xs">
              <option value="">All Members</option>
              {membersList.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
            </select>
            {(filterProject || filterEvent || filterMember) && (
              <button onClick={() => { setFilterProject(''); setFilterEvent(''); setFilterMember('') }} className="text-primary text-xs font-bold font-label-caps uppercase hover:underline">
                Clear
              </button>
            )}
          </div>

          {contrLoading ? (
            <GridSkeleton items={6} variant="default" />
          ) : filteredContributions.length === 0 ? (
            <div className="bg-surface-container rounded-xl border border-outline-variant p-12 text-center text-on-surface-variant italic">
              No contributions found.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredContributions.map(c => (
                <div key={c.id} className="bg-surface-container rounded-xl border border-outline-variant shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
                  {c.photo_url && <img src={c.photo_url} alt={c.title} className="w-full h-40 object-cover"/>}
                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold text-on-surface line-clamp-2 flex-1">{c.title}</h3>
                      {c.flagged && <span className="text-[10px] font-bold font-label-caps uppercase px-2 py-0.5 rounded bg-error/20 text-error shrink-0 ml-2">Flagged</span>}
                    </div>
                    <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-3 flex-1 mb-3">{c.description}</p>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-full bg-primary-container/20 flex items-center justify-center text-primary text-[10px] font-bold">
                        {c.member?.full_name?.charAt(0)?.toUpperCase() || 'M'}
                      </div>
                      <span className="text-xs text-on-surface-variant">{c.member?.full_name || 'Unknown'}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 text-[10px] text-outline font-label-caps uppercase mb-3">
                      {c.project_name && <span className="bg-primary/10 text-primary px-2 py-0.5 rounded">{c.project_name}</span>}
                      {c.event_name && <span className="bg-success/10 text-success px-2 py-0.5 rounded">{c.event_name}</span>}
                      <span className="bg-surface-container-high px-2 py-0.5 rounded">{c.visibility}</span>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-outline-variant/30">
                      <span className="text-[10px] text-outline font-mono">{new Date(c.created_at).toLocaleDateString()}</span>
                      <div className="flex gap-1.5">
                        <button onClick={() => toggleFlagContribution(c.id, !c.flagged)} className="p-1 rounded hover:bg-surface-container-high transition-colors" title={c.flagged ? "Unflag" : "Flag"}>
                          <span className={`material-symbols-outlined text-lg ${c.flagged ? 'text-amber-500' : 'text-on-surface-variant hover:text-amber-500'}`}>flag</span>
                        </button>
                        <button onClick={() => { if (confirm('Remove this contribution?')) deleteContribution(c.id) }} className="p-1 rounded hover:bg-surface-container-high transition-colors" title="Delete">
                          <span className="material-symbols-outlined text-lg text-error">delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  )
}