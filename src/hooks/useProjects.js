import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { sanitizeName, sanitizeText, sanitizeEnum } from '../utils/sanitize'
import { useCachedQuery, useCachedMutation } from '../context/CacheContext'

// Cache key generators
const getProjectsCacheKey = (filters) => `projects_${JSON.stringify(filters)}`
const PROJECTS_CACHE_TAG = 'projects'

export const useProjects = (filters = {}) => {
  // Use cached query for fetching
  const {
    data: projects = [],
    loading,
    error,
    isStale,
    refetch,
    updateCache
  } = useCachedQuery(
    getProjectsCacheKey(filters),
    async () => {
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
      return data || []
    },
    {
      ttl: 5 * 60 * 1000, // 5 minutes
      tags: [PROJECTS_CACHE_TAG],
      refetchOnMount: true,
      refetchOnWindowFocus: false
    }
  )

  // Mutations with cache invalidation
  const createProject = useCachedMutation(
    async (projectData) => {
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
      return data
    },
    {
      invalidateTags: [PROJECTS_CACHE_TAG],
      onSuccess: () => refetch()
    }
  )

  const updateProject = useCachedMutation(
    async (id, projectData) => {
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
      return data
    },
    {
      invalidateTags: [PROJECTS_CACHE_TAG],
      onSuccess: () => refetch()
    }
  )

  const deleteProject = useCachedMutation(
    async (id) => {
      const { error: err } = await supabase
        .from('projects')
        .delete()
        .eq('id', id)

      if (err) throw err
    },
    {
      invalidateTags: [PROJECTS_CACHE_TAG],
      onSuccess: () => refetch()
    }
  )

  return {
    projects,
    loading,
    error,
    isStale,
    refetch,
    createProject,
    updateProject,
    deleteProject
  }
}