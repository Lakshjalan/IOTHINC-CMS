import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../hooks/useAuth'

export const CompetitionHost = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState('hackathon')
  const [format, setFormat] = useState('solo')
  const [regDeadline, setRegDeadline] = useState('')
  const [startDate, setStartDate] = useState('')
  const [prizePool, setPrizePool] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    document.title = "Host Competition | IOTHINC"
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim() || !user) return
    setLoading(true)

    try {
      const { error } = await supabase
        .from('competitions')
        .insert({
          title,
          description,
          type,
          format,
          registration_deadline: new Date(regDeadline).toISOString(),
          start_date: new Date(startDate).toISOString(),
          prize_pool: prizePool,
          status: 'active',
          hosted_by: user.id
        })

      if (error) throw error
      alert('Competition published successfully!')
      navigate('/competitions')
    } catch (err) {
      alert('Error hosting competition: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex-1 px-4 md:px-stack-lg pt-24 pb-section-gap max-w-xl mx-auto w-full animate-in fade-in duration-200">
      
      {/* Back Button */}
      <button 
        onClick={() => navigate('/competitions')}
        className="flex items-center gap-1.5 text-on-surface-variant hover:text-primary mb-6 text-sm font-label-caps font-bold uppercase transition-colors"
      >
        <span className="material-symbols-outlined text-lg">arrow_back</span>
        Back to competitions
      </button>

      {/* Form Card */}
      <div className="bg-surface-container rounded-xl border border-outline-variant p-6 md:p-8 shadow-sm">
        <h2 className="font-headline-lg text-headline-lg text-on-surface mb-2">Host New Competition</h2>
        <p className="text-xs text-on-surface-variant mb-6 leading-relaxed">
          Fill out the parameters below to publish a new competitive event.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div>
            <label className="block text-xs font-label-caps text-on-surface-variant mb-1 uppercase">Competition Title</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant text-sm focus:ring-primary focus:border-primary"
              placeholder="e.g. IoT Hackathon 2026"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-label-caps text-on-surface-variant mb-1 uppercase">Description</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant text-sm h-28 resize-none focus:ring-primary"
              placeholder="Detail rules, prompts, and requirements..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Type */}
            <div>
              <label className="block text-xs font-label-caps text-on-surface-variant mb-1 uppercase">Type</label>
              <select 
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant text-sm focus:ring-primary"
              >
                <option value="hackathon">Hackathon</option>
                <option value="coding_contest">Coding Contest</option>
                <option value="design_jam">Design Jam</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Format */}
            <div>
              <label className="block text-xs font-label-caps text-on-surface-variant mb-1 uppercase">Format</label>
              <select 
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant text-sm focus:ring-primary"
              >
                <option value="solo">Solo Only</option>
                <option value="team">Team Only</option>
                <option value="both">Both</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Start Date */}
            <div>
              <label className="block text-xs font-label-caps text-on-surface-variant mb-1 uppercase">Start Date</label>
              <input 
                type="datetime-local" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant text-sm focus:ring-primary"
                required
              />
            </div>

            {/* Registration Deadline */}
            <div>
              <label className="block text-xs font-label-caps text-on-surface-variant mb-1 uppercase">Reg Deadline</label>
              <input 
                type="datetime-local" 
                value={regDeadline}
                onChange={(e) => setRegDeadline(e.target.value)}
                className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant text-sm focus:ring-primary"
                required
              />
            </div>
          </div>

          {/* Prize Pool */}
          <div>
            <label className="block text-xs font-label-caps text-on-surface-variant mb-1 uppercase">Prize Pool Description</label>
            <input 
              type="text" 
              value={prizePool}
              onChange={(e) => setPrizePool(e.target.value)}
              className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant text-sm focus:ring-primary"
              placeholder="e.g. $1,000 cash prizes + certificates"
            />
          </div>

          {/* Submit */}
          <div className="pt-4">
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-on-primary font-bold font-label-caps text-xs uppercase py-3.5 rounded-lg hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? 'Publishing...' : 'Publish Competition'}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
