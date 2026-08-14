import React, { useState, useEffect } from 'react'
import { useTasks } from '../hooks/useTasks'
import { useAuth } from '../hooks/useAuth'
import { useNotifications } from '../hooks/useNotifications'
import { supabase } from '../supabaseClient'
import { ListSkeleton } from '../components/SkeletonLoaders'

export const Tasks = () => {
  const { role, user } = useAuth()
  const canManage = ['chairperson', 'vice_chairperson', 'department_lead'].includes(role)
  const [statusTab, setStatusTab] = useState('all')
  const { tasks, loading, refetch, assignTask, toggleTaskCompleted } = useTasks(statusTab === 'all' ? null : statusTab)
  const { sendNotification } = useNotifications()

  const [showAssign, setShowAssign] = useState(false)
  const [members, setMembers] = useState([])
  const [projects, setProjects] = useState([])
  const [events, setEvents] = useState([])
  const [form, setForm] = useState({ title: '', assigned_to: '', event_id: '', project_id: '', priority: 'medium', due_date: '' })

  useEffect(() => { document.title = "Tasks | IOTHINC" }, [])

  useEffect(() => {
    if (canManage) {
      supabase.from('profiles').select('id,full_name').then(r => setMembers(r.data || []))
      supabase.from('projects').select('id,name').then(r => setProjects(r.data || []))
      supabase.from('events').select('id,title').then(r => setEvents(r.data || []))
    }
  }, [canManage])

  const handleAssign = async (e) => {
    e.preventDefault()
    try {
      await assignTask({ ...form, due_date: form.due_date ? new Date(form.due_date).toISOString() : null, event_id: form.event_id || null, project_id: form.project_id || null })
      
      // Send notification to the assigned member
      if (form.assigned_to) {
        await sendNotification({
          title: 'New Task Assigned',
          message: `You have been assigned a new task: "${form.title}"`,
          type: 'task',
          target_member_id: form.assigned_to,
          target_role: 'member' // Specific member ID takes precedence
        })
      }

      setShowAssign(false)
      setForm({ title: '', assigned_to: '', event_id: '', project_id: '', priority: 'medium', due_date: '' })
    } catch (err) { alert(err.message) }
  }

  const tabs = ['all', 'not_started', 'in_progress', 'completed', 'blocked']
  const priorityColor = (p) => p === 'high' ? 'bg-error/20 text-error' : p === 'medium' ? 'bg-amber-500/20 text-amber-400' : 'bg-primary/20 text-primary'
  const statusColor = (s) => s === 'completed' ? 'bg-success/20 text-success' : s === 'in_progress' ? 'bg-primary/20 text-primary' : s === 'blocked' ? 'bg-error/20 text-error' : 'bg-surface-variant text-on-surface-variant'

  const upcoming = [...(tasks || [])].filter(t => t.due_date && t.status !== 'completed').sort((a, b) => new Date(a.due_date) - new Date(b.due_date)).slice(0, 5)

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
          <h3 className="text-sm font-bold text-on-surface mb-3">New Task Assignment</h3>
          <form onSubmit={handleAssign} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2"><input type="text" placeholder="Task title" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant text-sm focus:ring-primary" required/></div>
            <div><select value={form.assigned_to} onChange={e=>setForm({...form,assigned_to:e.target.value})} className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant text-sm" required><option value="">Assign to...</option>{members.map(m=><option key={m.id} value={m.id}>{m.full_name}</option>)}</select></div>
            <div><select value={form.project_id} onChange={e=>setForm({...form,project_id:e.target.value})} className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant text-sm"><option value="">Project (optional)</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div><select value={form.event_id} onChange={e=>setForm({...form,event_id:e.target.value})} className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant text-sm"><option value="">Event (optional)</option>{events.map(ev=><option key={ev.id} value={ev.id}>{ev.title}</option>)}</select></div>
            <div className="flex gap-3">
              <select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})} className="flex-1 bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant text-sm"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select>
              <input type="date" value={form.due_date} onChange={e=>setForm({...form,due_date:e.target.value})} className="flex-1 bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant text-sm"/>
            </div>
            <div className="md:col-span-3 flex justify-end gap-3">
              <button type="button" onClick={()=>setShowAssign(false)} className="px-4 py-2 text-on-surface-variant hover:bg-surface-container-high rounded-lg font-label-caps text-xs uppercase">Cancel</button>
              <button type="submit" className="px-5 py-2 bg-primary text-on-primary rounded-lg font-bold font-label-caps text-xs uppercase hover:brightness-110">Assign</button>
            </div>
          </form>
        </div>
      )}

      <div className="flex gap-2 border-b border-outline-variant mb-6 pb-px overflow-x-auto no-scrollbar">
        {tabs.map(t => (
          <button key={t} onClick={() => setStatusTab(t)} className={`px-4 py-2.5 font-label-caps text-xs uppercase font-bold border-b-2 transition-all whitespace-nowrap ${statusTab === t ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}>{t.replace('_', ' ')}</button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {loading ? (
            <ListSkeleton items={5} variant="task" showAvatar={true} />
          ) : tasks.length === 0 ? (
            <div className="bg-surface-container rounded-xl border border-outline-variant p-12 text-center text-on-surface-variant italic">No tasks found.</div>
          ) : (
            <div className="space-y-3">
              {tasks.map(t => (
                <div key={t.id} className="bg-surface-container rounded-xl border border-outline-variant p-4 shadow-sm hover:shadow-md transition-shadow flex items-start gap-4">
                  <button onClick={() => toggleTaskCompleted(t.id, t.status)} className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${t.status === 'completed' ? 'bg-success border-success' : 'border-outline-variant hover:border-primary'}`}>
                    {t.status === 'completed' && <span className="material-symbols-outlined text-xs text-black">check</span>}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`font-bold text-sm ${t.status === 'completed' ? 'line-through text-on-surface-variant' : 'text-on-surface'}`}>{t.title}</span>
                      <span className={`text-[10px] font-bold font-label-caps uppercase px-2 py-0.5 rounded ${priorityColor(t.priority)}`}>{t.priority}</span>
                      <span className={`text-[10px] font-bold font-label-caps uppercase px-2 py-0.5 rounded ${statusColor(t.status)}`}>{t.status?.replace('_', ' ')}</span>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] text-outline font-label-caps uppercase">
                      {t.assignee_name && <span>Assigned to {t.assignee_name}</span>}
                      {t.due_date && <span>Due {new Date(t.due_date).toLocaleDateString()}</span>}
                    </div>
                    <div className="mt-2 w-full h-1.5 bg-surface rounded-full"><div className="h-full bg-primary rounded-full transition-all" style={{ width: `${t.progress ?? 0}%` }}/></div>
                  </div>
                  <span className="text-xs font-mono-data text-primary shrink-0">{t.progress ?? 0}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar - Upcoming Deadlines */}
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
    </main>
  )
}
