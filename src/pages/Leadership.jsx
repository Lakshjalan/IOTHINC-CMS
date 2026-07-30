import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabaseClient'

export const Leadership = () => {
  const [leaders, setLeaders] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchLeaders = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['chairperson', 'vice_chairperson', 'department_lead'])
        .order('role', { ascending: true })
      
      if (error) throw error
      
      const roleOrder = {
        'chairperson': 1,
        'vice_chairperson': 2,
        'department_lead': 3
      }
      
      const sorted = (data || []).sort((a, b) => {
        return (roleOrder[a.role] || 99) - (roleOrder[b.role] || 99)
      })

      setLeaders(sorted)
    } catch (error) {
      console.error('Error fetching leadership:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    document.title = "Leadership | IOTHINC"
    fetchLeaders()
  }, [fetchLeaders])

  const roleBadge = (r) => {
    if (r === 'chairperson' || r === 'vice_chairperson') return 'bg-red-500/20 text-red-400'
    if (r === 'department_lead') return 'bg-amber-400/20 text-amber-300'
    return 'bg-primary/20 text-primary'
  }

  const formatRole = (r) => {
    return r.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  }

  return (
    <main className="flex-1 px-4 md:px-stack-lg pt-24 pb-section-gap max-w-7xl mx-auto w-full animate-in fade-in duration-200">
      <div className="mb-8 text-center max-w-3xl mx-auto">
        <h2 className="font-headline-xl text-headline-xl text-on-surface">Club Leadership</h2>
        <p className="font-body-md text-body-md text-on-surface-variant mt-3">
          Meet the core team guiding the IOTHINC community, fostering innovation, and managing day-to-day operations.
        </p>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center min-h-[50vh]">
          <svg className="animate-spin h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"></path>
          </svg>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {leaders.map(leader => (
            <div key={leader.id} className="bg-surface-container rounded-xl border border-outline-variant p-6 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow">
              <img 
                src={leader.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(leader.full_name || 'L')}`}
                alt={leader.full_name}
                className="w-24 h-24 rounded-full border border-outline-variant object-cover mb-4 shadow-sm"
              />
              <h3 className="font-headline-lg text-lg text-on-surface font-bold">{leader.full_name}</h3>
              <span className={`mt-2 text-xs font-bold font-label-caps px-3 py-1 rounded-full uppercase ${roleBadge(leader.role)}`}>
                {formatRole(leader.role)}
              </span>
              {leader.department && (
                <span className="mt-3 text-sm text-on-surface-variant font-medium">
                  {leader.department}
                </span>
              )}
              {leader.bio && (
                <p className="mt-4 text-sm text-on-surface-variant line-clamp-3">
                  {leader.bio}
                </p>
              )}
              <div className="mt-6 pt-4 border-t border-outline-variant w-full flex justify-center gap-4">
                {leader.github_url ? (
                  <a href={leader.github_url} target="_blank" rel="noreferrer" className="text-on-surface-variant hover:text-primary transition-colors">
                    <span className="material-symbols-outlined">code</span>
                  </a>
                ) : (
                  <span className="text-on-surface-variant opacity-30 cursor-not-allowed">
                    <span className="material-symbols-outlined">code</span>
                  </span>
                )}
                {leader.linkedin_url ? (
                  <a href={leader.linkedin_url} target="_blank" rel="noreferrer" className="text-on-surface-variant hover:text-primary transition-colors">
                    <span className="material-symbols-outlined">account_box</span>
                  </a>
                ) : (
                  <span className="text-on-surface-variant opacity-30 cursor-not-allowed">
                    <span className="material-symbols-outlined">account_box</span>
                  </span>
                )}
                <a href={`mailto:${leader.email}`} className="text-on-surface-variant hover:text-primary transition-colors">
                  <span className="material-symbols-outlined">mail</span>
                </a>
              </div>
            </div>
          ))}
          {leaders.length === 0 && (
            <div className="col-span-full text-center p-12 text-on-surface-variant italic">
              No leadership members found.
            </div>
          )}
        </div>
      )}
    </main>
  )
}
