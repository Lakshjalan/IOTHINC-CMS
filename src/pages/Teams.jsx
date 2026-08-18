import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTeams } from '../hooks/useTeams'
import { useTeamJoinRequests } from '../hooks/useTeamJoinRequests'
import { useAuth } from '../hooks/useAuth'
import { useMembers } from '../hooks/useMembers'
import { GridSkeleton } from '../components/SkeletonLoaders'

// ── Avatar Stack ─────────────────────────────────────────────
const AvatarStack = ({ members = [], max = 5 }) => (
  <div className="flex -space-x-2">
    {members.slice(0, max).map((m, i) => (
      <img
        key={m?.id || i}
        src={m?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(m?.full_name || 'M')}`}
        alt={m?.full_name}
        title={m?.full_name}
        className="w-7 h-7 rounded-full border-2 border-surface-container object-cover"
      />
    ))}
    {members.length > max && (
      <div className="w-7 h-7 rounded-full border-2 border-surface-container bg-surface-container-highest flex items-center justify-center text-[10px] font-bold text-on-surface-variant">
        +{members.length - max}
      </div>
    )}
  </div>
)

// ── Join Request Modal ──────────────────────────────────────
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
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-primary/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary">group_add</span>
          </div>
          <div>
            <h3 className="font-bold text-on-surface text-lg">Request to Join</h3>
            <p className="text-xs text-on-surface-variant">{team.name} · {team.department || 'General'}</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-label-caps uppercase text-on-surface-variant mb-1.5">Message (optional)</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-3 text-sm text-on-surface resize-none h-24 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Why do you want to join this team?"
            />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-outline-variant text-on-surface-variant rounded-xl text-sm hover:bg-surface-container-high transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-primary text-on-primary font-bold rounded-xl text-sm hover:brightness-110 disabled:opacity-50 transition-all">
              {loading ? 'Sending...' : 'Send Request →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Manage Team Slide-over ──────────────────────────────────
const ManagePanel = ({ team, allRequests, allMembers, onClose, onApprove, onReject, onRemoveMember, onAddMember, refetchTeams }) => {
  const [addMemberId, setAddMemberId] = useState('')
  const teamRequests = allRequests.filter(r => r.team_id === team.id)

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end" onClick={onClose}>
      <div className="bg-surface border-l border-outline-variant w-full max-w-sm h-full overflow-y-auto flex flex-col shadow-2xl animate-in slide-in-from-right duration-200"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-5 border-b border-outline-variant flex items-center gap-3">
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant">close</span>
          </button>
          <div>
            <h3 className="font-bold text-on-surface">{team.name}</h3>
            <p className="text-xs text-on-surface-variant">{team.memberCount} members</p>
          </div>
        </div>

        <div className="flex-1 p-5 space-y-6">
          {/* Pending Requests */}
          {teamRequests.length > 0 && (
            <div>
              <h4 className="text-[10px] font-bold font-label-caps uppercase text-amber-400 mb-3 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">notifications</span>
                Pending Requests ({teamRequests.length})
              </h4>
              <div className="space-y-3">
                {teamRequests.map(req => (
                  <div key={req.id} className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <img
                        src={req.member?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(req.member?.full_name || 'M')}`}
                        className="w-9 h-9 rounded-full object-cover border border-outline-variant"
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-sm text-on-surface">{req.member?.full_name}</div>
                        <div className="text-[10px] text-on-surface-variant font-label-caps uppercase">{req.member?.department} · {req.member?.year}</div>
                      </div>
                    </div>
                    {req.request_message && (
                      <p className="text-xs text-on-surface-variant italic bg-surface-container-low rounded-lg p-2 mb-3">"{req.request_message}"</p>
                    )}
                    <div className="flex gap-2">
                      <button onClick={() => onApprove(req.id, req.team_id, req.member_id)} className="flex-1 flex items-center justify-center gap-1 py-2 bg-success/20 hover:bg-success/30 text-success text-xs font-bold rounded-lg transition-colors">
                        <span className="material-symbols-outlined text-sm">check</span> Accept
                      </button>
                      <button onClick={() => onReject(req.id)} className="flex-1 flex items-center justify-center gap-1 py-2 bg-error/20 hover:bg-error/30 text-error text-xs font-bold rounded-lg transition-colors">
                        <span className="material-symbols-outlined text-sm">close</span> Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Members List */}
          <div>
            <h4 className="text-[10px] font-bold font-label-caps uppercase text-on-surface-variant mb-3 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">group</span>
              Members ({team.memberCount})
            </h4>
            <div className="space-y-2">
              {team.members?.map(m => (
                <div key={m?.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-container-high transition-colors group">
                  <img
                    src={m?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(m?.full_name || 'M')}`}
                    className="w-8 h-8 rounded-full object-cover border border-outline-variant"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-on-surface">{m?.full_name}</div>
                    <div className="text-[10px] text-on-surface-variant">{m?.department}</div>
                  </div>
                  {m?.id !== team.lead_id && (
                    <button onClick={() => onRemoveMember(team.id, m?.id)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-error/20 transition-all">
                      <span className="material-symbols-outlined text-error text-sm">person_remove</span>
                    </button>
                  )}
                  {m?.id === team.lead_id && (
                    <span className="text-[9px] font-bold font-label-caps uppercase text-primary bg-primary/10 px-2 py-0.5 rounded-full">Lead</span>
                  )}
                </div>
              ))}
              {(!team.members || team.members.length === 0) && (
                <p className="text-xs text-on-surface-variant italic text-center py-4">No members yet.</p>
              )}
            </div>
          </div>

          {/* Add Member */}
          <div>
            <h4 className="text-[10px] font-bold font-label-caps uppercase text-on-surface-variant mb-3 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">person_add</span>
              Add Member
            </h4>
            <div className="flex gap-2">
              <select
                value={addMemberId}
                onChange={e => setAddMemberId(e.target.value)}
                className="flex-1 bg-surface-container-low border border-outline-variant rounded-xl px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select a member…</option>
                {(allMembers || []).filter(m => !team.members?.some(tm => tm?.id === m.id)).map(m => (
                  <option key={m.id} value={m.id}>{m.full_name}</option>
                ))}
              </select>
              <button
                disabled={!addMemberId}
                onClick={async () => { await onAddMember(team.id, addMemberId); setAddMemberId('') }}
                className="px-3 py-2 bg-primary text-on-primary text-xs font-bold rounded-xl hover:brightness-110 disabled:opacity-50 transition-all"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Team Card ────────────────────────────────────────────────
const TeamCard = ({ team, canManage, isAdmin, user, myRequest, pendingCount, onRequestJoin, onManage, onDelete }) => {
  const teamColors = ['from-violet-500/15 to-purple-600/5', 'from-blue-500/15 to-cyan-600/5', 'from-emerald-500/15 to-teal-600/5', 'from-amber-500/15 to-orange-600/5', 'from-pink-500/15 to-rose-600/5']
  const colorIdx = team.name.charCodeAt(0) % teamColors.length

  const getJoinButton = () => {
    if (canManage || team.lead_id === user?.id) return null
    if (team.isMember) return (
      <span className="flex items-center gap-1 text-[10px] font-bold font-label-caps uppercase text-success bg-success/10 border border-success/20 px-3 py-1.5 rounded-full">
        <span className="material-symbols-outlined text-sm">check_circle</span> Member
      </span>
    )
    if (myRequest?.status === 'pending') return (
      <span className="flex items-center gap-1 text-[10px] font-bold font-label-caps uppercase text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full">
        <span className="material-symbols-outlined text-sm">schedule</span> Pending
      </span>
    )
    if (myRequest?.status === 'approved') return (
      <span className="flex items-center gap-1 text-[10px] font-bold font-label-caps uppercase text-success bg-success/10 border border-success/20 px-3 py-1.5 rounded-full">
        <span className="material-symbols-outlined text-sm">check_circle</span> Member
      </span>
    )
    return (
      <button onClick={() => onRequestJoin(team)} className="flex items-center gap-1.5 text-xs font-bold text-on-primary bg-primary px-3 py-1.5 rounded-full hover:brightness-110 transition-all active:scale-[0.98]">
        <span className="material-symbols-outlined text-sm">group_add</span> Request to Join
      </button>
    )
  }

  return (
    <div className="bg-surface-container rounded-2xl border border-outline-variant overflow-hidden shadow-sm hover:shadow-lg hover:border-primary/20 transition-all duration-200 flex flex-col">
      {/* Gradient top strip */}
      <div className={`bg-gradient-to-r ${teamColors[colorIdx]} p-5 border-b border-outline-variant/30`}>
        <div className="flex justify-between items-start gap-3">
          <div>
            <h4 className="font-bold text-on-surface text-base">{team.name}</h4>
            <span className="text-[10px] font-label-caps text-on-surface-variant uppercase mt-0.5 block">
              {team.department || 'General'}
            </span>
          </div>
          <span className={`text-[10px] font-bold font-label-caps uppercase px-2 py-0.5 rounded-full ${team.status === 'active' ? 'bg-success/20 text-success' : 'bg-surface-variant text-on-surface-variant'}`}>
            {team.status}
          </span>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col">
        {/* Team Lead */}
        {team.lead && (
          <div className="flex items-center gap-2.5 bg-surface-container-low border border-outline-variant/50 rounded-xl p-3 mb-4">
            <img
              src={team.lead.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(team.lead.full_name)}`}
              className="w-8 h-8 rounded-full border border-outline-variant object-cover"
            />
            <div>
              <span className="text-[10px] font-label-caps text-on-surface-variant uppercase">Team Lead</span>
              <p className="text-xs font-semibold text-on-surface">{team.lead.full_name}</p>
            </div>
          </div>
        )}

        {/* Members avatars */}
        <div className="flex items-center justify-between mb-4">
          <AvatarStack members={team.members || []} />
          <span className="text-xs text-on-surface-variant">{team.memberCount} members</span>
        </div>

        {/* Footer: Stats + Action */}
        <div className="mt-auto flex items-center justify-between pt-3 border-t border-outline-variant/30">
          <div className="flex gap-3 text-xs text-on-surface-variant">
            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">folder</span>{team.projectCount}</span>
          </div>
          <div className="flex items-center gap-2">
            {(canManage || team.lead_id === user?.id) && (
              <button onClick={() => onManage(team)} className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-surface-container-high hover:bg-surface-container-highest rounded-xl transition-colors text-on-surface-variant relative">
                <span className="material-symbols-outlined text-sm">manage_accounts</span> Manage
                {pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-black text-[9px] font-bold rounded-full flex items-center justify-center">{pendingCount}</span>
                )}
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => onDelete(team)}
                className="p-1.5 text-on-surface-variant/40 hover:text-error hover:bg-error/10 rounded-xl transition-colors"
                title="Delete department"
              >
                <span className="material-symbols-outlined text-sm">delete</span>
              </button>
            )}
            {getJoinButton()}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Teams Page ──────────────────────────────────────────
export const Teams = () => {
  const { role, user } = useAuth()
  const isAdmin = (role === 'chairperson' || role === 'vice_chairperson')
  const canManage = ['chairperson', 'vice_chairperson'].includes(role)
  const { teams, myTeams, loading, refetch: refetchTeams, removeMember, addMember, deleteTeam } = useTeams()
  const { members } = useMembers()
  const { requests, myRequests, approveRequest, rejectRequest, requestJoin, getMyRequestStatus } = useTeamJoinRequests()

  const [activeTab, setActiveTab] = useState('all')
  const [joinModal, setJoinModal] = useState(null)
  const [manageTeam, setManageTeam] = useState(null)

  useEffect(() => { document.title = 'Departments | IOTHINC' }, [])

  const pendingCountForTeam = (teamId) => requests.filter(r => r.team_id === teamId).length
  const totalPending = requests.length

  const handleDeleteTeam = async (team) => {
    if (!window.confirm(`Delete "${team.name}"? This cannot be undone.`)) return
    try { await deleteTeam(team.id) } catch (err) { alert('Error: ' + err.message) }
  }

  const tabs = [
    { id: 'all', label: 'All Departments', icon: 'corporate_fare', count: teams.length },
    { id: 'mine', label: 'My Departments', icon: 'badge', count: myTeams.length },
    ...(canManage ? [{ id: 'requests', label: 'Requests', icon: 'notifications', count: totalPending, badge: true }] : []),
  ]

  if (loading) return (
    <main className="flex-1 px-4 md:px-8 pt-24 pb-12 max-w-7xl mx-auto w-full">
      <GridSkeleton items={6} variant="project" className="grid-cols-1 md:grid-cols-2 lg:grid-cols-3" />
    </main>
  )

  return (
    <main className="flex-1 px-4 md:px-8 pt-24 pb-12 max-w-7xl mx-auto w-full animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="font-headline-xl text-headline-xl text-on-surface">Department Management</h2>
          <p className="text-body-md text-on-surface-variant mt-2">Organise club departments, join a department, and collaborate with your team.</p>
        </div>
        {canManage && (
          <Link to="/teams/new" className="flex items-center gap-2 bg-primary text-on-primary font-bold font-label-caps text-xs uppercase px-4 py-3 rounded-xl hover:brightness-110 active:scale-[0.98] transition-all">
            <span className="material-symbols-outlined">add</span> Create Department
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-container rounded-2xl p-1.5 mb-6 border border-outline-variant w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === tab.id ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-base">{tab.icon}</span>
            {tab.label}
            {tab.count > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold min-w-[18px] text-center ${
                activeTab === tab.id ? 'bg-white/20 text-white' :
                tab.badge && tab.count > 0 ? 'bg-amber-500 text-black' : 'bg-surface-container-high text-on-surface-variant'
              }`}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: All Teams */}
      {activeTab === 'all' && (
        <div>
          {teams.length === 0 ? (
            <div className="text-center py-20 bg-surface-container rounded-2xl border border-dashed border-outline-variant">
              <span className="material-symbols-outlined text-5xl text-on-surface-variant/40 mb-4 block">corporate_fare</span>
              <p className="text-on-surface-variant font-semibold">No departments yet</p>
              {canManage && <p className="text-xs text-on-surface-variant/60 mt-1">Click "Create Department" to get started.</p>}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {teams.map(team => (
                <TeamCard
                  key={team.id}
                  team={team}
                  canManage={canManage}
                  isAdmin={isAdmin}
                  user={user}
                  myRequest={getMyRequestStatus(team.id)}
                  pendingCount={pendingCountForTeam(team.id)}
                  onRequestJoin={setJoinModal}
                  onManage={setManageTeam}
                  onDelete={handleDeleteTeam}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: My Teams */}
      {activeTab === 'mine' && (
        <div>
          {myTeams.length === 0 ? (
            <div className="text-center py-20 bg-surface-container rounded-2xl border border-dashed border-outline-variant">
              <span className="material-symbols-outlined text-5xl text-on-surface-variant/40 mb-4 block">badge</span>
              <p className="text-on-surface-variant font-semibold">You're not in any departments yet</p>
              <p className="text-xs text-on-surface-variant/60 mt-1">Browse "All Departments" and request to join one.</p>
              <button onClick={() => setActiveTab('all')} className="mt-4 px-4 py-2 bg-primary text-on-primary text-sm font-bold rounded-xl hover:brightness-110 transition-all">
                Browse Departments →
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {myTeams.map(team => (
                <TeamCard
                  key={team.id}
                  team={team}
                  canManage={canManage}
                  isAdmin={isAdmin}
                  user={user}
                  myRequest={getMyRequestStatus(team.id)}
                  pendingCount={pendingCountForTeam(team.id)}
                  onRequestJoin={setJoinModal}
                  onManage={setManageTeam}
                  onDelete={handleDeleteTeam}
                />
              ))}
            </div>
          )}

          {/* My pending requests */}
          {!canManage && myRequests.filter(r => r.status === 'pending').length > 0 && (
            <div className="mt-8">
              <h3 className="text-sm font-bold text-on-surface mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400 text-base">schedule</span>
                Pending Join Requests
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {myRequests.filter(r => r.status === 'pending').map(req => (
                  <div key={req.id} className="flex items-center gap-3 bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                    <span className="material-symbols-outlined text-amber-400">schedule</span>
                    <div>
                      <div className="text-sm font-semibold text-on-surface">{req.team?.name}</div>
                      <div className="text-xs text-on-surface-variant">Request pending review</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Requests (admin only) */}
      {activeTab === 'requests' && canManage && (
        <div>
          {requests.length === 0 ? (
            <div className="text-center py-20 bg-surface-container rounded-2xl border border-dashed border-outline-variant">
              <span className="material-symbols-outlined text-5xl text-on-surface-variant/40 mb-4 block">done_all</span>
              <p className="text-on-surface-variant font-semibold">No pending requests</p>
              <p className="text-xs text-on-surface-variant/60 mt-1">All join requests have been reviewed.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {requests.map(req => (
                <div key={req.id} className="bg-surface-container border border-amber-500/20 rounded-2xl p-5 hover:shadow-lg transition-all">
                  <div className="flex items-center gap-4 mb-4">
                    <img
                      src={req.member?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(req.member?.full_name || 'M')}`}
                      className="w-12 h-12 rounded-full object-cover border-2 border-outline-variant"
                    />
                    <div className="flex-1">
                      <div className="font-bold text-on-surface">{req.member?.full_name}</div>
                      <div className="text-xs text-on-surface-variant">{req.member?.department} · {req.member?.year}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-bold font-label-caps uppercase text-on-surface-variant">Requesting to join</div>
                      <div className="text-sm font-bold text-primary">{req.team?.name}</div>
                    </div>
                  </div>

                  {req.request_message && (
                    <div className="bg-surface-container-low border border-outline-variant/50 rounded-xl p-3 mb-4">
                      <p className="text-xs text-on-surface-variant italic">"{req.request_message}"</p>
                    </div>
                  )}

                  <div className="text-[10px] text-outline font-label-caps uppercase mb-4">
                    Requested {new Date(req.requested_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => rejectRequest(req.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-error/10 hover:bg-error/20 text-error text-sm font-bold rounded-xl border border-error/20 transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">close</span> Decline
                    </button>
                    <button
                      onClick={() => approveRequest(req.id, req.team_id, req.member_id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-success/10 hover:bg-success/20 text-success text-sm font-bold rounded-xl border border-success/20 transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">check</span> Accept
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Join Modal */}
      {joinModal && (
        <JoinRequestModal
          team={joinModal}
          onClose={() => setJoinModal(null)}
          onSubmit={requestJoin}
        />
      )}

      {/* Manage Slide-over */}
      {manageTeam && (
        <ManagePanel
          team={manageTeam}
          allRequests={requests}
          allMembers={members || []}
          onClose={() => setManageTeam(null)}
          onApprove={(reqId, teamId, memberId) => { approveRequest(reqId, teamId, memberId); setManageTeam(null) }}
          onReject={(reqId) => { rejectRequest(reqId) }}
          onRemoveMember={(teamId, memberId) => { removeMember(teamId, memberId); setManageTeam(null) }}
          onAddMember={async (teamId, memberId) => { await addMember(teamId, memberId); setManageTeam(null) }}
          refetchTeams={refetchTeams}
        />
      )}
    </main>
  )
}