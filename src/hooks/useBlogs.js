import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from './useAuth'
import { useCachedQuery, useCachedMutation } from '../context/CacheContext'

const BLOGS_CACHE_TAG = 'blogs'

export const useBlogs = () => {
  const { user } = useAuth()

  // Fetch all blogs
  const {
    data: blogs = [],
    loading,
    error,
    isStale,
    refetch
  } = useCachedQuery(
    'blogs_all',
    async () => {
      const { data, error: fetchErr } = await supabase
        .from('blogs')
        .select(`
          *,
          author:profiles!blogs_author_id_fkey(full_name, avatar_url)
        `)
        .order('created_at', { ascending: false })

      if (fetchErr) throw fetchErr
      return data || []
    },
    {
      ttl: 24 * 60 * 60 * 1000, // 24 hours — invalidated on mutation
      tags: [BLOGS_CACHE_TAG],
      refetchOnMount: true,
      refetchOnWindowFocus: false
    }
  )

  // Fetch a single blog by ID
  const fetchBlogById = async (id) => {
    try {
      const { data, error: fetchErr } = await supabase
        .from('blogs')
        .select(`
          *,
          author:profiles!blogs_author_id_fkey(full_name, avatar_url)
        `)
        .eq('id', id)
        .single()
      
      if (fetchErr) throw fetchErr
      return data
    } catch (err) {
      console.error('Error fetching blog:', err)
      throw err
    }
  }

  // Mutations
  const createBlog = useCachedMutation(
    async (blogData) => {
      const { data, error: err } = await supabase
        .from('blogs')
        .insert({
          ...blogData,
          author_id: user?.id
        })
        .select()
        .single()

      if (err) throw err
      return data
    },
    {
      invalidateTags: [BLOGS_CACHE_TAG],
      onSuccess: () => refetch()
    }
  )

  const updateBlog = useCachedMutation(
    async ({ id, updates }) => {
      const { data, error: err } = await supabase
        .from('blogs')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (err) throw err
      return data
    },
    {
      invalidateTags: [BLOGS_CACHE_TAG],
      onSuccess: () => refetch()
    }
  )

  const deleteBlog = useCachedMutation(
    async (id) => {
      const { error: err } = await supabase.from('blogs').delete().eq('id', id)
      if (err) throw err
    },
    {
      invalidateTags: [BLOGS_CACHE_TAG],
      onSuccess: () => refetch()
    }
  )

  return {
    blogs,
    loading,
    error,
    isStale,
    refetch,
    fetchBlogById,
    createBlog,
    updateBlog,
    deleteBlog
  }
}
