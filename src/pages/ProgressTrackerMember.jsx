import React, { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useProgress } from '../hooks/useProgress'
import { useAuth } from '../hooks/useAuth'
import { useContributions } from '../hooks/useContributions'
import { sanitizeUUID } from '../utils/sanitize'
import { supabase } from '../supabaseClient'
import { ProgressRingSkeleton, ListSkeleton, GridSkeleton } from '../components/SkeletonLoaders'

const ProgressTrackerMember = () => {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const memberId = sanitizeUUID(searchParams.get('member_id'))
  const effectiveMemberId = memberId || user?.id

  const { tasks, loading, avgProgress, refetch, updateProgress } = useProgress(effectiveMemberId)
  const { contributions, loading: contrLoading, deleteContribution } = useContributions({ memberId: effectiveMemberId })
  const [editingTask, setEditingTask] = useState(null)
  const [progressInput, setProgressInput] = useState('')

  // completion request modal
  const [requestModal, setRequestModal] = useState(null) // task object or null
  const [reqForm, setReqForm] = useState({ reg_no: '', desc: '' })
  const [reqLoading, setReqLoading] = useState(false)

  useEffect(() => { document.title = "My Progress | IOTHINC" }, [])

  const handleUpdateProgress = async (taskId) => {
    const val = parseInt(progressInput)
    if (isNaN(val) || val < 0 || val >= 100) { 
      alert('Enter a progress value between 0 and 99. To set the task as completed, please submit a "Request Completion" request.')
      return 
    }
    try {
      await updateProgress(taskId, val)
      setEditingTask(null)
      setProgressInput('')
    } catch (err) { alert(err.message) }
  }

  const handleRequestCompletion = async (e) => {
    e.preventDefault()
    setReqLoading(true)
    const { error } = await supabase.from('tasks').update({
      completion_request_status: 'pending',
      completion_reg_no: reqForm.reg_no,
      completion_desc: reqForm.desc,
    }).eq('id', requestModal.id)
    setReqLoading(false)
    if (error) { alert(error.message); return }
    setRequestModal(null)
    setReqForm({ reg_no: '', desc: '' })
    refetch()
  }

  const statusColor = (s) => s === 'completed' ? 'bg-success/20 text-success' : s === 'in_progress' ? 'bg-primary/20 text-primary' : s === 'blocked' ? 'bg-error/20 text-error' : 'bg-surface-variant text-on-surface-variant'
  const reqStatusColor = (s) => s === 'approved' ? 'text-success' : s === 'pending' ? 'text-amber-400' : s === 'rejected' ? 'text-error' : ''

  // SVG progress ring params
  const size = 140
  const strokeWidth = 10
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (avgProgress / 100) * circumference

  return (
    <main className="flex-1 px-4 md:px-stack-lg pt-24 pb-section-gap max-w-7xl mx-auto w-full">
      <h2 className="font-headline-xl text-headline-xl text-on-surface mb-2">My Progress</h2>
      <p className="font-body-md text-body-md text-on-surface-variant mb-8">Track your task assignments and overall performance.</p>

      {loading ? (
        <div className="grid lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <ProgressRingSkeleton />
          </div>
          <div className="lg:col-span-3">
            <ListSkeleton items={4} variant="task" showAvatar={false} />
          </div>
        </div>
      ) : (
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Progress Ring */}
          <div className="lg:col-span-1 flex flex-col items-center">
            <div className="bg-surface-container rounded-xl border border-outline-variant p-6 shadow-sm flex flex-col items-center w-full">
              <svg width={size} height={size} className="transform -rotate-90 mb-4">
                <circle cx={size/2} cy={size/2} r={radius} stroke="currentColor" strokeWidth={strokeWidth} fill="none" className="text-surface-variant"/>
                <circle cx={size/2} cy={size/2} r={radius} stroke="currentColor" strokeWidth={strokeWidth} fill="none" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="text-primary transition-all duration-700"/>
              </svg>
              <div className="text-center">
                <div className="text-3xl font-bold font-mono-data text-primary">{avgProgress}%</div>
                <div className="text-xs font-label-caps uppercase text-on-surface-variant mt-1">Average Progress</div>
              </div>
              <div className="grid grid-cols-2 gap-4 w-full mt-4 pt-4 border-t border-outline-variant/30">
                <div className="text-center">
                  <div className="text-lg font-bold font-mono-data text-on-surface">{tasks.length}</div>
                  <div className="text-[10px] font-label-caps uppercase text-outline">Total Tasks</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold font-mono-data text-success">{tasks.filter(t => t.status === 'completed').length}</div>
                  <div className="text-[10px] font-label-caps uppercase text-outline">Completed</div>
                </div>
              </div>
            </div>
          </div>

          {/* Task List */}
          <div className="lg:col-span-3">
            {tasks.length === 0 ? (
              <div className="bg-surface-container rounded-xl border border-outline-variant p-12 text-center text-on-surface-variant italic">No tasks assigned to you yet.</div>
            ) : (
              <div className="space-y-4">
                {tasks.map(t => (
                  <div key={t.id} className="bg-surface-container rounded-xl border border-outline-variant p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`font-bold text-on-surface ${t.status === 'completed' ? 'line-through text-on-surface-variant' : ''}`}>{t.title}</span>
                          <span className={`text-[10px] font-bold font-label-caps uppercase px-2 py-0.5 rounded ${statusColor(t.status)}`}>{t.status?.replace('_', ' ')}</span>
                          {t.completion_request_status && t.completion_request_status !== 'none' && (
                            <span className={`text-[10px] font-bold font-label-caps uppercase px-2 py-0.5 rounded border ${reqStatusColor(t.completion_request_status)} border-current bg-current/10`}>
                              {t.completion_request_status === 'pending' ? 'Request Pending' : t.completion_request_status === 'approved' ? 'Request Approved' : 'Request Rejected'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-[10px] text-outline font-label-caps uppercase">
                          {t.due_date && <span>Due {new Date(t.due_date).toLocaleDateString()}</span>}
                          {t.assigner?.full_name && <span>Assigned by {t.assigner.full_name}</span>}
                          {t.project?.title && <span>Project: {t.project.title}</span>}
                          {t.event?.title && <span>Event: {t.event.title}</span>}
                        </div>
                      </div>
                      <span className="text-xl font-bold font-mono-data text-primary shrink-0 ml-4">{t.progress ?? 0}%</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-surface rounded-full mb-3">
                      <div className="h-full bg-gradient-to-r from-primary to-primary-container rounded-full transition-all duration-500" style={{ width: `${t.progress ?? 0}%` }}/>
                    </div>

                    {/* Admin Comment */}
                    {t.admin_comment && (
                      <div className="bg-surface-container-low rounded-lg border border-outline-variant/50 p-3 mb-3">
                        <div className="text-[10px] text-outline font-label-caps uppercase mb-1">Admin Comment</div>
                        <div className="text-xs text-on-surface-variant">{t.admin_comment}</div>
                      </div>
                    )}

                    {/* Actions */}
                    {effectiveMemberId === user?.id && t.status !== 'completed' && (
                      <div className="flex items-center gap-3 pt-2">
                        {/* Request Completion button instead of Mark as Done */}
                        {(t.completion_request_status === 'none' || !t.completion_request_status || t.completion_request_status === 'rejected') && (
                          <button onClick={() => setRequestModal(t)} className="px-3 py-1.5 bg-primary/10 text-primary text-xs font-bold font-label-caps uppercase rounded border border-primary/20 hover:bg-primary/20 transition-all flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">check_circle</span>Request Completion
                          </button>
                        )}
                        {editingTask === t.id ? (
                          <div className="flex items-center gap-2">
                            <input type="number" min="0" max="99" value={progressInput} onChange={e => setProgressInput(e.target.value)} className="w-20 bg-surface-container-low text-on-surface p-2 rounded border border-outline-variant text-xs text-center focus:ring-primary" placeholder="0-99" autoFocus/>
                            <button onClick={() => handleUpdateProgress(t.id)} className="px-2 py-1.5 bg-primary/20 text-primary text-xs font-bold rounded hover:bg-primary/30">Save</button>
                            <button onClick={() => { setEditingTask(null); setProgressInput('') }} className="px-2 py-1.5 text-on-surface-variant text-xs rounded hover:bg-surface-container-high">Cancel</button>
                          </div>
                        ) : (
                          <button onClick={() => { setEditingTask(t.id); setProgressInput(String(t.progress ?? 0)) }} className="px-3 py-1.5 bg-primary/20 text-primary text-xs font-bold font-label-caps uppercase rounded hover:bg-primary/30 transition-all flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">update</span>Update Progress
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Contributions Section */}
      <div className="mt-12 pt-8 border-t border-outline-variant/30">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="font-headline-lg text-lg font-bold text-on-surface">Logged Contributions</h3>
            <p className="text-xs text-on-surface-variant mt-1">Project work, research publications, and club contributions.</p>
          </div>
          {(!memberId || memberId === user?.id) && (
            <Link 
              to="/contributions/new" 
              className="flex items-center gap-2 bg-primary text-on-primary font-bold font-label-caps text-xs uppercase px-4 py-2.5 rounded-lg hover:brightness-110 active:scale-[0.98] transition-all"
            >
              <span className="material-symbols-outlined text-sm">add</span>Log Contribution
            </Link>
          )}
        </div>

        {contrLoading ? (
          <GridSkeleton items={3} variant="default" />
        ) : contributions.length === 0 ? (
          <div className="bg-surface-container rounded-xl border border-outline-variant p-8 text-center text-on-surface-variant italic text-sm">
            No logged contributions.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {contributions.map(c => (
              <div key={c.id} className="bg-surface-container rounded-xl border border-outline-variant shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
                {c.photo_url && <img src={c.photo_url} alt={c.title} className="w-full h-36 object-cover"/>}
                <div className="p-4 flex flex-col flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-bold text-sm text-on-surface line-clamp-2 flex-1">{c.title}</h4>
                    {c.flagged && (
                      <span className="text-[9px] font-bold font-label-caps uppercase px-1.5 py-0.5 rounded bg-error/20 text-error shrink-0 ml-2">
                        Flagged
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-3 flex-1 mb-3">{c.description}</p>
                  <div className="flex flex-wrap gap-1 text-[9px] text-outline font-label-caps uppercase mb-3">
                    {c.project_name && <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded">{c.project_name}</span>}
                    {c.event_name && <span className="bg-success/10 text-success px-1.5 py-0.5 rounded">{c.event_name}</span>}
                    <span className="bg-surface-container-high px-1.5 py-0.5 rounded">{c.visibility}</span>
                  </div>
                  {/* Delete option if it belongs to current user */}
                  {c.member_id === user?.id && (
                    <div className="flex justify-end pt-2 border-t border-outline-variant/30">
                      <button 
                        onClick={() => { if (confirm('Remove this contribution?')) deleteContribution(c.id) }} 
                        className="text-error hover:bg-error/10 p-1.5 rounded transition-colors"
                        title="Delete"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Completion Request Modal (member) ───────────────────────────────── */}
      {requestModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setRequestModal(null)}>
          <div className="bg-surface-container rounded-2xl border border-outline-variant p-6 shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-base text-on-surface mb-1">Request Task Completion</h3>
            <p className="text-xs text-on-surface-variant mb-5">"{requestModal.title}"</p>
            <form onSubmit={handleRequestCompletion} className="space-y-4">
              <div>
                <label className="block text-xs font-label-caps text-on-surface-variant mb-1 uppercase">Your Registration Number</label>
                <input
                  type="text"
                  value={reqForm.reg_no}
                  onChange={e => setReqForm({...reqForm, reg_no: e.target.value})}
                  placeholder="e.g. 23BCE1234"
                  className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-label-caps text-on-surface-variant mb-1 uppercase">How did you complete this task?</label>
                <textarea
                  value={reqForm.desc}
                  onChange={e => setReqForm({...reqForm, desc: e.target.value})}
                  placeholder="Describe what you did to complete this task..."
                  className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant text-sm h-28 resize-none"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setRequestModal(null)} className="px-4 py-2 text-on-surface-variant hover:bg-surface-container-high rounded-lg font-label-caps text-xs uppercase">Cancel</button>
                <button type="submit" disabled={reqLoading} className="px-5 py-2 bg-primary text-on-primary rounded-lg font-bold font-label-caps text-xs uppercase hover:brightness-110 disabled:opacity-60">
                  {reqLoading ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}

export default ProgressTrackerMember;
