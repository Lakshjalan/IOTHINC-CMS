import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../hooks/useAuth'
import { getOptimizedImageUrl } from '../utils/imageOptimizer'
import { useAvatarUpload } from '../lib/unifiedStorage'
import { DetailPageSkeleton } from '../components/SkeletonLoaders'

export const MemberProfile = () => {
  const { id } = useParams()
  const { user: currentUser, role: currentRole } = useAuth()
  
  const [member, setMember] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('About')

  // Tabs Data
  const [contributions, setContributions] = useState([])
  const [tasks, setTasks] = useState([])
  const [registrations, setRegistrations] = useState([])
  
  // Edit Mode state
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState({
    full_name: '',
    department: '',
    year: '',
    bio: '',
    skills: '',
    github_url: '',
    linkedin_url: '',
    avatar_url: '',
    role: 'member',
    member_tag: ''
  })

  const isOwnProfile = currentUser?.id === id
  const canEdit = isOwnProfile || (currentRole === 'chairperson' || currentRole === 'vice_chairperson')

  const fetchProfileData = async () => {
    setLoading(true)
    try {
      // 1. Fetch Profile
      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single()

      if (profErr) throw profErr
      setMember(prof)
      setEditForm({
        full_name: prof.full_name,
        department: prof.department || '',
        year: prof.year || '',
        bio: prof.bio || '',
        skills: prof.skills ? prof.skills.join(', ') : '',
        github_url: prof.github_url || '',
        linkedin_url: prof.linkedin_url || '',
        avatar_url: prof.avatar_url || '',
        role: prof.role || 'member',
        member_tag: prof.member_tag || ''
      })

      document.title = `${prof.full_name} | IOTHINC`

      // 2. Fetch Contributions
      const { data: contrs } = await supabase
        .from('contributions')
        .select('*, project:projects(title), event:events(title)')
        .eq('member_id', id)
      
      // Filter private based on access
      let filteredContrs = contrs || []
      if (currentUser?.id !== id && currentRole !== 'admin') {
        filteredContrs = filteredContrs.filter(c => c.visibility === 'public')
      }
      setContributions(filteredContrs)

      // 3. Fetch Progress (Tasks)
      const { data: tsk } = await supabase
        .from('tasks')
        .select('*, project:projects(title), event:events(title)')
        .eq('assigned_to', id)
        .order('due_date', { ascending: true })
      setTasks(tsk || [])

      // 4. Fetch Registered Events
      const { data: regs } = await supabase
        .from('registrations')
        .select('*, event:events(*)')
        .eq('member_id', id)
        .eq('status', 'confirmed')
      setRegistrations(regs || [])

    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfileData()
  }, [id])

  const handleUpdate = async (e) => {
    e.preventDefault()
    try {
      const skillsArray = editForm.skills 
        ? editForm.skills.split(',').map(s => s.trim()) 
        : []

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editForm.full_name,
          department: editForm.department,
          year: editForm.year,
          bio: editForm.bio,
          skills: skillsArray,
          github_url: editForm.github_url,
          linkedin_url: editForm.linkedin_url,
          ...((currentRole === 'chairperson' || currentRole === 'vice_chairperson') && { role: editForm.role }),
          ...((currentRole === 'chairperson') && { member_tag: editForm.member_tag })
        })
        .eq('id', id)

      if (error) throw error
      alert('Profile updated!')
      setEditMode(false)
      fetchProfileData()
    } catch (err) {
      alert('Error updating profile: ' + err.message)
    }
  }

  const uploadAvatar = useAvatarUpload()

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    try {
      const result = await uploadAvatar(file, id)
      const publicUrl = result.url

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', id)

      if (updateError) throw updateError

      alert('Avatar uploaded successfully!')
      fetchProfileData()
    } catch (err) {
      console.error(err)
      alert('Error uploading avatar: ' + err.message)
    }
  }

  if (loading) return <DetailPageSkeleton variant="member" />

  return (
    <main className="flex-1 px-4 md:px-stack-lg pt-24 pb-section-gap max-w-5xl mx-auto w-full animate-in fade-in duration-200">
      
      {/* Profile Header Header Card */}
      <div className="bg-surface-container rounded-xl border border-outline-variant p-6 md:p-8 flex flex-col md:flex-row gap-6 items-center md:items-start mb-8 shadow-sm">
        <div className="relative group">
          <img 
            alt="Avatar" 
            width="128"
            height="128"
            src={getOptimizedImageUrl(member?.avatar_url || 'https://lh3.googleusercontent.com/aida-public/AB6AXuBNaqMiWFAn3N5e7M0gwmYiSokY3sIvWQwnYZMA0OyBqm4ptCO25QtOwdw1OQ5Rt5QTNH1uDqGHdu_L_t9wzqgFCLo5yIV_baf24Wf-xNCZxCaAlPkv5VLrFh3hXAREI068rYzK2DKm2y8Ru5FLCbUMv8cBS3F9GBx18Fv6wZ0tW9z9zXW40sIJ99UJvYbqJmHvgOnTlgxUFhS-L5JK-ZGbPBgMbAJbxIjoc14U41gx8HweiooxRjpNYkw-1cpZIXohA7GIseo7tbY', { width: 128, height: 128 })} 
            className="w-24 h-24 md:w-32 md:h-32 rounded-full border-2 border-outline-variant object-cover"
          />
          {canEdit && (
            <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity text-xs font-semibold text-white">
              Change Photo
              <input type="file" onChange={handleAvatarUpload} className="hidden" accept="image/*" />
            </label>
          )}
        </div>

        <div className="flex-1 text-center md:text-left">
          <div className="flex flex-col md:flex-row md:items-center gap-3 justify-center md:justify-start">
            <h2 className="font-headline-xl text-3xl text-on-surface leading-tight font-bold">{member?.full_name}</h2>
            <span className={`w-fit mx-auto md:mx-0 text-xs font-bold font-label-caps px-2.5 py-1 rounded-full uppercase ${(member?.role === 'chairperson' || member?.role === 'vice_chairperson') ? 'bg-red-500/20 text-red-400' : member?.role === 'department_lead' ? 'bg-amber-400/20 text-amber-300' : 'bg-primary/20 text-primary'}`}>
              {member?.role === 'department_lead' || member?.role === 'vice_chairperson' ? (
            member?.member_tag || 'No Tag'
          ) : (
            member?.role
          )}
            </span>
          </div>
          
          <p className="text-on-surface-variant font-medium mt-2">
            {member?.department || 'Department N/A'} • {member?.year || 'Year N/A'}
          </p>

          <div className="flex gap-4 justify-center md:justify-start mt-4">
            {member?.github_url && (
              <a href={member.github_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary transition-colors">
                <span className="material-symbols-outlined text-lg">code</span> GitHub
              </a>
            )}
            {member?.linkedin_url && (
              <a href={member.linkedin_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary transition-colors">
                <span className="material-symbols-outlined text-lg">account_box</span> LinkedIn
              </a>
            )}
          </div>
        </div>

        {canEdit && !editMode && (
          <button 
            onClick={() => setEditMode(true)}
            className="bg-surface-container-high border border-outline-variant hover:bg-surface-container-highest text-on-surface px-4 py-2 rounded-lg font-label-caps text-xs uppercase font-semibold"
          >
            Edit Profile
          </button>
        )}
      </div>

      {/* Tabs list */}
      <div className="flex gap-2 border-b border-outline-variant mb-6 pb-px overflow-x-auto no-scrollbar">
        {['About', 'Contributions', 'Progress', 'Events'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 font-label-caps text-xs uppercase font-bold border-b-2 transition-all ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      {activeTab === 'About' && (
        <div className="bg-surface-container rounded-xl border border-outline-variant p-6 shadow-sm">
          {editMode ? (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-label-caps text-on-surface-variant mb-1 uppercase">Full Name</label>
                  <input 
                    type="text" 
                    value={editForm.full_name}
                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                    className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant text-sm focus:ring-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-label-caps text-on-surface-variant mb-1 uppercase">Department</label>
                  <input 
                    type="text" 
                    value={editForm.department}
                    onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                    className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant text-sm focus:ring-primary"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-label-caps text-on-surface-variant mb-1 uppercase">Academic Year</label>
                  <input 
                    type="text" 
                    value={editForm.year}
                    onChange={(e) => setEditForm({ ...editForm, year: e.target.value })}
                    className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant text-sm focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-label-caps text-on-surface-variant mb-1 uppercase">Skills (comma separated)</label>
                  <input 
                    type="text" 
                    value={editForm.skills}
                    onChange={(e) => setEditForm({ ...editForm, skills: e.target.value })}
                    className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant text-sm focus:ring-primary"
                    placeholder="React, PyTorch, C++"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-label-caps text-on-surface-variant mb-1 uppercase">GitHub URL</label>
                  <input 
                    type="url" 
                    value={editForm.github_url}
                    onChange={(e) => setEditForm({ ...editForm, github_url: e.target.value })}
                    className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant text-sm focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-label-caps text-on-surface-variant mb-1 uppercase">LinkedIn URL</label>
                  <input 
                    type="url" 
                    value={editForm.linkedin_url}
                    onChange={(e) => setEditForm({ ...editForm, linkedin_url: e.target.value })}
                    className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant text-sm focus:ring-primary"
                  />
                </div>
              </div>
             {(currentRole === 'chairperson' || currentRole === 'vice_chairperson') && (
                <>
                  <div>
                    <label className="block text-xs font-label-caps text-on-surface-variant mb-1 uppercase">Role (Admin Only)</label>
                    <select
                      value={editForm.role}
                      onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                      className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant text-sm focus:ring-primary"
                    >
                      <option value="member">Member</option>
                      <option value="coordinator">Coordinator</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </>
              )}
              
              <div>
                <label className="block text-xs font-label-caps text-on-surface-variant mb-1 uppercase">Bio</label>
                <textarea 
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant text-sm h-28 resize-none focus:ring-primary"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setEditMode(false)}
                  className="px-4 py-2 text-on-surface-variant hover:bg-surface-container-high rounded-lg font-label-caps text-xs uppercase"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-primary text-on-primary rounded-lg font-bold font-label-caps text-xs uppercase hover:brightness-110"
                >
                  Save Changes
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="font-label-caps text-[10px] uppercase text-on-surface-variant mb-2">Biography</h3>
                <p className="text-on-surface text-sm leading-relaxed whitespace-pre-line">
                  {member?.bio || "No biography provided."}
                </p>
              </div>
              
              <div>
                <h3 className="font-label-caps text-[10px] uppercase text-on-surface-variant mb-3">Skills</h3>
                {member?.skills && member.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {member.skills.map((skill, i) => (
                      <span key={i} className="text-xs bg-surface-container-low border border-outline-variant text-on-surface-variant px-3 py-1 rounded-full font-medium">
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-on-surface-variant italic">No skills listed.</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'Contributions' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {contributions.length === 0 ? (
            <div className="col-span-2 bg-surface-container rounded-xl border border-outline-variant p-8 text-center text-on-surface-variant italic">
              No contributions recorded.
            </div>
          ) : (
            contributions.map((c) => (
              <div key={c.id} className="bg-surface-container rounded-xl border border-outline-variant p-5 flex flex-col shadow-sm">
                {c.photo_url && (
                  <img src={c.photo_url} alt="" className="w-full h-44 object-cover rounded-lg mb-4 border border-outline-variant" />
                )}
                <h4 className="font-bold text-on-surface text-lg mb-2">{c.title}</h4>
                <p className="text-sm text-on-surface-variant leading-relaxed flex-1">{c.description}</p>
                
                <div className="mt-4 flex gap-3 text-xs font-label-caps text-outline uppercase border-t border-outline-variant/30 pt-3">
                  {c.project && <span>📁 Project: {c.project.title}</span>}
                  {c.event && <span>📅 Event: {c.event.title}</span>}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'Progress' && (
        <div className="bg-surface-container rounded-xl border border-outline-variant overflow-hidden shadow-sm">
          {tasks.length === 0 ? (
            <p className="p-8 text-center text-on-surface-variant italic">No tasks assigned to this member.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-container-low text-[10px] font-label-caps uppercase text-on-surface-variant">
                    <th className="p-4">Task Name</th>
                    <th className="p-4">Priority</th>
                    <th className="p-4">Progress</th>
                    <th className="p-4">Due Date</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {tasks.map(task => (
                    <tr key={task.id} className="hover:bg-surface-container-high transition-colors">
                      <td className="p-4">
                        <span className="font-semibold text-on-surface">{task.title}</span>
                        {task.project && <span className="block text-xs text-on-surface-variant mt-0.5">Project: {task.project.title}</span>}
                      </td>
                      <td className="p-4 text-sm font-label-caps uppercase">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${task.priority === 'high' ? 'bg-red-500/20 text-red-400' : task.priority === 'medium' ? 'bg-amber-400/20 text-amber-300' : 'bg-primary/20 text-primary'}`}>
                          {task.priority}
                        </span>
                      </td>
                      <td className="p-4 text-sm font-mono-data font-semibold">{task.progress}%</td>
                      <td className="p-4 text-sm text-on-surface-variant">{task.due_date}</td>
                      <td className="p-4 text-xs font-label-caps uppercase">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${task.status === 'completed' ? 'bg-success/20 text-success' : task.status === 'in_progress' ? 'bg-primary/20 text-primary' : 'bg-surface-variant text-on-surface-variant'}`}>
                          {task.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'Events' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {registrations.length === 0 ? (
            <div className="col-span-2 bg-surface-container rounded-xl border border-outline-variant p-8 text-center text-on-surface-variant italic">
              Not registered for any events yet.
            </div>
          ) : (
            registrations.map((reg) => (
              <div key={reg.id} className="bg-surface-container rounded-xl border border-outline-variant p-5 shadow-sm">
                <span className="text-[10px] font-bold font-label-caps uppercase text-primary tracking-wider">{reg.event?.category}</span>
                <h4 className="font-bold text-on-surface text-lg mt-1 mb-2">{reg.event?.title}</h4>
                <p className="text-sm text-on-surface-variant">{reg.event?.description}</p>
                <div className="mt-4 flex gap-4 text-xs font-label-caps text-outline uppercase">
                  <span>📅 {new Date(reg.event?.event_date).toLocaleDateString()}</span>
                  <span>📍 {reg.event?.venue}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

    </main>
  )
}