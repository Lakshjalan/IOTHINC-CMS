import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../hooks/useAuth'
import { useMembers } from '../hooks/useMembers'
import { DetailPageSkeleton } from '../components/SkeletonLoaders'

// ── Small helpers ─────────────────────────────────────────────
const statusColors = {
  completed: 'bg-success/20 text-success',
  in_progress: 'bg-primary/20 text-primary',
  not_started: 'bg-surface-variant text-on-surface-variant',
  blocked: 'bg-error/20 text-error',
}

export const ProjectDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { role, user } = useAuth()
  const canModify = ['chairperson', 'vice_chairperson'].includes(role)
  const { members } = useMembers()

  const [project, setProject] = useState(null)
  const [tasks, setTasks] = useState([])
  const [subtasks, setSubtasks] = useState([])
  const [contributions, setContributions] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)

  // Sub-task add modal
  const [showSubtaskModal, setShowSubtaskModal] = useState(false)
  const [subtaskForm, setSubtaskForm] = useState({
    title: '',
    assignee_type: 'member', // 'member' | 'department'
    assigned_to: '',         // member uuid
    department: '',          // department string
    weightage: '',
  })
  const [subtaskSaving, setSubtaskSaving] = useState(false)

  // ── Fetch project + linked data ───────────────────────────
  const fetchProjectDetails = async () => {
    setLoading(true)
    try {
      const { data: proj, error: projErr } = await supabase
        .from('projects')
        .select('*, teams(id, name)')
        .eq('id', id)
        .single()

      if (projErr) throw projErr
      setProject(proj)
      document.title = `${proj.title} | IOTHINC`

      // Regular tasks
      const { data: tsk } = await supabase
        .from('tasks')
        .select('*, assignee:profiles!tasks_assigned_to_fkey(full_name, avatar_url)')
        .eq('project_id', id)
        .is('admin_comment', null)
      setTasks(tsk || [])

      // Sub-tasks: stored in tasks table, identified by admin_comment = 'subtask'
      const { data: st } = await supabase
        .from('tasks')
        .select('*, assignee:profiles!tasks_assigned_to_fkey(id, full_name, avatar_url)')
        .eq('project_id', id)
        .like('admin_comment', 'subtask:%')
      setSubtasks(
        (st || []).map(t => {
          let meta = {}
          try { meta = JSON.parse(t.admin_comment?.replace('subtask:', '')) } catch {}
          return { ...t, meta }
        })
      )

      // Contributions
      const { data: contr } = await supabase
        .from('contributions')
        .select('*, member:profiles!contributions_member_id_fkey(full_name, avatar_url)')
        .eq('project_id', id)
      setContributions(contr || [])

      // Distinct departments
      const { data: depts } = await supabase
        .from('profiles')
        .select('department')
        .not('department', 'is', null)
      const unique = [...new Set((depts || []).map(d => d.department).filter(Boolean))]
      setDepartments(unique)

    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjectDetails()
  }, [id])

  // ── Auto-recalculate progress from subtask weightages ─────
  const recalcProgress = async (updatedSubtasks) => {
    const total = updatedSubtasks.reduce((acc, st) => {
      if (st.status === 'completed') {
        const w = parseInt(st.meta?.weightage || 0)
        return acc + w
      }
      return acc
    }, 0)
    const capped = Math.min(total, 100)
    const { error } = await supabase
      .from('projects')
      .update({ progress: capped })
      .eq('id', id)
    if (!error) setProject(prev => ({ ...prev, progress: capped }))
  }

  // ── Sub-task: toggle complete ─────────────────────────────
  const handleSubtaskToggle = async (subtask) => {
    const originalSubtasks = [...subtasks]
    const originalProgress = project?.progress
    const newStatus = subtask.status === 'completed' ? 'not_started' : 'completed'

    // Optimistic Update: Subtask status
    const updated = subtasks.map(st =>
      st.id === subtask.id ? { ...st, status: newStatus } : st
    )
    setSubtasks(updated)

    // Optimistic Update: Project progress
    const total = updated.reduce((acc, st) => {
      if (st.status === 'completed') {
        const w = parseInt(st.meta?.weightage || 0)
        return acc + w
      }
      return acc
    }, 0)
    const capped = Math.min(total, 100)
    setProject(prev => ({ ...prev, progress: capped }))

    try {
      // 1. Update task status in DB
      const { error: taskErr } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', subtask.id)
      if (taskErr) throw taskErr

      // 2. Update parent project progress in DB
      const { error: projErr } = await supabase
        .from('projects')
        .update({ progress: capped })
        .eq('id', id)
      if (projErr) throw projErr

    } catch (err) {
      console.warn('[Optimistic Update] Subtask toggle failed. Rolling back.', err.message)
      // Rollback
      setSubtasks(originalSubtasks)
      setProject(prev => ({ ...prev, progress: originalProgress }))
      alert(`Failed to update subtask status: ${err.message}. Changes rolled back.`)
    }
  }

  // ── Sub-task: add ─────────────────────────────────────────
  const handleAddSubtask = async (e) => {
    e.preventDefault()
    const w = parseInt(subtaskForm.weightage)
    if (!w || w < 1 || w > 100) { alert('Weightage must be 1–100'); return }

    // Check total weightage doesn't exceed 100
    const currentTotal = subtasks.reduce((a, st) => a + parseInt(st.meta?.weightage || 0), 0)
    if (currentTotal + w > 100) {
      alert(`Total weightage would exceed 100%. Current total: ${currentTotal}%`)
      return
    }

    setSubtaskSaving(true)
    try {
      const meta = {
        weightage: w,
        assignee_type: subtaskForm.assignee_type,
        department: subtaskForm.department,
      }

      const { error } = await supabase.from('tasks').insert({
        title: subtaskForm.title,
        project_id: id,
        assigned_to: subtaskForm.assignee_type === 'member' && subtaskForm.assigned_to
          ? subtaskForm.assigned_to
          : null,
        assigned_by: user?.id,
        status: 'not_started',
        priority: 'medium',
        admin_comment: `subtask:${JSON.stringify(meta)}`,
        progress: w,  // store weightage in progress for sorting convenience
      })
      if (error) throw error

      setShowSubtaskModal(false)
      setSubtaskForm({ title: '', assignee_type: 'member', assigned_to: '', department: '', weightage: '' })
      fetchProjectDetails()
    } catch (err) {
      alert('Error adding sub-task: ' + err.message)
    } finally {
      setSubtaskSaving(false)
    }
  }

  // ── Sub-task: delete ──────────────────────────────────────
  const handleDeleteSubtask = async (subtaskId) => {
    if (!window.confirm('Delete this sub-task?')) return
    const originalSubtasks = [...subtasks]
    const originalProgress = project?.progress

    // Optimistic Update: Remove subtask
    const updated = subtasks.filter(st => st.id !== subtaskId)
    setSubtasks(updated)

    // Optimistic Update: Recalculate progress
    const total = updated.reduce((acc, st) => {
      if (st.status === 'completed') {
        const w = parseInt(st.meta?.weightage || 0)
        return acc + w
      }
      return acc
    }, 0)
    const capped = Math.min(total, 100)
    setProject(prev => ({ ...prev, progress: capped }))

    try {
      // 1. Delete from DB
      const { error: deleteErr } = await supabase.from('tasks').delete().eq('id', subtaskId)
      if (deleteErr) throw deleteErr

      // 2. Update progress in DB
      const { error: projErr } = await supabase
        .from('projects')
        .update({ progress: capped })
        .eq('id', id)
      if (projErr) throw projErr

    } catch (err) {
      console.warn('[Optimistic Update] Subtask delete failed. Rolling back.', err.message)
      // Rollback
      setSubtasks(originalSubtasks)
      setProject(prev => ({ ...prev, progress: originalProgress }))
      alert(`Failed to delete subtask: ${err.message}. Subtask restored.`)
    }
  }

  // ── Helpers ───────────────────────────────────────────────
  const totalWeightage = subtasks.reduce((a, st) => a + parseInt(st.meta?.weightage || 0), 0)
  const completedWeightage = subtasks.reduce((a, st) =>
    st.status === 'completed' ? a + parseInt(st.meta?.weightage || 0) : a, 0)

  if (loading) return <DetailPageSkeleton variant="project" />

  return (
    <main className="flex-1 px-4 md:px-stack-lg pt-24 pb-section-gap max-w-5xl mx-auto w-full animate-in fade-in duration-200">
      
      {/* Back Button */}
      <button 
        onClick={() => navigate('/projects')}
        className="flex items-center gap-1.5 text-on-surface-variant hover:text-primary mb-6 text-sm font-label-caps font-bold uppercase transition-colors"
      >
        <span className="material-symbols-outlined text-lg">arrow_back</span>
        Back to projects
      </button>

      {/* Project Card */}
      <div className="bg-surface-container rounded-xl border border-outline-variant p-6 md:p-8 shadow-sm mb-8">
        <div className="flex justify-between items-start flex-wrap gap-4 mb-4">
          <div>
            <span className="text-[10px] font-bold font-label-caps uppercase text-primary tracking-wider bg-primary-container/10 px-2 py-1 rounded">
              {project?.category || 'General'}
            </span>
            <h2 className="font-headline-xl text-3xl text-on-surface mt-2 font-bold">{project?.title}</h2>
          </div>
          
          <div className="text-right">
            <span className="block text-[10px] font-label-caps text-on-surface-variant uppercase">Status</span>
            <span className={`inline-block text-xs font-bold font-label-caps uppercase px-2.5 py-1 rounded-full mt-1 ${project?.status === 'completed' ? 'bg-success/20 text-success' : project?.status === 'active' ? 'bg-primary/20 text-primary' : 'bg-surface-variant text-on-surface-variant'}`}>
              {project?.status}
            </span>
          </div>
        </div>

        <p className="text-on-surface-variant text-sm leading-relaxed mb-6 whitespace-pre-wrap">{project?.description}</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-outline-variant/30">
          <div>
            <span className="block text-[10px] font-label-caps text-on-surface-variant uppercase">Milestone</span>
            <p className="text-sm font-semibold text-on-surface mt-1">{project?.milestone || 'N/A'}</p>
          </div>
          <div>
            <span className="block text-[10px] font-label-caps text-on-surface-variant uppercase">Deadline</span>
            <p className="text-sm font-semibold text-on-surface mt-1">{project?.deadline || 'N/A'}</p>
          </div>
          <div>
            <span className="block text-[10px] font-label-caps text-on-surface-variant uppercase mb-2">
              Progress ({project?.progress}%)
              {subtasks.length > 0 && (
                <span className="ml-1 normal-case text-[9px] text-primary/70 font-normal">(auto from sub-tasks)</span>
              )}
            </span>
            <div className="relative w-full bg-surface-container-highest rounded-full h-3">
              <div
                className="bg-gradient-to-r from-primary to-primary/70 h-3 rounded-full transition-all duration-700"
                style={{ width: `${project?.progress || 0}%` }}
              />
            </div>
            {subtasks.length > 0 && (
              <p className="text-[10px] text-on-surface-variant mt-1.5">
                {completedWeightage}% of {totalWeightage}% assigned completed
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Sub-Tasks Section ────────────────────────────────── */}
      <div className="bg-surface-container rounded-xl border border-outline-variant p-5 shadow-sm mb-8">
        <div className="flex justify-between items-center mb-5">
          <div>
            <h3 className="font-headline-lg text-lg text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">task_alt</span>
              Sub-Tasks
            </h3>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Each sub-task carries a weightage that auto-updates the progress bar when completed.
            </p>
          </div>
          {canModify && (
            <button
              onClick={() => setShowSubtaskModal(true)}
              className="flex items-center gap-1.5 bg-primary text-on-primary font-bold font-label-caps text-xs uppercase px-3 py-2 rounded-xl hover:brightness-110 active:scale-[0.98] transition-all"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Add Sub-task
            </button>
          )}
        </div>

        {/* Weightage usage bar */}
        {subtasks.length > 0 && (
          <div className="mb-4 p-3 bg-surface-container-low border border-outline-variant/50 rounded-xl">
            <div className="flex justify-between text-[10px] font-label-caps uppercase text-on-surface-variant mb-1.5">
              <span>Weightage Allocated</span>
              <span className={totalWeightage > 100 ? 'text-error' : totalWeightage === 100 ? 'text-success' : 'text-primary'}>
                {totalWeightage}% / 100%
              </span>
            </div>
            <div className="w-full bg-surface-container-highest rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all duration-500 ${totalWeightage > 100 ? 'bg-error' : 'bg-primary'}`}
                style={{ width: `${Math.min(totalWeightage, 100)}%` }}
              />
            </div>
          </div>
        )}

        {subtasks.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-outline-variant rounded-xl">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant/30 block mb-2">checklist</span>
            <p className="text-sm text-on-surface-variant italic">
              No sub-tasks yet.{canModify ? ' Click "Add Sub-task" to break down this project.' : ''}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {subtasks.map(st => {
              const w = parseInt(st.meta?.weightage || 0)
              const isDone = st.status === 'completed'
              const assigneeType = st.meta?.assignee_type || 'member'
              const deptLabel = st.meta?.department

              return (
                <div
                  key={st.id}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 ${isDone ? 'bg-success/5 border-success/20' : 'bg-surface-container-low border-outline-variant'}`}
                >
                  {/* Complete toggle */}
                  <button
                    onClick={() => handleSubtaskToggle(st)}
                    title={isDone ? 'Mark incomplete' : 'Mark complete'}
                    className={`w-7 h-7 shrink-0 rounded-full border-2 flex items-center justify-center transition-all ${isDone ? 'bg-success border-success text-white' : 'border-outline-variant hover:border-primary'}`}
                  >
                    {isDone && <span className="material-symbols-outlined text-sm">check</span>}
                  </button>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${isDone ? 'text-on-surface/50 line-through' : 'text-on-surface'}`}>
                      {st.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {assigneeType === 'department' && deptLabel ? (
                        <span className="flex items-center gap-1 text-[10px] text-on-surface-variant font-label-caps uppercase">
                          <span className="material-symbols-outlined text-[12px]">corporate_fare</span>
                          {deptLabel} (dept)
                        </span>
                      ) : st.assignee ? (
                        <span className="flex items-center gap-1 text-[10px] text-on-surface-variant font-label-caps uppercase">
                          <img
                            src={st.assignee.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(st.assignee.full_name)}`}
                            className="w-4 h-4 rounded-full border border-outline-variant"
                            alt=""
                          />
                          {st.assignee.full_name}
                        </span>
                      ) : (
                        <span className="text-[10px] text-on-surface-variant font-label-caps uppercase">Unassigned</span>
                      )}
                    </div>
                  </div>

                  {/* Weightage pill */}
                  <span className={`shrink-0 text-xs font-bold font-label-caps px-3 py-1 rounded-full ${isDone ? 'bg-success/20 text-success' : 'bg-primary/10 text-primary'}`}>
                    {w}%
                  </span>

                  {/* Status badge */}
                  <span className={`shrink-0 text-[10px] font-bold font-label-caps uppercase px-2 py-0.5 rounded ${statusColors[st.status] || ''}`}>
                    {st.status.replace('_', ' ')}
                  </span>

                  {/* Delete (admin/coordinator only) */}
                  {canModify && (
                    <button
                      onClick={() => handleDeleteSubtask(st.id)}
                      className="shrink-0 p-1 text-on-surface-variant/40 hover:text-error hover:bg-error/10 rounded transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Tasks Section (7 cols) */}
        <div className="lg:col-span-7 bg-surface-container rounded-xl border border-outline-variant p-5 shadow-sm">
          <h3 className="font-headline-lg text-lg text-on-surface mb-4">Linked Tasks</h3>
          {tasks.length === 0 ? (
            <p className="text-sm text-on-surface-variant italic text-center p-4">No tasks linked to this project yet.</p>
          ) : (
            <div className="space-y-3">
              {tasks.map(task => (
                <div key={task.id} className="p-3 bg-surface-container-low border border-outline-variant rounded-lg flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-sm text-on-surface">{task.title}</h4>
                    <span className="text-[10px] text-on-surface-variant font-label-caps uppercase mt-1 block">
                      Assigned to: {task.assignee?.full_name || 'Unassigned'}
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold font-label-caps uppercase px-2 py-0.5 rounded ${statusColors[task.status] || ''}`}>
                    {task.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Contributions Section (5 cols) */}
        <div className="lg:col-span-5 bg-surface-container rounded-xl border border-outline-variant p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-headline-lg text-lg text-on-surface">Contributions</h3>
            <div className="flex gap-4">
              <Link 
                to={`/contributions?project_id=${id}`}
                className="text-primary font-label-caps text-xs uppercase hover:underline"
              >
                View All
              </Link>
              <Link 
                to={`/contributions/new?project_id=${id}`}
                className="text-primary font-label-caps text-xs uppercase hover:underline"
              >
                Log New
              </Link>
            </div>
          </div>
          {contributions.length === 0 ? (
            <p className="text-sm text-on-surface-variant italic text-center p-4">No logged contributions.</p>
          ) : (
            <div className="space-y-4">
              {contributions.map(c => (
                <Link 
                  key={c.id} 
                  to={`/contributions?project_id=${id}`}
                  className="block p-3 bg-surface-container-low border border-outline-variant rounded-lg hover:bg-surface-container-high transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <img 
                      alt="" 
                      src={c.member?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(c.member?.full_name || 'M')}`}
                      className="w-6 h-6 rounded-full border border-outline-variant object-cover"
                    />
                    <span className="font-semibold text-xs text-on-surface">{c.member?.full_name}</span>
                  </div>
                  <h4 className="font-bold text-sm text-on-surface mb-1">{c.title}</h4>
                  <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-3">{c.description}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Add Sub-task Modal ──────────────────────────────── */}
      {showSubtaskModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-outline-variant rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-primary">task_alt</span>
              </div>
              <div>
                <h3 className="font-bold text-on-surface">Add Sub-Task</h3>
                <p className="text-xs text-on-surface-variant">
                  Remaining weightage: {100 - totalWeightage}%
                </p>
              </div>
            </div>

            <form onSubmit={handleAddSubtask} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-label-caps text-on-surface-variant mb-1.5 uppercase">
                  Sub-Task Title
                </label>
                <input
                  type="text"
                  value={subtaskForm.title}
                  onChange={e => setSubtaskForm({ ...subtaskForm, title: e.target.value })}
                  className="w-full bg-surface-container-low text-on-surface p-3 rounded-xl border border-outline-variant text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g. Design the login screen"
                  required
                />
              </div>

              {/* Assignee type toggle */}
              <div>
                <label className="block text-xs font-label-caps text-on-surface-variant mb-1.5 uppercase">
                  Assign To
                </label>
                <div className="flex rounded-xl border border-outline-variant overflow-hidden mb-2">
                  {['member', 'department'].map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSubtaskForm({ ...subtaskForm, assignee_type: t, assigned_to: '', department: '' })}
                      className={`flex-1 py-2 text-xs font-bold font-label-caps uppercase transition-colors ${subtaskForm.assignee_type === t ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'}`}
                    >
                      {t === 'member' ? '👤 Member' : '🏢 Department'}
                    </button>
                  ))}
                </div>

                {subtaskForm.assignee_type === 'member' ? (
                  <select
                    value={subtaskForm.assigned_to}
                    onChange={e => setSubtaskForm({ ...subtaskForm, assigned_to: e.target.value })}
                    className="w-full bg-surface-container-low text-on-surface p-3 rounded-xl border border-outline-variant text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select member (optional)</option>
                    {(members || []).map(m => (
                      <option key={m.id} value={m.id}>{m.full_name}</option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={subtaskForm.department}
                    onChange={e => setSubtaskForm({ ...subtaskForm, department: e.target.value })}
                    className="w-full bg-surface-container-low text-on-surface p-3 rounded-xl border border-outline-variant text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  >
                    <option value="">Select department</option>
                    {departments.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Weightage */}
              <div>
                <label className="block text-xs font-label-caps text-on-surface-variant mb-1.5 uppercase">
                  Weightage (%) — how much of project progress this task represents
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max={100 - totalWeightage}
                    value={subtaskForm.weightage}
                    onChange={e => setSubtaskForm({ ...subtaskForm, weightage: e.target.value })}
                    className="w-full bg-surface-container-low text-on-surface p-3 pr-12 rounded-xl border border-outline-variant text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder={`1–${100 - totalWeightage}`}
                    required
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-on-surface-variant">%</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowSubtaskModal(false); setSubtaskForm({ title: '', assignee_type: 'member', assigned_to: '', department: '', weightage: '' }) }}
                  className="flex-1 py-2.5 border border-outline-variant text-on-surface-variant rounded-xl text-sm hover:bg-surface-container-high transition-colors font-label-caps uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={subtaskSaving}
                  className="flex-1 py-2.5 bg-primary text-on-primary font-bold rounded-xl text-sm hover:brightness-110 disabled:opacity-50 transition-all font-label-caps uppercase"
                >
                  {subtaskSaving ? 'Saving…' : 'Add Sub-Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </main>
  )
}