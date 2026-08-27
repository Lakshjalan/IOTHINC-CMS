import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useTasks } from '../hooks/useTasks'
import { useAuth } from '../hooks/useAuth'
import { useNotifications } from '../hooks/useNotifications'
import { supabase } from '../supabaseClient'
import { ListSkeleton } from '../components/SkeletonLoaders'

const Tasks = () => {
  const { role, user } = useAuth()
  const canManage = ['chairperson', 'vice_chairperson', 'department_lead'].includes(role)
  const isSystemAdmin = ['chairperson', 'vice_chairperson'].includes(role)
  const isDepartmentLead = role === 'department_lead'

  const [viewTab, setViewTab] = useState(canManage ? 'all' : 'mine')
  const [statusTab, setStatusTab] = useState('all')
  const { tasks, loading, refetch, updateCache, assignTask, toggleTaskCompleted } = useTasks(statusTab === 'all' ? null : statusTab, viewTab)
  const { sendNotification } = useNotifications()

  const [showAssign, setShowAssign] = useState(false)
  const [members, setMembers] = useState([])
  const [teams, setTeams] = useState([])
  const [projects, setProjects] = useState([])
  const [events, setEvents] = useState([])
  const [departments, setDepartments] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // assign-to type: 'member' | 'department' | 'team'
  const [assignType, setAssignType] = useState('member')
  const [form, setForm] = useState({
    title: '', assigned_to: '', department: '', team_id: '',
    event_id: '', project_id: '', priority: 'medium', due_date: ''
  })

  // completion request modal (member side)
  const [requestModal, setRequestModal] = useState(null)
  const [reqForm, setReqForm] = useState({ reg_no: '', desc: '' })
  const [reqLoading, setReqLoading] = useState(false)

  // department lead completion selection modal
  const [completionSelectModal, setCompletionSelectModal] = useState(null)
  const [completionSelection, setCompletionSelection] = useState({})
  const [completionLoading, setCompletionLoading] = useState(false)

  // "View Members" modal for batch tasks (admin)
  const [membersModal, setMembersModal] = useState(null) // { title, label, members: [{name, status}] }
  const [membersModalLoading, setMembersModalLoading] = useState(false)

  // Fetch departments from database (from teams table)
  useEffect(() => {
    supabase.from('teams').select('department').eq('status', 'active').then(r => {
      const uniqueDepts = [...new Set((r.data || []).map(t => t.department).filter(Boolean))]
      setDepartments(uniqueDepts.sort())
    })
  }, [])

  useEffect(() => { document.title = 'Tasks | IOTHINC' }, [])

  useEffect(() => {
    if (!canManage) return
    supabase.from('profiles').select('id,full_name,department').then(r => {
      const all = r.data || []
      if (isSystemAdmin) {
        setMembers(all)
      } else {
        const myDept = all.find(m => m.id === user?.id)?.department
        setMembers(myDept ? all.filter(m => m.department === myDept) : all)
        if (myDept) setForm(prev => ({ ...prev, department: myDept }))
      }
    })
    supabase.from('teams').select('id,name,department').then(r => setTeams(r.data || []))
    supabase.from('projects').select('id,name').then(r => setProjects(r.data || []))
    supabase.from('events').select('id,title').then(r => setEvents(r.data || []))
  }, [canManage, isSystemAdmin, user?.id])

  // ─── Assign handler ─────────────────────────────────────────────────────────
  const handleAssign = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const batchId = crypto.randomUUID()
      const baseTask = {
        title: form.title,
        event_id: form.event_id || null,
        project_id: form.project_id || null,
        priority: form.priority,
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
        batch_id: batchId,
      }

      if (assignType === 'member') {
        await assignTask({ ...baseTask, assigned_to: form.assigned_to })
        await sendNotification({
          title: 'New Task Assigned',
          message: `You have been assigned a new task: "${form.title}"`,
          type: 'task',
          target_member_id: form.assigned_to,
        })
      } else if (assignType === 'department') {
        const deptMembers = members.filter(m => m.department === form.department)
        if (deptMembers.length === 0) {
          alert(`No members found in department: ${form.department}`)
        }
        for (const m of deptMembers) {
          const { error } = await supabase.from('tasks').insert({
            ...baseTask, assigned_to: m.id, assigned_by: user?.id,
            admin_comment: `department:${form.department}`
          })
          if (error) throw error
          await sendNotification({
            title: 'New Task Assigned',
            message: `You have been assigned a new task: "${form.title}"`,
            type: 'task',
            target_member_id: m.id,
          })
        }
        refetch()
      } else if (assignType === 'team') {
        const selectedTeam = teams.find(t => t.id === form.team_id)
        const teamName = selectedTeam?.name || ''
        const { data: teamMembers } = await supabase
          .from('team_members').select('member_id').eq('team_id', form.team_id)
        if (!teamMembers || teamMembers.length === 0) {
          alert('No members found in selected team.')
        } else {
          for (const member of teamMembers) {
            const { error } = await supabase.from('tasks').insert({
              ...baseTask, assigned_to: member.member_id, assigned_by: user?.id,
              admin_comment: `team:${teamName}`
            })
            if (error) throw error
          }
          refetch()
        }
      }
      alert('Task assigned successfully!')
      setShowAssign(false)
      setForm({ title: '', assigned_to: '', department: '', team_id: '', event_id: '', project_id: '', priority: 'medium', due_date: '' })
    } catch (err) {
      console.error('Error in handleAssign:', err)
      alert('Error assigning task: ' + err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // ─── Batch completion (optimistic, no reload) ────────────────────────────────
  const handleCompleteAll = async (task) => {
    if (!task.batch_id) {
      toggleTaskCompleted(task)
      return
    }

    const deptMatch = task.admin_comment?.match(/department:([^;]+)/)
    const teamMatch = task.admin_comment?.match(/team:([^;]+)/)
    const assignedDepartment = deptMatch ? deptMatch[1] : null

    // For department tasks — open member selection modal
    if (assignedDepartment && (isDepartmentLead || isSystemAdmin)) {
      const deptMembers = members.filter(m => m.department === assignedDepartment)
      setCompletionSelection(Object.fromEntries(deptMembers.map(m => [m.id, false])))
      setCompletionSelectModal({ ...task, deptMembers, assignedDepartment })
      return
    }

    // For team or generic batch tasks — complete all optimistically
    const originalTasks = [...tasks]
    const updated = tasks.map(t =>
      t.batch_id === task.batch_id ? { ...t, status: 'completed', progress: 100 } : t
    )
    updateCache(updated)

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'completed', progress: 100 })
        .eq('batch_id', task.batch_id)
      if (error) throw error
    } catch (err) {
      updateCache(originalTasks)
      alert('Failed to update: ' + err.message)
    }
  }

  // ─── Department completion selection (optimistic) ────────────────────────────
  const handleDepartmentCompletion = async (e) => {
    e.preventDefault()
    if (!completionSelectModal) return

    setCompletionLoading(true)
    try {
      const task = completionSelectModal
      const selectedMemberIds = Object.entries(completionSelection)
        .filter(([_, selected]) => selected)
        .map(([id]) => id)

      if (selectedMemberIds.length === 0) {
        alert('Please select at least one member')
        setCompletionLoading(false)
        return
      }

      // Optimistic update
      const originalTasks = [...tasks]
      const updated = tasks.map(t =>
        t.batch_id === task.batch_id && selectedMemberIds.includes(t.assigned_to)
          ? { ...t, status: 'completed', progress: 100 }
          : t
      )
      updateCache(updated)

      const { error } = await supabase
        .from('tasks')
        .update({ status: 'completed', progress: 100 })
        .eq('batch_id', task.batch_id)
        .in('assigned_to', selectedMemberIds)

      if (error) {
        updateCache(originalTasks)
        throw error
      }

      setCompletionSelectModal(null)
      setCompletionSelection({})
    } catch (err) {
      alert(err.message)
    } finally {
      setCompletionLoading(false)
    }
  }

  const handleSelectAll = () => {
    if (!completionSelectModal) return
    const allSelected = Object.values(completionSelection).every(v => v)
    setCompletionSelection(
      Object.fromEntries(completionSelectModal.deptMembers.map(m => [m.id, !allSelected]))
    )
  }

  // ─── Member completion request ───────────────────────────────────────────────
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

  // ─── Admin review completion request ────────────────────────────────────────
  const handleReviewRequest = async (taskId, approve) => {
    // Optimistic
    const original = [...tasks]
    const updated = tasks.map(t =>
      t.id === taskId
        ? { ...t, completion_request_status: approve ? 'approved' : 'rejected', ...(approve ? { status: 'completed', progress: 100 } : {}) }
        : t
    )
    updateCache(updated)

    const { error } = await supabase.from('tasks').update({
      completion_request_status: approve ? 'approved' : 'rejected',
      ...(approve ? { status: 'completed', progress: 100 } : {}),
    }).eq('id', taskId)

    if (error) {
      updateCache(original)
      alert(error.message)
    }
  }

  // ─── View Members modal for a batch task ────────────────────────────────────
  const openMembersModal = useCallback(async (batchTask) => {
    setMembersModalLoading(true)
    setMembersModal({ title: batchTask.title, label: batchTask._groupLabel, members: [] })

    try {
      const { data: batchTasks, error } = await supabase
        .from('tasks')
        .select('assigned_to, status, assignee:profiles!tasks_assigned_to_fkey(full_name)')
        .eq('batch_id', batchTask.batch_id)

      if (error) throw error

      const memberRows = (batchTasks || []).map(t => ({
        name: t.assignee?.full_name || 'Unknown',
        status: t.status,
      }))
      setMembersModal({ title: batchTask.title, label: batchTask._groupLabel, members: memberRows })
    } catch (err) {
      alert('Failed to load members: ' + err.message)
      setMembersModal(null)
    } finally {
      setMembersModalLoading(false)
    }
  }, [])

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  const tabs = ['all', 'not_started', 'in_progress', 'completed', 'blocked']
  const priorityColor = (p) => p === 'high' ? 'bg-error/20 text-error' : p === 'medium' ? 'bg-amber-500/20 text-amber-400' : 'bg-primary/20 text-primary'
  const statusColor = (s) => s === 'completed' ? 'bg-success/20 text-success' : s === 'in_progress' ? 'bg-primary/20 text-primary' : s === 'blocked' ? 'bg-error/20 text-error' : 'bg-surface-variant text-on-surface-variant'
  const reqStatusColor = (s) => s === 'approved' ? 'text-success' : s === 'pending' ? 'text-amber-400' : s === 'rejected' ? 'text-error' : ''

  // ─── Sidebar: deduplicated upcoming deadlines ────────────────────────────────
  const upcoming = useMemo(() => {
    const seen = new Set()
    return [...(tasks || [])]
      .filter(t => t.due_date && t.status !== 'completed')
      .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
      .filter(t => {
        const key = t.batch_id || t.id
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .slice(0, 5)
  }, [tasks])

  // ─── All completion requests (for Requests tab) ──────────────────────────────
  const allRequests = useMemo(() =>
    (tasks || []).filter(t => !t.isEventTask && t.completion_request_status && t.completion_request_status !== 'none'),
    [tasks]
  )
  const pendingRequests = useMemo(() =>
    allRequests.filter(t => t.completion_request_status === 'pending'),
    [allRequests]
  )

  // ─── Group batch tasks for admin "All Tasks" view ────────────────────────────
  // For admins, collapse batch tasks into a single representative card
  const displayTasks = useMemo(() => {
    if (!canManage || viewTab !== 'all') return tasks || []
    const seen = new Set()
    return (tasks || []).map(t => {
      if (!t.batch_id) return t
      if (seen.has(t.batch_id)) return null
      seen.add(t.batch_id)

      // Build label from admin_comment
      const deptMatch = t.admin_comment?.match(/department:([^;]+)/)
      const teamMatch = t.admin_comment?.match(/team:([^;]+)/)
      let groupLabel = null
      if (deptMatch) groupLabel = `Dept: ${deptMatch[1].trim()}`
      else if (teamMatch) groupLabel = `Team: ${teamMatch[1].trim()}`
      else groupLabel = 'Group Task'

      // Count siblings
      const siblings = (tasks || []).filter(s => s.batch_id === t.batch_id)
      const completed = siblings.filter(s => s.status === 'completed').length

      return { ...t, _isGroupCard: true, _groupLabel: groupLabel, _memberCount: siblings.length, _completedCount: completed }
    }).filter(Boolean)
  }, [tasks, canManage, viewTab])

  // ─── View tab options ─────────────────────────────────────────────────────────
  const viewTabs = canManage
    ? ['all', 'mine', 'team', 'requests']
    : ['mine', 'team']

  return (
    <main className="flex-1 px-4 md:px-stack-lg pt-24 pb-section-gap max-w-7xl mx-auto w-full animate-in fade-in duration-200">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="font-headline-xl text-headline-xl text-on-surface">Tasks</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2">Track assignments and deliverables.</p>
        </div>
        {canManage && (
          <button onClick={() => setShowAssign(!showAssign)} className="flex items-center gap-2 bg-primary text-on-primary font-bold font-label-caps text-xs uppercase px-4 py-3 rounded-lg hover:brightness-110 active:scale-[0.98] transition-all">
            <span className="material-symbols-outlined">add_task</span>Assign Task
          </button>
        )}
      </div>

      {/* Assign Form */}
      {showAssign && canManage && (
        <div className="bg-surface-container rounded-xl border border-outline-variant p-5 shadow-sm mb-6">
          <h3 className="text-sm font-bold text-on-surface mb-4">New Task Assignment</h3>
          <form onSubmit={handleAssign} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-label-caps text-on-surface-variant mb-1 uppercase">Task Title</label>
                <input type="text" placeholder="Task title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant text-sm focus:ring-primary" required/>
              </div>
              <div>
                <label className="block text-xs font-label-caps text-on-surface-variant mb-1 uppercase">Deadline</label>
                <input type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant text-sm" required/>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-label-caps text-on-surface-variant mb-1 uppercase">Assign To</label>
                <select value={assignType} onChange={e => setAssignType(e.target.value)} className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant text-sm">
                  <option value="member">Member</option>
                  <option value="department">Department</option>
                  <option value="team">Team</option>
                </select>
              </div>
              {assignType === 'member' && (
                <div className="md:col-span-2">
                  <label className="block text-xs font-label-caps text-on-surface-variant mb-1 uppercase">Select Member</label>
                  <select value={form.assigned_to} onChange={e => setForm({...form, assigned_to: e.target.value})} className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant text-sm" required>
                    <option value="">Select member...</option>
                    {members.map(m => <option key={m.id} value={m.id}>{m.full_name} {m.department ? `(${m.department})` : ''}</option>)}
                  </select>
                </div>
              )}
              {assignType === 'department' && (
                <div className="md:col-span-2">
                  <label className="block text-xs font-label-caps text-on-surface-variant mb-1 uppercase">Select Department</label>
                  <select value={form.department} onChange={e => setForm({...form, department: e.target.value})} className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant text-sm" required>
                    <option value="">Select department...</option>
                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              )}
              {assignType === 'team' && (
                <div className="md:col-span-2">
                  <label className="block text-xs font-label-caps text-on-surface-variant mb-1 uppercase">Select Team</label>
                  <select value={form.team_id} onChange={e => setForm({...form, team_id: e.target.value})} className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant text-sm" required>
                    <option value="">Select team...</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name} {t.department ? `(${t.department})` : ''}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-label-caps text-on-surface-variant mb-1 uppercase">Priority</label>
                <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant text-sm">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-label-caps text-on-surface-variant mb-1 uppercase">Project (optional)</label>
                <select value={form.project_id} onChange={e => setForm({...form, project_id: e.target.value})} className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant text-sm">
                  <option value="">None</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-label-caps text-on-surface-variant mb-1 uppercase">Event (optional)</label>
                <select value={form.event_id} onChange={e => setForm({...form, event_id: e.target.value})} className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant text-sm">
                  <option value="">None</option>
                  {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowAssign(false)} disabled={isSubmitting} className="flex-1 py-2.5 border border-outline-variant text-on-surface-variant rounded-xl text-sm font-semibold hover:bg-surface-container-high transition-colors">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="flex-1 py-2.5 bg-primary text-on-primary font-bold rounded-xl text-sm hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50">
                {isSubmitting ? 'Assigning...' : 'Assign Task'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* View + Status tabs */}
      <div className="flex gap-2 mb-6">
        <div className="bg-surface-container rounded-lg p-1 flex flex-wrap gap-1">
          {viewTabs.map(v => (
            <button
              key={v}
              onClick={() => setViewTab(v)}
              className={`px-4 py-2 font-label-caps text-xs uppercase font-bold rounded-md transition-all ${viewTab === v ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'}`}
            >
              {v === 'all' ? 'All Tasks' : v === 'mine' ? 'Your Tasks' : v === 'team' ? 'Your Team Tasks' : (
                <span className="flex items-center gap-1">
                  Requests
                  {pendingRequests.length > 0 && (
                    <span className="bg-amber-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1">{pendingRequests.length}</span>
                  )}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── REQUESTS TAB ─────────────────────────────────────────────────────── */}
      {viewTab === 'requests' && canManage ? (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <h3 className="text-sm font-bold text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-amber-400">pending_actions</span>
              Completion Requests
              <span className="text-on-surface-variant font-normal">({allRequests.length})</span>
            </h3>

            {loading ? (
              <ListSkeleton items={4} variant="task" />
            ) : allRequests.length === 0 ? (
              <div className="bg-surface-container rounded-xl border border-outline-variant p-12 text-center text-on-surface-variant italic">No completion requests yet.</div>
            ) : (
              <div className="space-y-3">
                {allRequests.map(t => (
                  <div key={t.id} className="bg-surface-container rounded-xl border border-outline-variant p-4 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center gap-3">
                      <div className="flex-1">
                        <div className="text-sm font-bold text-on-surface">{t.title}</div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {t.assignee?.full_name && <span className="text-xs text-on-surface-variant">By: <span className="font-semibold">{t.assignee.full_name}</span></span>}
                          <span className={`text-[10px] font-bold font-label-caps uppercase px-2 py-0.5 rounded border ${reqStatusColor(t.completion_request_status)} border-current bg-current/10`}>
                            {t.completion_request_status === 'pending' ? 'Pending' : t.completion_request_status === 'approved' ? 'Approved' : 'Rejected'}
                          </span>
                        </div>
                        {t.completion_reg_no && (
                          <div className="text-xs text-on-surface-variant mt-1">
                            <span className="font-semibold">Reg No:</span> {t.completion_reg_no}
                          </div>
                        )}
                        {t.completion_desc && (
                          <div className="text-xs text-on-surface-variant mt-0.5">
                            <span className="font-semibold">Note:</span> {t.completion_desc}
                          </div>
                        )}
                      </div>
                      {t.completion_request_status === 'pending' && (
                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => handleReviewRequest(t.id, true)} className="px-3 py-1.5 bg-success/20 text-success border border-success/30 rounded-lg font-label-caps text-xs uppercase font-bold hover:bg-success/30 transition-colors">Accept</button>
                          <button onClick={() => handleReviewRequest(t.id, false)} className="px-3 py-1.5 bg-error/20 text-error border border-error/30 rounded-lg font-label-caps text-xs uppercase font-bold hover:bg-error/30 transition-colors">Reject</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="bg-surface-container rounded-xl border border-outline-variant p-5 shadow-sm h-fit">
            <h3 className="font-bold text-sm text-on-surface mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-lg text-primary">alarm</span>Upcoming Deadlines</h3>
            {upcoming.length === 0 ? (
              <p className="text-xs text-on-surface-variant italic">No upcoming deadlines.</p>
            ) : (
              <div className="space-y-3">
                {upcoming.map(t => (
                  <div key={t.id} className="bg-surface-container-low rounded-lg border border-outline-variant/50 p-3">
                    <div className="text-xs font-bold text-on-surface mb-1 truncate">{t.title}</div>
                    <div className="text-[10px] text-outline font-label-caps uppercase">{new Date(t.due_date).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── MAIN TASK LIST (all / mine / team tabs) ──────────────────────── */
        <>
          <div className="flex gap-2 border-b border-outline-variant mb-6 pb-px overflow-x-auto no-scrollbar">
            {tabs.map(t => (
              <button key={t} onClick={() => setStatusTab(t)} className={`px-4 py-2.5 font-label-caps text-xs uppercase font-bold border-b-2 transition-all whitespace-nowrap ${statusTab === t ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}>{t.replace('_', ' ')}</button>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              {loading ? (
                <ListSkeleton items={5} variant="task" showAvatar={true} />
              ) : displayTasks.length === 0 ? (
                <div className="bg-surface-container rounded-xl border border-outline-variant p-12 text-center text-on-surface-variant italic">No tasks found.</div>
              ) : (
                <div className="space-y-3">
                  {displayTasks.map(t => (
                    <div key={t.batch_id ? `batch-${t.batch_id}` : t.id} className="bg-surface-container rounded-xl border border-outline-variant p-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-4">
                        {/* Checkbox — only for non-group cards */}
                        <button
                          onClick={() => {
                            if (!canManage) return
                            if (t._isGroupCard) {
                              handleCompleteAll(t)
                            } else {
                              toggleTaskCompleted(t)
                            }
                          }}
                          className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${t.status === 'completed' ? 'bg-success border-success' : 'border-outline-variant hover:border-primary'} ${!canManage && 'cursor-default'}`}
                        >
                          {t.status === 'completed' && <span className="material-symbols-outlined text-xs text-black">check</span>}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`font-bold text-sm ${t.status === 'completed' ? 'line-through text-on-surface-variant' : 'text-on-surface'}`}>{t.title}</span>

                            {/* Group task label (dept / team) */}
                            {t._isGroupCard && t._groupLabel && (
                              <span className="text-[10px] font-bold font-label-caps uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                                <span className="material-symbols-outlined text-[10px]">group</span>
                                {t._groupLabel}
                              </span>
                            )}

                            {/* Member progress badge for group cards */}
                            {t._isGroupCard && (
                              <span className="text-[10px] font-bold font-label-caps uppercase bg-surface-variant text-on-surface-variant border border-outline-variant px-2 py-0.5 rounded">
                                {t._completedCount}/{t._memberCount} done
                              </span>
                            )}

                            {!t._isGroupCard && t.isMine && <span className="text-[10px] font-bold font-label-caps uppercase bg-success/10 text-success border border-success/20 px-2 py-0.5 rounded">Your Task</span>}
                            {t.isEventTask && <span className="text-[10px] font-bold font-label-caps uppercase bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded flex items-center gap-1"><span className="material-symbols-outlined text-[10px]">groups</span>{t.team?.name || 'Team'}</span>}
                            <span className={`text-[10px] font-bold font-label-caps uppercase px-2 py-0.5 rounded ${priorityColor(t.priority)}`}>{t.priority}</span>
                            <span className={`text-[10px] font-bold font-label-caps uppercase px-2 py-0.5 rounded ${statusColor(t.status)}`}>{t.status?.replace('_', ' ')}</span>
                            {!t.isEventTask && !t._isGroupCard && t.completion_request_status && t.completion_request_status !== 'none' && (
                              <span className={`text-[10px] font-bold font-label-caps uppercase px-2 py-0.5 rounded border ${reqStatusColor(t.completion_request_status)} border-current bg-current/10`}>
                                {t.completion_request_status === 'pending' ? 'Request Pending' : t.completion_request_status === 'approved' ? 'Request Approved' : 'Request Rejected'}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-4 text-[10px] text-outline font-label-caps uppercase">
                            {!t._isGroupCard && t.assignee?.full_name && <span>Assigned to {t.assignee.full_name}</span>}
                            {t.due_date && <span>Due {new Date(t.due_date).toLocaleDateString()}</span>}
                          </div>

                          <div className="mt-2 w-full h-1.5 bg-surface rounded-full">
                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${t._isGroupCard ? Math.round((t._completedCount / t._memberCount) * 100) : (t.progress ?? 0)}%` }}/>
                          </div>
                        </div>
                        <span className="text-xs font-mono-data text-primary shrink-0">
                          {t._isGroupCard ? `${Math.round((t._completedCount / t._memberCount) * 100)}%` : `${t.progress ?? 0}%`}
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 mt-3 pt-3 border-t border-outline-variant/50 flex-wrap">
                        {/* Group card: View Members button */}
                        {t._isGroupCard && (
                          <button
                            onClick={() => openMembersModal(t)}
                            className="text-xs font-bold font-label-caps uppercase px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 transition-colors flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-sm">group</span>
                            View Members
                          </button>
                        )}

                        {/* Group card (dept): select completion per member */}
                        {t._isGroupCard && (() => {
                          const deptMatch = t.admin_comment?.match(/department:([^;]+)/)
                          return (isDepartmentLead || isSystemAdmin) && deptMatch && t.status !== 'completed'
                        })() && (
                          <button onClick={() => handleCompleteAll(t)} className="text-xs font-bold font-label-caps uppercase px-3 py-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg hover:bg-amber-500/20 transition-colors">
                            Mark Members Complete
                          </button>
                        )}

                        {/* Group card (team): complete all */}
                        {t._isGroupCard && (() => {
                          const deptMatch = t.admin_comment?.match(/department:([^;]+)/)
                          return canManage && !deptMatch && t.status !== 'completed'
                        })() && (
                          <button onClick={() => handleCompleteAll(t)} className="text-xs font-bold font-label-caps uppercase px-3 py-1.5 bg-success/10 text-success border border-success/20 rounded-lg hover:bg-success/20 transition-colors">
                            Complete All
                          </button>
                        )}

                        {/* Non-group member task: request completion */}
                        {!t._isGroupCard && !t.isEventTask && t.isMine && t.status !== 'completed' && (t.completion_request_status === 'none' || !t.completion_request_status) && (
                          <button onClick={() => setRequestModal(t)} className="text-xs font-bold font-label-caps uppercase px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 transition-colors">
                            Request Completion
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sidebar — deduplicated upcoming deadlines */}
            <div className="bg-surface-container rounded-xl border border-outline-variant p-5 shadow-sm h-fit">
              <h3 className="font-bold text-sm text-on-surface mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-lg text-primary">alarm</span>Upcoming Deadlines</h3>
              {upcoming.length === 0 ? (
                <p className="text-xs text-on-surface-variant italic">No upcoming deadlines.</p>
              ) : (
                <div className="space-y-3">
                  {upcoming.map(t => (
                    <div key={t.batch_id ? `up-${t.batch_id}` : t.id} className="bg-surface-container-low rounded-lg border border-outline-variant/50 p-3">
                      <div className="text-xs font-bold text-on-surface mb-1 truncate">{t.title}</div>
                      <div className="text-[10px] text-outline font-label-caps uppercase">{new Date(t.due_date).toLocaleDateString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

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

      {/* ── Department Lead Completion Selection Modal ────────────────────────── */}
      {completionSelectModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setCompletionSelectModal(null); setCompletionSelection({}) }}>
          <div className="bg-surface-container rounded-2xl border border-outline-variant p-6 shadow-xl w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-base text-on-surface mb-1">Mark Completed Members</h3>
            <p className="text-xs text-on-surface-variant mb-5">"{completionSelectModal.title}" — Department: {completionSelectModal.assignedDepartment}</p>
            <form onSubmit={handleDepartmentCompletion} className="space-y-4">
              <div className="space-y-2">
                {completionSelectModal.deptMembers.map(m => (
                  <label key={m.id} className="flex items-center gap-2 p-2 bg-surface-container-low rounded-lg border border-outline-variant hover:bg-surface-container-high transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!completionSelection[m.id]}
                      onChange={e => setCompletionSelection(prev => ({ ...prev, [m.id]: e.target.checked }))}
                      className="w-4 h-4 text-primary border-outline-variant rounded focus:ring-primary"
                    />
                    <span className="text-sm text-on-surface">{m.full_name}</span>
                  </label>
                ))}
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-outline-variant/50">
                <button type="button" onClick={handleSelectAll} className="text-xs font-bold font-label-caps uppercase text-primary hover:underline">
                  {Object.values(completionSelection).every(v => v) ? 'Deselect All' : 'Select All'}
                </button>
                <div className="flex gap-3">
                  <button type="button" onClick={() => { setCompletionSelectModal(null); setCompletionSelection({}) }} className="px-4 py-2 text-on-surface-variant hover:bg-surface-container-high rounded-lg font-label-caps text-xs uppercase">Cancel</button>
                  <button type="submit" disabled={completionLoading} className="px-5 py-2 bg-amber-500 text-black rounded-lg font-bold font-label-caps text-xs uppercase hover:brightness-110 disabled:opacity-60">
                    {completionLoading ? 'Saving...' : 'Mark Completed'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── View Members Modal (batch task member status) ─────────────────────── */}
      {membersModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setMembersModal(null)}>
          <div className="bg-surface-container rounded-2xl border border-outline-variant p-6 shadow-xl w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-base text-on-surface">Member Status</h3>
              <button onClick={() => setMembersModal(null)} className="text-on-surface-variant hover:text-on-surface transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <p className="text-xs text-on-surface-variant mb-1">"{membersModal.title}"</p>
            {membersModal.label && (
              <span className="inline-block text-[10px] font-bold font-label-caps uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded mb-4">
                {membersModal.label}
              </span>
            )}

            {membersModalLoading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => (
                  <div key={i} className="h-10 bg-surface-container-low rounded-lg border border-outline-variant animate-pulse" />
                ))}
              </div>
            ) : membersModal.members.length === 0 ? (
              <p className="text-xs text-on-surface-variant italic">No members found.</p>
            ) : (
              <div className="space-y-2">
                {membersModal.members.map((m, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg border border-outline-variant">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${m.status === 'completed' ? 'bg-success' : 'bg-amber-400'}`} />
                      <span className="text-sm text-on-surface font-medium">{m.name}</span>
                    </div>
                    <span className={`text-[10px] font-bold font-label-caps uppercase px-2 py-0.5 rounded ${m.status === 'completed' ? 'bg-success/20 text-success' : 'bg-amber-500/20 text-amber-400'}`}>
                      {m.status === 'completed' ? 'Completed' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-outline-variant/50 flex justify-between text-xs text-on-surface-variant">
              <span>{membersModal.members.filter(m => m.status === 'completed').length} completed</span>
              <span>{membersModal.members.filter(m => m.status !== 'completed').length} pending</span>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default Tasks
