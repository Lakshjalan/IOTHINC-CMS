import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useProgress } from '../hooks/useProgress'
import { supabase } from '../supabaseClient'

export const ProgressTrackerAdmin = () => {
  const { role } = useAuth()
  const navigate = useNavigate()
  const { fetchAllMembersProgress } = useProgress()

  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [commentTarget, setCommentTarget] = useState(null)
  const [commentText, setCommentText] = useState('')
  const [clubAvg, setClubAvg] = useState(0)

  useEffect(() => { document.title = "Progress Tracker (Admin) | IOTHINC" }, [])

  const loadMembers = async () => {
    setLoading(true)
    const data = await fetchAllMembersProgress()
    setMembers(data || [])
    if (data && data.length > 0) {
      const total = data.reduce((sum, m) => sum + m.avgProgress, 0)
      setClubAvg(Math.round(total / data.length))
    }
    setLoading(false)
  }

  useEffect(() => { loadMembers() }, [])

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

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">search</span>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search members..." className="w-full bg-surface-container text-on-surface pl-10 pr-4 py-3 rounded-lg border border-outline-variant text-sm focus:ring-primary"/>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center"><svg className="animate-spin h-8 w-8 text-primary mx-auto" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"/></svg></div>
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
    </main>
  )
}
