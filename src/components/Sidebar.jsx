import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { logError } from '../utils/logger'
import { supabase } from '../supabaseClient'
import { motion } from 'motion/react'
import { IothincLogo } from '../assets/IothincLogo'

const navItemVariants = {
  hidden: { opacity: 0, x: -16 },
  visible: (i) => ({
    opacity: 1, x: 0,
    transition: { delay: 0.1 + i * 0.04, duration: 0.35, ease: [0.16, 1, 0.3, 1] }
  })
}

export const Sidebar = ({ collapsed, setCollapsed, mobileMenuOpen, setMobileMenuOpen }) => {
  const location = useLocation()
  const { role } = useAuth()
  const EMPTY_FORM = { title: '', description: '', category: 'Software Development', status: 'planned', milestone: '', deadline: '', github_link: '' }
  const [showAddProject, setShowAddProject] = useState(false)
  const [newForm, setNewForm] = useState(EMPTY_FORM)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState(null)

  const currentPath = location.pathname

  const showNewProjectBtn = [
    '/projects',
    '/tasks'
  ].some(path => currentPath.startsWith(path))

  const reportsPath = (['chairperson', 'vice_chairperson', 'department_lead', 'electrical_lead', 'software_lead', 'general_secretary'].includes(role)) ? '/progress/admin' : '/progress'

  const handleCreateProject = async (e) => {
    e.preventDefault()
    if (!newForm.title.trim()) return
    setCreating(true)
    setCreateError(null)

    try {
      const { error } = await supabase
        .from('projects')
        .insert({
          title: newForm.title.trim(),
          description: newForm.description.trim() || null,
          category: newForm.category,
          status: newForm.status,
          milestone: newForm.milestone.trim() || null,
          deadline: newForm.deadline || null,
          github_link: newForm.github_link.trim() || null,
          progress: 0
        })

      if (error) throw error
      setNewForm(EMPTY_FORM)
      setShowAddProject(false)
      alert('Project created successfully!')
      window.location.reload()
    } catch (err) {
      logError(err)
      setCreateError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
    { name: 'Members', path: '/members', icon: 'group' },
    { name: 'Projects', path: '/projects', icon: 'rocket_launch' },
    { name: 'Departments', path: '/teams', icon: 'corporate_fare' },
    { name: 'Competitions', path: '/competitions', icon: 'emoji_events' },
    { name: 'Events', path: '/events', icon: 'event_available' },
    { name: 'Tasks', path: '/tasks', icon: 'assignment' },
    { name: 'Chat', path: '/chat', icon: 'chat' },
    { name: 'Meetings', path: '/meetings', icon: 'calendar_month' },
    { name: 'Scheduler', path: '/scheduler', icon: 'edit_calendar' },
    { name: 'Learn', path: '/learn', icon: 'school' },
    { name: 'Reports', path: reportsPath, icon: 'assessment' },
    {
      name: 'Storage Monitor',
      path: '/storage',
      icon: 'storage',
      isChairOnly: true
    },
    {
      name: 'Admin Panel',
      path: '/admin',
      icon: 'admin_panel_settings',
      isAdminOnly: true
    }
  ]

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      
      <nav
        className={`flex flex-col bg-surface fixed left-0 top-0 h-screen border-r border-outline-variant py-stack-lg z-50 transition-transform md:transition-all duration-300 md:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } ${collapsed ? 'w-[64px]' : 'w-sidebar-width'}`}
      >
        {/* Brand & collapse toggle */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className={`px-2 pt-2 mb-6 flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
            {!collapsed && (
              <div className="flex-1 flex justify-center items-center -ml-2">
                <IothincLogo
                  alt="IOTHINC Logo"
                  className="block w-[155px] h-auto text-on-surface"
                />
              </div>
            )}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-2 rounded-full hover:bg-surface-container-high text-on-surface-variant transition-colors duration-150"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <span className="material-symbols-outlined text-[20px]">
                {collapsed ? 'chevron_right' : 'chevron_left'}
              </span>
            </button>
          </div>
        </motion.div>

        {!collapsed && <div className="mx-4 mb-4 h-px w-auto bg-outline-variant" />}

        {/* Navigation items */}
        <div className="flex-1 overflow-y-auto px-2 space-y-1 no-scrollbar">
          {navItems.filter(item => {
            if (item.isAdminOnly && role === 'member') return false
            if (item.isChairOnly && !['chairperson', 'vice_chairperson'].includes(role)) return false
            return true
          }).map((item, index) => {
            const isRoleAdmin = (role === 'chairperson' || role === 'vice_chairperson' || role === 'department_lead' || role === 'electrical_lead' || role === 'software_lead' || role === 'general_secretary')
            const isLocked = item.isAdminOnly && !isRoleAdmin
            const isActive = currentPath === item.path

            return (
              <motion.div
                key={item.name}
                custom={index}
                variants={navItemVariants}
                initial="hidden"
                animate="visible"
              >
                <Link
                  to={isLocked ? '#' : item.path}
                  onClick={(e) => {
                    if (isLocked) {
                      e.preventDefault()
                      alert('Access denied: Admin Panel is restricted to top positions (Chairperson, Vice Chairperson, Department Lead).')
                    } else if (setMobileMenuOpen) {
                      setMobileMenuOpen(false)
                    }
                  }}
                  title={collapsed ? item.name : undefined}
                  className={`flex items-center gap-3 px-3 py-3 font-medium transition-all duration-150 rounded-full active:scale-[0.98] ${
                    collapsed ? 'justify-center' : ''
                  } ${
                    isActive
                      ? 'text-primary bg-primary-container/10 border-l-4 border-primary font-bold rounded-r-full'
                      : 'text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  <span className="material-symbols-outlined flex-shrink-0">{item.icon}</span>
                  {!collapsed && (
                    <span className="font-label-caps text-label-caps uppercase">{item.name}</span>
                  )}
                </Link>
              </motion.div>
            )
          })}
        </div>

        {/* Bottom actions */}
        <div className={`mt-auto px-2 pt-4 border-t border-outline-variant flex flex-col gap-3 ${collapsed ? 'items-center' : ''}`}>
          {showNewProjectBtn && !collapsed && (
            <button
              onClick={() => setShowAddProject(true)}
              className="w-full flex items-center justify-center gap-2 bg-primary text-on-primary font-label-caps text-label-caps uppercase py-3 rounded-lg hover:brightness-110 transition-all duration-150 active:scale-[0.98] shadow-sm font-bold"
            >
              <span className="material-symbols-outlined">add</span>
              New Project
            </button>
          )}

          {showNewProjectBtn && collapsed && (
            <button
              onClick={() => setShowAddProject(true)}
              className="p-2 rounded-full bg-primary text-on-primary hover:brightness-110 transition-all duration-150"
              title="New Project"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
            </button>
          )}

          <Link
            className={`flex items-center gap-3 px-3 py-3 text-on-surface-variant hover:bg-surface-container-high transition-colors duration-150 rounded-full active:scale-[0.98] ${collapsed ? 'justify-center' : ''}`}
            to="/leadership"
            title={collapsed ? 'Leadership' : undefined}
          >
            <span className="material-symbols-outlined">shield_person</span>
            {!collapsed && (
              <span className="font-label-caps text-label-caps uppercase">Leadership</span>
            )}
          </Link>
        </div>
      </nav>

      {/* Modal for creating a new project */}
      {showAddProject && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowAddProject(false)}
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
                onClick={() => setShowAddProject(false)}
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
                  onClick={() => setShowAddProject(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-outline-variant text-on-surface-variant text-sm font-semibold hover:bg-surface-container-high transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-semibold hover:opacity-90 active:scale-95 transition-all shadow-sm disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
