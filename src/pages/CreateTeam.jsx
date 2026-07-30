import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTeams } from '../hooks/useTeams'
import { supabase } from '../supabaseClient'

export const CreateTeam = () => {
  const navigate = useNavigate()
  const { createTeam } = useTeams()
  
  const [name, setName] = useState('')
  const [department, setDepartment] = useState('')
  const [leadId, setLeadId] = useState('')
  const [selectedMembers, setSelectedMembers] = useState([])
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    document.title = "Create New Team | IOTHINC"

    // Fetch profiles for selection
    const fetchProfiles = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name')
      
      if (!error) {
        setProfiles(data || [])
      }
    }
    fetchProfiles()
  }, [])

  const handleMemberToggle = (id) => {
    setSelectedMembers(prev => 
      prev.includes(id) ? prev.filter(mId => mId !== id) : [...prev, id]
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)

    try {
      await createTeam(name, department, leadId, selectedMembers)
      alert('Team created successfully!')
      navigate('/teams')
    } catch (err) {
      alert('Error creating team: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex-1 px-4 md:px-stack-lg pt-24 pb-section-gap max-w-xl mx-auto w-full animate-in fade-in duration-200">
      
      {/* Back Button */}
      <button 
        onClick={() => navigate('/teams')}
        className="flex items-center gap-1.5 text-on-surface-variant hover:text-primary mb-6 text-sm font-label-caps font-bold uppercase transition-colors"
      >
        <span className="material-symbols-outlined text-lg">arrow_back</span>
        Back to teams
      </button>

      {/* Form Card */}
      <div className="bg-surface-container rounded-xl border border-outline-variant p-6 md:p-8 shadow-sm">
        <h2 className="font-headline-lg text-headline-lg text-on-surface mb-2">Create Subdivision Team</h2>
        <p className="text-xs text-on-surface-variant mb-6 leading-relaxed">
          Initialize a new team structure, designate a leader, and select initial members.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <label className="block text-xs font-label-caps text-on-surface-variant mb-1 uppercase">Team Name</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant text-sm focus:ring-primary focus:border-primary"
              placeholder="e.g. Robotics & IoT Sub-Core"
              required
            />
          </div>

          {/* Department */}
          <div>
            <label className="block text-xs font-label-caps text-on-surface-variant mb-1 uppercase">Department / Track</label>
            <input 
              type="text" 
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant text-sm focus:ring-primary"
              placeholder="e.g. Hardware Engineering"
            />
          </div>

          {/* Lead Selector */}
          <div>
            <label className="block text-xs font-label-caps text-on-surface-variant mb-1 uppercase">Designated Lead</label>
            <select 
              value={leadId}
              onChange={(e) => setLeadId(e.target.value)}
              className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant text-sm focus:ring-primary"
              required
            >
              <option value="">Select Team Lead...</option>
              {profiles.map(p => (
                <option key={p.id} value={p.id}>{p.full_name} ({p.email})</option>
              ))}
            </select>
          </div>

          {/* Members Checklist */}
          <div>
            <label className="block text-xs font-label-caps text-on-surface-variant mb-2 uppercase">Select Team Members</label>
            <div className="bg-surface-container-low border border-outline-variant rounded-lg p-3 max-h-44 overflow-y-auto no-scrollbar space-y-2">
              {profiles.length === 0 ? (
                <p className="text-xs text-on-surface-variant italic text-center py-4">No members available.</p>
              ) : (
                profiles.map(p => (
                  <label key={p.id} className="flex items-center gap-3 cursor-pointer p-1.5 hover:bg-surface-container rounded-md transition-colors">
                    <input 
                      type="checkbox"
                      checked={selectedMembers.includes(p.id)}
                      onChange={() => handleMemberToggle(p.id)}
                      className="rounded border-outline-variant bg-surface text-primary focus:ring-primary w-4 h-4 focus:ring-offset-0"
                    />
                    <span className="text-sm text-on-surface">{p.full_name}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-4">
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-on-primary font-bold font-label-caps text-xs uppercase py-3.5 rounded-lg hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Assemble Team'}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
