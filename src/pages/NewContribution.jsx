import React, { useState, useEffect } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useContributions } from '../hooks/useContributions'
import { supabase } from '../supabaseClient'

const NewContribution = () => {
  const { user, role } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { addContribution } = useContributions()

  const [projects, setProjects] = useState([])
  const [events, setEvents] = useState([])
  const [form, setForm] = useState({
    title: '',
    description: '',
    visibility: 'public',
    project_id: searchParams.get('project_id') || '',
    event_id: searchParams.get('event_id') || '',
    type: 'project',
    tags: ''
  })
  const [file, setFile] = useState(null)
  const [filePreview, setFilePreview] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { document.title = "New Contribution | IOTHINC" }, [])

  useEffect(() => {
    supabase.from('projects').select('id,title').then(r => setProjects(r.data || []))
    supabase.from('events').select('id,title').then(r => setEvents(r.data || []))
  }, [])

  const handleFileChange = (e) => {
    const f = e.target.files[0]
    if (f) {
      setFile(f)
      const reader = new FileReader()
      reader.onloadend = () => setFilePreview(reader.result)
      reader.readAsDataURL(f)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const contributionData = {
        title: form.title,
        description: form.description || null,
        visibility: form.visibility,
        project_id: form.project_id || null,
        event_id: form.event_id || null,
        type: form.type,
        tags: form.tags ? form.tags.split(',').map(c => c.trim()).filter(Boolean) : []
      }
      await addContribution(contributionData, file)
      alert('Contribution added successfully!')
      const isAdmin = role && ['chairperson', 'vice_chairperson'].includes(role)
      navigate(isAdmin ? '/progress/admin' : '/progress')
    } catch (err) {
      alert('Error: ' + err.message)
    }
    setSubmitting(false)
  }

  return (
    <main className="flex-1 px-4 md:px-stack-lg pt-24 pb-section-gap max-w-7xl mx-auto w-full">
      <Link to="/contributions" className="inline-flex items-center gap-1.5 text-primary text-sm hover:underline mb-6">
        <span className="material-symbols-outlined text-lg">arrow_back</span>Back to Contributions
      </Link>

      <div className="grid lg:grid-cols-5 gap-8">
        {/* Form */}
        <div className="lg:col-span-3">
          <h2 className="font-headline-xl text-headline-xl text-on-surface mb-2">New Contribution</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mb-8">Share your project work, achievements, and progress.</p>

          <form onSubmit={handleSubmit} className="bg-surface-container rounded-xl border border-outline-variant p-6 shadow-sm space-y-5">
            <div>
              <label className="block text-xs font-label-caps text-on-surface-variant mb-1.5 uppercase">Title</label>
              <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant text-sm focus:ring-primary" placeholder="Give your contribution a title" required/>
            </div>

            <div>
              <label className="block text-xs font-label-caps text-on-surface-variant mb-1.5 uppercase">Description</label>
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant text-sm h-32 resize-none focus:ring-primary" placeholder="Describe what you contributed, challenges faced, results achieved..."/>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-label-caps text-on-surface-variant mb-1.5 uppercase">Linked Project</label>
                <select value={form.project_id} onChange={e => setForm({...form, project_id: e.target.value})} className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant text-sm">
                  <option value="">None</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-label-caps text-on-surface-variant mb-1.5 uppercase">Linked Event</label>
                <select value={form.event_id} onChange={e => setForm({...form, event_id: e.target.value})} className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant text-sm">
                  <option value="">None</option>
                  {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-label-caps text-on-surface-variant mb-1.5 uppercase">Type</label>
                <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant text-sm">
                  <option value="project">Project</option>
                  <option value="research">Research</option>
                  <option value="event">Event</option>
                  <option value="competition">Competition</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-label-caps text-on-surface-variant mb-1.5 uppercase">Tags (comma separated)</label>
                <input type="text" value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant text-sm focus:ring-primary" placeholder="e.g. hardware, IoT, research"/>
              </div>
            </div>

            <div>
              <label className="block text-xs font-label-caps text-on-surface-variant mb-1.5 uppercase">Visibility</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="visibility" value="public" checked={form.visibility === 'public'} onChange={e => setForm({...form, visibility: e.target.value})} className="text-primary focus:ring-primary"/>
                  <span className="text-sm text-on-surface">Public</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="visibility" value="private" checked={form.visibility === 'private'} onChange={e => setForm({...form, visibility: e.target.value})} className="text-primary focus:ring-primary"/>
                  <span className="text-sm text-on-surface">Private</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-label-caps text-on-surface-variant mb-1.5 uppercase">Photo</label>
              <div className="relative">
                <input type="file" accept="image/*" onChange={handleFileChange} className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant text-sm file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:bg-primary/20 file:text-primary file:text-xs file:font-bold file:font-label-caps file:uppercase file:cursor-pointer"/>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Link to="/contributions" className="px-4 py-2.5 text-on-surface-variant hover:bg-surface-container-high rounded-lg font-label-caps text-xs uppercase">Cancel</Link>
              <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-primary text-on-primary rounded-lg font-bold font-label-caps text-xs uppercase hover:brightness-110 disabled:opacity-50 transition-all">
                {submitting ? 'Submitting...' : 'Submit Contribution'}
              </button>
            </div>
          </form>
        </div>

        {/* Live Preview */}
        <div className="lg:col-span-2">
          <h3 className="font-headline-lg text-headline-lg text-on-surface mb-4">Live Preview</h3>
          <div className="bg-surface-container rounded-xl border border-outline-variant shadow-sm overflow-hidden sticky top-28">
            {(filePreview || form.title) ? (
              <>
                {filePreview && <img src={filePreview} alt="Preview" className="w-full h-40 object-cover"/>}
                <div className="p-5">
                  <h4 className="font-bold text-on-surface mb-2">{form.title || 'Untitled Contribution'}</h4>
                  <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-4 mb-3">{form.description || 'No description yet...'}</p>
                  <div className="flex flex-wrap gap-1.5 text-[10px] font-label-caps uppercase">
                    {form.visibility === 'private' && <span className="bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded">Private</span>}
                    <span className="bg-secondary/10 text-secondary px-2 py-0.5 rounded">{form.type}</span>
                    {form.tags && form.tags.split(',').filter(Boolean).map((cat, i) => (
                      <span key={i} className="bg-primary/10 text-primary px-2 py-0.5 rounded">{cat.trim()}</span>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-on-surface-variant italic text-sm">
                <span className="material-symbols-outlined text-3xl text-outline mb-2 block">preview</span>
                Start typing to see your contribution preview
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}


export default NewContribution;
