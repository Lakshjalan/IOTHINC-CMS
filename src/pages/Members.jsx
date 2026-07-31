import React, { useState } from 'react'
import { useMembers } from '../hooks/useMembers'
import { useAuth } from '../hooks/useAuth'
import { getOptimizedImageUrl } from '../utils/imageOptimizer'

// Rank order must mirror public.role_rank() in the DB — keep these in sync.
const ROLE_RANK = { chairperson: 4, vice_chairperson: 3, department_lead: 2, member: 1 }
const ALL_ROLES = ['member', 'department_lead', 'vice_chairperson', 'chairperson']

export const Members = () => {
  const { role, user } = useAuth()
  const isAdmin = (role === 'chairperson' || role === 'vice_chairperson')
  const myRank = ROLE_RANK[role] || 0

  // Roles this user is permitted to assign to someone else (strictly below their own rank)
  const assignableRoles = ALL_ROLES.filter(r => ROLE_RANK[r] < myRank)

  // Can the current user change this member's role at all?
  // Must outrank the target's current role, and can't touch their own row.
  const canChangeRole = (member) =>
    !!member && member.id !== user?.id && myRank > (ROLE_RANK[member.role] || 0)

  const [filters, setFilters] = useState({
    department: '',
    year: '',
    role: ''
  })

  const { members, loading, addMember, updateMember, deleteMember } = useMembers(filters)
  
  // Selected member side panel state
  const [selectedMember, setSelectedMember] = useState(null)
  
  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showRoleDialog, setShowRoleDialog] = useState(false)
  const [roleTarget, setRoleTarget] = useState(null)      // member being role-changed
  const [newRole, setNewRole] = useState('member')
  const [newMemberForm, setNewMemberForm] = useState({
    full_name: '',
    email: '',
    role: 'member',
    department: '',
    year: '',
    skills: '',
    bio: ''
  })

  // Set title
  React.useEffect(() => {
    document.title = "Member Directory | IOTHINC"
  }, [])

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const handleAddSubmit = async (e) => {
    e.preventDefault()
    try {
      const skillsArray = newMemberForm.skills ? newMemberForm.skills.split(',').map(s => s.trim()) : []
      await addMember({
        ...newMemberForm,
        skills: skillsArray,
        needs_approval: false
      })
      setShowAddDialog(false)
      setNewMemberForm({
        full_name: '',
        email: '',
        role: 'member',
        department: '',
        year: '',
        skills: '',
        bio: ''
      })
      alert('Member added successfully!')
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  const openRoleDialog = (member, e) => {
    e.stopPropagation()
    setRoleTarget(member)
    setNewRole(member.role)
    setShowRoleDialog(true)
  }

  const handleRoleSubmit = async (e) => {
    e.preventDefault()
    try {
      await updateMember(roleTarget.id, { role: newRole })
      setShowRoleDialog(false)
      setRoleTarget(null)
      // Update selectedMember panel if it's the same member
      if (selectedMember?.id === roleTarget.id) {
        setSelectedMember(prev => ({ ...prev, role: newRole }))
      }
      alert('Role updated successfully!')
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this member?')) return
    try {
      await deleteMember(id)
      setSelectedMember(null)
      alert('Member deleted.')
    } catch (err) {
      alert('Error deleting member: ' + err.message)
    }
  }

  const roleBadge = (r) => {
    if (r === 'chairperson' || r === 'vice_chairperson') return 'bg-red-500/20 text-red-400'
    if (r === 'department_lead') return 'bg-amber-400/20 text-amber-300'
    return 'bg-primary/20 text-primary'
  }

  return (
    <main className="flex-1 px-4 md:px-stack-lg pt-24 pb-section-gap max-w-7xl mx-auto w-full animate-in fade-in duration-200">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="font-headline-xl text-headline-xl text-on-surface">Member Directory</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2">
            Browse and coordinate with club members across departments and tracks.
          </p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setShowAddDialog(true)}
            className="flex items-center gap-2 bg-primary text-on-primary font-bold font-label-caps text-xs uppercase px-4 py-3 rounded-lg hover:brightness-110 active:scale-[0.98] transition-all"
          >
            <span className="material-symbols-outlined">add</span>
            Add Member
          </button>
        )}
      </div>

      {/* Filter Row */}
      <div className="bg-surface-container rounded-xl border border-outline-variant p-4 mb-6 flex flex-wrap gap-4 items-center">
        <div>
          <label className="block text-[10px] font-label-caps text-on-surface-variant uppercase mb-1">Department</label>
          <select 
            value={filters.department}
            onChange={(e) => handleFilterChange('department', e.target.value)}
            className="bg-surface-container-low text-on-surface text-sm p-2 rounded-lg border border-outline-variant focus:outline-none"
          >
            <option value="">All Departments</option>
            <option value="Computer Science">Computer Science</option>
            <option value="Electronics">Electronics</option>
            <option value="Mechanical">Mechanical</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-label-caps text-on-surface-variant uppercase mb-1">Academic Year</label>
          <select 
            value={filters.year}
            onChange={(e) => handleFilterChange('year', e.target.value)}
            className="bg-surface-container-low text-on-surface text-sm p-2 rounded-lg border border-outline-variant focus:outline-none"
          >
            <option value="">All Years</option>
            <option value="1st Year">1st Year</option>
            <option value="2nd Year">2nd Year</option>
            <option value="3rd Year">3rd Year</option>
            <option value="4th Year">4th Year</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-label-caps text-on-surface-variant uppercase mb-1">Role</label>
          <select 
            value={filters.role}
            onChange={(e) => handleFilterChange('role', e.target.value)}
            className="bg-surface-container-low text-on-surface text-sm p-2 rounded-lg border border-outline-variant focus:outline-none"
          >
            <option value="">All Roles</option>
            <option value="chairperson">Chairperson</option>
            <option value="vice_chairperson">Vice Chairperson</option>
            <option value="department_lead">Department Lead</option>
            <option value="member">Member</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Table List Area */}
        <div className={`${selectedMember ? 'lg:col-span-8' : 'lg:col-span-12'} bg-surface-container rounded-xl border border-outline-variant overflow-hidden shadow-sm transition-all duration-200`}>
          {loading ? (
            <div className="p-8 text-center">
              <svg className="animate-spin h-6 w-6 text-primary mx-auto" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"></path>
              </svg>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-container-low text-[10px] font-label-caps uppercase text-on-surface-variant">
                    <th className="p-4">Name</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Department</th>
                    <th className="p-4 text-center">Contributions</th>
                    {isAdmin && <th className="p-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {members.map(member => (
                    <tr 
                      key={member.id} 
                      onClick={() => setSelectedMember(member)}
                      className={`hover:bg-surface-container-high transition-colors cursor-pointer ${selectedMember?.id === member.id ? 'bg-primary-container/10' : ''}`}
                    >
                      <td className="p-4 flex items-center gap-3">
                        <img 
                          alt="" 
                          src={getOptimizedImageUrl(member.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(member.full_name || 'M')}`, { width: 32, height: 32 })} 
                          width="32"
                          height="32"
                          className="w-8 h-8 rounded-full border border-outline-variant object-cover"
                        />
                        <span className="font-semibold text-on-surface">{member.full_name}</span>
                        {/* Display member_tag if present, else fallback to role */}
                        <span className={`text-[10px] font-bold font-label-caps px-2 py-0.5 rounded-full uppercase ${roleBadge(member.role)}`}
                          >
                          {member.member_tag ? member.member_tag : member.role}
                        </span>
                      </td>
                      <td className="p-4 text-on-surface-variant text-sm">{member.email}</td>
                      <td className="p-4 text-on-surface-variant text-sm">{member.department || 'N/A'}</td>
                      <td className="p-4 text-center font-mono-data text-sm font-semibold">{member.contributionsCount}</td>
                      {isAdmin && (
                        <td className="p-4 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                          {role === 'chairperson' && (member.role === 'department_lead' || member.role === 'vice_chairperson') && (
                            <button
                              onClick={(e) => {
                                const newTag = prompt('Enter tag for this member (e.g., Electrical Lead, General Secretary):', member.member_tag || '');
                                if (newTag !== null) {
                                  updateMember(member.id, { member_tag: newTag });
                                  if (selectedMember?.id === member.id) setSelectedMember(prev => ({ ...prev, member_tag: newTag }));
                                }
                              }}
                              title="Edit Tag"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-primary hover:bg-primary-container/20 rounded transition-colors text-xs font-bold font-label-caps uppercase"
                            >
                              <span className="material-symbols-outlined text-sm">edit</span>
                              Tag
                            </button>
                          )}
                          {/* Change Role button — the ONLY edit action. Hidden if you can't outrank this member. */}
                          {canChangeRole(member) && (
                            <button 
                              onClick={(e) => openRoleDialog(member, e)}
                              title="Change Role"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-primary hover:bg-primary-container/20 rounded transition-colors text-xs font-bold font-label-caps uppercase"
                            >
                              <span className="material-symbols-outlined text-sm">manage_accounts</span>
                              Role
                            </button>
                          )}
                          <button 
                            onClick={() => handleDelete(member.id)}
                            className="p-1.5 text-error hover:bg-error/20 rounded transition-colors"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Selected Member Side Panel Drawer */}
        {selectedMember && (
          <div className="lg:col-span-4 bg-surface-container rounded-xl border border-outline-variant p-6 shadow-md animate-in slide-in-from-right duration-200">
            <div className="flex justify-between items-start mb-6">
              <h3 className="font-headline-lg text-headline-lg text-on-surface">Member Details</h3>
              <button 
                onClick={() => setSelectedMember(null)}
                className="p-1 text-on-surface-variant hover:bg-surface-container-high rounded"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="flex flex-col items-center text-center pb-6 border-b border-outline-variant mb-6">
              <img 
                alt="" 
                src={getOptimizedImageUrl(selectedMember.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(selectedMember.full_name || 'M')}`, { width: 80, height: 80 })}
                width="80"
                height="80"
                className="w-20 h-20 rounded-full border border-outline-variant object-cover mb-4"
              />
              <h4 className="font-headline-lg text-lg text-on-surface">{selectedMember.full_name}</h4>
              {/* Show tag if present, otherwise role */}
              <span className={`text-[10px] font-bold font-label-caps px-3 py-1 rounded-full uppercase mt-2 ${roleBadge(selectedMember.role)}`}
                >
                {selectedMember.member_tag ? selectedMember.member_tag : selectedMember.role}
              </span>
              
              <div className="flex gap-4 mt-4">
                {selectedMember.github_url && (
                  <a href={selectedMember.github_url} target="_blank" rel="noreferrer" className="text-on-surface-variant hover:text-primary transition-colors">
                    <span className="material-symbols-outlined">code</span>
                  </a>
                )}
                {selectedMember.linkedin_url && (
                  <a href={selectedMember.linkedin_url} target="_blank" rel="noreferrer" className="text-on-surface-variant hover:text-primary transition-colors">
                    <span className="material-symbols-outlined">account_box</span>
                  </a>
                )}
              </div>
            </div>

            <div className="space-y-4 text-left">
              <div>
                <span className="block text-[10px] font-label-caps text-on-surface-variant uppercase">Academic Details</span>
                <p className="text-sm text-on-surface font-semibold">{selectedMember.department || 'N/A'} • {selectedMember.year || 'N/A'}</p>
              </div>

              {selectedMember.bio && (
                <div>
                  <span className="block text-[10px] font-label-caps text-on-surface-variant uppercase">Bio</span>
                  <p className="text-sm text-on-surface leading-relaxed mt-1">{selectedMember.bio}</p>
                </div>
              )}

              {selectedMember.skills && selectedMember.skills.length > 0 && (
                <div>
                  <span className="block text-[10px] font-label-caps text-on-surface-variant uppercase mb-2">Skills</span>
                  <div className="flex flex-wrap gap-2">
                    {selectedMember.skills.map((skill, index) => (
                      <span key={index} className="text-xs bg-surface-container-high text-on-surface-variant px-2.5 py-1 rounded-full border border-outline-variant font-medium">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Admin: Edit Tag */}
              {role === 'chairperson' && (selectedMember.role === 'department_lead' || selectedMember.role === 'vice_chairperson') && (
                <div className="pt-4 border-t border-outline-variant">
                  <button
                    onClick={(e) => {
                      const newTag = prompt('Enter tag for this member (e.g., Electrical Lead, General Secretary):', selectedMember.member_tag || '');
                      if (newTag !== null) {
                        updateMember(selectedMember.id, { member_tag: newTag });
                        setSelectedMember(prev => ({ ...prev, member_tag: newTag }));
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold font-label-caps uppercase rounded-xl transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">edit</span>
                    Edit Tag
                  </button>
                </div>
              )}
              {/* Admin: Quick Role Change from side panel — only if you outrank this member */}
              {isAdmin && canChangeRole(selectedMember) && (
                <div className="pt-4 border-t border-outline-variant">
                  <button
                    onClick={(e) => openRoleDialog(selectedMember, e)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold font-label-caps uppercase rounded-xl transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">manage_accounts</span>
                    Change Role
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Dialog: Add Member (full form, admin only) ─────────────────── */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-outline-variant rounded-xl max-w-md w-full p-6 shadow-xl overflow-y-auto max-h-[90vh]">
            <h3 className="font-headline-lg text-headline-lg text-on-surface mb-4">Add Member Profile</h3>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-label-caps text-on-surface-variant mb-1 uppercase">Full Name</label>
                <input 
                  type="text" 
                  value={newMemberForm.full_name}
                  onChange={(e) => setNewMemberForm({ ...newMemberForm, full_name: e.target.value })}
                  className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant text-sm focus:ring-primary focus:border-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-label-caps text-on-surface-variant mb-1 uppercase">Email</label>
                <input 
                  type="email" 
                  value={newMemberForm.email}
                  onChange={(e) => setNewMemberForm({ ...newMemberForm, email: e.target.value })}
                  className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant text-sm focus:ring-primary"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-label-caps text-on-surface-variant mb-1 uppercase">Department</label>
                  <input 
                    type="text" 
                    value={newMemberForm.department}
                    onChange={(e) => setNewMemberForm({ ...newMemberForm, department: e.target.value })}
                    className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant text-sm focus:ring-primary"
                    placeholder="e.g. Computer Science"
                  />
                </div>
                <div>
                  <label className="block text-xs font-label-caps text-on-surface-variant mb-1 uppercase">Academic Year</label>
                  <input 
                    type="text" 
                    value={newMemberForm.year}
                    onChange={(e) => setNewMemberForm({ ...newMemberForm, year: e.target.value })}
                    className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant text-sm focus:ring-primary"
                    placeholder="e.g. 2nd Year"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-label-caps text-on-surface-variant mb-1 uppercase">Role</label>
                <select 
                  value={newMemberForm.role}
                  onChange={(e) => setNewMemberForm({ ...newMemberForm, role: e.target.value })}
                  className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant text-sm focus:ring-primary"
                >
                  <option value="member">Member</option>
                  <option value="department_lead">Department Lead</option>
                  <option value="vice_chairperson">Vice Chairperson</option>
                  <option value="chairperson">Chairperson</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-label-caps text-on-surface-variant mb-1 uppercase">Skills (comma separated)</label>
                <input 
                  type="text" 
                  value={newMemberForm.skills}
                  onChange={(e) => setNewMemberForm({ ...newMemberForm, skills: e.target.value })}
                  className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant text-sm focus:ring-primary"
                  placeholder="React, CSS, Python"
                />
              </div>
              <div>
                <label className="block text-xs font-label-caps text-on-surface-variant mb-1 uppercase">Bio</label>
                <textarea 
                  value={newMemberForm.bio}
                  onChange={(e) => setNewMemberForm({ ...newMemberForm, bio: e.target.value })}
                  className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant text-sm h-20 resize-none focus:ring-primary"
                  placeholder="Tell us about yourself..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowAddDialog(false)}
                  className="px-4 py-2 text-on-surface-variant hover:bg-surface-container-high rounded-lg font-label-caps text-xs uppercase"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-primary text-on-primary rounded-lg font-bold font-label-caps text-xs uppercase hover:brightness-110"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Dialog: Change Role (admin only — role field ONLY) ─────────── */}
      {showRoleDialog && roleTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-outline-variant rounded-xl max-w-sm w-full p-6 shadow-xl animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-primary">manage_accounts</span>
              </div>
              <div>
                <h3 className="font-bold text-on-surface">Change Role</h3>
                <p className="text-xs text-on-surface-variant">Only the role can be changed here</p>
              </div>
            </div>

            {/* Member read-only info */}
            <div className="flex items-center gap-3 p-3 bg-surface-container-low border border-outline-variant rounded-xl mb-5">
              <img
                src={roleTarget.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(roleTarget.full_name || 'M')}`}
                alt=""
                className="w-10 h-10 rounded-full border border-outline-variant object-cover"
              />
              <div>
                <p className="text-sm font-semibold text-on-surface">{roleTarget.full_name}</p>
                <p className="text-xs text-on-surface-variant">{roleTarget.email}</p>
              </div>
            </div>

            <form onSubmit={handleRoleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-label-caps text-on-surface-variant mb-2 uppercase">
                  New Role
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {assignableRoles.map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setNewRole(r)}
                      className={`py-2.5 rounded-xl text-xs font-bold font-label-caps uppercase border transition-all ${
                        newRole === r
                          ? (r === 'chairperson' || r === 'vice_chairperson')
                            ? 'bg-red-500/20 border-red-500/50 text-red-400'
                            : r === 'department_lead'
                            ? 'bg-amber-400/20 border-amber-400/50 text-amber-300'
                            : 'bg-primary/20 border-primary/50 text-primary'
                          : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-high'
                      }`}
                    >
                      {r === 'department_lead' ? 'Lead' : r === 'vice_chairperson' ? 'VC' : r}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => { setShowRoleDialog(false); setRoleTarget(null) }}
                  className="flex-1 py-2.5 border border-outline-variant text-on-surface-variant hover:bg-surface-container-high rounded-xl font-label-caps text-xs uppercase transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2.5 bg-primary text-on-primary rounded-xl font-bold font-label-caps text-xs uppercase hover:brightness-110 transition-all"
                >
                  Update Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}