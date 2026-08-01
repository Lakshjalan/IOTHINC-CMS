import React, { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../hooks/useAuth'
import { useEventTeams } from '../hooks/useEventTeams'
import { useMembers } from '../hooks/useMembers'
import { DetailPageSkeleton, GridSkeleton } from '../components/SkeletonLoaders'

const PRIORITY_STYLES = {
  high: 'bg-red-500/20 text-red-400',
  medium: 'bg-amber-500/20 text-amber-400',
  low: 'bg-emerald-500/20 text-emerald-400',
}

const STATUS_STYLES = {
  todo: 'bg-surface-variant text-on-surface-variant',
  in_progress: 'bg-primary/20 text-primary',
  done: 'bg-success/20 text-success',
  blocked: 'bg-error/20 text-error',
}

const STATUS_COLS = ['todo', 'in_progress', 'done', 'blocked']
const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', done: 'Done', blocked: 'Blocked' }

// ── Member Avatar Stack ─────────────────────────────────────
const AvatarStack = ({ members = [], max = 4 }) => (
  <div className="flex -space-x-2">
    {members.slice(0, max).map(m => (
      <img
        key={m.id}
        src={m.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(m.full_name)}`}
        alt={m.full_name}
        title={m.full_name}
        className="w-7 h-7 rounded-full border-2 border-surface-container object-cover"
      />
    ))}
    {members.length > max && (
      <div className="w-7 h-7 rounded-full border-2 border-surface-container bg-surface-container-high flex items-center justify-center text-[10px] font-bold text-on-surface-variant">
        +{members.length - max}
      </div>
    )}
  </div>
)

// ── Join Request Modal ─────────────────────────────────────
const JoinRequestModal = ({ team, onClose, onSubmit }) => {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try { await onSubmit(team.id, message); onClose() }
    catch (err) { alert(err.message) }
    finally { setLoading(false) }
  }
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface border border-outline-variant rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary">group_add</span>
          </div>
          <div>
            <h3 className="font-bold text-on-surface text-lg">Request to Join</h3>
            <p className="text-xs text-on-surface-variant">{team.name}</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-label-caps uppercase text-on-surface-variant mb-1.5">Message to team (optional)</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              className="w-full bg-surface-container-low text-on-surface border border-outline-variant rounded-xl p-3 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Tell the team why you want to join..."
            />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-outline-variant text-on-surface-variant rounded-xl text-sm hover:bg-surface-container-high transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-primary text-on-primary font-bold rounded-xl text-sm hover:brightness-110 disabled:opacity-50 transition-all">
              {loading ? 'Sending...' : 'Send Request →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Create Team Modal ────────────────────────────────────────
const CreateTeamModal = ({ onClose, onCreate }) => {
  const [form, setForm] = useState({ name: '', description: '', max_members: '' })
  const [loading, setLoading] = useState(false)
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try { await onCreate({ name: form.name, description: form.description, maxMembers: form.max_members ? parseInt(form.max_members) : null }); onClose() }
    catch (err) { alert(err.message) }
    finally { setLoading(false) }
  }
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface border border-outline-variant rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-on-surface text-lg mb-4">Create Sub-Team</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-label-caps uppercase text-on-surface-variant mb-1.5">Team Name *</label>
            <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required
              className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g. Design Team, Logistics, Dev" />
          </div>
          <div>
            <label className="block text-xs font-label-caps uppercase text-on-surface-variant mb-1.5">Description</label>
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
              className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-3 text-sm text-on-surface resize-none h-20 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="What will this team do?" />
          </div>
          <div>
            <label className="block text-xs font-label-caps uppercase text-on-surface-variant mb-1.5">Max Members</label>
            <input type="number" value={form.max_members} onChange={e => setForm({...form, max_members: e.target.value})}
              className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Leave empty for unlimited" />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-outline-variant text-on-surface-variant rounded-xl text-sm hover:bg-surface-container-high transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-primary text-on-primary font-bold rounded-xl text-sm hover:brightness-110 disabled:opacity-50">
              {loading ? 'Creating...' : 'Create Team'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const CreateTaskModal = ({ eventTeams, allMembers, canManage, user, onClose, onCreate }) => {
  const allowedTeams = canManage ? eventTeams : eventTeams.filter(t => t.created_by === user?.id)
  const [form, setForm] = useState({ eventTeamId: allowedTeams[0]?.id || '', title: '', description: '', assignedTo: '', priority: 'medium', dueDate: '' })
  const selectedTeam = allowedTeams.find(t => t.id === form.eventTeamId)
  const assignableMembers = canManage ? allMembers : (selectedTeam?.activeMembers?.map(m => m.member).filter(Boolean) || [])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!canManage && form.assignedTo && !assignableMembers.some(m => m.id === form.assignedTo)) {
      setForm(prev => ({ ...prev, assignedTo: '' }))
    }
  }, [form.eventTeamId, assignableMembers, canManage])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onCreate({ eventTeamId: form.eventTeamId, title: form.title, description: form.description, assignedTo: form.assignedTo || null, priority: form.priority, dueDate: form.dueDate || null })
      onClose()
    } catch (err) { alert(err.message) }
    finally { setLoading(false) }
  }
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface border border-outline-variant rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-on-surface text-lg mb-4">Create Task</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-label-caps uppercase text-on-surface-variant mb-1.5">Sub-Team *</label>
            <select value={form.eventTeamId} onChange={e => setForm({...form, eventTeamId: e.target.value})} required
              className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary">
              {allowedTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-label-caps uppercase text-on-surface-variant mb-1.5">Task Title *</label>
            <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required
              className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g. Design event banner" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-label-caps uppercase text-on-surface-variant mb-1.5">Priority</label>
              <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}
                className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-label-caps uppercase text-on-surface-variant mb-1.5">Due Date</label>
              <input type="date" value={form.dueDate} onChange={e => setForm({...form, dueDate: e.target.value})}
                className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-label-caps uppercase text-on-surface-variant mb-1.5">Assign To</label>
            <select value={form.assignedTo} onChange={e => setForm({...form, assignedTo: e.target.value})}
              className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="">Unassigned</option>
              {assignableMembers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-outline-variant text-on-surface-variant rounded-xl text-sm hover:bg-surface-container-high transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-primary text-on-primary font-bold rounded-xl text-sm hover:brightness-110 disabled:opacity-50">
              {loading ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Team Card (Teams Tab) ────────────────────────────────────
const TeamCard = ({ team, canManage, user, allMembers, onRequestJoin, onApprove, onReject, onAddMember, onRemoveMember }) => {
  const [expanded, setExpanded] = useState(false)
  const [showManage, setShowManage] = useState(false)
  const [addMemberId, setAddMemberId] = useState('')

  const progress = team.taskCount > 0 ? Math.round((team.doneTaskCount / team.taskCount) * 100) : 0

  const teamColors = ['from-violet-500/20 to-purple-600/10', 'from-blue-500/20 to-cyan-600/10', 'from-emerald-500/20 to-teal-600/10', 'from-amber-500/20 to-orange-600/10', 'from-pink-500/20 to-rose-600/10']
  const colorIdx = team.name.charCodeAt(0) % teamColors.length

  return (
    <div className="bg-surface-container rounded-2xl border border-outline-variant overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200">
      {/* Gradient Header */}
      <div className={`bg-gradient-to-r ${teamColors[colorIdx]} p-5 border-b border-outline-variant/30`}>
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-xl bg-surface-container/60 backdrop-blur-sm flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">groups</span>
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-on-surface text-base">{team.name}</h4>
              {team.description && <p className="text-xs text-on-surface-variant mt-0.5 line-clamp-1">{team.description}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 ml-2">
            {team.max_members && (
              <span className="text-[10px] font-label-caps uppercase text-on-surface-variant">
                {team.memberCount}/{team.max_members}
              </span>
            )}
            <button onClick={() => setExpanded(!expanded)} className="p-1.5 rounded-lg hover:bg-surface-container/60 transition-colors">
              <span className="material-symbols-outlined text-on-surface-variant text-sm">{expanded ? 'expand_less' : 'expand_more'}</span>
            </button>
          </div>
        </div>

        {/* Progress bar */}
        {team.taskCount > 0 && (
          <div className="mt-3">
            <div className="flex justify-between text-[10px] text-on-surface-variant mb-1">
              <span className="font-label-caps uppercase">Progress</span>
              <span>{team.doneTaskCount}/{team.taskCount} tasks</span>
            </div>
            <div className="w-full bg-surface-container/50 rounded-full h-1.5">
              <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <AvatarStack members={team.activeMembers.map(m => m.member).filter(Boolean)} />
          <div className="flex items-center gap-2">
            {(canManage || team.created_by === user?.id) && (
              <button onClick={() => setShowManage(!showManage)} className="text-xs flex items-center gap-1 px-3 py-1.5 bg-surface-container-high rounded-lg hover:bg-surface-container-highest transition-colors text-on-surface-variant">
                <span className="material-symbols-outlined text-sm">manage_accounts</span> Manage
              </button>
            )}
            {!canManage && (
              team.isMember ? (
                <span className="flex items-center gap-1 text-[10px] font-bold font-label-caps uppercase text-success bg-success/10 px-3 py-1.5 rounded-full">
                  <span className="material-symbols-outlined text-sm">check_circle</span> Member
                </span>
              ) : team.isPending ? (
                <span className="flex items-center gap-1 text-[10px] font-bold font-label-caps uppercase text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-full">
                  <span className="material-symbols-outlined text-sm">schedule</span> Pending
                </span>
              ) : team.max_members && team.memberCount >= team.max_members ? (
                <span className="text-[10px] font-bold font-label-caps uppercase text-on-surface-variant bg-surface-container-high px-3 py-1.5 rounded-full">
                  Team Full
                </span>
              ) : (
                <button onClick={() => onRequestJoin(team)} className="flex items-center gap-1 text-xs font-bold text-on-primary bg-primary px-3 py-1.5 rounded-full hover:brightness-110 transition-all active:scale-[0.98]">
                  <span className="material-symbols-outlined text-sm">group_add</span> Request to Join
                </button>
              )
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="flex gap-4 text-xs text-on-surface-variant">
          <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">group</span>{team.memberCount} members</span>
          <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">task_alt</span>{team.taskCount} tasks</span>
          {team.pendingMembers.length > 0 && canManage && (
            <span className="flex items-center gap-1 text-amber-400"><span className="material-symbols-outlined text-sm">notifications</span>{team.pendingMembers.length} pending</span>
          )}
        </div>

        {/* Expanded: Tasks */}
        {expanded && (
          <div className="mt-4 border-t border-outline-variant/30 pt-4 space-y-2">
            {team.event_tasks?.length === 0 ? (
              <p className="text-xs text-on-surface-variant italic text-center py-3">No tasks yet</p>
            ) : (
              team.event_tasks?.map(task => (
                <div key={task.id} className="flex items-center gap-3 p-2.5 bg-surface-container-low rounded-lg group">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${task.status === 'done' ? 'bg-success' : task.status === 'in_progress' ? 'bg-primary' : task.status === 'blocked' ? 'bg-error' : 'bg-outline'}`} />
                  <span className={`text-sm flex-1 ${task.status === 'done' ? 'line-through text-on-surface-variant' : 'text-on-surface'}`}>{task.title}</span>
                  <span className={`text-[9px] font-bold font-label-caps uppercase px-1.5 py-0.5 rounded ${PRIORITY_STYLES[task.priority]}`}>{task.priority}</span>
                  {task.assignee && (
                    <img src={task.assignee.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(task.assignee.full_name)}`}
                      title={task.assignee.full_name} className="w-5 h-5 rounded-full border border-outline-variant object-cover" />
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Admin manage panel */}
        {showManage && canManage && (
          <div className="mt-4 border-t border-outline-variant/30 pt-4 space-y-3">
            {/* Pending requests */}
            {team.pendingMembers.length > 0 && (
              <div>
                <h5 className="text-[10px] font-bold font-label-caps uppercase text-amber-400 mb-2">Pending Requests</h5>
                {team.pendingMembers.map(pm => (
                  <div key={pm.id} className="flex items-center gap-2 bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 mb-2">
                    <img src={pm.member?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(pm.member?.full_name)}`}
                      className="w-8 h-8 rounded-full object-cover border border-outline-variant" />
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-on-surface">{pm.member?.full_name}</div>
                      {pm.request_message && <div className="text-xs text-on-surface-variant mt-0.5 italic line-clamp-1">"{pm.request_message}"</div>}
                    </div>
                    <button onClick={() => onApprove(team.id, pm.member_id)} className="p-1.5 bg-success/20 hover:bg-success/30 rounded-lg transition-colors">
                      <span className="material-symbols-outlined text-success text-sm">check</span>
                    </button>
                    <button onClick={() => onReject(team.id, pm.member_id)} className="p-1.5 bg-error/20 hover:bg-error/30 rounded-lg transition-colors">
                      <span className="material-symbols-outlined text-error text-sm">close</span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Current members */}
            <div>
              <h5 className="text-[10px] font-bold font-label-caps uppercase text-on-surface-variant mb-2">Members ({team.memberCount})</h5>
              {team.activeMembers.map(am => (
                <div key={am.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-surface-container-high transition-colors">
                  <img src={am.member?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(am.member?.full_name)}`}
                    className="w-7 h-7 rounded-full object-cover border border-outline-variant" />
                  <span className="text-sm text-on-surface flex-1">{am.member?.full_name}</span>
                  <button onClick={() => onRemoveMember(team.id, am.member_id)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-error/20 rounded transition-all">
                    <span className="material-symbols-outlined text-error text-sm">person_remove</span>
                  </button>
                </div>
              ))}
            </div>

            {/* Add member */}
            <div className="flex gap-2">
              <select value={addMemberId} onChange={e => setAddMemberId(e.target.value)}
                className="flex-1 bg-surface-container-low border border-outline-variant rounded-xl p-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="">Add a member...</option>
                {allMembers.filter(m => !team.activeMembers.some(am => am.member_id === m.id)).map(m => (
                  <option key={m.id} value={m.id}>{m.full_name}</option>
                ))}
              </select>
              <button onClick={() => { if (addMemberId) { onAddMember(team.id, addMemberId); setAddMemberId('') } }}
                disabled={!addMemberId}
                className="px-3 py-2 bg-primary text-on-primary rounded-xl text-sm font-bold hover:brightness-110 disabled:opacity-40 transition-all">
                <span className="material-symbols-outlined text-sm">add</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Kanban Task Board ────────────────────────────────────────
const KanbanBoard = ({ eventTeams, canManage, user, onUpdateStatus, onAssignTask }) => {
  const allTasks = eventTeams.flatMap(team =>
    (team.event_tasks || []).map(t => ({ ...t, teamName: team.name }))
  )

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {STATUS_COLS.map(col => {
        const colTasks = allTasks.filter(t => t.status === col)
        const colIcons = { todo: 'radio_button_unchecked', in_progress: 'pending', done: 'check_circle', blocked: 'block' }
        return (
          <div key={col} className="bg-surface-container rounded-2xl border border-outline-variant overflow-hidden">
            <div className={`px-4 py-3 border-b border-outline-variant/40 flex items-center gap-2 ${
              col === 'done' ? 'bg-success/10' : col === 'blocked' ? 'bg-error/10' : col === 'in_progress' ? 'bg-primary/10' : 'bg-surface-container-high'
            }`}>
              <span className={`material-symbols-outlined text-sm ${STATUS_STYLES[col].split(' ')[1]}`}>{colIcons[col]}</span>
              <span className={`text-[10px] font-bold font-label-caps uppercase ${STATUS_STYLES[col].split(' ')[1]}`}>{STATUS_LABELS[col]}</span>
              <span className="ml-auto text-[10px] text-on-surface-variant bg-surface-container rounded-full px-2 py-0.5">{colTasks.length}</span>
            </div>
            <div className="p-3 space-y-3 min-h-[120px]">
              {colTasks.length === 0 ? (
                <div className="text-xs text-on-surface-variant italic text-center py-6 opacity-50">No tasks</div>
              ) : (
                colTasks.map(task => {
                  const team = eventTeams.find(t => t.id === task.event_team_id)
                  const canAssign = canManage || (team && team.created_by === user?.id)
                  const teamMembers = team?.activeMembers?.map(m => m.member).filter(Boolean) || []

                  return (
                    <div key={task.id} className="bg-surface-container-low border border-outline-variant/50 rounded-xl p-3 hover:border-primary/30 transition-all group">
                      <div className="text-sm font-semibold text-on-surface mb-1.5 leading-tight">{task.title}</div>
                      <div className="text-[10px] text-on-surface-variant mb-2 font-label-caps uppercase">{task.teamName}</div>
                      <div className="flex items-center justify-between">
                        <span className={`text-[9px] font-bold font-label-caps uppercase px-1.5 py-0.5 rounded ${PRIORITY_STYLES[task.priority]}`}>{task.priority}</span>
                        {task.assignee && (
                          <img src={task.assignee.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(task.assignee.full_name)}`}
                            title={task.assignee.full_name} className="w-5 h-5 rounded-full object-cover border border-outline-variant" />
                        )}
                      </div>
                      {canManage && (
                        <select
                          value={task.status}
                          onChange={e => onUpdateStatus(task.id, e.target.value)}
                          className="mt-2 w-full text-[10px] bg-surface-container border border-outline-variant/50 rounded-lg px-2 py-1 text-on-surface-variant focus:outline-none focus:ring-1 focus:ring-primary opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          {STATUS_COLS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                        </select>
                      )}
                      {!canManage && task.assigned_to === user?.id && (
                        <select
                          value={task.status}
                          onChange={e => onUpdateStatus(task.id, e.target.value)}
                          className="mt-2 w-full text-[10px] bg-surface-container border border-outline-variant/50 rounded-lg px-2 py-1 text-on-surface-variant focus:outline-none focus:ring-1 focus:ring-primary opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          {STATUS_COLS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                        </select>
                      )}
                      {canAssign && teamMembers.length > 0 && (
                        <div className="mt-2">
                          <label className="block text-[8px] font-label-caps uppercase text-on-surface-variant mb-0.5">Assignee</label>
                          <select
                            value={task.assigned_to || ''}
                            onChange={e => onAssignTask(task.id, e.target.value || null)}
                            className="w-full text-[10px] bg-surface-container border border-outline-variant/50 rounded-lg px-2 py-1 text-on-surface-variant focus:outline-none focus:ring-1 focus:ring-primary opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <option value="">Unassigned</option>
                            {teamMembers.map(m => (
                              <option key={m.id} value={m.id}>{m.full_name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Main EventDetail Component ──────────────────────────────
export const EventDetail = () => {
  const { id } = useParams()
  const { user, role } = useAuth()
  const canManage = ['chairperson', 'vice_chairperson', 'department_lead'].includes(role)

  const [event, setEvent] = useState(null)
  const [loadingEvent, setLoadingEvent] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [joinModal, setJoinModal] = useState(null) // team object
  const [showCreateTeam, setShowCreateTeam] = useState(false)
  const [showCreateTask, setShowCreateTask] = useState(false)
  const { members } = useMembers()

  const {
    eventTeams,
    loading: teamsLoading,
    createEventTeam,
    addMemberToTeam,
    removeMemberFromTeam,
    requestJoinTeam,
    approveJoinRequest,
    rejectJoinRequest,
    createEventTask,
    updateTaskStatus,
    assignTask,
  } = useEventTeams(id)

  const fetchEvent = async () => {
    setLoadingEvent(true)
    const { data } = await supabase
      .from('events')
      .select('*, organiser:profiles!events_organiser_id_fkey(id, full_name, avatar_url, department)')
      .eq('id', id)
      .single()
    setEvent(data)
    document.title = `${data?.title || 'Event'} | IOTHINC`
    setLoadingEvent(false)
  }

  useEffect(() => { fetchEvent() }, [id])

  const myTeamsCount = eventTeams.filter(t => t.isMember).length
  const pendingRequestsCount = eventTeams.reduce((acc, t) => acc + t.pendingMembers.length, 0)

  if (loadingEvent) return <DetailPageSkeleton variant="event" />

  if (!event) return (
    <main className="flex-1 px-4 md:px-8 pt-24 max-w-7xl mx-auto w-full">
      <div className="text-center py-20 text-on-surface-variant">Event not found.</div>
    </main>
  )

  const d = new Date(event.event_date)

  return (
    <main className="flex-1 px-4 md:px-8 pt-24 pb-12 max-w-7xl mx-auto w-full animate-in fade-in duration-200">
      {/* Back */}
      <Link to="/events" className="inline-flex items-center gap-1.5 text-on-surface-variant text-sm hover:text-primary transition-colors mb-6">
        <span className="material-symbols-outlined text-lg">arrow_back</span> Back to Events
      </Link>

      {/* Hero Header */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-primary/20 via-surface-container to-surface-container-high border border-outline-variant mb-6 p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="relative z-10">
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="text-[10px] font-bold font-label-caps uppercase text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full">{event.category}</span>
            <span className={`text-[10px] font-bold font-label-caps uppercase px-2.5 py-1 rounded-full border ${
              event.status === 'upcoming' ? 'bg-success/10 text-success border-success/20' :
              event.status === 'ongoing' ? 'bg-primary/10 text-primary border-primary/20' :
              'bg-surface-variant text-on-surface-variant border-outline-variant'
            }`}>{event.status}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-on-surface mb-4">{event.title}</h1>
          <div className="flex flex-wrap gap-4 text-sm text-on-surface-variant">
            <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-base">schedule</span>{d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-base">location_on</span>{event.venue || 'TBD'}</span>
            {event.organiser && <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-base">person</span>By {event.organiser.full_name}</span>}
          </div>
        </div>
        <div className="absolute top-6 right-6 flex gap-2 z-20">
          {canManage && (
            <button onClick={() => setShowCreateTeam(true)} className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-on-primary font-bold text-xs rounded-xl hover:brightness-110 transition-all">
              <span className="material-symbols-outlined text-sm">group_add</span> Add Sub-Team
            </button>
          )}
          {eventTeams.length > 0 && (canManage || eventTeams.some(t => t.created_by === user?.id)) && (
            <button onClick={() => setShowCreateTask(true)} className="flex items-center gap-1.5 px-4 py-2.5 bg-surface-container border border-outline-variant text-on-surface font-bold text-xs rounded-xl hover:bg-surface-container-high transition-all">
              <span className="material-symbols-outlined text-sm">add_task</span> Add Task
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-container rounded-2xl p-1.5 mb-6 border border-outline-variant w-fit">
        {[
          { id: 'overview', label: 'Overview', icon: 'info' },
          { id: 'teams', label: `Teams (${eventTeams.length})`, icon: 'groups', badge: canManage && pendingRequestsCount > 0 ? pendingRequestsCount : null },
          { id: 'tasks', label: 'Tasks', icon: 'task_alt' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === tab.id ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-base">{tab.icon}</span>
            {tab.label}
            {tab.badge && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-black text-[9px] font-bold rounded-full flex items-center justify-center">{tab.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-surface-container rounded-2xl border border-outline-variant p-6">
              <h3 className="font-bold text-on-surface mb-3">About This Event</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-line">{event.description || 'No description provided.'}</p>
            </div>

            {/* My teams in this event */}
            {myTeamsCount > 0 && (
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6">
                <h3 className="font-bold text-on-surface mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">badge</span> My Teams in This Event
                </h3>
                <div className="flex flex-wrap gap-2">
                  {eventTeams.filter(t => t.isMember).map(t => (
                    <span key={t.id} className="flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-bold px-3 py-1.5 rounded-full border border-primary/20">
                      <span className="material-symbols-outlined text-sm">groups</span>{t.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {/* Quick Stats */}
            <div className="bg-surface-container rounded-2xl border border-outline-variant p-5">
              <h3 className="font-bold text-on-surface text-sm mb-4">Event Info</h3>
              <div className="space-y-3 text-sm">
                {event.registration_deadline && (
                  <div className="flex items-center gap-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-base">timer</span>
                    <div><div className="text-[10px] uppercase font-label-caps text-outline">Deadline</div>{new Date(event.registration_deadline).toLocaleDateString()}</div>
                  </div>
                )}
                <div className="flex items-center gap-2 text-on-surface-variant">
                  <span className="material-symbols-outlined text-base">groups</span>
                  <div><div className="text-[10px] uppercase font-label-caps text-outline">Sub-Teams</div>{eventTeams.length} teams</div>
                </div>
                {event.max_seats && (
                  <div className="flex items-center gap-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-base">event_seat</span>
                    <div><div className="text-[10px] uppercase font-label-caps text-outline">Capacity</div>{event.max_seats} seats</div>
                  </div>
                )}
              </div>
            </div>

            {/* Organiser */}
            {event.organiser && (
              <div className="bg-surface-container rounded-2xl border border-outline-variant p-5">
                <h3 className="font-bold text-on-surface text-sm mb-3">Organiser</h3>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">{event.organiser.full_name?.charAt(0)}</div>
                  <div>
                    <div className="text-sm font-bold text-on-surface">{event.organiser.full_name}</div>
                    <div className="text-xs text-on-surface-variant">{event.organiser.department}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Teams */}
      {activeTab === 'teams' && (
        <div>
          {teamsLoading ? (
            <GridSkeleton items={3} cols={{ base: 1, md: 2, lg: 3 }} variant="project" />
          ) : eventTeams.length === 0 ? (
            <div className="text-center py-20 bg-surface-container rounded-2xl border border-outline-variant border-dashed">
              <span className="material-symbols-outlined text-5xl text-on-surface-variant/40 mb-4 block">group_off</span>
              <p className="text-on-surface-variant font-semibold mb-1">No sub-teams yet</p>
              <p className="text-xs text-on-surface-variant/60">
                {canManage ? 'Create a sub-team above to get started.' : 'The event organiser hasn\'t created any teams yet.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {eventTeams.map(team => (
                <TeamCard
                  key={team.id}
                  team={team}
                  canManage={canManage}
                  user={user}
                  allMembers={members || []}
                  onRequestJoin={setJoinModal}
                  onApprove={approveJoinRequest}
                  onReject={rejectJoinRequest}
                  onAddMember={addMemberToTeam}
                  onRemoveMember={removeMemberFromTeam}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Tasks */}
      {activeTab === 'tasks' && (
        <div>
          {eventTeams.length === 0 ? (
            <div className="text-center py-20 bg-surface-container rounded-2xl border border-outline-variant border-dashed">
              <span className="material-symbols-outlined text-5xl text-on-surface-variant/40 mb-4 block">task_alt</span>
              <p className="text-on-surface-variant font-semibold">No tasks yet</p>
              <p className="text-xs text-on-surface-variant/60 mt-1">Create sub-teams first, then add tasks.</p>
            </div>
          ) : (
            <KanbanBoard eventTeams={eventTeams} canManage={canManage} user={user} onUpdateStatus={updateTaskStatus} onAssignTask={assignTask} />
          )}
        </div>
      )}

      {/* Modals */}
      {joinModal && (
        <JoinRequestModal
          team={joinModal}
          onClose={() => setJoinModal(null)}
          onSubmit={requestJoinTeam}
        />
      )}
      {showCreateTeam && (
        <CreateTeamModal
          onClose={() => setShowCreateTeam(false)}
          onCreate={createEventTeam}
        />
      )}
      {showCreateTask && eventTeams.length > 0 && (
        <CreateTaskModal
          eventTeams={eventTeams}
          allMembers={members || []}
          user={user}
          canManage={canManage}
          onClose={() => setShowCreateTask(false)}
          onCreate={createEventTask}
        />
      )}
    </main>
  )
}
