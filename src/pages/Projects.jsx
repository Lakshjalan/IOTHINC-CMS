import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useProjects } from '../hooks/useProjects'
import { useAuth } from '../hooks/useAuth'
import { GridSkeleton } from '../components/SkeletonLoaders'

const EMPTY_FORM = { title: '', description: '', category: 'Software Development', status: 'planned', milestone: '', deadline: '' }

export const Projects = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { role } = useAuth()
  const isAdmin = (role === 'chairperson' || role === 'vice_chairperson')
  
  const [filters, setFilters] = useState({
    status: '',
    category: ''
  })
  
  const { projects, loading, updateProject, deleteProject, createProject } = useProjects(filters)
  const [viewMode, setViewMode] = useState('board') // 'board' or 'list'

  // New Project Modal state
  const [showNewModal, setShowNewModal] = useState(false)
  const [newForm, setNewForm] = useState(EMPTY_FORM)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState(null)

  // Auto-open new project modal if URL has ?new=true
  useEffect(() => {
    if (searchParams.get('new') === 'true' && isAdmin) {
      setShowNewModal(true)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, isAdmin])

  useEffect(() => {
    document.title = "Projects | IOTHINC"
  }, [])

  // Kanban status columns
  const statuses = [
    { key: 'planned', label: 'Planned', border: 'border-t-4 border-t-amber-400' },
    { key: 'active', label: 'Active', border: 'border-t-4 border-t-primary' },
    { key: 'completed', label: 'Completed', border: 'border-t-4 border-t-success' },
    { key: 'blocked', label: 'Blocked', border: 'border-t-4 border-t-red-500' }
  ]

  const getProjectsByStatus = (status) => {
    return projects.filter(p => p.status === status)
  }

  const handleStatusChange = async (id, newStatus) => {
    try {
      await updateProject(id, { status: newStatus })
    } catch (err) {
      alert('Error updating status: ' + err.message)
    }
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const handleDeleteProject = async (id, title) => {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return
    try { await deleteProject(id) } catch (err) { alert('Error: ' + err.message) }
  }

  const handleCreateProject = async (e) => {
    e.preventDefault()
    setCreating(true)
    setCreateError(null)
    try {
      await createProject({ ...newForm, progress: 0 })
      setShowNewModal(false)
      setNewForm(EMPTY_FORM)
    } catch (err) {
      setCreateError(err.message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <main className="flex-1 px-4 md:px-stack-lg pt-24 pb-section-gap max-w-7xl mx-auto w-full animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="font-headline-xl text-headline-xl text-on-surface">Projects</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2">
            Manage projects, monitor progress, and log your contribution updates.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Add New Project (admin only) */}
          {isAdmin && (
            <button
              id="new-project-btn"
              onClick={() => { setNewForm(EMPTY_FORM); setCreateError(null); setShowNewModal(true) }}
              className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2 rounded-xl font-semibold text-sm hover:opacity-90 active:scale-95 transition-all shadow-sm"
            >
              <span className="material-symbols-outlined text-base">add</span>
              New Project
            </button>
          )}

          {/* Layout toggle */}
          <div className="flex gap-1 bg-surface-container p-1 rounded-lg border border-outline-variant">
            <button 
              onClick={() => setViewMode('board')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'board' ? 'bg-primary text-on-primary font-bold' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
            >
              <span className="material-symbols-outlined text-base">dashboard</span>
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-primary text-on-primary font-bold' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
            >
              <span className="material-symbols-outlined text-base">format_list_bulleted</span>
            </button>
          </div>
        </div>
      </div>

      {/* New Project Modal */}
      {showNewModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowNewModal(false)}
        >
          <div
            className="bg-surface rounded-2xl border border-outline-variant shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-outline-variant">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary-container/20 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-lg">add_circle</span>
                </div>
                <div>
                  <h2 className="font-headline-md text-headline-md text-on-surface">New Project</h2>
                  <p className="text-xs text-on-surface-variant mt-0.5">Fill in the details to create a new project</p>
                </div>
              </div>
              <button
                onClick={() => setShowNewModal(false)}
                className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateProject} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-label-caps uppercase text-on-surface-variant mb-1.5">Project Title *</label>
                <input
                  required
                  value={newForm.title}
                  onChange={e => setNewForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Smart Home Dashboard"
                  className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-4 py-2.5 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                />
              </div>

              <div>
                <label className="block text-xs font-label-caps uppercase text-on-surface-variant mb-1.5">Description</label>
                <textarea
                  rows={3}
                  value={newForm.description}
                  onChange={e => setNewForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Brief description of the project..."
                  className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-4 py-2.5 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-label-caps uppercase text-on-surface-variant mb-1.5">Category</label>
                  <select
                    value={newForm.category}
                    onChange={e => setNewForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  >
                    <option value="Software Development">Software Development</option>
                    <option value="Robotics/IoT">Robotics / IoT</option>
                    <option value="UI/UX Design">UI/UX Design</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-label-caps uppercase text-on-surface-variant mb-1.5">Initial Status</label>
                  <select
                    value={newForm.status}
                    onChange={e => setNewForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  >
                    <option value="planned">Planned</option>
                    <option value="active">Active</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-label-caps uppercase text-on-surface-variant mb-1.5">Milestone</label>
                  <input
                    value={newForm.milestone}
                    onChange={e => setNewForm(f => ({ ...f, milestone: e.target.value }))}
                    placeholder="e.g. MVP Launch"
                    className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-4 py-2.5 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-label-caps uppercase text-on-surface-variant mb-1.5">Deadline</label>
                  <input
                    type="date"
                    value={newForm.deadline}
                    onChange={e => setNewForm(f => ({ ...f, deadline: e.target.value }))}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-label-caps uppercase text-on-surface-variant mb-1.5">GitHub Link</label>
                <input
                  type="url"
                  value={newForm.github_link}
                  onChange={e => setNewForm(f => ({ ...f, github_link: e.target.value }))}
                  placeholder="https://github.com/org/repo"
                  className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-4 py-2.5 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                />
              </div>

              {createError && (
                <p className="text-sm text-error bg-error-container/20 border border-error/30 rounded-lg px-3 py-2">{createError}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-outline-variant text-on-surface-variant text-sm font-semibold hover:bg-surface-container-high transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-semibold hover:opacity-90 active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"/></svg>
                      Creating...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base">add</span>
                      Create Project
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filter Row */}
      <div className="bg-surface-container rounded-xl border border-outline-variant p-4 mb-6 flex flex-wrap gap-4 items-center">
        <div>
          <label className="block text-[10px] font-label-caps text-on-surface-variant uppercase mb-1">Status</label>
          <select 
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="bg-surface-container-low text-on-surface text-sm p-2 rounded-lg border border-outline-variant focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="planned">Planned</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-label-caps text-on-surface-variant uppercase mb-1">Category</label>
          <select 
            value={filters.category}
            onChange={(e) => handleFilterChange('category', e.target.value)}
            className="bg-surface-container-low text-on-surface text-sm p-2 rounded-lg border border-outline-variant focus:outline-none"
          >
            <option value="">All Categories</option>
            <option value="Software Development">Software Development</option>
            <option value="Robotics/IoT">Robotics/IoT</option>
            <option value="UI/UX Design">UI/UX Design</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {loading ? (
        <GridSkeleton items={6} variant="project" className="grid-cols-1 md:grid-cols-2 lg:grid-cols-3" />
      ) : viewMode === 'board' ? (
        /* Board Kanban View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statuses.map(col => {
            const list = getProjectsByStatus(col.key)
            return (
              <div key={col.key} className="bg-surface-container rounded-xl border border-outline-variant flex flex-col p-4 min-h-[400px]">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-on-surface text-sm font-label-caps uppercase">{col.label}</h3>
                  <span className="bg-surface-container-high px-2.5 py-0.5 rounded-full text-xs font-bold text-on-surface-variant font-mono-data">
                    {list.length}
                  </span>
                </div>
                <div className="flex-1 space-y-4">
                  {list.map(proj => (
                    <div key={proj.id} className={`bg-surface-container-low border border-outline-variant p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow relative ${col.border}`}>
                      <Link to={`/projects/${proj.id}`} className="font-semibold text-on-surface hover:text-primary transition-colors text-sm block mb-1">
                        {proj.title}
                      </Link>
                      <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed mb-4">{proj.description}</p>
                      
                      {/* Progress bar */}
                      <div className="mb-4">
                        <div className="flex justify-between items-center text-[10px] font-label-caps text-outline uppercase mb-1">
                          <span>Progress</span>
                          <span>{proj.progress}%</span>
                        </div>
                        <div className="w-full bg-surface-container-highest rounded-full h-1.5">
                          <div className="bg-primary h-1.5 rounded-full" style={{ width: `${proj.progress}%` }} />
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="flex justify-between items-center pt-3 border-t border-outline-variant/30 text-xs">
                        <span className="text-[10px] font-bold text-primary font-label-caps uppercase bg-primary-container/10 px-2 py-0.5 rounded">
                          {proj.category || 'Other'}
                        </span>
                        <div className="flex items-center gap-2">
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteProject(proj.id, proj.title)}
                              className="p-1 text-on-surface-variant/40 hover:text-error hover:bg-error/10 rounded-lg transition-colors"
                              title="Delete project"
                            >
                              <span className="material-symbols-outlined text-xs">delete</span>
                            </button>
                          )}
                          <button 
                            onClick={() => navigate(`/contributions/new?project_id=${proj.id}`)}
                            className="flex items-center gap-1 text-primary hover:text-primary-muted font-bold font-label-caps text-[10px] uppercase focus:outline-none"
                          >
                            <span className="material-symbols-outlined text-xs">post_add</span>
                            Log Contribution
                          </button>
                        </div>
                      </div>

                      {/* Dropdown status update */}
                      <div className="absolute top-2 right-2">
                        <select 
                          value={proj.status} 
                          onChange={(e) => handleStatusChange(proj.id, e.target.value)}
                          className="bg-transparent border-none text-outline hover:text-white p-0 text-[10px] font-label-caps uppercase focus:ring-0 cursor-pointer"
                        >
                          <option value="planned" className="bg-surface text-on-surface">Planned</option>
                          <option value="active" className="bg-surface text-on-surface">Active</option>
                          <option value="completed" className="bg-surface text-on-surface">Completed</option>
                          <option value="blocked" className="bg-surface text-on-surface">Blocked</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* List View Table */
        <div className="bg-surface-container rounded-xl border border-outline-variant overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-low text-[10px] font-label-caps uppercase text-on-surface-variant">
                  <th className="p-4">Project</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Progress</th>
                  <th className="p-4">Milestone</th>
                  <th className="p-4">Deadline</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Log</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {projects.map(proj => (
                  <tr key={proj.id} className="hover:bg-surface-container-high transition-colors">
                    <td className="p-4">
                      <Link to={`/projects/${proj.id}`} className="font-semibold text-on-surface hover:text-primary transition-colors">
                        {proj.title}
                      </Link>
                      <span className="block text-xs text-on-surface-variant mt-0.5 line-clamp-1 max-w-sm">{proj.description}</span>
                    </td>
                    <td className="p-4 text-sm text-on-surface-variant">{proj.category || 'N/A'}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-surface-container-highest rounded-full h-1.5">
                          <div className="bg-primary h-1.5 rounded-full" style={{ width: `${proj.progress}%` }} />
                        </div>
                        <span className="font-mono-data text-xs font-semibold">{proj.progress}%</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-on-surface">{proj.milestone || 'N/A'}</td>
                    <td className="p-4 text-sm text-on-surface-variant">{proj.deadline || 'N/A'}</td>
                    <td className="p-4 text-xs font-label-caps uppercase">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${proj.status === 'completed' ? 'bg-success/20 text-success' : proj.status === 'active' ? 'bg-primary/20 text-primary' : proj.status === 'blocked' ? 'bg-red-500/20 text-red-400' : 'bg-surface-variant text-on-surface-variant'}`}>
                        {proj.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteProject(proj.id, proj.title)}
                            className="p-1 text-on-surface-variant/40 hover:text-error hover:bg-error/10 rounded-lg transition-colors"
                            title="Delete project"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        )}
                        <button 
                          onClick={() => navigate(`/contributions/new?project_id=${proj.id}`)}
                          className="text-primary hover:underline font-bold font-label-caps text-xs uppercase"
                        >
                          Log
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  )
}
