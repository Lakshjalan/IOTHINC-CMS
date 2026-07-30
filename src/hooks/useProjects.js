import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { sanitizeName, sanitizeText, sanitizeEnum } from '../utils/sanitize'

export const useProjects = (filters = {}) => {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchProjects = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('projects')
        .select('*, teams(id, name)')

      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      if (filters.category) {
        query = query.eq('category', filters.category)
      }

      const { data, error: fetchErr } = await query.order('created_at', { ascending: false })

      if (fetchErr) throw fetchErr
      setProjects(data || [])
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [filters.status, filters.category])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const createProject = async (projectData) => {
    const safeData = {
      name: sanitizeName(projectData.name, 255),
      title: sanitizeName(projectData.title, 255),
      description: sanitizeText(projectData.description, 5000),
      status: sanitizeEnum(projectData.status, ['active', 'planning', 'completed', 'on_hold', 'cancelled']) || 'planning',
      category: sanitizeName(projectData.category, 100),
      github_link: projectData.github_link || null,
    }

    const { data, error: err } = await supabase
      .from('projects')
      .insert(safeData)
      .select()
      .single()

    if (err) throw err
    fetchProjects()
    return data
  }

  const updateProject = async (id, projectData) => {
    const safeData = {}
    if (projectData.name !== undefined)        safeData.name        = sanitizeName(projectData.name, 255)
    if (projectData.title !== undefined)       safeData.title       = sanitizeName(projectData.title, 255)
    if (projectData.description !== undefined) safeData.description = sanitizeText(projectData.description, 5000)
    if (projectData.status !== undefined)      safeData.status      = sanitizeEnum(projectData.status, ['active', 'planning', 'completed', 'on_hold', 'cancelled'])
    if (projectData.category !== undefined)    safeData.category    = sanitizeName(projectData.category, 100)
    if (projectData.github_link !== undefined) safeData.github_link = projectData.github_link || null

    const { data, error: err } = await supabase
      .from('projects')
      .update(safeData)
      .eq('id', id)
      .select()
      .single()

    if (err) throw err
    fetchProjects()
    return data
  }

  const deleteProject = async (id) => {
    const { error: err } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)

    if (err) throw err
    fetchProjects()
  }

  return {
    projects,
    loading,
    error,
    refetch: fetchProjects,
    createProject,
    updateProject,
    deleteProject
  }
}
