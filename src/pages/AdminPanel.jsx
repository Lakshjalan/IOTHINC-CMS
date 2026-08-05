import React, { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useNotifications } from '../hooks/useNotifications'
import { useContributions } from '../hooks/useContributions'
import { supabase } from '../supabaseClient'
import { TableSkeleton } from '../components/SkeletonLoaders'

export const AdminPanel = () => {
  const { role } = useAuth()
  const { sendNotification } = useNotifications()
  const { contributions, refetch: refetchContribs, toggleFlagContribution, deleteContribution } = useContributions()

  const [pendingProfiles, setPendingProfiles] = useState([])
  const [loadingPending, setLoadingPending] = useState(true)
  const [broadcastForm, setBroadcastForm] = useState({ title: '', message: '', priority: '3', target_role: 'all' })
  const [sending, setSending] = useState(false)

  useEffect(() => { document.title = "Admin Panel | IOTHINC" }, [])

  const fetchPending = async () => {
    setLoadingPending(true)
    const { data } = await supabase.from('profiles').select('id,full_name,email,department,role,avatar_url,created_at').eq('needs_approval', true)
    setPendingProfiles(data || [])
    setLoadingPending(false)
  }

  useEffect(() => { fetchPending() }, [])

  const handleApprove = async (id) => {
    await supabase.from('profiles').update({ needs_approval: false }).eq('id', id)
    fetchPending()
  }

  const handleReject = async (id) => {
    if (!confirm('Delete this profile permanently?')) return
    const { error } = await supabase.rpc('delete_user_account', { target_user_id: id })
    if (error) {
      alert("Failed to delete user: " + error.message)
    }
    fetchPending()
  }

  const handleBroadcast = async (e) => {
    e.preventDefault()
    setSending(true)
    try {
      await sendNotification({ 
        target_member_id: null, 
        title: broadcastForm.title,
        message: broadcastForm.message, 
        priority: parseInt(broadcastForm.priority), 
        type: 'announcement',
        target_role: broadcastForm.target_role 
      })
      alert(`Broadcast sent!`)
      setBroadcastForm({ title: '', message: '', priority: '3', target_role: 'all' })
    } catch (err) { alert(err.message) }
    setSending(false)
  }

  if (!['chairperson', 'vice_chairperson', 'department_lead'].includes(role)) return <main className="flex-1 px-4 md:px-stack-lg pt-24 pb-section-gap max-w-7xl mx-auto w-full"><div className="text-center text-error text-lg mt-20">Access denied. Restricted Area.</div></main>

  return (
    <main className="flex-1 px-4 md:px-stack-lg pt-24 pb-section-gap max-w-7xl mx-auto w-full">
      <h2 className="font-headline-xl text-headline-xl text-on-surface mb-2">Admin Panel</h2>
      <p className="font-body-md text-body-md text-on-surface-variant mb-8">Manage approvals, broadcast notifications, and moderate content.</p>

      <div className="space-y-8">
        {/* Pending Approvals */}
        <section className="bg-surface-container rounded-xl border border-outline-variant p-6 shadow-sm">
          <h3 className="font-headline-lg text-headline-lg text-on-surface mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-primary">how_to_reg</span>Pending Approvals</h3>
          {loadingPending ? (
            <TableSkeleton columns={5} rows={5} />
          ) : pendingProfiles.length === 0 ? (
            <p className="text-sm text-on-surface-variant italic">No pending approvals.</p>
          ) : (
            <div className="space-y-3">
              {pendingProfiles.map(p => (
                <div key={p.id} className="flex items-center justify-between bg-surface-container-low rounded-lg border border-outline-variant/50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-container/20 flex items-center justify-center text-primary font-bold">{p.full_name?.charAt(0)?.toUpperCase()}</div>
                    <div><div className="text-sm font-bold text-on-surface">{p.full_name}</div><div className="text-[10px] text-outline font-label-caps uppercase">{p.email} • {p.department || 'No dept'} • Applied {new Date(p.created_at).toLocaleDateString()}</div></div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => handleApprove(p.id)} className="px-3 py-1.5 bg-success/20 text-success text-xs font-bold font-label-caps uppercase rounded hover:bg-success/30 transition-all">Approve</button>
                    <button onClick={() => handleReject(p.id)} className="px-3 py-1.5 bg-error/20 text-error text-xs font-bold font-label-caps uppercase rounded hover:bg-error/30 transition-all">Reject</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Broadcast Notification */}
        <section className="bg-surface-container rounded-xl border border-outline-variant p-6 shadow-sm">
          <h3 className="font-headline-lg text-headline-lg text-on-surface mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-primary">campaign</span>Broadcast Notification</h3>
          <form onSubmit={handleBroadcast} className="space-y-4">
            <div><label className="block text-xs font-label-caps text-on-surface-variant mb-1 uppercase">Title</label><input type="text" value={broadcastForm.title} onChange={e => setBroadcastForm({...broadcastForm, title: e.target.value})} className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant text-sm focus:ring-primary mb-4" placeholder="Announcement Title..." required/></div>
            <div><label className="block text-xs font-label-caps text-on-surface-variant mb-1 uppercase">Message</label><textarea value={broadcastForm.message} onChange={e => setBroadcastForm({...broadcastForm, message: e.target.value})} className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant text-sm h-24 resize-none focus:ring-primary" placeholder="Type your broadcast message..." required/></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs font-label-caps text-on-surface-variant mb-1 uppercase">Priority</label><select value={broadcastForm.priority} onChange={e => setBroadcastForm({...broadcastForm, priority: e.target.value})} className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant text-sm"><option value="1">1 — Admin (Highest)</option><option value="2">2 — Coordinator</option><option value="3">3 — Member (Normal)</option></select></div>
              <div><label className="block text-xs font-label-caps text-on-surface-variant mb-1 uppercase">Target</label><select value={broadcastForm.target_role} onChange={e => setBroadcastForm({...broadcastForm, target_role: e.target.value})} className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant text-sm"><option value="all">All Members</option><option value="chairperson">Chairpersons Only</option><option value="vice_chairperson">Vice Chairpersons Only</option><option value="department_lead">Department Leads Only</option><option value="member">Members Only</option></select></div>
            </div>
            <div className="flex justify-end"><button type="submit" disabled={sending} className="px-5 py-2.5 bg-primary text-on-primary rounded-lg font-bold font-label-caps text-xs uppercase hover:brightness-110 disabled:opacity-50 transition-all">{sending ? 'Sending...' : 'Send Broadcast'}</button></div>
          </form>
        </section>

        {/* Contributions Moderation */}
        <section className="bg-surface-container rounded-xl border border-outline-variant p-6 shadow-sm">
          <h3 className="font-headline-lg text-headline-lg text-on-surface mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-primary">shield</span>Contributions Moderation</h3>
          {!contributions || contributions.length === 0 ? (
            <p className="text-sm text-on-surface-variant italic">No contributions to moderate.</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {contributions.map(c => (
                <div key={c.id} className="flex items-center justify-between bg-surface-container-low rounded-lg border border-outline-variant/50 p-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {c.flagged && <span className="text-[10px] font-bold font-label-caps uppercase px-2 py-0.5 rounded bg-error/20 text-error shrink-0">Flagged</span>}
                    <div className="min-w-0"><div className="text-sm font-bold text-on-surface truncate">{c.title}</div><div className="text-[10px] text-outline font-label-caps uppercase">{c.member_name || 'Unknown'} • {new Date(c.created_at).toLocaleDateString()}</div></div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => toggleFlagContribution(c.id, !c.flagged)} className={`px-3 py-1.5 text-xs font-bold font-label-caps uppercase rounded transition-all ${c.flagged ? 'bg-success/20 text-success hover:bg-success/30' : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'}`}>{c.flagged ? 'Unflag' : 'Flag'}</button>
                    <button onClick={() => { if (confirm('Remove this contribution?')) deleteContribution(c.id) }} className="px-3 py-1.5 bg-error/20 text-error text-xs font-bold font-label-caps uppercase rounded hover:bg-error/30 transition-all">Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
