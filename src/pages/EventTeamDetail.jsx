import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../hooks/useAuth'
import { useEventTeams } from '../hooks/useEventTeams'
import { useMembers } from '../hooks/useMembers'
import { DetailPageSkeleton } from '../components/SkeletonLoaders'

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

const KanbanBoard = ({ eventTeams, canManage, user, onUpdateStatus, onAssignTask, eventOrganiserId }) => {
  const allTasks = eventTeams.flatMap(team =>
    (team.event_tasks || []).map(t => ({ ...t, teamName: team.name }))
  )
  const topLevelTasks = allTasks.filter(t => !t.parent_task_id)
  const getSubTasks = (taskId) => allTasks.filter(t => t.parent_task_id === taskId)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {STATUS_COLS.map(col => {
        const colTasks = topLevelTasks.filter(t => t.status === col)
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
                  const isManager = team?.activeMembers?.some(m => m.member_id === user?.id && m.role === 'manager');
                  const canAssign = canManage || (team && team.created_by === user?.id) || eventOrganiserId === user?.id || isManager;
                  const canManageTask = canAssign;
                  const teamMembers = team?.activeMembers?.map(m => m.member).filter(Boolean) || []
                  const subTasks = getSubTasks(task.id)

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

                      {subTasks.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-outline-variant/30 space-y-1">
                          <div className="text-[9px] font-bold font-label-caps uppercase text-on-surface-variant mb-1">Sub-Tasks ({subTasks.length})</div>
                          {subTasks.map(sub => (
                            <div key={sub.id} className="flex items-center gap-1.5 text-xs">
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sub.status === 'done' ? 'bg-success' : sub.status === 'in_progress' ? 'bg-primary' : sub.status === 'blocked' ? 'bg-error' : 'bg-outline'}`} />
                              <span className={`flex-1 truncate ${sub.status === 'done' ? 'line-through text-on-surface-variant' : 'text-on-surface'}`}>{sub.title}</span>
                              {(canManageTask || sub.assigned_to === user?.id) && (
                                <select
                                  value={sub.status}
                                  onChange={e => onUpdateStatus(sub.id, e.target.value)}
                                  className="text-[9px] bg-surface-container border border-outline-variant/50 rounded px-1 py-0.5 text-on-surface-variant focus:outline-none"
                                >
                                  {STATUS_COLS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                                </select>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {(canManageTask || task.assigned_to === user?.id) && (
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

export const EventTeamDetail = () => {
  const { eventId, teamId } = useParams()
  const { user, role } = useAuth()
  const navigate = useNavigate()
  const canManage = ['chairperson', 'vice_chairperson'].includes(role)
  
  const [event, setEvent] = useState(null)
  const [loadingEvent, setLoadingEvent] = useState(true)
  const { members } = useMembers()

  const {
    eventTeams,
    loading: teamsLoading,
    updateTaskStatus,
    assignTask,
  } = useEventTeams(eventId)

  useEffect(() => {
    const fetchEvent = async () => {
      setLoadingEvent(true)
      const { data } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single()
      setEvent(data)
      setLoadingEvent(false)
    }
    fetchEvent()
  }, [eventId])

  if (loadingEvent || teamsLoading) return <DetailPageSkeleton variant="event" />

  const team = eventTeams.find(t => t.id === teamId)
  if (!team) {
    return (
      <main className="flex-1 px-4 md:px-8 pt-24 pb-12 max-w-7xl mx-auto w-full">
        <div className="text-center py-20 text-on-surface-variant">Team not found.</div>
      </main>
    )
  }

  // Include the team itself and any nested subteams
  const relevantTeams = [team, ...eventTeams.filter(t => t.parent_team_id === team.id)]

  return (
    <main className="flex-1 px-4 md:px-8 pt-24 pb-12 max-w-7xl mx-auto w-full animate-in fade-in duration-200">
      <button onClick={() => navigate(`/events/${eventId}`)} className="inline-flex items-center gap-1.5 text-on-surface-variant text-sm hover:text-primary transition-colors mb-6">
        <span className="material-symbols-outlined text-lg">arrow_back</span> Back to Event
      </button>

      <div className="bg-surface-container rounded-2xl p-6 border border-outline-variant mb-6 flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <h2 className="text-2xl font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">groups</span>
            {team.name}
          </h2>
          {team.description && <p className="text-sm text-on-surface-variant mt-2">{team.description}</p>}
        </div>
        <div className="flex gap-4 bg-surface p-4 rounded-xl border border-outline-variant">
           <div className="text-center">
             <div className="text-xl font-bold text-primary">{team.memberCount}</div>
             <div className="text-[10px] font-label-caps uppercase text-on-surface-variant">Members</div>
           </div>
           <div className="text-center">
             <div className="text-xl font-bold text-primary">{team.taskCount}</div>
             <div className="text-[10px] font-label-caps uppercase text-on-surface-variant">Tasks</div>
           </div>
           <div className="text-center">
             <div className="text-xl font-bold text-primary">{relevantTeams.length - 1}</div>
             <div className="text-[10px] font-label-caps uppercase text-on-surface-variant">Sub-Teams</div>
           </div>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="font-bold text-on-surface text-lg mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">task_alt</span> Tasks
        </h3>
        <KanbanBoard 
          eventTeams={relevantTeams}
          canManage={canManage}
          user={user}
          onUpdateStatus={updateTaskStatus}
          onAssignTask={assignTask}
          eventOrganiserId={event?.organiser_id}
        />
      </div>

      {relevantTeams.length > 1 && (
        <div className="mt-8">
          <h3 className="font-bold text-on-surface text-lg mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">hub</span> Sub-Teams
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {relevantTeams.slice(1).map(subTeam => (
              <div key={subTeam.id} className="bg-surface-container rounded-xl p-4 border border-outline-variant cursor-pointer hover:border-primary transition-colors" onClick={() => navigate(`/events/${eventId}/team/${subTeam.id}`)}>
                <div className="font-bold text-on-surface">{subTeam.name}</div>
                <div className="flex justify-between text-xs text-on-surface-variant mt-2">
                  <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">group</span>{subTeam.memberCount}</span>
                  <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">task_alt</span>{subTeam.taskCount}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}
